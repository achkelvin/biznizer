import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import { getStoreId } from "@/lib/env";

type StoreRole = "owner" | "manager" | "staff";

function roleCanAccess(role: StoreRole | null, pathname: string) {
  if (pathname.startsWith("/team")) return role === "owner";
  if (pathname.startsWith("/catalog") || pathname.startsWith("/pricing") || pathname.startsWith("/production") || pathname.startsWith("/inventory")) return role === "owner" || role === "manager";
  return true;
}

function clearAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-") || cookie.name.includes("supabase") || cookie.name.includes("auth-token")) {
      response.cookies.delete(cookie.name);
    }
  });
}

function isStaleSessionError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String((error as { message?: string }).message ?? "").toLowerCase() : "";
  return ["refresh token", "invalid refresh", "invalid token", "session not found", "jwt", "token expired", "auth session"].some((needle) => message.includes(needle));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getPublicEnv();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const isAuthRoute = request.nextUrl.pathname === "/login";

  if (userError && isStaleSessionError(userError)) {
    clearAuthCookies(request, response);
    if (!isAuthRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  if (!user && !isAuthRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/pos", request.url));
  }

  if (user && !isAuthRoute) {
    const storeId = getStoreId();
    let role: StoreRole | null = null;
    if (storeId) {
      const { data: roleFromDatabase } = await supabase.rpc("store_member_role", { target_store_id: storeId });
      if (roleFromDatabase === "owner" || roleFromDatabase === "manager" || roleFromDatabase === "staff") role = roleFromDatabase;
    }

    if (!roleCanAccess(role, request.nextUrl.pathname)) {
      const allowedUrl = new URL("/pos", request.url);
      allowedUrl.searchParams.set("access", "restricted");
      return NextResponse.redirect(allowedUrl);
    }
  }

  return response;
}