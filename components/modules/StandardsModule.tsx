"use client";

import { useState, useMemo } from "react";
import {
  BookOpen,
  CheckCircle,
  GraduationCap,
  Search,
  Eye,
  MessageSquare,
  FileCheck,
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from "lucide-react";
import type { Indicator } from "@/types/database";
import {
  EARLY_CHILDHOOD_STANDARDS,
  EARLY_CHILDHOOD_INDICATORS,
  BASIC_EDUCATION_STANDARDS,
  BASIC_EDUCATION_INDICATORS,
  ONESQA_RATING_RUBRICS,
} from "@/lib/qa-framework";

interface StandardsModuleProps {
  indicators?: Indicator[];
  onBack?: () => void;
  onNavigateToEvaluations?: (standardId?: string) => void;
  onNavigateToEvidence?: (indicatorCode?: string) => void;
}

export function StandardsModule({
  onNavigateToEvaluations,
  onNavigateToEvidence,
}: StandardsModuleProps) {
  const [levelTab, setLevelTab] = useState<"early" | "basic">("basic");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);

  // Load standards based on selected education framework
  const activeStandards = useMemo(() => {
    return levelTab === "early" ? EARLY_CHILDHOOD_STANDARDS : BASIC_EDUCATION_STANDARDS;
  }, [levelTab]);

  const [activeStandardId, setActiveStandardId] = useState<string>(activeStandards[0].id);

  // Keep activeStandardId in sync when levelTab changes
  const currentStandardId = activeStandards.some((s) => s.id === activeStandardId)
    ? activeStandardId
    : activeStandards[0].id;

  const activeIndicators = useMemo(() => {
    return levelTab === "early" ? EARLY_CHILDHOOD_INDICATORS : BASIC_EDUCATION_INDICATORS;
  }, [levelTab]);

  const filteredIndicators = useMemo(() => {
    return activeIndicators.filter((item) => {
      const matchesSearch =
        `${item.code} ${item.title} ${item.description}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesStd = item.standardId === currentStandardId;
      return searchTerm ? matchesSearch : matchesStd;
    });
  }, [activeIndicators, currentStandardId, searchTerm]);

  const toggleExpand = (id: string) => {
    setExpandedIndicator((prev) => (prev === id ? null : id));
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Top Banner */}
      <div
        className="panel"
        style={{
          background: "linear-gradient(135deg, #183b68 0%, #0d223f 100%)",
          color: "#fff",
          borderRadius: 14,
          boxShadow: "0 8px 24px rgba(10, 31, 68, 0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#93c5fd",
                fontSize: 13,
                marginBottom: 6,
                background: "rgba(255, 255, 255, 0.08)",
                padding: "4px 10px",
                borderRadius: 20,
              }}
            >
              <Sparkles size={15} />
              <span>กรอบแนวทางการประกันคุณภาพภายนอก สมศ. (พ.ศ. ๒๕๖๗ - ๒๕๗๑)</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#fff", fontWeight: 700 }}>
              มาตรฐานและตัวชี้วัดการประเมินคุณภาพภายนอก (ONESQA Standards & Indicators)
            </h1>
            <p style={{ margin: "6px 0 0", color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>
              โรงเรียนเทศบาล ๑ บ้านกลาง • ฉบับสถานศึกษาและผู้ประเมินภายนอก (เน้นร่องรอยการทำงานตามสภาพจริง ไม่ต้องทำเอกสารใหม่)
            </p>
          </div>

          {/* Level Switcher Tab */}
          <div
            style={{
              display: "flex",
              background: "rgba(255, 255, 255, 0.12)",
              padding: 4,
              borderRadius: 12,
              gap: 4,
            }}
          >
            <button
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: levelTab === "early" ? "#ffffff" : "transparent",
                color: levelTab === "early" ? "#e11d48" : "#e2e8f0",
                boxShadow: levelTab === "early" ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.2s ease",
              }}
              onClick={() => {
                setLevelTab("early");
                setActiveStandardId(EARLY_CHILDHOOD_STANDARDS[0].id);
              }}
            >
              <GraduationCap size={16} />
              การศึกษาปฐมวัย (18 ตัวชี้วัด)
            </button>

            <button
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: levelTab === "basic" ? "#ffffff" : "transparent",
                color: levelTab === "basic" ? "#1e40af" : "#e2e8f0",
                boxShadow: levelTab === "basic" ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.2s ease",
              }}
              onClick={() => {
                setLevelTab("basic");
                setActiveStandardId(BASIC_EDUCATION_STANDARDS[0].id);
              }}
            >
              <BookOpen size={16} />
              การศึกษาขั้นพื้นฐาน (16 ตัวชี้วัด)
            </button>
          </div>
        </div>
      </div>

      {/* Guide Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 10,
          color: "#166534",
          fontSize: 13,
        }}
      >
        <Info size={18} style={{ flexShrink: 0, color: "#16a34a" }} />
        <div>
          <strong>หลักการประเมิน สมศ. (พ.ศ. ๒๕๖๗ - ๒๕๗๑):</strong>{" "}
          ประเมินตามสภาพจริง โดยค้นหาร่องรอยหลักฐานจากการปฏิบัติงานประจำวัน ไม่ต้องสร้างเอกสารหลักฐานขึ้นใหม่
          การตัดสินผลมี ๒ รูปแบบ: <strong>“เป็นไปตามมาตรฐาน”</strong> (ผ่านเกณฑ์ระดับ ๓ ขึ้นไปครบทุกตัวชี้วัด) หรือ <strong>“อยู่ระหว่างการพัฒนา”</strong>
        </div>
      </div>

      {/* Standards Selection Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {activeStandards.map((std) => {
          const isSelected = currentStandardId === std.id;
          return (
            <div
              key={std.id}
              onClick={() => {
                setActiveStandardId(std.id);
                setSearchTerm("");
              }}
              style={{
                background: isSelected ? "#eff6ff" : "#fff",
                border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 16,
                cursor: "pointer",
                boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isSelected ? "#1d4ed8" : "#64748b",
                    background: isSelected ? "#dbeafe" : "#f1f5f9",
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  {std.code}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    background: isSelected ? "#2563eb" : "#f1f5f9",
                    color: isSelected ? "#ffffff" : "#475569",
                    padding: "3px 10px",
                    borderRadius: 12,
                  }}
                >
                  {std.indicatorCount} ตัวชี้วัด
                </span>
              </div>
              <strong style={{ fontSize: 15, display: "block", color: "#1e293b", marginBottom: 6 }}>
                {std.title}
              </strong>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                {std.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Search and Action Bar */}
      <div className="panel" style={{ padding: 18, borderRadius: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#f8fafc",
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              width: "100%",
              maxWidth: 420,
            }}
          >
            <Search size={17} color="#64748b" />
            <input
              type="text"
              placeholder={`ค้นหาใน ${activeStandards.find((s) => s.id === currentStandardId)?.code || "ตัวชี้วัด"} หรือพิมพ์คำสำคัญ...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 0,
                outline: 0,
                background: "transparent",
                fontSize: 13,
                width: "100%",
                color: "#1e293b",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle size={16} color="#16a34a" /> พบ {filteredIndicators.length} ตัวชี้วัด
            </span>
            {onNavigateToEvaluations && (
              <button
                className="secondary-button"
                style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => onNavigateToEvaluations(currentStandardId)}
              >
                <Award size={15} /> ไปที่หน้าประเมินผล
              </button>
            )}
          </div>
        </div>

        {/* Indicators Accordion List */}
        <div style={{ display: "grid", gap: 14 }}>
          {filteredIndicators.map((ind) => {
            const isExpanded = expandedIndicator === ind.id;
            return (
              <div
                key={ind.id}
                style={{
                  border: isExpanded ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: isExpanded ? "#f8fafc" : "#ffffff",
                  overflow: "hidden",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(ind.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 18px",
                    cursor: "pointer",
                    background: isExpanded ? "#f1f5f9" : "transparent",
                  }}
                >
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: "#1e40af",
                          background: "#dbeafe",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        ตัวชี้วัดที่ {ind.code}
                      </span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {ind.standardCode}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          background: "#e0f2fe",
                          color: "#0369a1",
                          padding: "2px 8px",
                          borderRadius: 10,
                        }}
                      >
                        เกณฑ์ตัดสิน: ต้องบรรลุระดับ ๓ ขึ้นไป
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
                      {ind.title}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      type="button"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        fontSize: 12,
                        color: "#334155",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(ind.id);
                      }}
                    >
                      {isExpanded ? (
                        <>
                          ย่อรายละเอียด <ChevronUp size={14} />
                        </>
                      ) : (
                        <>
                          ดูเกณฑ์ สมศ. และหลักฐาน <ChevronDown size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ padding: "18px 20px", borderTop: "1px solid #e2e8f0", display: "grid", gap: 18 }}>
                    {/* Description */}
                    <div>
                      <strong style={{ fontSize: 13, color: "#1e293b", display: "block", marginBottom: 4 }}>
                        คำอธิบายตัวชี้วัด (สมศ.):
                      </strong>
                      <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                        {ind.description}
                      </p>
                    </div>

                    {/* Criteria Level 3 */}
                    <div
                      style={{
                        background: "#ffffff",
                        padding: 14,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      }}
                    >
                      <strong style={{ fontSize: 13, color: "#0284c7", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <CheckCircle size={16} /> รายการพิจารณาเกณฑ์ระดับ ๓ (เป้าหมายมาตรฐานสถานศึกษา):
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                        {ind.criteriaLevel3.map((crit, idx) => (
                          <li key={idx}>{crit}</li>
                        ))}
                      </ul>
                    </div>

                    {/* 3 Inspection Sources per ONESQA Manual */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                      {/* Evidence Checklist */}
                      <div
                        style={{
                          background: "#fff",
                          padding: 14,
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <strong style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <FileCheck size={16} color="#2563eb" /> ๑. เอกสาร/ร่องรอยเชิงประจักษ์:
                        </strong>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                          {ind.evidenceExamples.map((ev, idx) => (
                            <li key={idx}>{ev}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Observation */}
                      <div
                        style={{
                          background: "#fff",
                          padding: 14,
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <strong style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <Eye size={16} color="#16a34a" /> ๒. ผลการสังเกตเชิงประจักษ์:
                        </strong>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                          {ind.observationPoints.map((ob, idx) => (
                            <li key={idx}>{ob}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Interview */}
                      <div
                        style={{
                          background: "#fff",
                          padding: 14,
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <strong style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <MessageSquare size={16} color="#d97706" /> ๓. บุคคลเป้าหมายในการสัมภาษณ์:
                        </strong>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                          {ind.interviewTargets.map((it, idx) => (
                            <li key={idx}>{it}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Rating Scale Reference */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "#f8fafc",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#64748b",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div>
                        <strong>เกณฑ์ระดับ ๕ (Best Practice):</strong> ต้องทำตามระดับ ๓ ต่อเนื่องไม่น้อยกว่า ๓ ปี และเป็นแบบอย่างที่ดี
                      </div>
                      {onNavigateToEvidence && (
                        <button
                          className="secondary-button"
                          style={{ fontSize: 12, padding: "5px 12px" }}
                          onClick={() => onNavigateToEvidence(ind.code)}
                        >
                          ผูกร่องรอยหลักฐานกับตัวชี้วัดนี้
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rubrics Explanation Panel */}
      <div className="panel" style={{ padding: 20, borderRadius: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
          <Award size={18} color="#2563eb" />
          เกณฑ์ระดับคุณภาพ ๕ ระดับในการตัดสินของ สมศ. (พ.ศ. ๒๕๖๗ - ๒๕๗๑)
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {ONESQA_RATING_RUBRICS.map((rubric) => (
            <div
              key={rubric.level}
              style={{
                padding: 14,
                borderRadius: 8,
                background: rubric.level >= 4 ? "#f0fdf4" : rubric.level === 3 ? "#eff6ff" : "#fff7ed",
                border: rubric.level >= 4 ? "1px solid #bbf7d0" : rubric.level === 3 ? "1px solid #bfdbfe" : "1px solid #fed7aa",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: rubric.level >= 4 ? "#15803d" : rubric.level === 3 ? "#1d4ed8" : "#c2410c",
                  marginBottom: 6,
                }}
              >
                {rubric.title}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                {rubric.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
