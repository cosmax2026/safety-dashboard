"use client";

import { useState, useEffect, useCallback } from "react";
import UploadForm from "@/components/UploadForm";

interface Week {
  id: number;
  weekLabel: string;
  filename: string;
  uploadedAt: string;
  _count: { tasks: number };
}

export default function UploadPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);

  const loadWeeks = useCallback(() => {
    fetch("/api/weeks")
      .then((r) => r.json())
      .then(setWeeks);
  }, []);

  useEffect(() => {
    loadWeeks();
  }, [loadWeeks]);

  const deleteWeek = async (id: number) => {
    if (!confirm("이 주차 데이터를 삭제하시겠습니까?")) return;
    await fetch(`/api/weeks/${id}`, { method: "DELETE" });
    loadWeeks();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">엑셀 업로드</h2>
      <UploadForm onUploaded={loadWeeks} />

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-sm font-bold text-gray-700">업로드 이력</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">주차</th>
                <th className="px-4 py-2 text-left">파일명</th>
                <th className="px-4 py-2 text-center">업무 수</th>
                <th className="px-4 py-2 text-left">업로드 일시</th>
                <th className="px-4 py-2 text-center">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {weeks.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{w.weekLabel}</td>
                  <td className="px-4 py-2 text-gray-600">{w.filename}</td>
                  <td className="px-4 py-2 text-center">{w._count.tasks}건</td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(w.uploadedAt).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => deleteWeek(w.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {weeks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    업로드된 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
