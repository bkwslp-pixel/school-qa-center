import Link from "next/link";
import { SearchX, Home } from "lucide-react";

export default function NotFound() {
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
          padding: "40px 32px",
          maxWidth: 440,
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
            background: "#eff6ff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
          }}
        >
          <SearchX size={32} />
        </div>

        <h2 style={{ fontSize: 22, color: "#0f172a", margin: "0 0 10px 0", fontWeight: 700 }}>
          ไม่พบหน้าที่ท่านต้องการ
        </h2>

        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, margin: "0 0 24px 0" }}>
          หน้าเว็บที่ท่านเรียกดูอาจถูกย้าย ลบ หรือที่อยู่ URL ไม่ถูกต้อง (Error 404)
        </p>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "#2563eb",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
          }}
        >
          <Home size={16} />
          กลับสู่หน้าหลักของระบบ
        </Link>
      </div>
    </div>
  );
}
