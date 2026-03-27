import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const weeks = await prisma.week.findMany({
    orderBy: { id: "asc" },
    include: { tasks: true },
  });

  const trends = weeks.map((w) => {
    const tasks = w.tasks;
    const totalTarget = tasks.reduce((s, t) => s + t.targetCount, 0);
    const totalCompleted = tasks.reduce((s, t) => s + t.completedCount, 0);
    const overallRate = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

    const fields = ["환경", "안전", "소방", "훈련"];
    const fieldRates: Record<string, number> = {};
    fields.forEach((f) => {
      const ft = tasks.filter((t) => t.field === f);
      const target = ft.reduce((s, t) => s + t.targetCount, 0);
      const completed = ft.reduce((s, t) => s + t.completedCount, 0);
      fieldRates[f] = target > 0 ? Math.round((completed / target) * 100) : 0;
    });

    return {
      weekLabel: w.weekLabel,
      overallRate,
      fieldRates,
      statusDist: {
        완료: tasks.filter((t) => t.status === "완료").length,
        진행중: tasks.filter((t) => t.status === "진행중").length,
        지연: tasks.filter((t) => t.status === "지연").length,
        대기: tasks.filter((t) => t.status === "대기").length,
      },
      taskCount: tasks.length,
    };
  });

  return NextResponse.json(trends);
}
