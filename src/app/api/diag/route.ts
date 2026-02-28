import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const test = url.searchParams.get('test') || 'default';
  const results: Record<string, any> = {};

  if (test === 'vendor-profile') {
    const vendorId = 'cmm6kmrmj0000kw04ctirr86e';
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          skills: true,
          credentials: { orderBy: { type: 'asc' } },
        },
      });
      results.vendor = vendor ? { id: vendor.id, companyName: vendor.companyName, skillCount: vendor.skills.length, credCount: vendor.credentials.length } : null;
    } catch (e: any) {
      results.vendorError = e.message.substring(0, 500);
    }

    try {
      const totalJobs = await prisma.job.count({ where: { vendorId } });
      results.totalJobs = totalJobs;
    } catch (e: any) {
      results.totalJobsError = e.message.substring(0, 500);
    }

    try {
      const completedJobs = await prisma.job.count({ where: { vendorId, completedAt: { not: null } } });
      results.completedJobs = completedJobs;
    } catch (e: any) {
      results.completedJobsError = e.message.substring(0, 500);
    }
  } else {
    // Default: check DB health
    try {
      const colTypes = await prisma.$queryRawUnsafe(`
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type = 'USER-DEFINED'
        ORDER BY table_name
      `) as any[];
      results.remainingEnumColumns = colTypes.length;
    } catch (e: any) {
      results.error = e.message.substring(0, 500);
    }

    try {
      const user = await prisma.user.findUnique({ where: { email: 'testvendor2@dispatchtogo.com' } });
      results.userQuery = user ? `${user.email} role=${user.role}` : 'not found';
    } catch (e: any) {
      results.userQueryError = e.message.substring(0, 500);
    }
  }

  return NextResponse.json(results);
}
