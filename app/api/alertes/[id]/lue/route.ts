import { NextRequest } from "next/server";
import { getAuthUser, ok, unauthorized } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return unauthorized();
  return ok({ message: "Alerte marquée comme lue." });
}
