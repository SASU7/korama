import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export const PATHNAME_HEADER = "x-korama-pathname";

/** Paths that always require a signed-in user. */
const PROTECTED = ["/account", "/admin", "/checkout", "/operations", "/compliance", "/delivery"];

export async function updateSession(request: NextRequest) {
  // Server layouts cannot read the request path, but a group layout needs it
  // to build an accurate ?next= for the sign-in redirect. Carry it through.
  request.headers.set(PATHNAME_HEADER, request.nextUrl.pathname);

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const { data: claims } = await supabase.auth.getClaims();

  // Redirect unauthenticated visitors before anything renders. Without this
  // the storefront shell streams first and Next can only fall back to a
  // meta-refresh, which costs the user a second.
  //
  // This is a speed and UX fix, not the security boundary: every protected
  // page still asserts auth and role for itself in a server component,
  // because middleware does not run on every client-side navigation.
  if (!claims && PROTECTED.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    const signIn = new URL("/auth/sign-in", request.url);
    signIn.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  return response;
}
