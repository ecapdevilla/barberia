import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Subdominios: acme.barberia.com -> cookie org_slug=acme
// El app resuelve el slug a organizacion despues del login.
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  // Extraer subdominio (ignorar www, app, localhost, vercel preview)
  const parts = host.split(".");
  let subdomain: string | null = null;
  if (parts.length >= 3 && !host.includes("localhost") && !host.includes("vercel.app")) {
    const first = parts[0].toLowerCase();
    if (first && first !== "www" && first !== "app" && first !== "api") {
      subdomain = first;
    }
  }

  const res = NextResponse.next();
  if (subdomain) {
    res.cookies.set("org_slug", subdomain, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
  } else {
    // limpiar si no hay subdominio
    res.cookies.delete("org_slug");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
