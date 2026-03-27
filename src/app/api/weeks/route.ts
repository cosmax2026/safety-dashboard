import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const weeks = await prisma.week.findMany({
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      weekLabel: true,
      periodStart: true,
      periodEnd: true,
      uploadedAt: true,
      filename: true,
      _count: { select: { tasks: true } },
    },
  });
  return NextResponse.json(weeks);
}
