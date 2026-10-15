# Backend Implementation & Handoff Guide

**Document Version:** 1.0.0  
**Target Stack:** FastAPI (Python 3.12+), Supabase / PostgreSQL (pgvector), Supabase Realtime  
**Workspace:** Cognitive Workspace  
**Status:** Ready for Backend Implementation  

---

## 1. Executive Summary & Context

To support our modern frontend refactors (Streamlined Members List, Master-Detail Slide Drawer, Global Dynamic Accent Color, and Real-Time Member Synchronization), the backend infrastructure must provide persistent database schemas, optimized REST endpoints, and authentication broadcast hooks.

### Key Frontend Capabilities to Support:
1. **Members Master-Detail Pattern:** Minimal on-page query payload for the master table list, and an enriched, full-fidelity payload for the slide-out detail drawer.
2. **Dynamic Role Privileges:** Interactive promotion/demotion between `Admin`, `Editor`, `Member`, and `Viewer` with audited activity logs.
3. **Global Accent Color Persistence:** Storing user theme preference (`accent_color`) so it restores seamlessly across devices and browser sessions.
4. **Real-time Member Synchronization:** Newly signed-up or authenticated users must immediately populate into the talent directory without manual administrator provisioning.

---

## 2. Database Schema Extensions

### 2.1 System Role Enum & Profiles Table Extension

Add the `user_system_role` enum and extend the `profiles` (or `users`) table in PostgreSQL:

```sql
-- 1. Create System Role Enum Constraint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_system_role') THEN
    CREATE TYPE user_system_role AS ENUM ('admin', 'editor', 'member', 'viewer');
  END IF;
END $$;

-- 2. Extend Profiles / Users Table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS system_role user_system_role NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS role_title TEXT DEFAULT 'Software Developer',
  ADD COLUMN IF NOT EXISTS role_type TEXT NOT NULL DEFAULT 'developer' CHECK (role_type IN ('manager', 'developer')),
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Core Platform',
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'Active contributor in Cognitive Workspace pipelines.',
  ADD COLUMN IF NOT EXISTS accent_color VARCHAR(9) DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT 'from-blue-600 to-cyan-500',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT ARRAY['AI Systems', 'TypeScript']::TEXT[],
  ADD COLUMN IF NOT EXISTS assigned_projects TEXT[] DEFAULT ARRAY['Financial Document Intelligence']::TEXT[],
  ADD COLUMN IF NOT EXISTS joined_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS activity_log JSONB DEFAULT '[]'::jsonb;

-- 3. High Performance Indexing
CREATE INDEX IF NOT EXISTS idx_profiles_system_role ON public.profiles (system_role);
CREATE INDEX IF NOT EXISTS idx_profiles_role_type ON public.profiles (role_type);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles (department);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm ON public.profiles USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON public.profiles USING gin (full_name gin_trgm_ops);
```

### 2.2 Row Level Security (RLS) Policies

Ensure secure access boundaries:

```sql
-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Anyone authenticated can view active members list
CREATE POLICY "Allow authenticated read on profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Users can update their own personal settings (e.g., accent_color, full_name, bio)
CREATE POLICY "Allow users to update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Only Admins can update system_role on other members
CREATE POLICY "Allow admins to update system_role"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'admin'
    )
  );
```

---

## 3. API Endpoint Specifications

Base Path: `/api/v1` or `/api`  
Standard Headers: `Authorization: Bearer <SUPABASE_JWT_ACCESS_TOKEN>`, `Content-Type: application/json`

---

### Endpoint 1: Minimal Members List (Master View)
Returns a light, paginated list of members with only the essential fields needed for the master roster.

* **Method:** `GET`
* **Path:** `/api/members`
* **Query Parameters:**
  * `page` (integer, optional, default: `1`)
  * `limit` (integer, optional, default: `20`, max: `100`)
  * `role` (string, optional: `'admin' | 'editor' | 'member' | 'viewer' | 'manager' | 'developer'`)
  * `search` (string, optional, searches name, email, department, role title)
  * `sort` (string, optional, default: `created_at_desc`)

