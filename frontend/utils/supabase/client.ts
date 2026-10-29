import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let clientInstance: any = null;

export const createClient = <Schema = any>(): ReturnType<typeof createBrowserClient<Schema>> => {
  if (typeof window === "undefined") {
    return createBrowserClient<Schema>(supabaseUrl || "", supabaseKey || "");
  }

  if (!clientInstance) {
    clientInstance = createBrowserClient<Schema>(
      supabaseUrl || "",
      supabaseKey || ""
    );
  }
  return clientInstance;
};