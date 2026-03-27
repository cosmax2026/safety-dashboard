import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  const { weekId } = await params;
  const id = parseInt(weekId);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid weekId" }, { status: 400 });
  }

  await prisma.week.delete({ where: { id } });
  return NextResponse.json({ message: "삭제 완료" });
}
