"use client";

import { useState } from "react";
import { BookOpen, CheckCircle, GraduationCap, Search } from "lucide-react";
import type { Indicator } from "@/types/database";

interface StandardsModuleProps {
  indicators: Indicator[];
  onBack: () => void;
}

export function StandardsModule({ indicators }: StandardsModuleProps) {
  const [levelTab, setLevelTab] = useState<"early" | "primary" | "secondary">("primary");
  const [activeStandard, setActiveStandard] = useState("s1");
  const [searchTerm, setSearchTerm] = useState("");

  const standardsData = [
    {
      id: "s1",
      code: "มาตรฐานที่ 1",
      title: "คุณภาพของผู้เรียน",
      description: "ผลสัมฤทธิ์ทางวิชาการของผู้เรียน และคุณลักษณะที่พึงประสงค์ของผู้เรียน",
      indicatorCount: 5,
    },
    {
      id: "s2",
      code: "มาตรฐานที่ 2",
      title: "กระบวนการบริหารและการจัดการ",
      description: "การมีเป้าหมายวิสัยทัศน์ ระบบบริหารจัดการคุณภาพ และการพัฒนาวิชาการ",
      indicatorCount: 6,
    },
    {
      id: "s3",
      code: "มาตรฐานที่ 3",
      title: "กระบวนการจัดการเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญ",
      description: "การจัดการเรียนรู้ผ่านกระบวนการคิดและปฏิบัติจริง การใช้สื่อและเทคโนโลยีสารสนเทศ",
      indicatorCount: 5,
    },
  ];

  const filteredIndicators = indicators.filter((item) => {
    const matchesSearch = `${item.code} ${item.title_th}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStd = item.standard_id === activeStandard;
    return matchesSearch && (searchTerm ? true : matchesStd);
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Top Banner */}
      <div className="panel" style={{ background: "linear-gradient(135deg, #183b68, #102747)", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8dbaff", fontSize: 13, marginBottom: 4 }}>
              <BookOpen size={18} />
              <span>เกณฑ์มาตรฐานการศึกษาขั้นพื้นฐาน</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#fff" }}>มาตรฐานและตัวชี้วัด (Standards & Indicators)</h1>
            <p style={{ margin: "6px 0 0", color: "#c5d5e9", fontSize: 13 }}>
              เกณฑ์การประเมินคุณภาพภายในสถานศึกษา โรงเรียนเทศบาล ๑ บ้านกลาง ประจำปีการศึกษา 2567
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`level-pill ${levelTab === "early" ? "level-0" : ""}`}
              style={{ background: levelTab === "early" ? "#fff5f8" : "#ffffff18", color: levelTab === "early" ? "#e84a70" : "#fff", border: "1px solid #ffffff26" }}
              onClick={() => setLevelTab("early")}
            >
              <GraduationCap size={15} /> ปฐมวัย
            </button>
            <button
              className={`level-pill ${levelTab === "primary" ? "level-1" : ""}`}
              style={{ background: levelTab === "primary" ? "#f3f8ff" : "#ffffff18", color: levelTab === "primary" ? "#1873ed" : "#fff", border: "1px solid #ffffff26" }}
              onClick={() => setLevelTab("primary")}
            >
              <GraduationCap size={15} /> ประถมศึกษา
            </button>
            <button
              className={`level-pill ${levelTab === "secondary" ? "level-2" : ""}`}
              style={{ background: levelTab === "secondary" ? "#f0fff8" : "#ffffff18", color: levelTab === "secondary" ? "#169f6a" : "#fff", border: "1px solid #ffffff26" }}
              onClick={() => setLevelTab("secondary")}
            >
              <GraduationCap size={15} /> มัธยมศึกษา
            </button>
          </div>
        </div>
      </div>

      {/* Standards Selection Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {standardsData.map((std) => {
          const isSelected = activeStandard === std.id;
          return (
            <div
              key={std.id}
              onClick={() => setActiveStandard(std.id)}
              style={{
                background: isSelected ? "#f0f6ff" : "#fff",
                border: isSelected ? "2px solid #2474f3" : "1px solid var(--line)",
                borderRadius: 10,
                padding: 16,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#2474f3" }}>{std.code}</span>
                <span style={{ fontSize: 11, background: "#e8effc", padding: "2px 8px", borderRadius: 10, color: "#365582" }}>
                  {std.indicatorCount} ตัวชี้วัด
                </span>
              </div>
              <strong style={{ fontSize: 14, display: "block", color: "var(--ink)", marginBottom: 4 }}>
                {std.title}
              </strong>
              <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                {std.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Search & List */}
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f3f7fc", padding: "6px 12px", borderRadius: 8, border: "1px solid #e7eef8", width: 320 }}>
            <Search size={16} color="#7890b2" />
            <input
              type="text"
              placeholder="ค้นหาตัวชี้วัด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 0, outline: 0, background: "transparent", fontSize: 12, width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle size={15} color="#20b486" /> ทั้งหมด {filteredIndicators.length} ตัวชี้วัดในหมวดนี้
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {filteredIndicators.map((ind, i) => (
            <div
              key={ind.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                border: "1px solid #edf2f9",
                borderRadius: 8,
                background: "#fafcff",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#183b68" }}>
                    ตัวชี้วัดที่ {ind.code}
                  </span>
                  <span style={{ fontSize: 11, background: "#e8f7ee", color: "#127e4e", padding: "2px 8px", borderRadius: 12 }}>
                    เป้าหมาย: ระดับดีเลิศ (4.00)
                  </span>
                  <span style={{ fontSize: 11, background: "#f2f5fa", color: "#50698c", padding: "2px 8px", borderRadius: 12 }}>
                    น้ำหนัก: {ind.weight ?? "1.00"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#253b59" }}>{ind.title_th}</div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#617d9e" }}>
                  หลักฐานที่ผูกไว้: <strong>{i + 2} รายการ</strong>
                </span>
                <button
                  className="primary-button"
                  style={{ padding: "6px 12px", fontSize: 11 }}
                  onClick={() => alert(`ดูข้อมูลเกณฑ์และร่องรอยตัวชี้วัด ${ind.code}`)}
                >
                  ดูเกณฑ์ประเมิน
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
