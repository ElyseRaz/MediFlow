import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAdmin } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  const err = requireAdmin(user);
  if (err) return err;

  return NextResponse.json(
    { error: "Export PDF non disponible. Utilisez le format CSV (/api/rapports/export/csv)." },
    { status: 501 }
  );
}
