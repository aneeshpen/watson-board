"""
Investigative Copilot — retrieval-augmented generation over the evidence corpus.

Before this module, the "AI Copilot" was a vector similarity search whose
results were string-concatenated into a reply. Nothing generated anything.

Now: retrieve from ChromaDB -> build a numbered evidence context -> ask Claude
to answer *only* from that context, citing evidence by node id. Answers stream
token-by-token so the UI can render them live.

If no Anthropic API key is configured the module degrades to the previous
retrieval-only behaviour rather than erroring, so the app still runs end-to-end
for anyone cloning the repo without a key.
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from config import settings
from services.chroma_db import query_evidence

logger = logging.getLogger("watson_board.copilot")

SYSTEM_PROMPT = """You are the Watson-Board investigative copilot, assisting a \
forensic analyst working a homicide case file.

Rules you must follow:
- Answer ONLY from the numbered EVIDENCE entries provided in the user message.
- Cite every factual claim with the evidence's node id in square brackets, e.g. \
[weapon-1]. Cite the specific item the claim comes from.
- If the evidence does not support an answer, say so plainly. Never invent \
evidence, names, times, or conclusions.
- Distinguish what the evidence establishes from what it merely suggests. Flag \
contradictions between items when you notice them.
- Be concise and factual. An analyst is reading this, not a jury.
- You are decision support. Do not assert guilt; describe what the evidence shows.
"""


def _format_evidence(results: list[dict[str, Any]]) -> str:
    """Render retrieved chunks as a numbered, citable block."""
    lines: list[str] = []
    for i, item in enumerate(results, start=1):
        meta = item.get("metadata") or {}
        node_id = meta.get("node_id", f"item-{i}")
        etype = str(meta.get("type", "unknown")).upper()
        confidence = meta.get("confidence", "n/a")
        linked = meta.get("linked_to")
        link_txt = f" | linked_to: {linked}" if linked else ""
        lines.append(
            f"[{node_id}] ({etype} | confidence: {confidence}%{link_txt})\n"
            f"{item.get('document', '')}"
        )
    return "\n\n".join(lines)


def _build_user_message(question: str, evidence_block: str) -> str:
    return (
        f"EVIDENCE (case corpus, retrieved for this question):\n\n"
        f"{evidence_block}\n\n"
        f"---\n\nANALYST QUESTION: {question}"
    )


def retrieve(question: str, k: int | None = None) -> list[dict[str, Any]]:
    """Semantic retrieval over the evidence collection."""
    return query_evidence(question, n_results=k or settings.copilot_retrieval_k)


def _fallback_answer(results: list[dict[str, Any]]) -> str:
    """Retrieval-only reply used when no Anthropic key is configured."""
    if not results:
        return "No relevant evidence was found in the case corpus for that question."
    parts = [
        "Retrieval-only mode (no ANTHROPIC_API_KEY configured — set one to enable "
        "generated answers). Closest matching evidence:\n"
    ]
    for item in results[:3]:
        meta = item.get("metadata") or {}
        parts.append(
            f"[{meta.get('node_id', 'unknown')}] "
            f"({str(meta.get('type', 'unknown')).upper()} | "
            f"confidence: {meta.get('confidence', 'n/a')}%)\n{item.get('document', '')}"
        )
    return "\n\n".join(parts)


def _client():
    import anthropic

    key = settings.anthropic_api_key
    return anthropic.AsyncAnthropic(api_key=key) if key else anthropic.AsyncAnthropic()


def _citations_payload(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The source list the UI renders under an answer."""
    payload = []
    for item in results:
        meta = item.get("metadata") or {}
        payload.append(
            {
                "node_id": meta.get("node_id"),
                "type": meta.get("type"),
                "confidence": meta.get("confidence"),
                "linked_to": meta.get("linked_to"),
                "document": item.get("document"),
                "distance": item.get("distance"),
            }
        )
    return payload


async def stream_answer(question: str, k: int | None = None) -> AsyncIterator[str]:
    """
    Yield Server-Sent Events for a grounded answer.

    Event shapes (each line is `data: <json>`):
      {"type": "sources",  "sources": [...]}   — sent first, so the UI can show
                                                 what the answer is grounded in
      {"type": "delta",    "text": "..."}      — incremental answer text
      {"type": "done",     "mode": "..."}      — terminal
      {"type": "error",    "message": "..."}   — terminal
    """
    try:
        results = retrieve(question, k)
    except Exception as exc:
        logger.error("Evidence retrieval failed: %s", exc, exc_info=True)
        yield f"data: {json.dumps({'type': 'error', 'message': 'Evidence retrieval failed.'})}\n\n"
        return

    yield f"data: {json.dumps({'type': 'sources', 'sources': _citations_payload(results)})}\n\n"

    if not settings.copilot_enabled:
        text = _fallback_answer(results)
        yield f"data: {json.dumps({'type': 'delta', 'text': text})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'mode': 'retrieval_only'})}\n\n"
        return

    if not results:
        msg = "No relevant evidence was found in the case corpus for that question."
        yield f"data: {json.dumps({'type': 'delta', 'text': msg})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'mode': 'rag'})}\n\n"
        return

    user_message = _build_user_message(question, _format_evidence(results))

    try:
        client = _client()
        async with client.messages.stream(
            model=settings.copilot_model,
            max_tokens=settings.copilot_max_tokens,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    # Stable prefix — cache it across requests.
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            async for chunk in stream.text_stream:
                yield f"data: {json.dumps({'type': 'delta', 'text': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'mode': 'rag'})}\n\n"

    except Exception as exc:
        # Typed-exception chain, most specific first.
        import anthropic

        if isinstance(exc, anthropic.AuthenticationError):
            message = "Copilot authentication failed — check ANTHROPIC_API_KEY."
        elif isinstance(exc, anthropic.RateLimitError):
            message = "Copilot is rate limited. Try again shortly."
        elif isinstance(exc, anthropic.APIConnectionError):
            message = "Could not reach the Copilot service."
        elif isinstance(exc, anthropic.APIStatusError):
            message = f"Copilot service error (HTTP {exc.status_code})."
        else:
            message = "Copilot failed to generate an answer."
        logger.error("Copilot generation failed: %s", exc, exc_info=True)
        yield f"data: {json.dumps({'type': 'error', 'message': message})}\n\n"


async def answer(question: str, k: int | None = None) -> dict[str, Any]:
    """Non-streaming variant — used by tests and non-SSE clients."""
    results = retrieve(question, k)
    sources = _citations_payload(results)

    if not settings.copilot_enabled:
        return {
            "question": question,
            "answer": _fallback_answer(results),
            "sources": sources,
            "mode": "retrieval_only",
        }

    if not results:
        return {
            "question": question,
            "answer": "No relevant evidence was found in the case corpus.",
            "sources": [],
            "mode": "rag",
        }

    client = _client()
    response = await client.messages.create(
        model=settings.copilot_model,
        max_tokens=settings.copilot_max_tokens,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": _build_user_message(question, _format_evidence(results))}
        ],
    )
    text = "".join(b.text for b in response.content if b.type == "text")
    return {"question": question, "answer": text, "sources": sources, "mode": "rag"}
