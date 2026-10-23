"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChartNoAxesCombined,
  CheckCircle2,
  Save,
  Send,
  Loader2,
  AlertCircle,
  FileCheck2,
  BookOpen,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { School, Indicator } from "@/types/database";
import { useNotification } from "@/components/ui/NotificationProvider";
import {
  EARLY_CHILDHOOD_STANDARDS,
  EARLY_CHILDHOOD_INDICATORS,
  BASIC_EDUCATION_STANDARDS,
  BASIC_EDUCATION_INDICATORS,
  ONESQA_RATING_RUBRICS,
  evaluateStandardStatus,
  type QAIndicatorDef,
  type QAStandardDef,
} from "@/lib/qa-framework";

interface EvaluationsModuleProps {
  school?: School | null;
  user?: User | null;
  client?: SupabaseClient | null;
  indicators?: Indicator[];
  academicYear?: string;
  onNavigateToEvidence?: (indicatorCode?: string) => void;
}

interface IndicatorEvaluationState {
  indicatorId?: string;
  code: string;
  title: string;
  criteria: string[];
  weight: number;
  selfScore: number; // 1-5 (or 0 if unrated)
  evaluatedScore?: number | null;
  strengths: string;
  weaknesses: string;
  improvementPlan: string;
  riskAssessment: string;
  bestPracticeNote: string;
  status: "draft" | "submitted" | "verified" | "approved";
  evidenceCount: number;
}

function buildInitialState(indicators: QAIndicatorDef[]): IndicatorEvaluationState[] {
  return indicators.map((ind) => ({
    indicatorId: ind.id,
    code: ind.code,
    title: ind.title,
    criteria: ind.criteriaLevel3,
    weight: ind.weight,
    selfScore: 0,
    strengths: "",
    weaknesses: "",
    improvementPlan: "",
    riskAssessment: "",
    bestPracticeNote: "",
    status: "draft",
    evidenceCount: 0,
  }));
}

