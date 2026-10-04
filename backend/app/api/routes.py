from fastapi import APIRouter

router = APIRouter()

@router.get("/workspace/status", tags=["Workspace"])
async def workspace_status():
    return {
        "workspace": "Cognitive Workspace",
        "active": True
    }