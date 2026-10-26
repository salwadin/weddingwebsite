import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Keeps the Supabase Auth session fresh: Server Components can read cookies but
 * not write them, so expired access tokens are refreshed here, before rendering.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  // The iOS and Android apps open on sign-in (or the account's home), not the marketing
  // and pricing pages: the apps can't offer plans for sale (lib/native.ts).
  if ((request.headers.get("user-agent") ?? "").includes("QuboolApp") && ["/", "/pricing"].includes(request.nextUrl.pathname)) {
    const home = !user ? "/login" : user.user_metadata?.kind === "vendor" ? "/vendor" : "/dashboard";
    return NextResponse.redirect(new URL(home, request.url));
  }
  return response;
}

export const config = {
  // Paths that can carry an organizer or vendor session, and the apps' start page.
  matcher: ["/", "/pricing", "/dashboard/:path*", "/onboarding", "/account/:path*", "/vendor", "/marketplace/:path*", "/w/:path*", "/login", "/reset-password"],
};
