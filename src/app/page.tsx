"use client";

import { useState, useEffect, useCallback } from "react";
import SummaryCards from "@/components/SummaryCards";
import FieldCards from "@/components/FieldCards";
import { FieldBarChart, StatusPieChart, CategoryBarChart } from "@/components/Charts";
import TaskTable from "@/components/TaskTable";

interface Week {
  id: number;
  weekLabel: string;
}

interface DashboardData {
  weekLabel: string;
  periodStart: string;
  periodEnd: string;
  totalTarget: number;
  totalCompleted: number;
  overallRate: number;
  taskCount: number;
  fieldSummary: Array<{
    field: string;
    taskCount: number;
    targetCount: number;
    completedCount: number;
    achievementRate: number;
    statuses: Record<string, number>;
  }>;
  statusDist: Record<string, number>;
  categorySummary: Array<{
    category: string;
    achievementRate: number;
  }>;
}

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

export default function DashboardPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/weeks")
      .then((r) => r.json())
      .then((data) => {
        setWeeks(data);
        if (data.length > 0) setSelectedWeekId(data[0].id);
        setLoading(false);
      });
  }, []);

  const loadDashboard = useCallback(async (weekId: number) => {
    const [dashRes, taskRes] = await Promise.all([
      fetch(`/api/dashboard?weekId=${weekId}`),
      fetch(`/api/tasks?weekId=${weekId}`),
    ]);
    setDashboard(await dashRes.json());
    setTasks(await taskRes.json());
  }, []);

  useEffect(() => {
    if (selectedWeekId) loadDashboard(selectedWeekId);
  }, [selectedWeekId, loadDashboard]);

  if (loading) {
    return <div className="text-center py-20 text-gray-500">로딩 중...</div>;
  }

  if (weeks.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-2">업로드된 데이터가 없습니다.</p>
        <a href="/upload" className="text-blue-600 hover:underline text-sm">
          엑셀 업로드하기
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">주차 선택</label>
        <select
          className="border rounded px-3 py-1.5 text-sm"
          value={selectedWeekId ?? ""}
          onChange={(e) => setSelectedWeekId(Number(e.target.value))}
        >
          {weeks.map((w) => (
            <option key={w.id} value={w.id}>
              {w.weekLabel}
            </option>
          ))}
        </select>
        {dashboard && (
          <span className="text-xs text-gray-400">
            {dashboard.periodStart} ~ {dashboard.periodEnd}
          </span>
        )}
      </div>

      {dashboard && (
        <>
          {/* Summary Cards */}
          <SummaryCards data={dashboard} />

          {/* Field Cards */}
          <FieldCards fields={dashboard.fieldSummary} />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <FieldBarChart data={dashboard.fieldSummary} />
            <StatusPieChart data={dashboard.statusDist as DashboardData["statusDist"] & { 완료: number; 진행중: number; 지연: number; 대기: number }} />
            <CategoryBarChart data={dashboard.categorySummary} />
          </div>

          {/* Task Table */}
          <TaskTable
            tasks={tasks}
            fields={[...new Set(dashboard.fieldSummary.map((f) => f.field))]}
          />
        </>
      )}
    </div>
  );
}
