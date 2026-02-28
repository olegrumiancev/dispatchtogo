import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: Record<string, any> = {};
  const orgId = "cmm6kmr0v0000l104zdrtb4bv";

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    results.org = org;
  } catch (e: any) {
    results.orgError = e.message;
  }

  try {
    const count = await prisma.serviceRequest.count({
      where: {
        organizationId: orgId,
        status: { notIn: ["COMPLETED", "VERIFIED", "CANCELLED"] },
      },
    });
    results.openRequests = count;
  } catch (e: any) {
    results.openRequestsError = e.message;
  }

  try {
    const count = await prisma.serviceRequest.count({
      where: { organizationId: orgId, status: "IN_PROGRESS" },
    });
    results.inProgress = count;
  } catch (e: any) {
    results.inProgressError = e.message;
  }

  try {
    const reqs = await prisma.serviceRequest.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { property: { select: { name: true } } },
    });
    results.recentRequests = reqs.length;
    if (reqs.length > 0) {
      results.sampleRequest = {
        id: reqs[0].id,
        status: reqs[0].status,
        urgency: reqs[0].urgency,
        category: reqs[0].category,
      };
    }
  } catch (e: any) {
    results.recentRequestsError = e.message;
  }

  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completed = await prisma.serviceRequest.count({
      where: {
        organizationId: orgId,
        status: { in: ["COMPLETED", "VERIFIED"] },
        resolvedAt: { gte: firstOfMonth },
      },
    });
    results.completedThisMonth = completed;
  } catch (e: any) {
    results.completedError = e.message;
  }

  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedForAvg = await prisma.serviceRequest.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["COMPLETED", "VERIFIED"] },
        resolvedAt: { gte: firstOfMonth },
        createdAt: { not: undefined },
      },
      select: { createdAt: true, resolvedAt: true },
    });
    results.completedForAvg = completedForAvg.length;
  } catch (e: any) {
    results.completedForAvgError = e.message;
  }

  return NextResponse.json(results);
}
