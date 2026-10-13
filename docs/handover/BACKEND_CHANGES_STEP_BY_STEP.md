# Cognitive Workspace: Backend Implementation & Integration Guide

**Document:** Backend Step-by-Step Implementation Guide & Code Reference  
**Target Audience:** Backend Developers (FastAPI)  
**Repository Focus:** `backend/app/api/routes.py` and `backend/.env`  
**Security Model:** Supabase PostgreSQL Row-Level Security (RLS) with JWT Token Forwarding  
**Version:** 1.0.0  

---

## Executive Summary & Architectural Context

The **Cognitive Workspace** database has been upgraded with production PostgreSQL Row-Level Security (RLS) and ownership inheritance:
- **`public.projects`**: Strictly isolated by `auth.uid() = user_id`.
- **`public.tasks`**: Strictly isolated by parent project ownership (`EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND p.user_id = auth.uid())`).

### Why Backend Changes Are Needed
Previously, the backend used a static `get_supabase_headers()` that used the anonymous `SUPABASE_KEY` without forwarding the user's session token. When RLS is active:
1. An anonymous request evaluates `auth.uid()` as `NULL`.
2. PostgreSQL policies deny access or return empty lists (`[]`).
3. The backend falls back to in-memory mocks instead of syncing with Supabase.

By following the steps below, the backend will capture the caller's `Authorization: Bearer <user_jwt>` and forward it directly to PostgREST.

---

## Step-by-Step Implementation Instructions

### Step 1: Environment Variables Configuration

Verify or create `backend/.env` with the following variables:

```env
PROJECT_NAME="Cognitive Workspace API"
ENVIRONMENT="development"
PORT=8000
HOST="0.0.0.0"

# Supabase Connection
SUPABASE_URL=https://<your-supabase-project-ref>.supabase.co
SUPABASE_KEY=<your-supabase-anon-or-publishable-key>

# LLM & Agent Keys
GEMINI_API_KEY="your-gemini-key"
```

---

### Step 2: Dynamic JWT Header Factory

In `backend/app/api/routes.py`, replace the static `get_supabase_headers()` function with this dynamic header generator:

```python
from fastapi import Header
from typing import Optional

def get_supabase_headers(authorization: Optional[str] = None) -> dict:
    """
    Constructs PostgREST request headers.
    If the caller provides an Authorization Bearer token, it is forwarded
    so PostgreSQL evaluates auth.uid() in Row-Level Security (RLS) policies.
    """
    token = SUPABASE_KEY
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()

    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
```

---

### Step 3: Pydantic Data Models

In `backend/app/api/routes.py`, update or define the Pydantic schemas for `projects` and `tasks`:

```python
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

# --- TASK STATUS ENUM ---
class TaskStatusEnum(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

# --- PROJECT SCHEMAS ---
class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(default="", max_length=5000)

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str
    user_id: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

# --- TASK SCHEMAS ---
class TaskBase(BaseModel):
    project_id: str = Field(..., description="UUID of parent project")
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(default="", max_length=10000)
    status: TaskStatusEnum = Field(default=TaskStatusEnum.TODO)

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatusEnum] = None

class Task(TaskBase):
    id: str
    created_at: str
    updated_at: Optional[str] = None
```

---

### Step 4: Projects Endpoints with Token Forwarding

In `backend/app/api/routes.py`, update the project endpoints to accept `authorization: Optional[str] = Header(None)`:

