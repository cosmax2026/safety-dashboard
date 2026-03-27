"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrendItem {
  weekLabel: string;
  overallRate: number;
  fieldRates: Record<string, number>;
  statusDist: Record<string, number>;
  taskCount: number;
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

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendItem[]>([]);

  useEffect(() => {
    fetch("/api/trends")
      .then((r) => r.json())
      .then(setTrends);
  }, []);

  if (trends.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        트렌드 데이터가 없습니다. 2주 이상 데이터를 업로드해주세요.
      </div>
    );
  }

  const fieldTrendData = trends.map((t) => ({
    weekLabel: t.weekLabel,
    전체: t.overallRate,
    ...t.fieldRates,
  }));

  const statusStackData = trends.map((t) => ({
    weekLabel: t.weekLabel,
    ...t.statusDist,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">주간 트렌드</h2>

      {/* Overall trend */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-bold mb-3 text-gray-700">
          주차별 전체 달성률
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={fieldTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="weekLabel" fontSize={11} />
            <YAxis domain={[0, 100]} fontSize={12} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="전체"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Field trends */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-bold mb-3 text-gray-700">
          분야별 달성률 트렌드
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={fieldTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="weekLabel" fontSize={11} />
            <YAxis domain={[0, 100]} fontSize={12} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Legend />
            {Object.entries(FIELD_COLORS).map(([field, color]) => (
              <Line
                key={field}
                type="monotone"
                dataKey={field}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status distribution stacked bar */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-bold mb-3 text-gray-700">
          주차별 상태 분포
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={statusStackData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="weekLabel" fontSize={11} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <Bar
                key={status}
                dataKey={status}
                stackId="a"
                fill={color}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
