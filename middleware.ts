import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/artisan/dashboard", "/admin", "/booking"];
const ADMIN_ONLY = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Admin check — email whitelist, phone whitelist, or role in user_metadata
  if (ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    const adminEmails = (process.env.ADMIN_EMAIL_WHITELIST ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const adminPhones = (process.env.ADMIN_PHONE_WHITELIST ?? "").split(",").map((p) => p.trim()).filter(Boolean);
    const isAdmin =
      user.user_metadata?.role === "admin" ||
      (adminEmails.length > 0 && adminEmails.includes((user.email ?? "").toLowerCase())) ||
      (adminPhones.length > 0 && adminPhones.includes(user.phone ?? ""));
    if (!isAdmin) return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/artisan/dashboard/:path*", "/admin/:path*", "/booking/:path*"],
};