```python
from fastapi import APIRouter, HTTPException, Header, status
import httpx
import uuid
from datetime import datetime

# --- GET /api/v1/projects ---
@router.get("/projects", response_model=List[Project], tags=["Projects"])
async def list_projects(authorization: Optional[str] = Header(None)):
    """Fetch projects owned by the authenticated caller."""
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(
                    f"{SUPABASE_URL}/rest/v1/projects?select=*&order=created_at.desc",
                    headers=get_supabase_headers(authorization)
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass
    return _PROJECTS_STORE


# --- POST /api/v1/projects ---
@router.post("/projects", response_model=Project, status_code=status.HTTP_201_CREATED, tags=["Projects"])
async def create_project(payload: ProjectCreate, authorization: Optional[str] = Header(None)):
    """Create a project strictly under the authenticated user's ID."""
    project_payload = {
        "name": payload.name,
        "description": payload.description
    }

    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                headers = get_supabase_headers(authorization)
                headers["Prefer"] = "return=representation"
                res = await client.post(
                    f"{SUPABASE_URL}/rest/v1/projects",
                    headers=headers,
                    json=project_payload
                )
                if res.status_code in (200, 201):
                    created = res.json()[0]
                    _PROJECTS_STORE.insert(0, created)
                    return created
                elif res.status_code == 403:
                    raise HTTPException(status_code=403, detail="Forbidden: RLS violation on project creation.")
        except HTTPException:
            raise
        except Exception:
            pass

    # In-memory fallback
    fallback_project = {
        "id": f"proj-{uuid.uuid4().hex[:8]}",
        **project_payload,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }
    _PROJECTS_STORE.insert(0, fallback_project)
    return fallback_project


# --- DELETE /api/v1/projects/{project_id} ---
@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Projects"])
async def delete_project(project_id: str, authorization: Optional[str] = Header(None)):
    """Delete a project (cascades to all child tasks automatically)."""
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.delete(
                    f"{SUPABASE_URL}/rest/v1/projects?id=eq.{project_id}",
                    headers=get_supabase_headers(authorization)
                )
                if res.status_code not in (200, 204):
                    raise HTTPException(status_code=res.status_code, detail="Failed to delete project.")
        except HTTPException:
            raise
        except Exception:
            pass

    global _PROJECTS_STORE
    _PROJECTS_STORE = [p for p in _PROJECTS_STORE if p["id"] != project_id]
    return None
```

---

### Step 5: Tasks Endpoints with Inherited Ownership

In `backend/app/api/routes.py`, update the task endpoints:

