"use client";

interface DashboardData {
  totalTarget: number;
  totalCompleted: number;
  overallRate: number;
  taskCount: number;
}

export default function SummaryCards({ data }: { data: DashboardData }) {
  const cards = [
    { label: "목표건수", value: data.totalTarget, unit: "건", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "완료건수", value: data.totalCompleted, unit: "건", color: "bg-green-50 text-green-700 border-green-200" },
    { label: "전체 달성률", value: data.overallRate, unit: "%", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { label: "업무 수", value: data.taskCount, unit: "건", color: "bg-purple-50 text-purple-700 border-purple-200" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-lg border p-4 ${c.color}`}>
          <p className="text-sm font-medium opacity-80">{c.label}</p>
          <p className="text-2xl font-bold mt-1">
            {c.value}
            <span className="text-base font-normal ml-1">{c.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
