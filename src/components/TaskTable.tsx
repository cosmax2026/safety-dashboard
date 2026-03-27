"use client";

import { useState } from "react";

interface Task {
  id: number;
  field: string;
  category: string;
  taskName: string;
  targetCount: number;
  completedCount: number;
  achievementRate: number;
  status: string;
  notes: string;
  personInCharge: string;
}

const statusBadge: Record<string, string> = {
  완료: "bg-blue-100 text-blue-700",
  진행중: "bg-green-100 text-green-700",
  지연: "bg-red-100 text-red-700",
  대기: "bg-yellow-100 text-yellow-700",
};

export default function TaskTable({
  tasks,
  fields,
}: {
  tasks: Task[];
  fields: string[];
}) {
  const [filterField, setFilterField] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const statuses = ["완료", "진행중", "지연", "대기"];

  const filtered = tasks.filter((t) => {
    if (filterField && t.field !== filterField) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b flex flex-wrap gap-3 items-center">
        <h3 className="text-sm font-bold text-gray-700 mr-2">업무 목록</h3>
        <select
          className="text-sm border rounded px-2 py-1"
          value={filterField}
          onChange={(e) => setFilterField(e.target.value)}
        >
          <option value="">전체 분야</option>
          {fields.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          className="text-sm border rounded px-2 py-1"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">전체 상태</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length}건</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">분야</th>
              <th className="px-3 py-2 text-left">구분</th>
              <th className="px-3 py-2 text-left">업무명</th>
              <th className="px-3 py-2 text-center">목표</th>
              <th className="px-3 py-2 text-center">완료</th>
              <th className="px-3 py-2 text-center">달성률</th>
              <th className="px-3 py-2 text-center">상태</th>
              <th className="px-3 py-2 text-left">담당자</th>
              <th className="px-3 py-2 text-left">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">{t.field}</td>
                <td className="px-3 py-2">{t.category}</td>
                <td className="px-3 py-2 max-w-[200px] truncate">{t.taskName}</td>
                <td className="px-3 py-2 text-center">{t.targetCount}</td>
                <td className="px-3 py-2 text-center">{t.completedCount}</td>
                <td className="px-3 py-2 text-center font-medium">{t.achievementRate}%</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[t.status] || "bg-gray-100"}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2">{t.personInCharge}</td>
                <td className="px-3 py-2 max-w-[150px] truncate text-gray-500">{t.notes}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
