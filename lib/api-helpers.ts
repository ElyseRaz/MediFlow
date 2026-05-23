import { NextRequest, NextResponse } from "next/server";

export type AuthUser = {
  userId: string;
  role: string;
  pharmacieId: string;
};

/** Lit l'utilisateur injecté par le middleware dans les headers. */
export function getAuthUser(req: NextRequest): AuthUser | null {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");
  const pharmacieId = req.headers.get("x-pharmacie-id");
  if (!userId || !role || !pharmacieId) return null;
  return { userId, role, pharmacieId };
}

export const ok = (data: unknown, status = 200) =>
  NextResponse.json(data, { status });

export const created = (data: unknown) =>
  NextResponse.json(data, { status: 201 });

export const unauthorized = (msg = "Non autorisé") =>
  NextResponse.json({ error: msg }, { status: 401 });

export const forbidden = (msg = "Accès refusé — rôle admin requis") =>
  NextResponse.json({ error: msg }, { status: 403 });

export const notFound = (msg = "Ressource introuvable") =>
  NextResponse.json({ error: msg }, { status: 404 });

export const badRequest = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 400 });

export const serverError = (msg = "Erreur serveur interne") =>
  NextResponse.json({ error: msg }, { status: 500 });

/** Retourne un 403 si l'utilisateur n'est pas admin, sinon null. */
export function requireAdmin(user: AuthUser | null): NextResponse | null {
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  return null;
}

/** Parse page / limit depuis les searchParams avec des valeurs par défaut. */
export function parsePagination(url: URL, defaultLimit = 20) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? String(defaultLimit)))
  );
  return { page, limit, skip: (page - 1) * limit };
}
