from fastapi import APIRouter
from src.services.drift_engine import calculate_drift_metrics

router = APIRouter()


@router.get("/drift")
async def get_drift_analysis():
    """Returns multi-technique concept drift detection metrics."""
    return calculate_drift_metrics()
