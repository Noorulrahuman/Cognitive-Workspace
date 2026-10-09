import { redirect } from "next/navigation";

// The tasks workspace is now strictly accessed under each project:
// Route: /projects/[id]/tasks
export default function TasksRedirectPage() {
  redirect("/projects");
}