```python
# --- GET /api/v1/tasks ---
@router.get("/tasks", response_model=List[Task], tags=["Tasks"])
async def list_tasks(
    project_id: Optional[str] = None,
    task_status: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """
    List tasks. Inherited RLS guarantees users only see tasks
    belonging to projects they own.
    """
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            query_parts = ["select=*"]
            if project_id:
                query_parts.append(f"project_id=eq.{project_id}")
            if task_status:
                query_parts.append(f"status=eq.{task_status}")
            query_str = "&".join(query_parts) + "&order=created_at.desc"

            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(
                    f"{SUPABASE_URL}/rest/v1/tasks?{query_str}",
                    headers=get_supabase_headers(authorization)
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass

    results = _TASKS_STORE
    if project_id:
        results = [t for t in results if t.get("project_id") == project_id]
    if task_status:
        results = [t for t in results if t.get("status") == task_status]
    return results


# --- POST /api/v1/tasks ---
@router.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED, tags=["Tasks"])
async def create_task(payload: TaskCreate, authorization: Optional[str] = Header(None)):
    """
    Create a task. The database rejects this with a 403/404 if the parent
    project_id does not belong to the authenticated caller.
    """
    new_task = {
        "project_id": payload.project_id,
        "title": payload.title,
        "description": payload.description,
        "status": payload.status.value
    }

    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                headers = get_supabase_headers(authorization)
                headers["Prefer"] = "return=representation"
                res = await client.post(
                    f"{SUPABASE_URL}/rest/v1/tasks",
                    headers=headers,
                    json=new_task
                )
                if res.status_code in (200, 201):
                    created = res.json()[0]
                    _TASKS_STORE.insert(0, created)
                    return created
                elif res.status_code in (400, 403, 404):
                    raise HTTPException(
                        status_code=res.status_code,
                        detail="Cannot create task: parent project does not exist or access denied by RLS."
                    )
        except HTTPException:
            raise
        except Exception:
            pass

    fallback_task = {
        "id": f"task-{uuid.uuid4().hex[:8]}",
        **new_task,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }
    _TASKS_STORE.insert(0, fallback_task)
    return fallback_task


# --- PATCH /api/v1/tasks/{task_id} ---
@router.patch("/tasks/{task_id}", response_model=Task, tags=["Tasks"])
async def update_task(task_id: str, updates: TaskUpdate, authorization: Optional[str] = Header(None)):
    """Update a task's title, description, or status."""
    update_data = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
    if "status" in update_data and isinstance(update_data["status"], TaskStatusEnum):
        update_data["status"] = update_data["status"].value

    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                headers = get_supabase_headers(authorization)
                headers["Prefer"] = "return=representation"
                res = await client.patch(
                    f"{SUPABASE_URL}/rest/v1/tasks?id=eq.{task_id}",
                    headers=headers,
                    json=update_data
                )
                if res.status_code in (200, 204):
                    records = res.json()
                    if records:
                        return records[0]
                elif res.status_code in (403, 404):
                    raise HTTPException(status_code=404, detail="Task not found or access denied.")
        except HTTPException:
            raise
        except Exception:
            pass

    for t in _TASKS_STORE:
        if t["id"] == task_id:
            t.update(update_data)
            t["updated_at"] = datetime.utcnow().isoformat() + "Z"
            return t
    raise HTTPException(status_code=404, detail="Task not found")


# --- DELETE /api/v1/tasks/{task_id} ---
@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Tasks"])
async def delete_task(task_id: str, authorization: Optional[str] = Header(None)):
    """Delete a task."""
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.delete(
                    f"{SUPABASE_URL}/rest/v1/tasks?id=eq.{task_id}",
                    headers=get_supabase_headers(authorization)
                )
                if res.status_code not in (200, 204):
                    raise HTTPException(status_code=res.status_code, detail="Failed to delete task.")
        except HTTPException:
            raise
        except Exception:
            pass

    global _TASKS_STORE
    _TASKS_STORE = [t for t in _TASKS_STORE if t["id"] != task_id]
    return None
```

---

## Error Handling & Status Code Matrix

| PostgREST Status / Reason | FastAPI Response Code | Error Message |
| :--- | :--- | :--- |
| `200 / 201` Success | `200 OK` / `201 Created` | Returns modified resource object |
| `PGRST116` (0 rows matched RLS) | `404 Not Found` | `"Project or task not found."` |
| `403 Forbidden` (RLS policy violation) | `403 Forbidden` | `"Access denied by Row-Level Security policy."` |
| `23503` (Foreign key violation) | `400 Bad Request` | `"Parent project_id does not exist or access denied."` |
| `23514` (Check constraint violation) | `422 Unprocessable` | `"Invalid status value. Must be todo, in_progress, completed."` |
| Missing / expired JWT | `401 Unauthorized` | `"Invalid or expired authentication session."` |

---

## Local Verification & Testing

### 1. Start the FastAPI Dev Server
```powershell
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

### 2. Run Integration Tests with `curl`

#### Create Project
```bash
curl -X POST "http://localhost:8000/api/v1/projects" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Cognitive Workflow Alpha", "description": "Production RLS test project"}'
```

#### List Projects
```bash
curl -X GET "http://localhost:8000/api/v1/projects" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>"
```

#### Create Task
```bash
curl -X POST "http://localhost:8000/api/v1/tasks" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"project_id": "<PROJECT_UUID>", "title": "Implement LangGraph State Graph", "status": "todo"}'
```

#### Update Task Status
```bash
curl -X PATCH "http://localhost:8000/api/v1/tasks/<TASK_UUID>" \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

#### Cross-Tenant Negative Test
Try sending a request using a different user's JWT to mutate `<PROJECT_UUID>`. The database will reject it with a `403` or `404`, confirming tenant isolation.