#### Success Response (`200 OK`)
```json
{
  "data": [
    {
      "id": "m-001",
      "name": "Dr. Sarah Chen",
      "email": "sarah.chen@cognitive.ai",
      "system_role": "Admin",
      "role_type": "manager",
      "role_title": "Head of Cognitive Architecture",
      "department": "Executive & AI Strategy",
      "avatar_color": "from-amber-500 to-rose-600",
      "status": "online",
      "active_tasks_count": 2,
      "total_tasks_count": 4
    },
    {
      "id": "d-002",
      "name": "Priya Sharma",
      "email": "priya.sharma@cognitive.ai",
      "system_role": "Member",
      "role_type": "developer",
      "role_title": "Fullstack Next.js & UI Engineer",
      "department": "Frontend Experience",
      "avatar_color": "from-emerald-500 to-teal-600",
      "status": "online",
      "active_tasks_count": 1,
      "total_tasks_count": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_records": 7,
    "total_pages": 1
  }
}
```

---

### Endpoint 2: Full Member Profile (Slide-out Detail Drawer)
Fetches comprehensive member metadata, assigned task portfolio, project assignments, and chronological activity logs.

* **Method:** `GET`
* **Path:** `/api/members/{id}`
* **Path Parameters:**
  * `id` (string, UUID or member identifier, e.g. `m-001`)

#### Success Response (`200 OK`)
```json
{
  "id": "m-001",
  "name": "Dr. Sarah Chen",
  "email": "sarah.chen@cognitive.ai",
  "system_role": "Admin",
  "role_type": "manager",
  "role_title": "Head of Cognitive Architecture",
  "department": "Executive & AI Strategy",
  "bio": "Pioneering state machine graph topologies for autonomous multi-agent cognition. Leads enterprise reasoning workflows and governance.",
  "avatar_color": "from-amber-500 to-rose-600",
  "status": "online",
  "joined_date": "2026-09-15T08:00:00Z",
  "created_at": "2026-09-15T08:00:00Z",
  "skills": [
    "LangGraph Orchestration",
    "Multi-Agent Topology",
    "System Design"
  ],
  "assigned_projects": [
    "Financial Document Intelligence",
    "Regulatory Web Scraper"
  ],
  "assigned_tasks": [
    {
      "id": "t-001",
      "project_name": "Financial Document Intelligence",
      "title": "Design cyclical LangGraph state transitions",
      "description": "Establish multi-agent message routing and dynamic branching for unstructured PDF extraction.",
      "stage": "in_progress",
      "priority": "high",
      "due_date": "2026-10-25",
      "descriptive_paths": [
        "backend/app/agents/graph.py",
        "backend/app/agents/state.py"
      ]
    }
  ],
  "activity_log": [
    {
      "id": "act-1",
      "action": "Approved architectural RFC for pgvector clustering",
      "timestamp": "2026-10-14T10:15:00Z",
      "details": "Reviewed index cardinality and cosine distance thresholds."
    },
    {
      "id": "act-2",
      "action": "Assigned Financial Document Intelligence pipeline tasks",
      "timestamp": "2026-10-12T14:30:00Z",
      "details": "Assigned tasks to Alex Rivera and David Kim."
    }
  ]
}
```

---

### Endpoint 3: Update Member Role Privileges
Allows authorized administrators to update a user's system role. Dispatches an audit entry into `activity_log`.

* **Method:** `PATCH`
* **Path:** `/api/members/{id}/role`
* **Path Parameters:**
  * `id` (string, required): Member identifier

