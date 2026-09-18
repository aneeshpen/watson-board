// Typed API client.
//
// Base URL comes from VITE_API_BASE_URL. In dev it is empty, so paths stay
// relative and the Vite proxy forwards /api to :8000. In a production build
// there is no proxy, so the deployed origin must be supplied at build time —
// previously every call was hardcoded relative and 404'd against the static host.

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

/** Requests that hang forever freeze the UI; every call gets a deadline. */
const DEFAULT_TIMEOUT_MS = 15_000;

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** Thrown for any non-2xx response, carrying the status for callers to branch on. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface AutopsyRecord {
  "CPR Number": string;
  Age: number;
  Sex: string;
  Height: number;
  Weight: number;
  Putrefaction: number;
  Putre_level: string | null;
  "Algor Mortis": number;
  "Rigor Mortis": string;
  "Livor Mortis": string;
  "Stomach Contents": string;
  "Vitreous Potassium": number;
  Entomology: string;
}

export interface AutopsiesResponse {
  data: AutopsyRecord[];
  count: number;
}

export interface TimelineEvent {
  id: string | number;
  time: string;
  title: string;
  eventType: string;
  description: string;
  confidence: number;
  severity: "critical" | "high" | "medium" | "low";
  aiInsight: string;
}

export interface TimelineResponse {
  case_id: string;
  timeline: TimelineEvent[];
}

export interface MovementPoint {
  lat: number;
  lng: number;
  label: string;
  time: string;
  type?: string;
}

export interface MovementResponse {
  case_id: string;
  movement: MovementPoint[];
}

export interface SearchResult {
  document: string;
  metadata: Record<string, unknown>;
  distance: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export interface PMIRequest {
  Age: number;
  Sex: string;
  Height: number;
  Weight: number;
  Putrefaction: number;
  Putre_level: string;
  "Rigor Mortis": string;
  "Livor Mortis": string;
  "Algor Mortis": number;
  "Stomach Contents": string;
  "Vitreous Potassium": number;
  Entomology: string;
}

export interface PMIResponse {
  predicted_pmi_hours: number;
  confidence_score: number;
  explanation: Record<string, number>;
  message: string;
}

export interface StatsResponse {
  total_autopsies: number;
  dataset_available?: boolean;
  /** Names of counters that are demo fixtures rather than live figures. */
  fixture_counters?: string[];
  active_cases: number;
  high_risk: number;
  ai_flagged: number;
  contradictions: number;
  missing_evidence: number;
  backend_online: boolean;
}

// ── Core fetch helper ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(apiUrl(path), {
      signal: controller.signal,
      ...rest,
      headers: { "Content-Type": "application/json", ...rest.headers },
    });

    if (!res.ok) {
      const detail = await res
        .json()
        .then((b: { detail?: string }) => b.detail)
        .catch(() => undefined);
      throw new ApiError(res.status, path, detail ?? res.statusText);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, path, `Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Autopsy endpoints ──────────────────────────────────────────────────────

export function fetchAutopsies(limit = 50, skip = 0): Promise<AutopsiesResponse> {
  return apiFetch<AutopsiesResponse>(`/api/autopsies?limit=${limit}&skip=${skip}`);
}

export function fetchAutopsyByCPR(cpr: string): Promise<AutopsyRecord> {
  return apiFetch<AutopsyRecord>(`/api/autopsy/${encodeURIComponent(cpr)}`);
}

// ── Case endpoints ─────────────────────────────────────────────────────────

export function fetchTimeline(caseId: string): Promise<TimelineResponse> {
  return apiFetch<TimelineResponse>(`/api/cases/${encodeURIComponent(caseId)}/timeline`);
}

export function fetchMovement(caseId: string): Promise<MovementResponse> {
  return apiFetch<MovementResponse>(`/api/cases/${encodeURIComponent(caseId)}/movement`);
}

export function fetchStats(): Promise<StatsResponse> {
  return apiFetch<StatsResponse>("/api/stats");
}

// ── Evidence search ────────────────────────────────────────────────────────

export function searchEvidence(query: string, nResults = 5): Promise<SearchResponse> {
  return apiFetch<SearchResponse>(
    `/api/search?query=${encodeURIComponent(query)}&n_results=${nResults}`,
  );
}

// ── PMI prediction ─────────────────────────────────────────────────────────

export function predictPMI(data: PMIRequest): Promise<PMIResponse> {
  return apiFetch<PMIResponse>("/api/pmi/predict", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Copilot (RAG) ──────────────────────────────────────────────────────────

export interface EvidenceSource {
  node_id: string;
  type: string;
  confidence: number | null;
  linked_to?: string | null;
  document: string;
  distance: number | null;
}

export interface CopilotStatus {
  mode: "rag" | "retrieval_only";
  generation_enabled: boolean;
  model: string | null;
  retrieval_k: number;
}

export interface CopilotAnswer {
  question: string;
  answer: string;
  sources: EvidenceSource[];
  mode: "rag" | "retrieval_only";
}

export function fetchCopilotStatus(): Promise<CopilotStatus> {
  return apiFetch<CopilotStatus>("/api/copilot/status");
}

export function askCopilot(question: string): Promise<CopilotAnswer> {
  return apiFetch<CopilotAnswer>("/api/copilot/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
    timeoutMs: 60_000,
  });
}

/** SSE events emitted by `GET /api/copilot/stream`. */
export type CopilotEvent =
  | { type: "sources"; sources: EvidenceSource[] }
  | { type: "delta"; text: string }
  | { type: "done"; mode: string }
  | { type: "error"; message: string };

/**
 * Stream a grounded answer, yielding each event as it arrives.
 *
 * Uses fetch + a ReadableStream rather than EventSource so the request can be
 * aborted and so errors surface as real HTTP statuses.
 */
export async function* streamCopilot(
  question: string,
  signal?: AbortSignal,
): AsyncGenerator<CopilotEvent> {
  const res = await fetch(apiUrl(`/api/copilot/stream?question=${encodeURIComponent(question)}`), {
    headers: { Accept: "text/event-stream" },
    signal,
  });

  if (!res.ok || !res.body) {
    throw new ApiError(res.status, "/api/copilot/stream", res.statusText);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        yield JSON.parse(line.slice(6)) as CopilotEvent;
      } catch {
        // Ignore malformed frames rather than killing the stream.
      }
    }
  }
}

// ── PMI model provenance ───────────────────────────────────────────────────

export interface ModelInfo {
  loaded: boolean;
  metrics_available: boolean;
  metrics: {
    holdout: { mae_hours: number; rmse_hours: number; r2: number };
    baselines: Record<string, { mae_hours: number; r2?: number }>;
    cross_validation: { mae_hours_mean: number; mae_hours_std: number };
    caveats?: string[];
  } | null;
}

export function fetchModelInfo(): Promise<ModelInfo> {
  return apiFetch<ModelInfo>("/api/pmi/model-info");
}
