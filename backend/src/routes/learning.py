from fastapi import APIRouter
from pydantic import BaseModel

from src.services import learning_engine

router = APIRouter()


class LabelRequest(BaseModel):
    name: str


@router.get("/learning/status")
async def learning_status():
    """Everything the Learning dashboard needs: pending novel bucket, custom
    classes, model metrics (current + previous), and retrain state."""
    return learning_engine.status()


@router.post("/learning/label")
async def label_bucket(req: LabelRequest):
    """Name the pending novel bucket, synthesize samples, append to the dataset."""
    return learning_engine.label_bucket(req.name)


@router.post("/learning/retrain")
async def retrain():
    """Retrain the model on NSL-KDD + the custom labeled dataset (background)."""
    return learning_engine.start_retrain()