export function EvaluationsModule({
  user,
  client,
  academicYear = "2567",
  onNavigateToEvidence,
}: EvaluationsModuleProps) {
  const { showToast, showConfirm, showAlert } = useNotification();
  const sb = client ?? getSupabase();

  // Framework Level Tab: "early" (18 indicators) vs "basic" (16 indicators)
  const [levelTab, setLevelTab] = useState<"early" | "basic">("basic");

  // Standards list based on active level
  const standardsList: QAStandardDef[] = useMemo(() => {
    return levelTab === "early" ? EARLY_CHILDHOOD_STANDARDS : BASIC_EDUCATION_STANDARDS;
  }, [levelTab]);

  const [selectedStandardId, setSelectedStandardId] = useState<string>(standardsList[0].id);

  // Sync selected standard if out of bounds
  useEffect(() => {
    if (!standardsList.some((s) => s.id === selectedStandardId)) {
      setSelectedStandardId(standardsList[0].id);
    }
  }, [standardsList, selectedStandardId]);

  // Master State for both Early Childhood and Basic Education
  const [earlyState, setEarlyState] = useState<IndicatorEvaluationState[]>(() =>
    buildInitialState(EARLY_CHILDHOOD_INDICATORS)
  );
  const [basicState, setBasicState] = useState<IndicatorEvaluationState[]>(() =>
    buildInitialState(BASIC_EDUCATION_INDICATORS)
  );

  const [saving, setSaving] = useState(false);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>("1.1");

  // Current active evaluation items
  const activeAllItems = levelTab === "early" ? earlyState : basicState;
  const setActiveAllItems = levelTab === "early" ? setEarlyState : setBasicState;

  // Items for selected standard
  const currentStandard = standardsList.find((s) => s.id === selectedStandardId) || standardsList[0];
  const currentStandardItems = useMemo(() => {
    return activeAllItems.filter((item) => {
      const stdCodeNumber = currentStandard.code.replace(/\D/g, "");
      return item.code.startsWith(`${stdCodeNumber}.`);
    });
  }, [activeAllItems, currentStandard]);

  // Fetch live evaluations from Supabase (if available)
  const fetchLiveEvaluations = useCallback(async () => {
    if (!sb) return;
    try {
      const { data: cycles } = await sb
        .from("evaluation_cycles")
        .select("id, title, status")
        .limit(1)
        .maybeSingle();

      if (cycles?.id) {
        setCycleId(cycles.id);

        const { data: evalRows, error } = await sb
          .from("evaluations")
          .select(
            `
            id,
            evaluation_cycle_id,
            indicator_id,
            self_score,
            evaluated_score,
            level_quality,
            strengths,
            weaknesses,
            improvement_plan,
            status,
            indicators:indicator_id(code, title_th, standard_id)
          `
          )
          .eq("evaluation_cycle_id", cycles.id);

        if (!error && evalRows && evalRows.length > 0) {
          interface EvalDbResultRow {
            indicator_id: string;
            self_score: number | string | null;
            evaluated_score: number | string | null;
            level_quality: string | null;
            strengths: string | null;
            weaknesses: string | null;
            improvement_plan: string | null;
            status: "draft" | "submitted" | "verified" | "approved" | null;
            indicators: { code?: string; title_th?: string; standard_id?: string } | null;
          }
          const evalMap = new Map<string, EvalDbResultRow>();
          (evalRows as unknown as EvalDbResultRow[]).forEach((row) => {
            const code = row.indicators?.code;
            if (code) evalMap.set(code, row);
          });

          const mergeState = (prev: IndicatorEvaluationState[]) =>
            prev.map((item) => {
              const row = evalMap.get(item.code);
              if (row) {
                return {
                  ...item,
                  indicatorId: row.indicator_id,
                  selfScore: row.self_score ? Number(row.self_score) : item.selfScore,
                  evaluatedScore: row.evaluated_score ? Number(row.evaluated_score) : null,
                  strengths: row.strengths ?? item.strengths,
                  weaknesses: row.weaknesses ?? item.weaknesses,
                  improvementPlan: row.improvement_plan ?? item.improvementPlan,
                  status: row.status ?? "draft",
                };
              }
              return item;
            });

          setBasicState((prev) => mergeState(prev));
          setEarlyState((prev) => mergeState(prev));
        }
      }
    } catch (err: unknown) {
      console.warn("fetchLiveEvaluations fallback:", err);
    }
  }, [sb]);

  useEffect(() => {
    void fetchLiveEvaluations();
  }, [fetchLiveEvaluations]);

  // Draft Auto-Save & Recovery state
  const draftStorageKey = `qa_eval_draft_${academicYear}_${levelTab}`;
  const [hasRecoverableDraft, setHasRecoverableDraft] = useState<{
    savedAt: string;
    count: number;
    data: Array<{
      code: string;
      selfScore: number;
      strengths?: string;
      weaknesses?: string;
      improvementPlan?: string;
      riskAssessment?: string;
      bestPracticeNote?: string;
    }>;
  } | null>(null);

  // Check for existing draft on tab / year change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
          const filledCount = parsed.data.filter(
            (d: { selfScore?: number; strengths?: string; weaknesses?: string }) =>
              (d.selfScore && d.selfScore > 0) || Boolean(d.strengths?.trim()) || Boolean(d.weaknesses?.trim())
          ).length;
          if (filledCount > 0) {
            setHasRecoverableDraft({
              savedAt: parsed.savedAt || new Date().toISOString(),
              count: filledCount,
              data: parsed.data,
            });
            return;
          }
        }
      }
      setHasRecoverableDraft(null);
    } catch {
      setHasRecoverableDraft(null);
    }
  }, [draftStorageKey]);

  // Auto-save draft changes to localStorage (debounced)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const filledItems = activeAllItems.filter(
      (item) => item.selfScore > 0 || item.strengths.trim() || item.weaknesses.trim() || item.improvementPlan.trim()
    );
    if (filledItems.length === 0) return;

    const timeout = setTimeout(() => {
      try {
        const payload = {
          savedAt: new Date().toISOString(),
          data: activeAllItems.map((item) => ({
            code: item.code,
            selfScore: item.selfScore,
            strengths: item.strengths,
            weaknesses: item.weaknesses,
            improvementPlan: item.improvementPlan,
            riskAssessment: item.riskAssessment,
            bestPracticeNote: item.bestPracticeNote,
          })),
        };
        localStorage.setItem(draftStorageKey, JSON.stringify(payload));
      } catch {
        // storage quota exceeded or disabled
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [activeAllItems, draftStorageKey]);

  const handleRestoreDraft = () => {
    if (!hasRecoverableDraft) return;
    const draftMap = new Map(hasRecoverableDraft.data.map((d) => [d.code, d]));
    setActiveAllItems((prev) =>
      prev.map((item) => {
        const d = draftMap.get(item.code);
        if (!d) return item;
        return {
          ...item,
          selfScore: d.selfScore > 0 ? d.selfScore : item.selfScore,
          strengths: d.strengths ?? item.strengths,
          weaknesses: d.weaknesses ?? item.weaknesses,
          improvementPlan: d.improvementPlan ?? item.improvementPlan,
          riskAssessment: d.riskAssessment ?? item.riskAssessment,
          bestPracticeNote: d.bestPracticeNote ?? item.bestPracticeNote,
        };
      })
    );
    setHasRecoverableDraft(null);
    showToast("กู้คืนข้อมูลแบบร่างสำเร็จแล้ว", "success", "กู้คืนข้อมูล");
  };

  const handleDismissDraft = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {}
    }
    setHasRecoverableDraft(null);
  };

  // Handle Score Change
  const handleScoreChange = (code: string, newScore: number) => {
    setActiveAllItems((prev) =>
      prev.map((item) => (item.code === code ? { ...item, selfScore: newScore } : item))
    );
  };

  // Handle Text Field Change
  const handleTextChange = (
    code: string,
    field: "strengths" | "weaknesses" | "improvementPlan" | "riskAssessment" | "bestPracticeNote",
    value: string
  ) => {
    setActiveAllItems((prev) =>
      prev.map((item) => (item.code === code ? { ...item, [field]: value } : item))
    );
  };

  // Calculate Standard Stats
  const standardStats = useMemo(() => {
    if (!currentStandardItems.length) return { avg: "0.00", num: 0, decision: "รอการประเมิน" };
    const scores = currentStandardItems.map((i) => i.selfScore);
    const validScores = scores.filter((s) => s > 0);
    const sum = validScores.reduce((acc, curr) => acc + curr, 0);
    const avgNum = validScores.length > 0 ? sum / validScores.length : 0;
    const decision = evaluateStandardStatus(scores);
    return {
      avg: avgNum.toFixed(2),
      num: avgNum,
      decision,
    };
  }, [currentStandardItems]);

  // Overall Across all Standards in the active level
  const overallStats = useMemo(() => {
    const scores = activeAllItems.map((i) => i.selfScore);
    const validScores = scores.filter((s) => s > 0);
    const sum = validScores.reduce((acc, curr) => acc + curr, 0);
    const avgNum = validScores.length > 0 ? sum / validScores.length : 0;
    const decision = evaluateStandardStatus(scores);
    const completedCount = validScores.length;
    const totalCount = activeAllItems.length;

    return {
      avg: avgNum.toFixed(2),
      num: avgNum,
      decision,
      completedCount,
      totalCount,
    };
  }, [activeAllItems]);

  // Execute Save / Submit
  const executeSaveEvaluations = async (targetStatus: "draft" | "submitted") => {
    setSaving(true);
    setStatusMessage(null);

    try {
      if (sb && cycleId) {
        const { data: indList } = await sb.from("indicators").select("id, code");
        const indMap = new Map<string, string>();
        if (indList) {
          indList.forEach((ind: { id: string; code: string }) => indMap.set(ind.code, ind.id));
        }

        for (const item of currentStandardItems) {
          const matchedIndId = item.indicatorId || indMap.get(item.code);
          if (matchedIndId) {
            await sb.from("evaluations").upsert(
              {
                evaluation_cycle_id: cycleId,
                indicator_id: matchedIndId,
                self_score: item.selfScore,
                level_quality: item.selfScore >= 3 ? "เป็นไปตามมาตรฐาน" : "อยู่ระหว่างการพัฒนา",
                strengths: item.strengths || null,
                weaknesses: item.weaknesses || null,
                improvement_plan: item.improvementPlan || null,
                status: targetStatus,
                evaluator_id: user?.id || null,
                evaluated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "evaluation_cycle_id,indicator_id" }
            );
          }
        }
      }

      // Update local state
      setActiveAllItems((prev) =>
        prev.map((item) => {
          const isCurrentStd = currentStandardItems.some((ci) => ci.code === item.code);
          return isCurrentStd ? { ...item, status: targetStatus } : item;
        })
      );

      // On successful save or submit to server, remove local backup draft
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(draftStorageKey);
        } catch {
          // ignore
        }
      }
      setHasRecoverableDraft(null);

      const successText =
        targetStatus === "submitted"
          ? `ส่งผลการประเมินตนเอง (SAR) ${currentStandard.code} เข้าสู่ระบบเรียบร้อยแล้ว`
          : `บันทึกแบบร่างผลประเมิน ${currentStandard.code} เรียบร้อยแล้ว`;

      setStatusMessage({ text: successText, type: "success" });
      showToast(successText, "success", "บันทึกเรียบร้อย");

      if (targetStatus === "submitted") {
        showAlert({
          title: `ส่งผลการประเมิน ${currentStandard.code} สำเร็จ!`,
          message: `บันทึกและส่งผลการประเมินตนเองตามมาตรฐาน "${currentStandard.title}" เข้าสู่ระบบเรียบร้อยแล้ว`,
          type: "success",
          nextStep: `สิ่งที่ควรทำต่อไป:\n1. ตรวจสอบคะแนนเฉลี่ยและระดับคุณภาพที่แท็บ "สรุปภาพรวม"\n2. สามารถไปที่เมนู "เอกสารและรายงาน SAR" เพื่อส่งออกไฟล์รายงานสรุปของโรงเรียนได้ทันที`,
          buttonText: "เข้าใจแล้ว / ดำเนินการต่อ",
        });
      } else {
        showAlert({
          title: `บันทึกแบบร่าง ${currentStandard.code} สำเร็จ`,
          message: `ระบบบันทึกแบบร่างคะแนนและข้อคิดเห็นของมาตรฐาน "${currentStandard.title}" ไว้แล้ว`,
          type: "info",
          nextStep: "ท่านสามารถกลับมาแก้ไขเพิ่มเติมคะแนน หรือแนบหลักฐานประกอบเพิ่มเติมได้ตลอดเวลาก่อนกดส่งผลประเมินจริง",
          buttonText: "รับทราบ",
        });
      }
    } catch (err: unknown) {
      console.error("Save evaluations error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      setStatusMessage({ text: msg, type: "error" });
      showToast(msg, "error", "บันทึกไม่สำเร็จ");

      showAlert({
        title: "ไม่สามารถบันทึกผลการประเมินได้",
        message: `สาเหตุ: ${msg}`,
        type: "error",
        nextStep: "กรุณาตรวจสอบสิทธิ์การเข้าใช้งาน หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองบันทึกใหม่อีกครั้ง",
        buttonText: "เข้าใจแล้ว",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleSaveEvaluations = (targetStatus: "draft" | "submitted" = "draft") => {
    if (targetStatus === "submitted") {
      showConfirm({
        title: "ยืนยันส่งผลการประเมินตนเอง (SAR)",
        message: `คุณต้องการส่งผลการประเมิน ${currentStandard.code} เข้าสู่ระบบเพื่อรองรับการตรวจเยี่ยมของ สมศ. ใช่หรือไม่?`,
        confirmText: "ยืนยันส่งผลประเมิน",
        cancelText: "ตรวจสอบอีกครั้ง",
        type: "primary",
        onConfirm: () => executeSaveEvaluations("submitted"),
      });
    } else {
      void executeSaveEvaluations("draft");
    }
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
              <ChartNoAxesCombined size={15} />
              <span>ระบบบันทึกผลการประเมินตนเองตามกรอบ สมศ. (พ.ศ. ๒๕๖๗ - ๒๕๗๑)</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#fff", fontWeight: 700 }}>
              ประเมินผลคุณภาพสถานศึกษา (SAR Self-Assessment Engine)
            </h1>
            <p style={{ margin: "6px 0 0", color: "#cbd5e1", fontSize: 13 }}>
              โรงเรียนเทศบาล ๑ บ้านกลาง • ประจำปีการศึกษา {academicYear}
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
                transition: "all 0.2s ease",
              }}
              onClick={() => setLevelTab("basic")}
            >
              <BookOpen size={16} />
              ขั้นพื้นฐาน (16 ตัวชี้วัด)
            </button>
          </div>
        </div>

        {/* Stats summary row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          {/* Current Standard Rating */}
          <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: 12, borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: "#93c5fd", display: "block" }}>
              ผลคะแนนเฉลี่ย {currentStandard.code}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <strong style={{ fontSize: 24, color: "#ffffff" }}>{standardStats.avg}</strong>
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontWeight: 600,
                  background:
                    standardStats.decision === "เป็นไปตามมาตรฐาน"
                      ? "#dcfce7"
                      : standardStats.decision === "อยู่ระหว่างการพัฒนา"
                      ? "#ffedd5"
                      : "#f1f5f9",
                  color:
                    standardStats.decision === "เป็นไปตามมาตรฐาน"
                      ? "#15803d"
                      : standardStats.decision === "อยู่ระหว่างการพัฒนา"
                      ? "#c2410c"
                      : "#64748b",
                }}
              >
                {standardStats.decision}
              </span>
            </div>
          </div>

          {/* Overall Framework Rating */}
          <div style={{ background: "rgba(255, 255, 255, 0.12)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)" }}>
            <span style={{ fontSize: 11, color: "#bfdbfe", display: "block" }}>
              การตัดสินภาพรวม สมศ. ({levelTab === "early" ? "ปฐมวัย" : "ขั้นพื้นฐาน"})
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <strong style={{ fontSize: 24, color: "#ffffff" }}>{overallStats.avg}</strong>
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontWeight: 700,
                  background:
                    overallStats.decision === "เป็นไปตามมาตรฐาน"
                      ? "#22c55e"
                      : overallStats.decision === "อยู่ระหว่างการพัฒนา"
                      ? "#f97316"
                      : "#94a3b8",
                  color: "#ffffff",
                }}
              >
                {overallStats.decision}
              </span>
            </div>
          </div>

          {/* Progress Count */}
          <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: 12, borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: "#93c5fd", display: "block" }}>
              ความก้าวหน้าการประเมิน
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
              <strong style={{ fontSize: 24, color: "#ffffff" }}>
                {overallStats.completedCount}/{overallStats.totalCount}
              </strong>
              <span style={{ fontSize: 12, color: "#cbd5e1" }}>ตัวชี้วัดที่ได้รับการประเมิน</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recoverable Draft Backup Banner */}
      {hasRecoverableDraft && (
        <div
          className="panel"
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 12,
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <RotateCcw size={18} color="#d97706" />
            <div style={{ fontSize: 13, color: "#92400e" }}>
              <strong>พบข้อมูลแบบร่างที่บันทึกสำรองไว้ในอุปกรณ์นี้</strong> ({hasRecoverableDraft.count} ตัวชี้วัด • สำรองล่าสุดเมื่อ{" "}
              {new Date(hasRecoverableDraft.savedAt).toLocaleDateString("th-TH")}{" "}
              {new Date(hasRecoverableDraft.savedAt).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              )
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="primary-button"
              style={{
                padding: "6px 14px",
                fontSize: 12,
                background: "#d97706",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RotateCcw size={14} />
              กู้คืนแบบร่าง
            </button>
            <button
              type="button"
              onClick={handleDismissDraft}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#64748b",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Trash2 size={13} />
              ละทิ้ง
            </button>
          </div>
        </div>
      )}

      {/* Alert message */}
      {statusMessage && (
        <div
          style={{
            background: statusMessage.type === "success" ? "#f0fdf4" : "#fef2f2",
            borderColor: statusMessage.type === "success" ? "#86efac" : "#fca5a5",
            color: statusMessage.type === "success" ? "#166534" : "#991b1b",
            padding: "10px 14px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid",
            fontSize: 13,
          }}
        >
          {statusMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Standards Selection Tabs */}
      <div
        className="table-tabs"
        style={{
          background: "#fff",
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid var(--line)",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {standardsList.map((std) => (
          <button
            key={std.id}
            className={selectedStandardId === std.id ? "selected" : ""}
            onClick={() => setSelectedStandardId(std.id)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px" }}
          >
            <BookOpen size={15} />
            <span>
              {std.code}: {std.title} ({std.indicatorCount} ตัวชี้วัด)
            </span>
          </button>
        ))}
      </div>

      {/* Assessment Header and Action Bar */}
      <div className="panel" style={{ padding: 18, borderRadius: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ fontSize: 17, margin: 0, color: "#0f172a", fontWeight: 700 }}>
              {currentStandard.code} — {currentStandard.title}
            </h2>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              {currentStandard.description}
            </span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="primary-button"
              style={{ background: "#ffffff", color: "#1e40af", border: "1px solid #bfdbfe" }}
              onClick={() => handleSaveEvaluations("draft")}
              disabled={saving}
            >
              {saving ? <Loader2 size={15} className="spinner" /> : <Save size={15} />}
              บันทึกแบบร่าง (Draft)
            </button>

            <button
              className="primary-button"
              onClick={() => handleSaveEvaluations("submitted")}
              disabled={saving}
              style={{
                background: "linear-gradient(120deg, #10b981, #059669)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Send size={15} />
              ส่งผลการประเมิน (Submit SAR)
            </button>
          </div>
        </div>

        {/* Indicator Cards List */}
        <div style={{ display: "grid", gap: 16 }}>
          {currentStandardItems.map((item) => {
            const isExpanded = expandedCode === item.code;
            return (
              <div
                key={item.code}
                style={{
                  border: isExpanded ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                  borderRadius: 12,
                  background: isExpanded ? "#f8fafc" : "#ffffff",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedCode((prev) => (prev === item.code ? null : item.code))}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 20px",
                    cursor: "pointer",
                    background: isExpanded ? "#f1f5f9" : "transparent",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "grid", gap: 4, maxWidth: "70%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                        ตัวชี้วัดที่ {item.code}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 10,
                          fontWeight: 600,
                          background: item.selfScore >= 3 ? "#dcfce7" : item.selfScore > 0 ? "#ffedd5" : "#f1f5f9",
                          color: item.selfScore >= 3 ? "#166534" : item.selfScore > 0 ? "#c2410c" : "#64748b",
                        }}
                      >
                        {item.selfScore >= 3
                          ? "เป็นไปตามมาตรฐาน"
                          : item.selfScore > 0
                          ? "อยู่ระหว่างการพัฒนา"
                          : "รอประเมิน"}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                      {item.title}
                    </div>
                  </div>

                  {/* Rating Selector */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span style={{ fontSize: 12, color: "#64748b" }}>ระดับคุณภาพ:</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[1, 2, 3, 4, 5].map((lvl) => {
                        const isSelected = item.selfScore === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => handleScoreChange(item.code, lvl)}
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              border: isSelected ? "2px solid #1e40af" : "1px solid #cbd5e1",
                              background: isSelected
                                ? lvl >= 4
                                  ? "#16a34a"
                                  : lvl === 3
                                  ? "#2563eb"
                                  : "#ea580c"
                                : "#ffffff",
                              color: isSelected ? "#ffffff" : "#334155",
                              fontWeight: 700,
                              fontSize: 14,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                            title={`ระดับ ${lvl}`}
                          >
                            {lvl}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedCode((prev) => (prev === item.code ? null : item.code))}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#64748b",
                        padding: 4,
                      }}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details and Form */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "20px",
                      borderTop: "1px solid #e2e8f0",
                      display: "grid",
                      gap: 16,
                      background: "#ffffff",
                    }}
                  >
                    {/* Rubric Details for the chosen score */}
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: item.selfScore >= 4 ? "#f0fdf4" : item.selfScore === 3 ? "#eff6ff" : "#fff7ed",
                        border: item.selfScore >= 4 ? "1px solid #bbf7d0" : item.selfScore === 3 ? "1px solid #bfdbfe" : "1px solid #fed7aa",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: 4 }}>
                        {item.selfScore > 0
                          ? ONESQA_RATING_RUBRICS.find((r) => r.level === item.selfScore)?.title
                          : "คำแนะนำเกณฑ์ระดับ ๓ (มาตรฐานขั้นต้นของ สมศ.):"}
                      </strong>
                      <span>
                        {item.selfScore > 0
                          ? ONESQA_RATING_RUBRICS.find((r) => r.level === item.selfScore)?.description
                          : "สถานศึกษาต้องดำเนินการครบถ้วนตามรายการพิจารณาระดับ (๓) และมีหลักฐานเชิงประจักษ์ตรวจสอบได้ จึงจะถือว่า 'เป็นไปตามมาตรฐาน'"}
                      </span>
                    </div>

                    {/* Criteria Level 3 Checklist */}
                    <div
                      style={{
                        padding: 12,
                        background: "#f8fafc",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <strong style={{ fontSize: 13, color: "#1e40af", display: "block", marginBottom: 6 }}>
                        รายการพิจารณาระดับ (๓) ที่ต้องมีหลักฐานรองรับ:
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                        {item.criteria.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Two-Column Form for Strengths, Weaknesses, and Improvement */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#15803d", marginBottom: 4 }}>
                          จุดเด่น (Strengths) ที่ประสบความสำเร็จ:
                        </label>
                        <textarea
                          rows={3}
                          value={item.strengths}
                          onChange={(e) => handleTextChange(item.code, "strengths", e.target.value)}
                          placeholder="ระบุจุดเด่น วิธีการ หรือกระบวนการที่โรงเรียนทำได้ดีเยี่ยม..."
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            fontSize: 13,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>
                          จุดที่ควรพัฒนา (Areas for Improvement):
                        </label>
                        <textarea
                          rows={3}
                          value={item.weaknesses}
                          onChange={(e) => handleTextChange(item.code, "weaknesses", e.target.value)}
                          placeholder="ระบุข้อจำกัด หรือสิ่งที่ยังต้องพัฒนาให้ครบตามเกณฑ์..."
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            fontSize: 13,
                          }}
                        />
                      </div>
                    </div>

                    {/* Four-Dimensional Feedback per ONESQA Manual Chapter 3 */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1d4ed8", marginBottom: 4 }}>
                          แผนพัฒนาปรับปรุง (Improvement Plan / Internal Correction):
                        </label>
                        <textarea
                          rows={3}
                          value={item.improvementPlan}
                          onChange={(e) => handleTextChange(item.code, "improvementPlan", e.target.value)}
                          placeholder="แผนงาน/กิจกรรมที่จะดำเนินการแก้ไขด่วนหรือยกระดับคุณภาพ..."
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            fontSize: 13,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#c2410c", marginBottom: 4 }}>
                          การบริหารความเสี่ยง (Risk-R):
                        </label>
                        <textarea
                          rows={3}
                          value={item.riskAssessment}
                          onChange={(e) => handleTextChange(item.code, "riskAssessment", e.target.value)}
                          placeholder="วิเคราะห์ปัจจัยเสี่ยงและมาตรการป้องกันความเสี่ยงในอนาคต..."
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            fontSize: 13,
                          }}
                        />
                      </div>
                    </div>

                    {/* Best Practice Note if Score is 5 */}
                    {item.selfScore === 5 && (
                      <div
                        style={{
                          background: "#f0fdf4",
                          padding: 12,
                          borderRadius: 8,
                          border: "1px solid #86efac",
                        }}
                      >
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 4 }}>
                          ร่องรอยการเป็นแบบอย่างที่ดี (Best Practice):
                        </label>
                        <input
                          type="text"
                          value={item.bestPracticeNote}
                          onChange={(e) => handleTextChange(item.code, "bestPracticeNote", e.target.value)}
                          placeholder="ระบุชื่อนวัตกรรม รางวัลที่ได้รับ หรือการเผยแพร่ที่เป็นแบบอย่าง..."
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: "1px solid #86efac",
                            fontSize: 13,
                          }}
                        />
                      </div>
                    )}

                    {/* Navigate to attach evidence */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                      {onNavigateToEvidence && (
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                          onClick={() => onNavigateToEvidence(item.code)}
                        >
                          <FileCheck2 size={15} /> ผูกร่องรอยหลักฐานกับตัวชี้วัด {item.code}
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
    </div>
  );
}
