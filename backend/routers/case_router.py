from fastapi import APIRouter, HTTPException
from services.autopsy_service import autopsy_service
from services.data_generator import generate_timeline, generate_movement

router = APIRouter()

@router.get("/stats")
def get_stats():
    """Returns aggregate dashboard statistics for the active case."""
    try:
        total = autopsy_service.get_all_autopsies(limit=10000, skip=0)
        total_count = len(total)
    except Exception:
        total_count = 3000

    return {
        "total_autopsies": total_count,
        "active_cases": 12,
        "high_risk": 4,
        "ai_flagged": 7,
        "contradictions": 3,
        "missing_evidence": 9,
        "backend_online": True,
    }

@router.get("/autopsies")
def get_autopsies(limit: int = 50, skip: int = 0):
    """
    Returns a list of autopsies from the dataset.
    """
    data = autopsy_service.get_all_autopsies(limit, skip)
    return {"data": data, "count": len(data)}

@router.get("/autopsy/{cpr_number}")
def get_autopsy(cpr_number: str):
    """
    Returns a specific autopsy by CPR Number.
    """
    record = autopsy_service.get_autopsy_by_cpr(cpr_number)
    if not record:
        raise HTTPException(status_code=404, detail="Autopsy not found")
    return record

@router.get("/cases/{case_id}/timeline")
def get_case_timeline(case_id: str):
    """
    Returns time-series log events for the given case.
    """
    return {"case_id": case_id, "timeline": generate_timeline(case_id)}

@router.get("/cases/{case_id}/movement")
def get_case_movement(case_id: str):
    """
    Returns geospatial GPS routes.
    """
    return {"case_id": case_id, "movement": generate_movement(case_id)}

import chromadb
import os

PERSIST_DIRECTORY = os.path.join(os.path.dirname(__file__), "../chroma_data")

@router.get("/search")
def search_evidence(query: str, n_results: int = 5):
    """
    Query ChromaDB for evidence relationships.
    """
    try:
        client = chromadb.PersistentClient(path=PERSIST_DIRECTORY)
        collection = client.get_collection(name="watson_board_evidence_graph")
        
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        formatted_results = []
        if results['documents']:
            for i, doc in enumerate(results['documents'][0]):
                formatted_results.append({
                    "document": doc,
                    "metadata": results['metadatas'][0][i],
                    "distance": results['distances'][0][i]
                })
            
        return {"query": query, "results": formatted_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
