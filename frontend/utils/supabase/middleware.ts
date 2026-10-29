import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function updateSession(request: NextRequest) {
  // If Supabase credentials are not configured, pass through immediately
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  // Fast bypass for Next.js internal prefetch requests (link hovering, RSC prefetch)
  const isPrefetch =
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-purpose") === "prefetch" ||
    request.headers.get("next-router-prefetch") === "1";

  // Check if any Supabase auth cookies are present in the request
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  // If there are no auth cookies or this is a background prefetch,
  // skip the external Supabase server round-trip to guarantee sub-50ms TTFB
  if (!hasAuthCookie || isPrefetch) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Safe non-blocking session check
  try {
    await supabase.auth.getUser();
  } catch {
    // If Supabase network check fails or times out, allow page navigation to proceed
  }

  return supabaseResponse;
}

export const createClient = (request: NextRequest) => {
  return updateSession(request);
};