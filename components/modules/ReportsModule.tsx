"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Printer,
  Download,
  GraduationCap,
  BookOpen,
  Sparkles,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { School, Indicator } from "@/types/database";
import { useNotification } from "@/components/ui/NotificationProvider";
import {
  EARLY_CHILDHOOD_STANDARDS,
  EARLY_CHILDHOOD_INDICATORS,
  BASIC_EDUCATION_STANDARDS,
  BASIC_EDUCATION_INDICATORS,
  evaluateStandardStatus,
  FEEDBACK_CATEGORIES,
} from "@/lib/qa-framework";

interface ReportsModuleProps {
  school?: School | null;
  academicYear?: string;
  indicators?: Indicator[];
  client?: SupabaseClient | null;
}

export function ReportsModule({
  school,
  academicYear = "2567",
  client,
}: ReportsModuleProps) {
  const { showToast } = useNotification();
  const sb = client ?? getSupabase();

  const [levelTab, setLevelTab] = useState<"early" | "basic">("basic");
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const schoolName = school?.name ?? "โรงเรียนเทศบาล ๑ บ้านกลาง";
  const affiliation = school?.affiliation ?? "สังกัดเทศบาลตำบลบ้านกลาง กรมส่งเสริมการปกครองท้องถิ่น";
  const province = school?.province ?? "จังหวัดลำพูน";
  const district = school?.district ?? "อำเภอเมืองลำพูน";

  // Framework Data
  const standards = useMemo(() => {
    return levelTab === "early" ? EARLY_CHILDHOOD_STANDARDS : BASIC_EDUCATION_STANDARDS;
  }, [levelTab]);

  const indicators = useMemo(() => {
    return levelTab === "early" ? EARLY_CHILDHOOD_INDICATORS : BASIC_EDUCATION_INDICATORS;
  }, [levelTab]);

  // Scores state mapped by indicator code
  const [scoresMap, setScoresMap] = useState<Record<string, number>>({});

  // Load evaluations from Supabase if available
  useEffect(() => {
    async function loadLiveEvaluations() {
      if (!sb) return;
      try {
        const { data: evals } = await sb
          .from("evaluations")
          .select("self_score, indicators(code)");

        if (evals && evals.length > 0) {
          const map: Record<string, number> = {};
          interface EvalQueryRow {
            self_score: number | string | null;
            indicators: { code?: string } | null;
          }
          (evals as unknown as EvalQueryRow[]).forEach((e) => {
            const code = e.indicators?.code;
            if (code && typeof e.self_score === "number") {
              map[code] = e.self_score;
            }
          });
          setScoresMap(map);
        }
      } catch (err) {
        console.warn("Could not load live evaluation summary for reports:", err);
      }
    }

    void loadLiveEvaluations();
  }, [sb]);

  // Calculate stats for each standard
  const standardsSummary = useMemo(() => {
    return standards.map((std) => {
      const stdNum = std.code.replace(/\D/g, "");
      const stdIndicators = indicators.filter((i) => i.code.startsWith(`${stdNum}.`));
      const scores = stdIndicators.map((i) => scoresMap[i.code] ?? 0);
      const validScores = scores.filter((s) => s > 0);
      const sum = validScores.reduce((a, b) => a + b, 0);
      const avg = validScores.length > 0 ? (sum / validScores.length).toFixed(2) : "0.00";
      const decision = validScores.length === 0 ? "รอการประเมิน" : evaluateStandardStatus(scores);

      return {
        ...std,
        indicators: stdIndicators.map((ind) => ({
          ...ind,
          score: scoresMap[ind.code] ?? 0,
        })),
        avg,
        decision,
        ratedCount: validScores.length,
      };
    });
  }, [standards, indicators, scoresMap]);

  // Overall Decision
  const overallStats = useMemo(() => {
    const allScores = standardsSummary.flatMap((s) => s.indicators.map((i) => i.score));
    const validScores = allScores.filter((s) => s > 0);
    const sum = validScores.reduce((a, b) => a + b, 0);
    const avg = validScores.length > 0 ? (sum / validScores.length).toFixed(2) : "0.00";
    const allMeetStandard = validScores.length === allScores.length && allScores.every((s) => s >= 3);
    const decision =
      validScores.length === 0
        ? "รอการประเมิน"
        : allMeetStandard
        ? "เป็นไปตามมาตรฐาน"
        : "อยู่ระหว่างการพัฒนา";

    return {
      avg,
      decision,
      indicatorCount: allScores.length,
      ratedCount: validScores.length,
    };
  }, [standardsSummary]);

  // Print SAR to PDF or Printer
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV
  const handleExportCSV = () => {
    setDownloading(true);

    try {
      const rows: string[][] = [
        ["รายงานสรุปการประเมินตนเองเพื่อรองรับการประกันคุณภาพภายนอก (ONESQA SAR Report)"],
        [`ระดับ: ${levelTab === "early" ? "การศึกษาปฐมวัย (18 ตัวชี้วัด)" : "การศึกษาขั้นพื้นฐาน (16 ตัวชี้วัด)"}`],
        [`สถานศึกษา: ${schoolName}`, `สังกัด: ${affiliation}`],
        [`ที่ตั้ง: ${district} ${province}`, `ปีการศึกษา: ${academicYear}`],
        [`ผลการตัดสินภาพรวมตามเกณฑ์ สมศ.: ${overallStats.decision} (คะแนนเฉลี่ย ${overallStats.avg})`],
        [],
        ["มาตรฐาน", "ตัวชี้วัด", "ชื่อตัวชี้วัด", "ระดับคุณภาพ (1-5)", "สถานะเกณฑ์ สมศ."],
      ];

      standardsSummary.forEach((std) => {
        std.indicators.forEach((ind) => {
          rows.push([
            std.code,
            ind.code,
            `"${ind.title.replace(/"/g, '""')}"`,
            String(ind.score),
            ind.score >= 3 ? "เป็นไปตามมาตรฐาน" : "อยู่ระหว่างการพัฒนา",
          ]);
        });
      });

      const csvContent =
        "\uFEFF" + rows.map((e) => e.join(",")).join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `รายงาน_สมศ_${levelTab === "early" ? "ปฐมวัย" : "ขั้นพื้นฐาน"}_${schoolName}_${academicYear}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      showToast("ส่งออกไฟล์ CSV สำหรับ Microsoft Excel เรียบร้อยแล้ว", "success", "ส่งออกข้อมูลสำเร็จ");
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: unknown) {
      console.error("Export error:", err);
      showToast("เกิดข้อผิดพลาดในการส่งออกไฟล์", "error", "ส่งออกไม่สำเร็จ");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Action Header & Level Switcher */}
      <div
        className="panel no-print"
        style={{
          background: "linear-gradient(135deg, #183b68 0%, #0d223f 100%)",
          color: "#fff",
          borderRadius: 14,
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
              <span>เอกสารแบบรายงานผลการประเมินตนเอง (SAR) ตามกรอบ สมศ. ๒๕๖๗ - ๒๕๗๑</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#fff", fontWeight: 700 }}>
              ระบบรายงานการประกันคุณภาพและเตรียมรับการประเมินภายนอก
            </h1>
            <p style={{ margin: "6px 0 0", color: "#cbd5e1", fontSize: 13 }}>
              {schoolName} • {affiliation}
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
              }}
              onClick={() => setLevelTab("early")}
            >
              <GraduationCap size={16} />
              ปฐมวัย (18 ตัวชี้วัด)
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
              }}
              onClick={() => setLevelTab("basic")}
            >
              <BookOpen size={16} />
              ขั้นพื้นฐาน (16 ตัวชี้วัด)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#93c5fd" }}>
              ผลการตัดสินภาพรวม:
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 14,
                background:
                  overallStats.decision === "เป็นไปตามมาตรฐาน"
                    ? "#22c55e"
                    : "#f97316",
                color: "#ffffff",
              }}
            >
              {overallStats.decision} (เฉลี่ย {overallStats.avg})
            </span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="primary-button"
              style={{
                background: "#ffffff",
                color: "#1e3a8a",
                border: "1px solid #bfdbfe",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              onClick={handlePrint}
            >
              <Printer size={16} /> พิมพ์รายงาน / บันทึกเป็น PDF
            </button>

            <button
              className="primary-button"
              style={{
                background: "linear-gradient(120deg, #10b981, #059669)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
              onClick={handleExportCSV}
              disabled={downloading}
            >
              <Download size={16} />
              {downloading ? "กำลังส่งออก..." : downloadSuccess ? "ส่งออกเรียบร้อย" : "ส่งออก Excel (CSV)"}
            </button>
          </div>
        </div>
      </div>

      {/* Official Report Document Container (Printable Area) */}
      <div
        className="panel sar-document-container"
        style={{
          background: "#fff",
          padding: "36px 40px",
          borderRadius: 14,
          border: "1px solid var(--line)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}
      >
        {/* Document Header */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #183b68", paddingBottom: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #183b68, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 24,
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              }}
            >
              ท.๑
            </div>
          </div>
          <h1 style={{ fontSize: 20, margin: "0 0 6px", color: "#183b68", fontWeight: 700 }}>
            รายงานสรุปการประเมินตนเองของสถานศึกษา (SAR)
          </h1>
          <h2 style={{ fontSize: 16, margin: "0 0 6px", color: "#334155", fontWeight: 600 }}>
            ตามกรอบแนวทางการประกันคุณภาพภายนอก สมศ. (พ.ศ. ๒๕๖๗ - ๒๕๗๑)
          </h2>
          <div style={{ fontSize: 14, color: "#64748b", display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
            <span><strong>ระดับ:</strong> {levelTab === "early" ? "การศึกษาปฐมวัย (18 ตัวชี้วัด)" : "ระดับการศึกษาขั้นพื้นฐาน (16 ตัวชี้วัด)"}</span>
            <span><strong>สถานศึกษา:</strong> {schoolName}</span>
            <span><strong>ปีการศึกษา:</strong> {academicYear}</span>
            <span><strong>สังกัด:</strong> {affiliation}</span>
          </div>
        </div>

        {/* Section 1: Executive Summary & ONESQA Overall Decision */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, color: "#183b68", borderLeft: "4px solid #2563eb", paddingLeft: 10, margin: "0 0 14px" }}>
            ส่วนที่ ๑: สรุปผลการตัดสินภาพรวมตามเกณฑ์ สมศ. (Executive Summary)
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div style={{ padding: 16, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 12, color: "#64748b", display: "block" }}>ผลการตัดสินระดับสถานศึกษา</span>
              <div style={{ fontSize: 20, fontWeight: 700, color: overallStats.decision === "เป็นไปตามมาตรฐาน" ? "#16a34a" : "#ea580c", marginTop: 4 }}>
                {overallStats.decision}
              </div>
              <span style={{ fontSize: 11, color: "#64748b", display: "block", marginTop: 4 }}>
                (ตามเกณฑ์ สมศ. ตัวชี้วัดทุกตัวต้องบรรลุระดับ ๓ ขึ้นไป)
              </span>
            </div>

            <div style={{ padding: 16, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 12, color: "#64748b", display: "block" }}>คะแนนเฉลี่ยภาพรวม (เต็ม 5.00)</span>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1e40af", marginTop: 4 }}>
                {overallStats.avg} <span style={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>/ 5.00</span>
              </div>
              <span style={{ fontSize: 11, color: "#64748b", display: "block", marginTop: 4 }}>
                ประเมินครบทั้ง {overallStats.indicatorCount} ตัวชี้วัด
              </span>
            </div>

            <div style={{ padding: 16, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 12, color: "#64748b", display: "block" }}>การเชื่อมโยงระบบประกันคุณภาพ</span>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#334155", marginTop: 4 }}>
                เชื่อมโยง IQA สู่ EQA (AQA System)
              </div>
              <span style={{ fontSize: 11, color: "#64748b", display: "block", marginTop: 4 }}>
                ใช้ข้อมูลตามสภาพจริง ไม่สร้างภาระเอกสารใหม่
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Standard-by-Standard Assessment Summary Table */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 15, color: "#183b68", borderLeft: "4px solid #2563eb", paddingLeft: 10, margin: "0 0 14px" }}>
            ส่วนที่ ๒: ตารางสรุปผลการประเมินรายมาตรฐานและตัวชี้วัด
          </h3>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", color: "#1e293b", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", border: "1px solid #cbd5e1", width: 90 }}>ตัวชี้วัด</th>
                <th style={{ padding: "10px 12px", border: "1px solid #cbd5e1" }}>ประเด็นการพิจารณาตามกรอบ สมศ.</th>
                <th style={{ padding: "10px 12px", border: "1px solid #cbd5e1", width: 110, textAlign: "center" }}>ระดับ (1-5)</th>
                <th style={{ padding: "10px 12px", border: "1px solid #cbd5e1", width: 140, textAlign: "center" }}>ผลการตัดสิน</th>
              </tr>
            </thead>
            <tbody>
              {standardsSummary.map((std) => (
                <Fragment key={std.id}>
                  {/* Standard Header Row */}
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={2} style={{ padding: "10px 12px", border: "1px solid #cbd5e1", fontWeight: 700, color: "#1e40af" }}>
                      {std.code}: {std.title} ({std.indicatorCount} ตัวชี้วัด)
                    </td>
                    <td style={{ padding: "10px 12px", border: "1px solid #cbd5e1", fontWeight: 700, textAlign: "center", color: "#1e40af" }}>
                      {std.avg !== "0.00" ? `เฉลี่ย ${std.avg}` : "รอประเมิน"}
                    </td>
                    <td style={{ padding: "10px 12px", border: "1px solid #cbd5e1", fontWeight: 700, textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background:
                            std.decision === "เป็นไปตามมาตรฐาน"
                              ? "#dcfce7"
                              : std.decision === "อยู่ระหว่างการพัฒนา"
                              ? "#ffedd5"
                              : "#f1f5f9",
                          color:
                            std.decision === "เป็นไปตามมาตรฐาน"
                              ? "#166534"
                              : std.decision === "อยู่ระหว่างการพัฒนา"
                              ? "#c2410c"
                              : "#64748b",
                        }}
                      >
                        {std.decision}
                      </span>
                    </td>
                  </tr>

                  {/* Indicator Rows */}
                  {std.indicators.map((ind) => (
                    <tr key={ind.code}>
                      <td style={{ padding: "8px 12px", border: "1px solid #cbd5e1", fontWeight: 600, color: "#334155" }}>
                        {ind.code}
                      </td>
                      <td style={{ padding: "8px 12px", border: "1px solid #cbd5e1", color: "#334155" }}>
                        <strong>{ind.title}</strong>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{ind.description}</div>
                      </td>
                      <td style={{ padding: "8px 12px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: 700 }}>
                        {ind.score > 0 ? ind.score : "-"}
                      </td>
                      <td style={{ padding: "8px 12px", border: "1px solid #cbd5e1", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background:
                              ind.score >= 3
                                ? "#f0fdf4"
                                : ind.score > 0
                                ? "#fff7ed"
                                : "#f1f5f9",
                            color:
                              ind.score >= 3
                                ? "#15803d"
                                : ind.score > 0
                                ? "#c2410c"
                                : "#64748b",
                          }}
                        >
                          {ind.score >= 3
                            ? "ผ่านเกณฑ์"
                            : ind.score > 0
                            ? "ควรปรับปรุง"
                            : "รอการประเมิน"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Four-Dimensional Feedback & Continuous Improvement Plan */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 15, color: "#183b68", borderLeft: "4px solid #2563eb", paddingLeft: 10, margin: "0 0 14px" }}>
            ส่วนที่ ๓: แนวทางการให้ข้อมูลย้อนกลับและแผนพัฒนา (ONESQA 4-Dimension Feedback)
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            {FEEDBACK_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: cat.badgeColor,
                    }}
                  />
                  <strong style={{ fontSize: 13, color: cat.badgeColor }}>{cat.title}</strong>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                  {cat.desc}
                </p>
                <div
                  style={{
                    marginTop: 10,
                    padding: 8,
                    background: "#f8fafc",
                    borderRadius: 6,
                    fontSize: 11,
                    color: "#64748b",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  สถานศึกษาเตรียมแผนรองรับในการจัดทำเล่มรายงานฉบับสมบูรณ์
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Sign-off & Verification */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid #cbd5e1",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ height: 60 }} />
            <div style={{ borderBottom: "1px dotted #94a3b8", width: "70%", margin: "0 auto 8px" }} />
            <span style={{ fontSize: 13, color: "#334155", display: "block" }}>
              (......................................................)
            </span>
            <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 2 }}>
              หัวหน้างานประกันคุณภาพการศึกษา
            </span>
          </div>

          <div>
            <div style={{ height: 60 }} />
            <div style={{ borderBottom: "1px dotted #94a3b8", width: "70%", margin: "0 auto 8px" }} />
            <span style={{ fontSize: 13, color: "#334155", display: "block" }}>
              (......................................................)
            </span>
            <span style={{ fontSize: 12, color: "#64748b", display: "block", marginTop: 2 }}>
              ผู้อำนวยการสถานศึกษา {schoolName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
