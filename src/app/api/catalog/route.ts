import { NextResponse } from "next/server";
import { getCatalogOptions } from "@/lib/catalog";

export async function GET() {
  const catalog = await getCatalogOptions();
  return NextResponse.json(catalog);
}