#### Request Body Schema
```json
{
  "role": "Admin"
}
```
*Allowed values for `role`:* `"Admin"`, `"Editor"`, `"Member"`, `"Viewer"` (case-insensitive in backend parsing, stored normalized).

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "User role updated successfully.",
  "data": {
    "id": "d-001",
    "name": "Alex Rivera",
    "system_role": "Editor",
    "updated_at": "2026-10-15T06:30:00Z",
    "new_activity_item": {
      "id": "act-1729000000",
      "action": "Assigned role privilege: Editor",
      "timestamp": "2026-10-15T06:30:00Z",
      "details": "Privilege updated from Member to Editor by admin."
    }
  }
}
```

#### Error Responses
* `400 Bad Request`: `{ "error": "INVALID_ROLE", "message": "Role must be one of: Admin, Editor, Member, Viewer" }`
* `403 Forbidden`: `{ "error": "INSUFFICIENT_PERMISSIONS", "message": "Only Administrators can modify user system roles." }`
* `404 Not Found`: `{ "error": "MEMBER_NOT_FOUND", "message": "Member with ID d-001 does not exist." }`

---

### Endpoint 4: Persist User Preferences (Accent Color)
Saves the user's selected global accent color and workspace layout preferences.

* **Method:** `PUT`
* **Path:** `/api/user/settings`
* **Request Headers:** `Authorization: Bearer <JWT>`

#### Request Body Schema
```json
{
  "accent_color": "#10b981",
  "pref_view": "grid",
  "pref_sort": "newest"
}
```
*Validation:* `accent_color` must match regex `^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "User preferences saved successfully.",
  "data": {
    "user_id": "usr_998234",
    "accent_color": "#10b981",
    "pref_view": "grid",
    "pref_sort": "newest",
    "updated_at": "2026-10-15T06:35:00Z"
  }
}
```

---

## 4. Authentication Callback & Real-Time Sync Triggers

When a user signs up or signs in through Supabase Auth, they must immediately exist in the `public.profiles` table and be broadcasted to all connected clients.

### 4.1 Automatic Profile Ingestion (PostgreSQL Trigger)

Execute this trigger function on `auth.users`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
BEGIN
  -- Extract full name from raw metadata or derive from email
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    system_role,
    role_type,
    role_title,
    department,
    avatar_color,
    status,
    accent_color,
    joined_date,
    activity_log
  ) VALUES (
    NEW.id,
    NEW.email,
    extracted_name,
    'member',
    'developer',
    'Active Workspace Contributor',
    'Core Platform',
    'from-indigo-600 via-purple-600 to-pink-500',
    'online',
    '#6366f1',
    NOW(),
    jsonb_build_array(
      jsonb_build_object(
        'id', 'act-' || extract(epoch from now())::text,
        'action', 'User registered and authenticated',
        'timestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'details', 'Account initialized via authentication callback.'
      )
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'online',
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
```

### 4.2 Supabase Realtime Channel Publication

To enable the frontend to receive zero-latency updates when members sign in or roles change:

```sql
-- Enable replication on public.profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
```

#### Frontend Subscription Contract:
The frontend listens to events on channel:
```typescript
const channel = supabase
  .channel("workspace:members")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "profiles" },
    (payload) => {
      // payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      // payload.new contains the updated/created profile record
    }
  )
  .subscribe();
```

---

## 5. Pydantic Schemas for FastAPI Implementation

Backend engineers can drop the following Pydantic models directly into `backend/app/api/schemas/members.py`:

```python
from enum import Enum
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr

class SystemRoleEnum(str, Enum):
    ADMIN = "Admin"
    EDITOR = "Editor"
    MEMBER = "Member"
    VIEWER = "Viewer"

class RoleTypeEnum(str, Enum):
    MANAGER = "manager"
    DEVELOPER = "developer"

class ActivityLogItem(BaseModel):
    id: str
    action: str
    timestamp: str
    details: Optional[str] = None

class MemberListResponseItem(BaseModel):
    id: str
    name: str
    email: EmailStr
    system_role: SystemRoleEnum
    role_type: RoleTypeEnum
    role_title: str
    department: str
    avatar_color: str
    status: str
    active_tasks_count: int = 0
    total_tasks_count: int = 0

class MemberDetailResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    system_role: SystemRoleEnum
    role_type: RoleTypeEnum
    role_title: str
    department: str
    bio: Optional[str] = None
    avatar_color: str
    status: str
    joined_date: str
    created_at: str
    skills: List[str] = []
    assigned_projects: List[str] = []
    assigned_tasks: List[dict] = []
    activity_log: List[ActivityLogItem] = []

class UpdateRoleRequest(BaseModel):
    role: SystemRoleEnum

class UserSettingsUpdateRequest(BaseModel):
    accent_color: str = Field(..., pattern=r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
    pref_view: Optional[str] = "grid"
    pref_sort: Optional[str] = "newest"
```

---

## 6. Verification & Acceptance Checklist

| Requirement | Acceptance Criteria | Backend Verification Step |
|---|---|---|
| **Clean List View** | `/api/members` returns minimal fields within 50ms | `curl -X GET /api/members?page=1&limit=20` |
| **Drawer Details** | `/api/members/:id` returns bio, skills, assigned tasks & activity logs | `curl -X GET /api/members/m-001` |
| **Role Assignment** | Role updates persist, enforce RBAC, append activity audit log | `curl -X PATCH /api/members/d-001/role -d '{"role":"Admin"}'` |
| **Accent Color** | User preference persists in `profiles.accent_color` | `curl -X PUT /api/user/settings -d '{"accent_color":"#10b981"}'` |
| **Live Sign-In** | Ingestion trigger adds row to `profiles` on auth signup | Insert test user into `auth.users` and check `profiles` |
