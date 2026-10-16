"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { FileText, Printer, Download, CheckCircle, CheckCircle2 } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { School, Indicator } from "@/types/database";
import { useNotification } from "@/components/ui/NotificationProvider";

interface ReportsModuleProps {
  school?: School | null;
  academicYear?: string;
  indicators?: Indicator[];
  client?: SupabaseClient | null;
}

interface StandardSummary {
  standardCode: string;
  standardName: string;
  score: number;
  quality: string;
  evidenceStatus: string;
  indicators: Array<{
    code: string;
    title: string;
    score: number;
    quality: string;
  }>;
}

const cleanInitialReportStandards: StandardSummary[] = [
  {
    standardCode: "มาตรฐานที่ 1",
    standardName: "คุณภาพของผู้เรียน",
    score: 0,
    quality: "รอการประเมิน",
    evidenceStatus: "ยังไม่มีเอกสารแนบ",
    indicators: [
      { code: "1.1", title: "ผู้เรียนมีพัฒนาการด้านร่างกาย สมวัย มีสุขนิสัยที่ดี", score: 0, quality: "รอการประเมิน" },
      { code: "1.2", title: "ผู้เรียนมีคุณธรรม จริยธรรม และค่านิยมที่พึงประสงค์", score: 0, quality: "รอการประเมิน" },
      { code: "1.3", title: "ผู้เรียนมีความสามารถในการอ่าน คิดวิเคราะห์ และเขียน", score: 0, quality: "รอการประเมิน" },
      { code: "1.4", title: "ผู้เรียนมีทักษะการใช้เทคโนโลยีดิจิทัลและการสื่อสาร", score: 0, quality: "รอการประเมิน" },
      { code: "1.5", title: "ผู้เรียนมีสุขภาวะทางจิตและสังคม มีผลสัมฤทธิ์ตามเกณฑ์", score: 0, quality: "รอการประเมิน" },
    ],
  },
  {
    standardCode: "มาตรฐานที่ 2",
    standardName: "กระบวนการบริหารและการจัดการ",
    score: 0,
    quality: "รอการประเมิน",
    evidenceStatus: "ยังไม่มีเอกสารแนบ",
    indicators: [
      { code: "2.1", title: "เป้าหมาย วิสัยทัศน์ และพันธกิจที่กำหนดชัดเจน สอดคล้องบริบท", score: 0, quality: "รอการประเมิน" },
      { code: "2.2", title: "ระบบบริหารจัดการคุณภาพของสถานศึกษาที่เป็นระบบ", score: 0, quality: "รอการประเมิน" },
      { code: "2.3", title: "การดำเนินงานพัฒนาวิชาการที่เน้นคุณภาพผู้เรียนรอบด้าน", score: 0, quality: "รอการประเมิน" },
    ],
  },
  {
    standardCode: "มาตรฐานที่ 3",
    standardName: "กระบวนการจัดการเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญ",
    score: 0,
    quality: "รอการประเมิน",
    evidenceStatus: "ยังไม่มีเอกสารแนบ",
    indicators: [
      { code: "3.1", title: "จัดการเรียนรู้ผ่านกระบวนการคิดและปฏิบัติจริง (Active Learning)", score: 0, quality: "รอการประเมิน" },
      { code: "3.2", title: "ใช้สื่อ เทคโนโลยีสารสนเทศ และแหล่งเรียนรู้ที่เอื้อต่อการเรียนรู้", score: 0, quality: "รอการประเมิน" },
    ],
  },
];

