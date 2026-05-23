import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";

const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
];

const PROTECTED_PAGES = [
  "/dashboard",
  "/stock",
  "/ventes",
  "/historique",
  "/reappro",
  "/fournisseurs",
  "/rapports",
  "/parametres",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Protéger les pages principales ─────────────────────────────────────────
  if (PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    const payload = await verifyAccessToken(token);
    if (!payload) {
      const res = NextResponse.redirect(new URL("/", req.url));
      res.cookies.delete("access_token");
      res.cookies.delete("refresh_token");
      return res;
    }
    return NextResponse.next();
  }

  // ── Protéger les routes API (sauf publiques) ────────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ??
      req.cookies.get("access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Token invalide ou expiré" },
        { status: 401 }
      );
    }

    // Injecter l'utilisateur dans les headers pour les route handlers
    const headers = new Headers(req.headers);
    headers.set("x-user-id", payload.userId);
    headers.set("x-user-role", payload.role);
    headers.set("x-pharmacie-id", payload.pharmacieId);
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/stock/:path*",
    "/ventes/:path*",
    "/historique/:path*",
    "/reappro/:path*",
    "/fournisseurs/:path*",
    "/rapports/:path*",
    "/parametres/:path*",
    "/api/:path*",
  ],
};
