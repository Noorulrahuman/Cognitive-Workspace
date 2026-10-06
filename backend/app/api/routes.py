from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

router = APIRouter()

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., max_length=500)
    category: str = Field(default="Agentic Workflow")
    tags: List[str] = Field(default_factory=list)
    source_url: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str
    documents_count: int = 0
    status: str = "Active"
    created_at: str

# In-memory initial project repository
_PROJECTS_STORE: List[dict] = [
    {
        "id": "proj-1",
        "name": "Financial Document Intelligence",
        "description": "Multi-agent extraction and automated ratio analysis on 10-K financial reports using PyMuPDF and LangGraph.",
        "category": "Agentic Workflow",
        "tags": ["LangGraph", "PyMuPDF", "FastAPI"],
        "source_url": "https://sec.gov/edgar",
        "documents_count": 14,
        "status": "Active",
        "created_at": "2026-10-01T10:00:00Z"
    },
    {
        "id": "proj-2",
        "name": "Biomedical Literature Search",
        "description": "Dense vector retrieval pipeline with Supabase pgvector and automated literature citation graph.",
        "category": "Semantic Search",
        "tags": ["Supabase", "pgvector", "RAG"],
        "source_url": "https://pubmed.ncbi.nlm.nih.gov",
        "documents_count": 86,
        "status": "Active",
        "created_at": "2026-10-03T14:30:00Z"
    },
    {
        "id": "proj-3",
        "name": "Regulatory Web Scraper",
        "description": "Headless Chromium crawler driven by Playwright and BeautifulSoup4 for monitoring regulatory amendments.",
        "category": "Document Extraction",
        "tags": ["Playwright", "BeautifulSoup4", "Pandas"],
        "source_url": "https://regulations.gov",
        "documents_count": 42,
        "status": "Active",
        "created_at": "2026-10-04T09:15:00Z"
    }
]

@router.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok"}

@router.get("/workspace/status", tags=["Workspace"])
async def workspace_status():
    return {
        "workspace": "Cognitive Workspace",
        "active": True,
        "projects_count": len(_PROJECTS_STORE)
    }

@router.get("/projects", response_model=List[Project], tags=["Projects"])
async def list_projects():
    """Retrieve all active workspace projects."""
    return _PROJECTS_STORE

@router.post("/projects", response_model=Project, status_code=status.HTTP_201_CREATED, tags=["Projects"])
async def create_project(payload: ProjectCreate):
    """Add a new project to the cognitive workspace."""
    new_project = {
        "id": f"proj-{uuid.uuid4().hex[:8]}",
        "name": payload.name,
        "description": payload.description,
        "category": payload.category,
        "tags": payload.tags if payload.tags else [payload.category],
        "source_url": payload.source_url,
        "documents_count": 1 if payload.source_url else 0,
        "status": "Active",
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    _PROJECTS_STORE.insert(0, new_project)
    return new_project

@router.delete("/projects/{project_id}", status_code=status.HTTP_200_OK, tags=["Projects"])
async def delete_project(project_id: str):
    """Remove a project from the workspace by its ID."""
    global _PROJECTS_STORE
    original_len = len(_PROJECTS_STORE)
    _PROJECTS_STORE = [p for p in _PROJECTS_STORE if p["id"] != project_id]
    if len(_PROJECTS_STORE) == original_len:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found."
        )
    return {"message": f"Project '{project_id}' successfully removed.", "remaining_count": len(_PROJECTS_STORE)}

@router.get("/requirements", tags=["Requirements"])
async def get_requirements():
    """Return architecture specifications and status for Cognitive Workspace."""
    return {
        "architecture": {
            "orchestration": "LangGraph (Multi-Agent Cognitive Loops)",
            "vector_store": "Supabase with pgvector",
            "backend": "FastAPI (Asynchronous, High-Concurrency)",
            "frontend": "Next.js 16 (App Router, Turbopack, Tailwind CSS)",
            "extraction_stack": [
                {"name": "HTTPX", "purpose": "Fast asynchronous HTTP web requests", "status": "Ready"},
                {"name": "BeautifulSoup4", "purpose": "DOM & HTML content sanitization and parsing", "status": "Ready"},
                {"name": "Playwright", "purpose": "Headless Chromium browser for dynamic SPA ingestion", "status": "Ready"},
                {"name": "PyMuPDF", "purpose": "High-throughput PDF document layout extraction", "status": "Ready"},
                {"name": "Pandas", "purpose": "Structured data formatting and tabular normalization", "status": "Ready"}
            ]
        },
        "system_status": "Healthy"
    }