export function ReportsModule({
  school,
  academicYear = "2567",
  client,
}: ReportsModuleProps) {
  const { showToast } = useNotification();
  const sb = client ?? getSupabase();

  const [reportStandards, setReportStandards] = useState<StandardSummary[]>(cleanInitialReportStandards);
  const [overallScore, setOverallScore] = useState("0.00");
  const [overallQuality, setOverallQuality] = useState("รอการประเมิน");
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const schoolName = school?.name ?? "โรงเรียนเทศบาล ๑ บ้านกลาง";
  const affiliation = school?.affiliation ?? "สังกัดเทศบาลตำบลบ้านกลาง กรมส่งเสริมการปกครองท้องถิ่น";
  const province = school?.province ?? "จังหวัดลำพูน";
  const district = school?.district ?? "อำเภอเมืองลำพูน";

  // Load live evaluations from Supabase if exist
  useEffect(() => {
    async function loadLiveEvaluations() {
      if (!sb) return;
      try {
        const { data: evals } = await sb
          .from("evaluations")
          .select("self_score, level_quality, indicators(code, standard_id, title_th)");

        if (evals && evals.length > 0) {
          interface EvalRow {
            self_score: number | string | null;
            level_quality: string | null;
            indicators: { code?: string; standard_id?: string; title_th?: string } | null;
          }
          const rawEvals = evals as unknown as EvalRow[];
          const evalMap = new Map<string, { score: number; quality: string }>();

          rawEvals.forEach((e) => {
            if (e.indicators?.code) {
              evalMap.set(e.indicators.code, {
                score: typeof e.self_score === "number" ? e.self_score : parseFloat(String(e.self_score || 0)),
                quality: e.level_quality || "รอการประเมิน",
              });
            }
          });

          let grandTotalScore = 0;
          let grandIndicatorCount = 0;

          const updated = cleanInitialReportStandards.map((std) => {
            let stdSum = 0;
            let stdCount = 0;

            const updatedIndicators = std.indicators.map((ind) => {
              const live = evalMap.get(ind.code);
              if (live && live.score > 0) {
                stdSum += live.score;
                stdCount++;
                grandTotalScore += live.score;
                grandIndicatorCount++;
                return { ...ind, score: live.score, quality: live.quality };
              }
              return ind;
            });

            const stdAvg = stdCount > 0 ? stdSum / stdCount : 0;
            const stdQualityText =
              stdAvg >= 4.5 ? "ยอดเยี่ยม" : stdAvg >= 3.75 ? "ดีเลิศ" : stdAvg >= 3.0 ? "ดี" : stdAvg >= 2.0 ? "ปานกลาง" : stdAvg > 0 ? "กำลังพัฒนา" : "รอการประเมิน";

            return {
              ...std,
              score: stdAvg,
              quality: stdQualityText,
              evidenceStatus: stdCount > 0 ? `บันทึกแล้ว ${stdCount} ตัวชี้วัด` : "ยังไม่มีเอกสารแนบ",
              indicators: updatedIndicators,
            };
          });

          setReportStandards(updated);

          if (grandIndicatorCount > 0) {
            const finalAvg = grandTotalScore / grandIndicatorCount;
            setOverallScore(finalAvg.toFixed(2));
            setOverallQuality(
              finalAvg >= 4.5 ? "ยอดเยี่ยม (Excellent)" : finalAvg >= 3.75 ? "ดีเลิศ (Very Good)" : finalAvg >= 3.0 ? "ดี (Good)" : "กำลังพัฒนา"
            );
          }
        }
      } catch (err) {
        console.warn("Could not load live evaluation summary for reports:", err);
      }
    }

    void loadLiveEvaluations();
  }, [sb]);

  // Print SAR to PDF or Printer
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV with UTF-8 BOM for Microsoft Excel compatibility
  const handleExportCSV = () => {
    setDownloading(true);

    try {
      const rows: string[][] = [
        ["รายงานการประเมินตนเองของสถานศึกษา (Self-Assessment Report : SAR)"],
        [`สถานศึกษา: ${schoolName}`, `สังกัด: ${affiliation}`],
        [`ที่ตั้ง: ${district} ${province}`, `ปีการศึกษา: ${academicYear}`],
        [`วันที่ส่งออกข้อมูล: ${new Intl.DateTimeFormat("th-TH", { dateStyle: "full" }).format(new Date())}`],
        [],
        ["1. สรุปผลการประเมินภาพรวมรายมาตรฐาน"],
        ["มาตรฐานการศึกษา", "ชื่อมาตรฐาน", "คะแนนเฉลี่ย", "ระดับคุณภาพ", "สถานะเอกสารร่องรอย"],
      ];

      reportStandards.forEach((std) => {
        rows.push([
          std.standardCode,
          std.standardName,
          std.score.toFixed(2),
          std.quality,
          std.evidenceStatus,
        ]);
      });

      // Overall row
      rows.push(["ภาพรวมสถานศึกษา", "รวมทั้ง 3 มาตรฐานการศึกษาขั้นพื้นฐาน", overallScore, overallQuality, parseFloat(overallScore) > 0 ? "พร้อมรับการตรวจประเมินภายนอก (สมศ.)" : "อยู่ระหว่างการเก็บรวบรวมข้อมูล"]);
      rows.push([]);

      // Section 2: Detailed Indicators
      rows.push(["2. รายละเอียดผลการประเมินรายตัวชี้วัด"]);
      rows.push(["มาตรฐาน", "รหัสตัวชี้วัด", "คำอธิบายตัวชี้วัด", "คะแนนประเมิน (เต็ม 5.00)", "ระดับคุณภาพ"]);

      reportStandards.forEach((std) => {
        std.indicators.forEach((ind) => {
          rows.push([
            std.standardCode,
            ind.code,
            ind.title,
            ind.score.toFixed(1),
            ind.quality,
          ]);
        });
      });

      rows.push([]);
      rows.push(["3. จุดเด่นและแนวทางการพัฒนา"]);
      rows.push(["จุดเด่น:", "ผู้เรียนมีคุณธรรม จริยธรรม สุขภาวะแข็งแรง ครูจัดการเรียนรู้เชิงรุก Active Learning ร้อยละ 90 ขึ้นไป"]);
      rows.push(["จุดควรพัฒนา:", "ยกระดับผลสัมฤทธิ์ทางการเรียนวิชาคณิตศาสตร์และภาษาอังกฤษ และการขยายผลห้องเรียนดิจิทัล"]);

      // Convert rows to CSV string with quotes
      const csvContent = rows
        .map((row) =>
          row
            .map((val) => {
              const str = (val ?? "").toString().replace(/"/g, '""');
              return `"${str}"`;
            })
            .join(",")
        )
        .join("\r\n");

      // Add UTF-8 BOM (\uFEFF) so Excel on Windows parses Thai characters perfectly
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `รายงาน_SAR_${schoolName.replace(/\s+/g, "_")}_${academicYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      showToast("ส่งออกไฟล์ตารางสรุปผล SAR เรียบร้อยแล้ว (เปิดกับ Excel ได้ทันที)", "success", "ส่งออกสำเร็จ");
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error("Export CSV error:", err);
      showToast("เกิดข้อผิดพลาดในการส่งออกไฟล์ กรุณาลองใหม่อีกครั้ง", "error", "ส่งออกไม่สำเร็จ");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Banner (Hidden on Print) */}
      <div className="panel print-hide" style={{ background: "linear-gradient(135deg, #102e54, #0a1f38)", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8abff7", fontSize: 13, marginBottom: 4 }}>
              <FileText size={18} />
              <span>ศูนย์จัดทำรายงานการประเมินตนเอง (SAR Report Center)</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#fff" }}>รายงานการประเมินตนเองของสถานศึกษา (SAR)</h1>
            <p style={{ margin: "6px 0 0", color: "#bad6f7", fontSize: 13 }}>
              ปีการศึกษา {academicYear} — {schoolName} {affiliation}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="primary-button" onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Printer size={16} /> พิมพ์รายงาน / บันทึก PDF (A4)
            </button>
            <button
              className="primary-button"
              style={{ background: "#ffffff22", border: "1px solid #ffffff44", display: "flex", alignItems: "center", gap: 6 }}
              onClick={handleExportCSV}
              disabled={downloading}
            >
              <Download size={16} />
              {downloading ? "กำลังเตรียมไฟล์..." : "ส่งออก Excel / CSV"}
            </button>
          </div>
        </div>
      </div>

      {downloadSuccess && (
        <div className="inline-alert print-hide" style={{ background: "#e8f8f2", borderColor: "#a6edd2", color: "#0c7850" }}>
          <CheckCircle2 size={16} /> ส่งออกไฟล์สรุปข้อมูล SAR รูปแบบ Excel (.csv) เรียบร้อยแล้ว (รองรับภาษาไทย 100%)
        </div>
      )}

      {/* SAR Summary Document Preview (Optimized for Screen & Print) */}
      <div className="panel print-doc-container" style={{ padding: "32px 36px", background: "#fff", color: "#1e293b" }}>
        {/* Document Header */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #0f2e54", paddingBottom: 20, marginBottom: 24 }}>
          <div style={{ width: 76, height: 76, margin: "0 auto 12px", background: "#ffffff", borderRadius: 16, border: "1px solid #dce8f6", padding: 4, display: "grid", placeItems: "center", boxShadow: "0 4px 14px rgba(24, 59, 104, 0.08)" }}>
            <Image
              src="/logo.png"
              alt="ตราสัญลักษณ์โรงเรียนเทศบาล ๑ บ้านกลาง"
              width={68}
              height={68}
              style={{ objectFit: "contain" }}
            />
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, color: "#0f2e54", fontWeight: 700 }}>
            รายงานการประเมินตนเองของสถานศึกษา (Self-Assessment Report : SAR)
          </h2>
          <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "#1e3a8a" }}>
            {schoolName} ประจำปีการศึกษา {academicYear}
          </h3>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {affiliation} {district} {province}
          </span>
        </div>

        {/* Section 1: Overview Score Table */}
        <h4 style={{ fontSize: 15, color: "#0f2e54", margin: "0 0 12px", fontWeight: 700 }}>
          ส่วนที่ 1: บทสรุปผลการประเมินภาพรวมทั้ง 3 มาตรฐานการศึกษาขั้นพื้นฐาน
        </h4>

        <table style={{ marginBottom: 28 }}>
          <thead>
            <tr>
              <th style={{ width: "45%" }}>มาตรฐานการศึกษา</th>
              <th style={{ textAlign: "center", width: "15%" }}>คะแนนเฉลี่ย</th>
              <th style={{ textAlign: "center", width: "18%" }}>ระดับคุณภาพ</th>
              <th style={{ width: "22%" }}>สถานะความพร้อมร่องรอย</th>
            </tr>
          </thead>
          <tbody>
            {reportStandards.map((std) => (
              <tr key={std.standardCode}>
                <td>
                  <strong>{std.standardCode}</strong> {std.standardName}
                </td>
                <td style={{ textAlign: "center", fontWeight: 700, color: "#1b6ee4" }}>
                  {std.score.toFixed(2)}
                </td>
                <td style={{ textAlign: "center" }}>
                  <span className="pill-status good" style={{ fontWeight: 600 }}>
                    {std.quality}
                  </span>
                </td>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#16ad72", fontSize: 11 }}>
                    <CheckCircle size={14} /> {std.evidenceStatus}
                  </span>
                </td>
              </tr>
            ))}
            <tr style={{ background: "#f1f6fd", fontWeight: 700 }}>
              <td>ผลการประเมินภาพรวมทั้งสถานศึกษา</td>
              <td style={{ textAlign: "center", fontWeight: 800, fontSize: 15, color: "#0c3b77" }}>
                {overallScore} / 5.00
              </td>
              <td style={{ textAlign: "center" }}>
                <span className="pill-status good" style={{ fontWeight: 800, fontSize: 12, padding: "4px 10px" }}>
                  {overallQuality}
                </span>
              </td>
              <td>
                <span style={{ color: "#0f3a68", fontWeight: 700 }}>
                  {parseFloat(overallScore) > 0 ? "พร้อมรับการประเมินภายนอก (สมศ.)" : "อยู่ระหว่างการเก็บรวบรวมข้อมูล"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 2: Detailed Indicators Table */}
        <h4 style={{ fontSize: 15, color: "#0f2e54", margin: "0 0 12px", fontWeight: 700 }}>
          ส่วนที่ 2: รายละเอียดผลการประเมินตนเองรายตัวชี้วัด
        </h4>

        <table style={{ marginBottom: 28 }}>
          <thead>
            <tr>
              <th style={{ width: "12%", textAlign: "center" }}>ตัวชี้วัด</th>
              <th style={{ width: "60%" }}>ชื่อตัวชี้วัดและเกณฑ์พิจารณา</th>
              <th style={{ width: "14%", textAlign: "center" }}>คะแนนประเมิน</th>
              <th style={{ width: "14%", textAlign: "center" }}>ระดับคุณภาพ</th>
            </tr>
          </thead>
          <tbody>
            {reportStandards.flatMap((std) =>
              std.indicators.map((ind) => (
                <tr key={ind.code}>
                  <td style={{ textAlign: "center", fontWeight: 700, color: "#0f3a68" }}>{ind.code}</td>
                  <td>{ind.title}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{ind.score > 0 ? ind.score.toFixed(1) : "-"}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className="pill-status good">{ind.quality}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Section 3: Highlights & Action Plan */}
        <h4 style={{ fontSize: 15, color: "#0f2e54", margin: "0 0 12px", fontWeight: 700 }}>
          ส่วนที่ 3: จุดเด่นและแนวทางการพัฒนาต่อเนื่อง
        </h4>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
          <div style={{ border: "1px solid #bfdbfe", borderRadius: 8, padding: 14, background: "#f8fbfe" }}>
            <strong style={{ color: "#1d4ed8", fontSize: 13, display: "block", marginBottom: 6 }}>
              จุดเด่นของสถานศึกษา (Strengths)
            </strong>
            <p style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.8 }}>
              (สรุปจุดเด่นจากการประเมินตนเองตามมาตรฐานที่ 1 - 3 ของสถานศึกษา)
            </p>
          </div>

          <div style={{ border: "1px solid #fed7aa", borderRadius: 8, padding: 14, background: "#fffdf9" }}>
            <strong style={{ color: "#c2410c", fontSize: 13, display: "block", marginBottom: 6 }}>
              จุดที่ควรพัฒนา (Areas for Improvement)
            </strong>
            <p style={{ margin: 0, fontSize: 12, color: "#431407", lineHeight: 1.8 }}>
              (สรุปจุดที่ควรพัฒนาและแผนการยกระดับคุณภาพการศึกษาต่อเนื่อง)
            </p>
          </div>
        </div>

        {/* Section 4: Signatures */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 20, borderTop: "1px solid #cbd5e1", textAlign: "center" }}>
          <div>
            <div style={{ width: 180, borderBottom: "1px dotted #64748b", margin: "45px auto 8px" }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>( ............................................................ )</div>
            <div style={{ fontSize: 12, color: "#475569" }}>หัวหน้างานประกันคุณภาพการศึกษา</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{schoolName}</div>
          </div>

          <div>
            <div style={{ width: 180, borderBottom: "1px dotted #64748b", margin: "45px auto 8px" }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>( ............................................................ )</div>
            <div style={{ fontSize: 12, color: "#475569" }}>ผู้อำนวยการสถานศึกษา</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{schoolName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
