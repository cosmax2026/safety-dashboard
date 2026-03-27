import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const weekId = sp.get("weekId");
  const field = sp.get("field");
  const status = sp.get("status");

  if (!weekId) {
    return NextResponse.json({ error: "weekId 필요" }, { status: 400 });
  }

  const where: Record<string, unknown> = { weekId: parseInt(weekId) };
  if (field) where.field = field;
  if (status) where.status = status;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ field: "asc" }, { id: "asc" }],
  });

  return NextResponse.json(tasks);
}
