"use client";

import { useState, useRef, DragEvent } from "react";

interface UploadFormProps {
  onUploaded: () => void;
}

export default function UploadForm({ onUploaded }: UploadFormProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setMessage("");
    setError("");
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      setMessage(data.message);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      upload(file);
    } else {
      setError("엑셀 파일(.xlsx)만 업로드 가능합니다.");
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleSelect}
          className="hidden"
        />
        {uploading ? (
          <p className="text-gray-500">업로드 중...</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium">
              엑셀 파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-xs text-gray-400 mt-2">.xlsx 파일만 지원</p>
          </>
        )}
      </div>
      {message && (
        <div className="mt-3 p-3 bg-green-50 text-green-700 rounded text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-3 p-3 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
