import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import { getStoreId } from "@/lib/env";

type StoreRole = "owner" | "manager" | "staff";

function roleCanAccess(role: StoreRole | null, pathname: string) {
  if (pathname.startsWith("/team")) return role === "owner";
  if (pathname.startsWith("/catalog") || pathname.startsWith("/pricing") || pathname.startsWith("/production")) return role === "owner" || role === "manager";
  return true;
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

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthRoute = request.nextUrl.pathname === "/login";

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