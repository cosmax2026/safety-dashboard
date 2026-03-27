import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseExcel } from "@/lib/excel-parser";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseExcel(buffer);

    // Delete existing week with same label (upsert behavior)
    await prisma.week.deleteMany({ where: { weekLabel: parsed.weekLabel } });

    const week = await prisma.week.create({
      data: {
        weekLabel: parsed.weekLabel,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        filename: file.name,
        tasks: {
          create: parsed.tasks,
        },
      },
      include: { tasks: true },
    });

    return NextResponse.json({
      message: `${parsed.weekLabel} 주차 데이터 업로드 완료 (${parsed.tasks.length}건)`,
      week,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "업로드 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
