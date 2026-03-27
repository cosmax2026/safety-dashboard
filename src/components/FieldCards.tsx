"use client";

interface FieldData {
  field: string;
  taskCount: number;
  targetCount: number;
  completedCount: number;
  achievementRate: number;
  statuses: Record<string, number>;
}

const fieldColors: Record<string, string> = {
  환경: "border-emerald-300 bg-emerald-50",
  안전: "border-blue-300 bg-blue-50",
  소방: "border-red-300 bg-red-50",
  훈련: "border-orange-300 bg-orange-50",
};

const rateColor = (rate: number) => {
  if (rate >= 100) return "bg-blue-500";
  if (rate >= 60) return "bg-green-500";
  if (rate >= 1) return "bg-red-500";
  return "bg-yellow-400";
};

export default function FieldCards({ fields }: { fields: FieldData[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {fields.map((f) => (
        <div
          key={f.field}
          className={`rounded-lg border p-4 ${fieldColors[f.field] || "border-gray-200 bg-gray-50"}`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-sm">{f.field}</span>
            <span className="text-xs text-gray-500">{f.taskCount}건</span>
          </div>
          <div className="text-xl font-bold mb-2">{f.achievementRate}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${rateColor(f.achievementRate)}`}
              style={{ width: `${Math.min(f.achievementRate, 100)}%` }}
            />
          </div>
          <div className="flex gap-2 text-xs text-gray-600">
            <span>목표 {f.targetCount}</span>
            <span>완료 {f.completedCount}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
