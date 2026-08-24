import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/setup-account",
  "/auth/callback",
  "/supabase-check",
  "/mitgliedschaft",
  "/mitgliedschaft/ausstehend",
  "/gesperrt",
  "/documents",
  "/api/membership",
  "/api/cron",
  "/live/host",
  "/api/live/host-token",
  "/api/live/host-feed",
  "/api/live/host-dismiss-question",
  "/api/live/host-end",
  "/besprechung/einladung",
  "/api/besprechung/token",
  "/api/besprechung/agenda",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function createProxySupabase(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, getResponse: () => response };
}

function isServerActionRequest(request: NextRequest) {
  return request.headers.has("next-action") || request.headers.has("Next-Action");
}

/** Supabase Auth-Cookies — ohne sie ist getUser() nur unnötige Edge-CPU. */
function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((c) => {
    const n = c.name;
    return n.startsWith("sb-") && n.includes("auth-token");
  });
}

function redirectPreservingCookies(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string,
  search?: Record<string, string>,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (search) {
    for (const [key, value] of Object.entries(search)) {
      url.searchParams.set(key, value);
    }
  }
  const redirectResponse = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Speichern/Server Actions: Session ggf. refreshen, keine Membership-Redirects
  // (sonst fliegt die Session nach abgelaufenem Access-Token weg).
  if (isServerActionRequest(request)) {
    if (!hasSupabaseAuthCookie(request)) {
      return NextResponse.next({ request });
    }
    const { supabase, getResponse } = createProxySupabase(request);
    await supabase.auth.getUser();
    return getResponse();
  }

  // Öffentliche Pfade: ohne Session-Cookie kein Auth-Netzwerkaufruf
  // (Bots/Crawler/Login-Landing verbrauchen sonst unnötig Fluid CPU).
  if (isPublicPath(pathname)) {
    if (!hasSupabaseAuthCookie(request)) {
      return NextResponse.next({ request });
    }
    const { supabase, getResponse } = createProxySupabase(request);
    await supabase.auth.getUser();
    return getResponse();
  }

  // API-Routen: nur Session-Refresh. Auth/Berechtigung prüft der Handler selbst.
  // Spart Profile- + Membership-Queries bei Polling (Attendance, Host-Feed, …).
  if (pathname.startsWith("/api/")) {
    if (!hasSupabaseAuthCookie(request)) {
      return NextResponse.next({ request });
    }
    const { supabase, getResponse } = createProxySupabase(request);
    await supabase.auth.getUser();
    return getResponse();
  }

  const { supabase, getResponse } = createProxySupabase(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectPreservingCookies(request, getResponse(), "/login", { next: pathname });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    const { data: membership } = await supabase
      .from("memberships")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membership?.status === "applied") {
      const pendingPath = "/mitgliedschaft/ausstehend";
      if (pathname !== pendingPath) {
        return redirectPreservingCookies(request, getResponse(), pendingPath);
      }
    }

    if (membership?.status === "suspended") {
      const allowedWhenSuspended = pathname === "/gesperrt";
      if (!allowedWhenSuspended) {
        return redirectPreservingCookies(request, getResponse(), "/gesperrt");
      }
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (profile?.role !== "admin") {
      return redirectPreservingCookies(request, getResponse(), "/dashboard");
    }
  }

  return getResponse();
}

export const config = {
  matcher: [
    /*
     * Auth/Gate nur für App-Routen — keine Static Assets, Manifest, Robots.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
