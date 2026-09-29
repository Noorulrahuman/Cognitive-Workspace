from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "cognitive-workspace-backend"
    }

@router.get("/workspace/status", tags=["Workspace"])
async def workspace_status():
    return {
        "workspace": "Cognitive Workspace",
        "active": True
    }