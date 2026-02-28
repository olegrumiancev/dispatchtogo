import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Temporary debug endpoint - DELETE AFTER USE
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (token !== "dtg-debug-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // Test 1: List existing tables/columns
  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `) as any[];
    results.tables = tables.map((t: any) => t.table_name);
  } catch (e: any) {
    results.tables_error = e.message;
  }

  // Test 2: Organization columns
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'Organization' ORDER BY ordinal_position
    `) as any[];
    results.organization_columns = cols;
  } catch (e: any) {
    results.org_error = e.message;
  }

  // Test 3: Vendor columns
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'Vendor' ORDER BY ordinal_position
    `) as any[];
    results.vendor_columns = cols;
  } catch (e: any) {
    results.vendor_error = e.message;
  }

  // Test 4: User columns
  try {
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'User' ORDER BY ordinal_position
    `) as any[];
    results.user_columns = cols;
  } catch (e: any) {
    results.user_error = e.message;
  }

  // Test 5: Try creating an Organization
  try {
    const org = await prisma.organization.create({
      data: {
        name: "Debug Test Org",
        contactEmail: "debug@test.com",
      },
    });
    results.org_create = org;
    // Clean up
    await prisma.organization.delete({ where: { id: org.id } });
    results.org_create_success = true;
  } catch (e: any) {
    results.org_create_error = e.message;
  }

  // Test 6: Try creating a Vendor
  try {
    const vendor = await prisma.vendor.create({
      data: {
        companyName: "Debug Vendor",
        contactName: "Debug",
        email: "debug_vendor_" + Date.now() + "@test.com",
        phone: "555-0000",
      },
    });
    results.vendor_create = vendor;
    // Clean up
    await prisma.vendor.delete({ where: { id: vendor.id } });
    results.vendor_create_success = true;
  } catch (e: any) {
    results.vendor_create_error = e.message;
  }

  return NextResponse.json(results, { status: 200 });
}
