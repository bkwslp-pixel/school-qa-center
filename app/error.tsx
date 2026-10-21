"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        padding: "20px",
        fontFamily: "'Prompt', sans-serif",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: "36px 32px",
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "#fee2e2",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
          }}
        >
          <AlertCircle size={32} />
        </div>

        <h2 style={{ fontSize: 20, color: "#0f172a", margin: "0 0 10px 0", fontWeight: 700 }}>
          เกิดข้อผิดพลาดในการโหลดระบบ
        </h2>

        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, margin: "0 0 24px 0" }}>
          ระบบตรวจพบข้อผิดพลาดที่ไม่คาดคิด ข้อมูลและเอกสารของคุณยังคงปลอดภัย
          กรุณากดปุ่มเพื่อลองใหม่อีกครั้ง หรือกลับสู่หน้าหลัก
        </p>

        {error.message && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12,
              fontFamily: "monospace",
              color: "#dc2626",
              marginBottom: 24,
              textAlign: "left",
              overflowX: "auto",
            }}
          >
            {error.message}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              flex: 1,
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
            }}
          >
            <RefreshCw size={16} />
            ลองใหม่อีกครั้ง
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/";
            }}
            style={{
              flex: 1,
              background: "#f1f5f9",
              color: "#475569",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Home size={16} />
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  );
}
