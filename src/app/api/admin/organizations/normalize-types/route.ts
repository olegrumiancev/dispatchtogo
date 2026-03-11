import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrganizationTypes } from "@/lib/catalog";

/**
 * POST /api/admin/organizations/normalize-types
 * One-time migration: normalises any non-standard type values
 * (e.g. "Hotel" -> "HOTEL", "Campground" -> "CAMPGROUND", "operator" -> "OTHER")
 */
export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedTypes = new Set<string>((await getOrganizationTypes()).map((t) => t.value));

  const orgs = await prisma.organization.findMany({
    select: { id: true, type: true },
  });

  let fixed = 0;
  for (const org of orgs) {
    const upper = org.type.toUpperCase();
    if (org.type !== upper || !allowedTypes.has(upper)) {
      const newType = allowedTypes.has(upper) ? upper : "OTHER";
      if (newType !== org.type) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { type: newType },
        });
        fixed++;
      }
    }
  }

  return NextResponse.json({ total: orgs.length, fixed });
}
