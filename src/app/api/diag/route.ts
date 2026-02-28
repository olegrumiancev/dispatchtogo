import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // Check column types
    const colTypes = await prisma.$queryRawUnsafe(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name IN ('role', 'type', 'status', 'urgency')
      ORDER BY table_name, column_name
    `);
    results.columnTypes = colTypes;
  } catch (e: any) {
    results.columnTypesError = e.message;
  }

  try {
    // Check if old enum types still exist
    const enumTypes = await prisma.$queryRawUnsafe(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY t.typname, e.enumsortorder
    `);
    results.existingEnums = enumTypes;
  } catch (e: any) {
    results.existingEnumsError = e.message;
  }

  try {
    // Sample user roles
    const users = await prisma.$queryRawUnsafe(`
      SELECT id, email, role, pg_typeof(role) as role_type FROM "User" LIMIT 5
    `);
    results.sampleUsers = users;
  } catch (e: any) {
    results.sampleUsersError = e.message;
  }

  return NextResponse.json(results);
}
