import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const weekId = req.nextUrl.searchParams.get("weekId");

  if (!weekId) {
    return NextResponse.json({ error: "weekId 필요" }, { status: 400 });
  }

  const week = await prisma.week.findUnique({
    where: { id: parseInt(weekId) },
    include: { tasks: true },
  });

  if (!week) {
    return NextResponse.json({ error: "데이터 없음" }, { status: 404 });
  }

  const tasks = week.tasks;
  const totalTarget = tasks.reduce((s, t) => s + t.targetCount, 0);
  const totalCompleted = tasks.reduce((s, t) => s + t.completedCount, 0);
  const overallRate = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  // Group by field
  const fields = ["환경", "안전", "소방", "훈련"];
  const fieldSummary = fields.map((f) => {
    const ft = tasks.filter((t) => t.field === f);
    const target = ft.reduce((s, t) => s + t.targetCount, 0);
    const completed = ft.reduce((s, t) => s + t.completedCount, 0);
    const rate = target > 0 ? Math.round((completed / target) * 100) : 0;
    return {
      field: f,
      taskCount: ft.length,
      targetCount: target,
      completedCount: completed,
      achievementRate: rate,
      statuses: {
        완료: ft.filter((t) => t.status === "완료").length,
        진행중: ft.filter((t) => t.status === "진행중").length,
        지연: ft.filter((t) => t.status === "지연").length,
        대기: ft.filter((t) => t.status === "대기").length,
      },
    };
  });

  // Status distribution
  const statusDist = {
    완료: tasks.filter((t) => t.status === "완료").length,
    진행중: tasks.filter((t) => t.status === "진행중").length,
    지연: tasks.filter((t) => t.status === "지연").length,
    대기: tasks.filter((t) => t.status === "대기").length,
  };

  // Category summary
  const categories = [...new Set(tasks.map((t) => t.category))].filter(Boolean);
  const categorySummary = categories.map((c) => {
    const ct = tasks.filter((t) => t.category === c);
    const target = ct.reduce((s, t) => s + t.targetCount, 0);
    const completed = ct.reduce((s, t) => s + t.completedCount, 0);
    const rate = target > 0 ? Math.round((completed / target) * 100) : 0;
    return { category: c, taskCount: ct.length, targetCount: target, completedCount: completed, achievementRate: rate };
  });

  return NextResponse.json({
    weekLabel: week.weekLabel,
    periodStart: week.periodStart,
    periodEnd: week.periodEnd,
    totalTarget,
    totalCompleted,
    overallRate,
    taskCount: tasks.length,
    fieldSummary,
    statusDist,
    categorySummary,
  });
}
