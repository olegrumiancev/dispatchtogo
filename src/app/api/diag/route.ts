import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const test = url.searchParams.get('test') || 'default';
  const results: Record<string, any> = {};

  if (test === 'columns') {
    const table = url.searchParams.get('table') || 'VendorCredential';
    try {
      const cols = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, table);
      results.table = table;
      results.columns = cols;
    } catch (e: any) {
      results.error = e.message.substring(0, 500);
    }
  } else if (test === 'vendor-profile') {
    const vendorId = 'cmm6kmrmj0000kw04ctirr86e';
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          skills: true,
          credentials: { orderBy: { type: 'asc' } },
        },
      });
      results.vendor = vendor ? { id: vendor.id, companyName: vendor.companyName } : null;
    } catch (e: any) {
      results.vendorError = e.message.substring(0, 500);
    }
  } else {
    results.status = 'ok';
    try {
      const user = await prisma.user.findUnique({ where: { email: 'testvendor2@dispatchtogo.com' } });
      results.userQuery = user ? `${user.email} role=${user.role}` : 'not found';
    } catch (e: any) {
      results.error = e.message.substring(0, 500);
    }
  }

  return NextResponse.json(results);
}
