import { SupabaseClient } from "@supabase/supabase-js";
import {
  Database,
  ProjectRow,
  ProjectInsert,
  ProjectUpdate,
  TaskRow,
  TaskInsert,
  TaskUpdate,
} from "../../types/supabase";

// ==============================================================================
// TYPED CRUD HELPERS: PROJECTS
// ==============================================================================

/**
 * Retrieve all projects for the authenticated user, or optionally filtered by userId.
 */
export async function getProjects(
  supabase: SupabaseClient<Database>,
  userId?: string
): Promise<ProjectRow[]> {
  let query = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Retrieve a specific project by UUID.
 */
export async function getProjectById(
  supabase: SupabaseClient<Database>,
  projectId: string
): Promise<ProjectRow | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Record not found
    throw new Error(`Failed to fetch project ${projectId}: ${error.message}`);
  }
  return data;
}

/**
 * Create a new project row in Supabase.
 */
export async function createProject(
  supabase: SupabaseClient<Database>,
  payload: ProjectInsert
): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }
  return data;
}

/**
 * Update an existing project row.
 */
export async function updateProject(
  supabase: SupabaseClient<Database>,
  projectId: string,
  updates: ProjectUpdate
): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update project ${projectId}: ${error.message}`);
  }
  return data;
}

/**
 * Delete a project by UUID.
 */
export async function deleteProject(
  supabase: SupabaseClient<Database>,
  projectId: string
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    throw new Error(`Failed to delete project ${projectId}: ${error.message}`);
  }
}

// ==============================================================================
// TYPED CRUD HELPERS: TASKS
// ==============================================================================

/**
 * Retrieve tasks, optionally filtered by project_id or user_id.
 */
export async function getTasks(
  supabase: SupabaseClient<Database>,
  projectId?: string,
  userId?: string
): Promise<TaskRow[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Retrieve a single task by UUID.
 */
export async function getTaskById(
  supabase: SupabaseClient<Database>,
  taskId: string
): Promise<TaskRow | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch task ${taskId}: ${error.message}`);
  }
  return data;
}

/**
 * Create a new task row in Supabase.
 */
export async function createTask(
  supabase: SupabaseClient<Database>,
  payload: TaskInsert
): Promise<TaskRow> {
  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }
  return data;
}

/**
 * Update an existing task row.
 */
export async function updateTask(
  supabase: SupabaseClient<Database>,
  taskId: string,
  updates: TaskUpdate
): Promise<TaskRow> {
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update task ${taskId}: ${error.message}`);
  }
  return data;
}

/**
 * Delete a task by UUID.
 */
export async function deleteTask(
  supabase: SupabaseClient<Database>,
  taskId: string
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    throw new Error(`Failed to delete task ${taskId}: ${error.message}`);
  }
}
