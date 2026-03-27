"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface FieldSummary {
  field: string;
  achievementRate: number;
}

interface CategorySummary {
  category: string;
  achievementRate: number;
}

interface StatusDist {
  완료: number;
  진행중: number;
  지연: number;
  대기: number;
}

const FIELD_COLORS: Record<string, string> = {
  환경: "#10b981",
  안전: "#3b82f6",
  소방: "#ef4444",
  훈련: "#f97316",
};

const STATUS_COLORS: Record<string, string> = {
  완료: "#3b82f6",
  진행중: "#22c55e",
  지연: "#ef4444",
  대기: "#eab308",
};

export function FieldBarChart({ data }: { data: FieldSummary[] }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-bold mb-3 text-gray-700">분야별 달성률</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="field" fontSize={12} />
          <YAxis domain={[0, 100]} fontSize={12} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Bar dataKey="achievementRate" name="달성률" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.field}
                fill={FIELD_COLORS[entry.field] || "#6b7280"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPieChart({ data }: { data: StatusDist }) {
  const pieData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  if (pieData.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-bold mb-3 text-gray-700">상태 분포</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ name, value }) => `${name} ${value}`}
          >
            {pieData.map((entry) => (
              <Cell
                key={entry.name}
                fill={STATUS_COLORS[entry.name] || "#6b7280"}
              />
            ))}
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryBarChart({ data }: { data: CategorySummary[] }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-bold mb-3 text-gray-700">구분별 달성률</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 35)}>
        <BarChart data={data} layout="vertical" margin={{ left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} fontSize={12} />
          <YAxis dataKey="category" type="category" fontSize={11} width={55} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Bar dataKey="achievementRate" name="달성률" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
