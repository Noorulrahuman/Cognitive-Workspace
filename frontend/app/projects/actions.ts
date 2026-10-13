"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

/* ==========================================================================
 * Project Server Actions (create, list, update, delete)
 *
 * - Runs only on the server.
 * - Uses the signed-in user's own Supabase session, so the database rules
 *   (RLS) decide what that user can see or change.
 * - Every input is checked before it reaches the database.
 * - Every action returns { success: true, data } or { success: false, error }.
 * ========================================================================== */

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ProjectRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  source_url: string | null;
  documents_count: number;
  status: string;
  created_at: string;
};

export type ProjectInput = {
  name: string;
  description: string;
  category: string;
  tags: string[];
  source_url?: string | null;
};

// ----- Validation -----

type Checked =
  | { ok: true; value: Omit<ProjectInput, "source_url"> & { source_url: string | null } }
  | { ok: false; error: string };

function checkProjectInput(input: ProjectInput): Checked {
  const name = (input.name ?? "").trim();
  const description = (input.description ?? "").trim();
  const category = (input.category ?? "").trim();
  const sourceUrl = (input.source_url ?? "").trim();
  const tags = Array.isArray(input.tags)
    ? input.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  if (name.length < 3 || name.length > 100) {
    return { ok: false, error: "Project name must be 3 to 100 characters." };
  }
  if (description.length > 500) {
    return { ok: false, error: "Description must be 500 characters or fewer." };
  }
  if (!category || category.length > 50) {
    return { ok: false, error: "Please choose a category." };
  }
  if (tags.length > 10 || tags.some((t) => t.length > 30)) {
    return { ok: false, error: "Use at most 10 tags, each up to 30 characters." };
  }
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
    return { ok: false, error: "The link must start with http:// or https://" };
  }

  return {
    ok: true,
    value: { name, description, category, tags, source_url: sourceUrl || null },
  };
}

// ----- Helper: who is signed in? -----

async function getSignedInUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

const NOT_SIGNED_IN = "Please sign in to continue.";

// ----- 1. List -----

export async function listProjects(): Promise<ActionResult<ProjectRow[]>> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN };

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: "Could not load your projects." };
  return { success: true, data: (data ?? []) as ProjectRow[] };
}

// ----- 2. Create -----

export async function createProject(input: ProjectInput): Promise<ActionResult<ProjectRow>> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN };

  const checked = checkProjectInput(input);
  if (!checked.ok) return { success: false, error: checked.error };

  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...checked.value,
      user_id: user.id, // owner of the project
      title: checked.value.name, // TEMPORARY: the table also has a required "title" column
      documents_count: 0,
      status: "Active",
    })
    .select()
    .single();

  if (error) {
    console.error("createProject failed:", error.message);
    return {
      success: false,
      error: error.code === "23505" ? "A project with this name already exists." : "Could not create the project.",
    };
  }

  revalidatePath("/projects");
  return { success: true, data: data as ProjectRow };
}

// ----- 3. Update (the name cannot change, tasks are linked by name) -----

export async function updateProject(
  id: string,
  input: ProjectInput
): Promise<ActionResult<ProjectRow>> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN };
  if (!id) return { success: false, error: "Missing project id." };

  const checked = checkProjectInput(input);
  if (!checked.ok) return { success: false, error: checked.error };

  const { description, category, tags, source_url } = checked.value;
  const { data, error } = await supabase
    .from("projects")
    .update({ description, category, tags, source_url })
    .eq("id", id)
    .select();

  if (error) return { success: false, error: "Could not update the project." };
  // No row came back: it does not exist, or it belongs to someone else (RLS)
  if (!data || data.length === 0) {
    return { success: false, error: "Project not found, or you do not have permission." };
  }

  revalidatePath("/projects");
  return { success: true, data: data[0] as ProjectRow };
}

// ----- 4. Delete -----

export async function deleteProject(id: string): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await getSignedInUser();
  if (!user) return { success: false, error: NOT_SIGNED_IN };
  if (!id) return { success: false, error: "Missing project id." };

  const { data, error } = await supabase.from("projects").delete().eq("id", id).select("id");

  if (error) return { success: false, error: "Could not delete the project." };
  if (!data || data.length === 0) {
    return { success: false, error: "Project not found, or you do not have permission." };
  }

  revalidatePath("/projects");
  return { success: true, data: { id } };
}