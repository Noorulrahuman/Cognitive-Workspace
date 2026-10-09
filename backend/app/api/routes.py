from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import os
import httpx

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

# ==============================================================================
# PROJECT SCHEMAS & STORE
# ==============================================================================

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., max_length=500)
    category: str = Field(default="Agentic Workflow")
    tags: List[str] = Field(default_factory=list)
    source_url: Optional[str] = None
    user_id: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str
    documents_count: int = 0
    status: str = "Active"
    created_at: str

_PROJECTS_STORE: List[dict] = [
    {
        "id": "d1a1b1c1-1111-4000-8000-000000000001",
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
        "id": "d2a2b2c2-2222-4000-8000-000000000002",
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
        "id": "d3a3b3c3-3333-4000-8000-000000000003",
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

# ==============================================================================
# MEMBER SCHEMAS & STORE (Separating Managers and Developers)
# ==============================================================================

class MemberBase(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(...)
    role_type: str = Field(..., description="'manager' or 'developer'")
    role_title: str
    department: str = Field(default="Engineering")
    avatar_color: str = Field(default="from-blue-600 to-cyan-500")
    status: str = Field(default="online")
    skills: List[str] = Field(default_factory=list)
    assigned_projects: List[str] = Field(default_factory=list)

class MemberCreate(MemberBase):
    pass

class Member(MemberBase):
    id: str
    created_at: str

_MEMBERS_STORE: List[dict] = [
    {
        "id": "m-001",
        "name": "Dr. Sarah Chen",
        "email": "sarah.chen@cognitive.ai",
        "role_type": "manager",
        "role_title": "Head of Cognitive Architecture",
        "department": "Executive & AI Strategy",
        "avatar_color": "from-amber-500 to-rose-600",
        "status": "online",
        "skills": ["LangGraph Orchestration", "Multi-Agent Topology"],
        "assigned_projects": ["Financial Document Intelligence"],
        "created_at": "2026-09-15T08:00:00Z"
    },
    {
        "id": "m-002",
        "name": "Marcus Vance",
        "email": "marcus.vance@cognitive.ai",
        "role_type": "manager",
        "role_title": "Product & Delivery Lead",
        "department": "Product Management",
        "avatar_color": "from-indigo-600 to-purple-600",
        "status": "online",
        "skills": ["Roadmap Planning", "Vector Search KPIs"],
        "assigned_projects": ["Biomedical Literature Search"],
        "created_at": "2026-09-18T09:30:00Z"
    },
    {
        "id": "m-003",
        "name": "Elena Rostova",
        "email": "elena.rostova@cognitive.ai",
        "role_type": "manager",
        "role_title": "Engineering Manager (Data Pipelines)",
        "department": "Platform Engineering",
        "avatar_color": "from-pink-500 to-red-600",
        "status": "away",
        "skills": ["ETL Pipelines", "Compliance Guardrails"],
        "assigned_projects": ["Regulatory Web Scraper"],
        "created_at": "2026-09-20T11:00:00Z"
    },
    {
        "id": "d-001",
        "name": "Alex Rivera",
        "email": "alex.rivera@cognitive.ai",
        "role_type": "developer",
        "role_title": "Senior LangGraph & Python Engineer",
        "department": "AI Agent Development",
        "avatar_color": "from-blue-600 to-cyan-500",
        "status": "online",
        "skills": ["Python", "LangGraph", "FastAPI"],
        "assigned_projects": ["Financial Document Intelligence"],
        "created_at": "2026-09-25T10:00:00Z"
    },
    {
        "id": "d-002",
        "name": "Priya Sharma",
        "email": "priya.sharma@cognitive.ai",
        "role_type": "developer",
        "role_title": "Fullstack Next.js & UI Engineer",
        "department": "Frontend Experience",
        "avatar_color": "from-emerald-500 to-teal-600",
        "status": "online",
        "skills": ["TypeScript", "Next.js 16", "Tailwind CSS"],
        "assigned_projects": ["Regulatory Web Scraper"],
        "created_at": "2026-09-27T13:45:00Z"
    },
    {
        "id": "d-003",
        "name": "David Kim",
        "email": "david.kim@cognitive.ai",
        "role_type": "developer",
        "role_title": "Document Ingestion & PyMuPDF Specialist",
        "department": "Document Intelligence",
        "avatar_color": "from-violet-600 to-indigo-600",
        "status": "online",
        "skills": ["PyMuPDF", "Playwright", "Pandas"],
        "assigned_projects": ["Financial Document Intelligence"],
        "created_at": "2026-10-01T08:15:00Z"
    },
    {
        "id": "d-004",
        "name": "Sophia Taylor",
        "email": "sophia.taylor@cognitive.ai",
        "role_type": "developer",
        "role_title": "Vector DB & Supabase Systems Dev",
        "department": "Storage & Semantic Retrieval",
        "avatar_color": "from-sky-500 to-indigo-500",
        "status": "offline",
        "skills": ["Supabase", "pgvector", "PostgreSQL"],
        "assigned_projects": ["Biomedical Literature Search"],
        "created_at": "2026-10-02T14:20:00Z"
    }
]

# ==============================================================================
# TASK SCHEMAS & STORE (Task Stage, Priority, Member Assignment, Due Date)
# ==============================================================================

class TaskBase(BaseModel):
    project_id: str
    project_name: str
    title: str = Field(..., min_length=1)
    description: str = Field(default="")
    priority: str = Field(default="medium") # low, medium, high, urgent
    stage: str = Field(default="todo")       # todo, in_progress, review, done
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_role: Optional[str] = None
    due_date: str

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    stage: Optional[str] = None
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_role: Optional[str] = None
    due_date: Optional[str] = None

class Task(TaskBase):
    id: str
    created_at: str
    updated_at: Optional[str] = None

_TASKS_STORE: List[dict] = [
    {
        "id": "task-001",
        "project_id": "d1a1b1c1-1111-4000-8000-000000000001",
        "project_name": "Financial Document Intelligence",
        "title": "Implement PyMuPDF 10-K Table Extraction Parser",
        "description": "Extract multi-column tabular balance sheets and income statements into structured JSON chunks.",
        "priority": "high",
        "stage": "in_progress",
        "assigned_to_id": "d-003",
        "assigned_to_name": "David Kim",
        "assigned_to_role": "Document Ingestion Specialist",
        "due_date": "2026-10-15",
        "created_at": "2026-10-05T09:00:00Z"
    },
    {
        "id": "task-002",
        "project_id": "d1a1b1c1-1111-4000-8000-000000000001",
        "project_name": "Financial Document Intelligence",
        "title": "Review LangGraph Multi-Agent Cognitive Loop State",
        "description": "Evaluate graph transition conditions and prevent recursive deadlocks in ratio calculation agent.",
        "priority": "urgent",
        "stage": "review",
        "assigned_to_id": "m-001",
        "assigned_to_name": "Dr. Sarah Chen",
        "assigned_to_role": "Head of Cognitive Architecture",
        "due_date": "2026-10-12",
        "created_at": "2026-10-06T11:20:00Z"
    },
    {
        "id": "task-003",
        "project_id": "d1a1b1c1-1111-4000-8000-000000000001",
        "project_name": "Financial Document Intelligence",
        "title": "Unit Test Semantic Chunking Overlap Window",
        "description": "Verify 15% sliding window overlap preserves context boundaries across SEC disclosures.",
        "priority": "medium",
        "stage": "done",
        "assigned_to_id": "d-001",
        "assigned_to_name": "Alex Rivera",
        "assigned_to_role": "Senior LangGraph Engineer",
        "due_date": "2026-10-08",
        "created_at": "2026-10-02T14:00:00Z"
    },
    {
        "id": "task-004",
        "project_id": "d2a2b2c2-2222-4000-8000-000000000002",
        "project_name": "Biomedical Literature Search",
        "title": "Configure Supabase pgvector Indexing & HNSW Cosine Distance",
        "description": "Set up m=16 ef_construction=64 on pubmed_abstracts embedding column for sub-50ms latency.",
        "priority": "high",
        "stage": "in_progress",
        "assigned_to_id": "d-004",
        "assigned_to_name": "Sophia Taylor",
        "assigned_to_role": "Vector DB Engineer",
        "due_date": "2026-10-18",
        "created_at": "2026-10-07T10:15:00Z"
    },
    {
        "id": "task-005",
        "project_id": "d2a2b2c2-2222-4000-8000-000000000002",
        "project_name": "Biomedical Literature Search",
        "title": "Sign-off on RAG Citation Graph Grounding Standards",
        "description": "Approve accuracy metrics and threshold scores for citation claims in biomedical synthesis.",
        "priority": "medium",
        "stage": "todo",
        "assigned_to_id": "m-002",
        "assigned_to_name": "Marcus Vance",
        "assigned_to_role": "Product & Delivery Lead",
        "due_date": "2026-10-22",
        "created_at": "2026-10-08T15:00:00Z"
    },
    {
        "id": "task-006",
        "project_id": "d3a3b3c3-3333-4000-8000-000000000003",
        "project_name": "Regulatory Web Scraper",
        "title": "Develop Headless Chromium Playwright Session Handler",
        "description": "Handle JS-rendered federal register portal without triggering automated bot challenges.",
        "priority": "urgent",
        "stage": "in_progress",
        "assigned_to_id": "d-002",
        "assigned_to_name": "Priya Sharma",
        "assigned_to_role": "Fullstack Engineer",
        "due_date": "2026-10-14",
        "created_at": "2026-10-07T16:30:00Z"
    }
]

# ==============================================================================
# ROUTES
# ==============================================================================

@router.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": "Cognitive Workspace Engine", "ai_model": "Gemini 1.5"}

@router.get("/workspace/status", tags=["Workspace"])
async def workspace_status():
    p_count = len(_PROJECTS_STORE)
    t_count = len(_TASKS_STORE)
    m_count = len(_MEMBERS_STORE)
    return {
        "workspace": "Cognitive Workspace",
        "active": True,
        "projects_count": p_count,
        "tasks_count": t_count,
        "members_count": m_count,
        "database": "Supabase pgvector" if (SUPABASE_URL and SUPABASE_KEY) else "In-Memory Dynamic"
    }

# --- PROJECTS ---

@router.get("/projects", response_model=List[Project], tags=["Projects"])
async def list_projects():
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(
                    f"{SUPABASE_URL}/rest/v1/projects?select=*&order=created_at.desc",
                    headers=get_supabase_headers()
                )
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, list) and len(data) > 0:
                        return data
        except Exception:
            pass
    return _PROJECTS_STORE

@router.post("/projects", response_model=Project, status_code=status.HTTP_201_CREATED, tags=["Projects"])
async def create_project(payload: ProjectCreate):
    project_payload = {
        "name": payload.name,
        "description": payload.description,
        "category": payload.category,
        "tags": payload.tags if payload.tags else [payload.category],
        "source_url": payload.source_url,
        "documents_count": 1 if payload.source_url else 0,
        "status": "Active",
        "user_id": payload.user_id
    }
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                headers = get_supabase_headers()
                headers["Prefer"] = "return=representation"
                res = await client.post(
                    f"{SUPABASE_URL}/rest/v1/projects",
                    headers=headers,
                    json=project_payload
                )
                if res.status_code in (200, 201):
                    created_list = res.json()
                    if isinstance(created_list, list) and len(created_list) > 0:
                        created = created_list[0]
                        _PROJECTS_STORE.insert(0, created)
                        return created
        except Exception:
            pass
    fallback_project = {
        "id": f"proj-{uuid.uuid4().hex[:8]}",
        **project_payload,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    _PROJECTS_STORE.insert(0, fallback_project)
    return fallback_project

@router.delete("/projects/{project_id}", status_code=status.HTTP_200_OK, tags=["Projects"])
async def delete_project(project_id: str):
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.delete(
                    f"{SUPABASE_URL}/rest/v1/projects?id=eq.{project_id}",
                    headers=get_supabase_headers()
                )
        except Exception:
            pass
    global _PROJECTS_STORE
    _PROJECTS_STORE = [p for p in _PROJECTS_STORE if p["id"] != project_id]
    return {"message": f"Project '{project_id}' deleted."}

# --- MEMBERS (Separating Managers and Developers) ---

@router.get("/members", response_model=List[Member], tags=["Members"])
async def list_members():
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(
                    f"{SUPABASE_URL}/rest/v1/members?select=*&order=role_type.asc",
                    headers=get_supabase_headers()
                )
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, list) and len(data) > 0:
                        return data
        except Exception:
            pass
    return _MEMBERS_STORE

@router.post("/members", response_model=Member, status_code=status.HTTP_201_CREATED, tags=["Members"])
async def create_member(payload: MemberCreate):
    new_member = {
        "id": f"m-{uuid.uuid4().hex[:6]}",
        **payload.dict(),
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{SUPABASE_URL}/rest/v1/members",
                    headers=get_supabase_headers(),
                    json=new_member
                )
        except Exception:
            pass
    _MEMBERS_STORE.insert(0, new_member)
    return new_member

# --- TASKS (Stage, Priority, Due Date, Member Assignment) ---

@router.get("/tasks", response_model=List[Task], tags=["Tasks"])
async def list_tasks(project_id: Optional[str] = None, stage: Optional[str] = None):
    results = _TASKS_STORE
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(
                    f"{SUPABASE_URL}/rest/v1/tasks?select=*&order=created_at.desc",
                    headers=get_supabase_headers()
                )
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, list) and len(data) > 0:
                        results = data
        except Exception:
            pass

    if project_id:
        results = [t for t in results if t.get("project_id") == project_id or t.get("project_name") == project_id]
    if stage:
        results = [t for t in results if t.get("stage") == stage]
    return results

@router.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED, tags=["Tasks"])
async def create_task(payload: TaskCreate):
    new_task = {
        "id": f"task-{uuid.uuid4().hex[:8]}",
        **payload.dict(),
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{SUPABASE_URL}/rest/v1/tasks",
                    headers=get_supabase_headers(),
                    json=new_task
                )
        except Exception:
            pass
    _TASKS_STORE.insert(0, new_task)
    return new_task

@router.put("/tasks/{task_id}", response_model=Task, tags=["Tasks"])
async def update_task(task_id: str, updates: TaskUpdate):
    target = None
    for t in _TASKS_STORE:
        if t["id"] == task_id:
            target = t
            break

    if not target:
        raise HTTPException(status_code=404, detail="Task not found")

    update_dict = updates.dict(exclude_unset=True)
    update_dict["updated_at"] = datetime.utcnow().isoformat() + "Z"
    target.update(update_dict)

    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.patch(
                    f"{SUPABASE_URL}/rest/v1/tasks?id=eq.{task_id}",
                    headers=get_supabase_headers(),
                    json=update_dict
                )
        except Exception:
            pass

    return target

@router.delete("/tasks/{task_id}", status_code=status.HTTP_200_OK, tags=["Tasks"])
async def delete_task(task_id: str):
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.delete(
                    f"{SUPABASE_URL}/rest/v1/tasks?id=eq.{task_id}",
                    headers=get_supabase_headers()
                )
        except Exception:
            pass
    global _TASKS_STORE
    _TASKS_STORE = [t for t in _TASKS_STORE if t["id"] != task_id]
    return {"message": f"Task '{task_id}' deleted."}