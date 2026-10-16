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
  ExternalLink,
  ChevronRight,
  Sparkles,
  BookOpen,
} from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { School, Indicator } from "@/types/database";

interface EvaluationsModuleProps {
  school?: School | null;
  user?: User | null;
  client?: SupabaseClient | null;
  indicators?: Indicator[];
  academicYear?: string;
  onNavigateToEvidence?: (indicatorCode?: string) => void;
}

interface StandardDef {
  id: number;
  code: string;
  name: string;
  desc: string;
}

const standardsList: StandardDef[] = [
  {
    id: 1,
    code: "มาตรฐานที่ 1",
    name: "คุณภาพของผู้เรียน",
    desc: "ผลสัมฤทธิ์ทางวิชาการและคุณลักษณะที่พึงประสงค์ของผู้เรียน",
  },
  {
    id: 2,
    code: "มาตรฐานที่ 2",
    name: "กระบวนการบริหารและการจัดการ",
    desc: "ระบบบริหารจัดการคุณภาพ การพัฒนาวิชาการ และสภาพแวดล้อมที่เอื้อต่อการเรียนรู้",
  },
  {
    id: 3,
    code: "มาตรฐานที่ 3",
    name: "กระบวนการจัดการเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญ",
    desc: "การจัดการเรียนรู้เชิงรุก (Active Learning) การใช้สื่อเทคโนโลยี และการวัดประเมินผล",
  },
];

interface IndicatorEvaluationState {
  indicatorId?: string;
  code: string;
  title: string;
  criteria: string;
  weight: number;
  selfScore: number;
  evaluatedScore?: number | null;
  strengths: string;
  weaknesses: string;
  improvementPlan: string;
  status: "draft" | "submitted" | "verified" | "approved";
  evidenceCount: number;
}

const defaultIndicatorsByStandard: Record<number, IndicatorEvaluationState[]> = {
  1: [
    {
      code: "1.1",
      title: "ผู้เรียนมีพัฒนาการด้านร่างกาย สมวัย มีสุขนิสัยที่ดี และดูแลความปลอดภัยตนเองได้",
      criteria: "ตรวจสอบจากบันทึกสุขภาพ การชั่งน้ำหนักส่วนสูง การทดสอบสมรรถภาพทางกาย และโครงการส่งเสริมสุขภาวะ",
      weight: 1.0,
      selfScore: 4.5,
      strengths: "นักเรียนส่วนใหญ่มีน้ำหนักส่วนสูงตามเกณฑ์มาตรฐาน และเข้าร่วมกิจกรรมกีฬา/สุขนิสัยอย่างสม่ำเสมอ",
      weaknesses: "นักเรียนบางส่วนยังขาดทักษะการเลือกบริโภคอาหารที่มีประโยชน์นอกโรงเรียน",
      improvementPlan: "จัดโครงการรณรงค์อาหารปลอดภัยและส่งเสริมกิจกรรมออกกำลังกายยามเช้า",
      status: "draft",
      evidenceCount: 4,
    },
    {
      code: "1.2",
      title: "ผู้เรียนมีคุณธรรม จริยธรรม ค่านิยมที่พึงประสงค์ และจิตสาธารณะ",
      criteria: "ตรวจสอบจากโครงการวิถีพุทธ กิจกรรมจิตอาสา บันทึกความดี และการประเมินพฤติกรรมนักเรียน",
      weight: 1.0,
      selfScore: 4.8,
      strengths: "นักเรียนมีระเบียบวินัย ไหว้สวย และเข้าร่วมกิจกรรมบำเพ็ญประโยชน์ต่อชุมชนบ้านกลางอย่างต่อเนื่อง",
      weaknesses: "การขยายผลด้านจิตสาธารณะสู่ครอบครัวและชุมชนภายนอกยังทำได้ไม่ครอบคลุม",
      improvementPlan: "เพิ่มกิจกรรมจิตอาสาร่วมกับชุมชนเทศบาลตำบลบ้านกลางและเครือข่ายผู้ปกครอง",
      status: "draft",
      evidenceCount: 5,
    },
    {
      code: "1.3",
      title: "ผู้เรียนมีความสามารถในการอ่าน คิดวิเคราะห์ และเขียนสื่อความ",
      criteria: "ตรวจสอบจากผลการทดสอบการอ่าน (RT ป.1) ผลประเมินสมรรถภาพการอ่านระดับชาติ และผลงานเขียนเชิงสร้างสรรค์",
      weight: 1.5,
      selfScore: 4.2,
      strengths: "ผลการทดสอบ RT ชั้น ป.1 สูงกว่าค่าเฉลี่ยระดับประเทศอย่างต่อเนื่อง และมีโครงการส่งเสริมการอ่านทุกวัน",
      weaknesses: "นักเรียนระดับมัธยมศึกษาตอนต้นบางส่วนยังขาดทักษะการสรุปใจความสำคัญและการคิดวิเคราะห์เชิงลึก",
      improvementPlan: "ส่งเสริมการจัดการเรียนรู้แบบ Inquiry-based Learning และเพิ่มคลังแบบฝึกทักษะการอ่านวิเคราะห์",
      status: "draft",
      evidenceCount: 3,
    },
    {
      code: "1.4",
      title: "ผู้เรียนมีทักษะการใช้เทคโนโลยีดิจิทัลและการสื่อสารอย่างปลอดภัย",
      criteria: "ตรวจสอบจากผลสัมฤทธิ์รายวิชาวิทยาการคำนวณ ชิ้นงานดิจิทัล และการประกวดโครงงานคอมพิวเตอร์",
      weight: 1.0,
      selfScore: 4.0,
      strengths: "โรงเรียนมีห้องปฏิบัติการคอมพิวเตอร์พร้อมใช้งาน และนักเรียนมีทักษะสืบค้นข้อมูลพื้นฐานได้ดี",
      weaknesses: "นักเรียนยังต้องเสริมทักษะความตระหนักรู้ด้านความปลอดภัยทางไซเบอร์ (Cyber Hygiene)",
      improvementPlan: "จัดอบรมหลักสูตรการรู้เท่าทันสื่อดิจิทัลและกฎหมายคอมพิวเตอร์สำหรับเยาวชน",
      status: "draft",
      evidenceCount: 2,
    },
    {
      code: "1.5",
      title: "ผู้เรียนมีสุขภาวะทางจิตและสังคม มีผลสัมฤทธิ์ทางการเรียนตามหลักสูตร",
      criteria: "ตรวจสอบจากระบบดูแลช่วยเหลือนักเรียน (SDQ), ผลสัมฤทธิ์ทางการเรียน 8 กลุ่มสาระฯ และผลการทดสอบ O-NET",
      weight: 1.0,
      selfScore: 4.6,
      strengths: "ระบบคัดกรองและให้คำปรึกษาดูแลช่วยเหลือนักเรียนมีความเข้มแข็ง นักเรียนมีความสุขในการเรียนรู้",
      weaknesses: "ผลสัมฤทธิ์ในกลุ่มสาระฯ คณิตศาสตร์และภาษาอังกฤษยังต้องยกระดับต่อเนื่อง",
      improvementPlan: "จัดคลินิกวิชาการซ่อมเสริมรายวิชาหลักและติวเข้มข้อสอบมาตรฐานระดับชาติ",
      status: "draft",
      evidenceCount: 6,
    },
  ],
  2: [
    {
      code: "2.1",
      title: "สถานศึกษามีเป้าหมาย วิสัยทัศน์ และพันธกิจที่กำหนดไว้อย่างชัดเจน สอดคล้องกับบริบทท้องถิ่น",
      criteria: "ตรวจสอบจากแผนพัฒนาคุณภาพการศึกษา 5 ปี แผนปฏิบัติการประจำปี และมติความเห็นชอบของคณะกรรมการสถานศึกษา",
      weight: 1.0,
      selfScore: 4.7,
      strengths: "วิสัยทัศน์ชัดเจน มุ่งเน้นการพัฒนาผู้เรียนตามอัตลักษณ์ท้องถิ่นบ้านกลางและทักษะแห่งศตวรรษที่ 21",
      weaknesses: "การมีส่วนร่วมของภาคีเครือข่ายเอกชนในพื้นที่ยังสามารถขยายเพิ่มขึ้นได้อีก",
      improvementPlan: "เปิดเวทีประชาคมรับฟังความคิดเห็นจากผู้มีส่วนได้ส่วนเสียในตำบลบ้านกลางเป็นประจำทุกปี",
      status: "draft",
      evidenceCount: 4,
    },
    {
      code: "2.2",
      title: "มีระบบบริหารจัดการคุณภาพของสถานศึกษาที่เป็นระบบและตรวจสอบได้",
      criteria: "ตรวจสอบจากรายงานการประเมินตนเอง (SAR) คำสั่งแต่งตั้งคณะทำงานประกันคุณภาพ และบันทึกการประชุม",
      weight: 1.5,
      selfScore: 4.6,
      strengths: "ใช้ระบบบริหารข้อมูลดิจิทัล School QA Center ทำให้สามารถติดตามงานและตรวจสอบหลักฐานได้สะดวกรวดเร็ว",
      weaknesses: "การสื่อสารข้อมูลประกันคุณภาพสู่ผู้ปกครองทั่วไปยังต้องเพิ่มช่องทางการเผยแพร่",
      improvementPlan: "จัดทำ Infographic สรุปผล SAR เผยแพร่ผ่านเว็บไซต์และเพจประชาสัมพันธ์ของโรงเรียน",
      status: "draft",
      evidenceCount: 5,
    },
    {
      code: "2.3",
      title: "การดำเนินงานพัฒนาวิชาการที่เน้นคุณภาพผู้เรียนรอบด้านตามหลักสูตรสถานศึกษา",
      criteria: "ตรวจสอบจากหลักสูตรสถานศึกษา แผนการเรียนรู้ที่บูรณาการท้องถิ่น และกิจกรรมเสริมหลักสูตร",
      weight: 1.0,
      selfScore: 4.5,
      strengths: "หลักสูตรสถานศึกษามีความยืดหยุ่น บูรณาการภูมิปัญญาท้องถิ่นลำพูนและการเรียนรู้เพื่อการมีงานทำ",
      weaknesses: "การปรับปรุงหลักสูตรให้ตอบรับกับการเปลี่ยนแปลงทางเทคโนโลยีสมัยใหม่ต้องทำอย่างต่อเนื่อง",
      improvementPlan: "ทบทวนและปรับปรุงโครงสร้างหลักสูตรสถานศึกษาทุกๆ 2 ปีการศึกษา",
      status: "draft",
      evidenceCount: 3,
    },
  ],
  3: [
    {
      code: "3.1",
      title: "จัดการเรียนรู้ผ่านกระบวนการคิดและปฏิบัติจริง (Active Learning) และนำไปประยุกต์ใช้ในชีวิตได้",
      criteria: "ตรวจสอบจากแผนการจัดการเรียนรู้ บันทึกหลังสอน คลิปวิดีโอการสอน และชิ้นงานโครงงานของนักเรียน",
      weight: 1.5,
      selfScore: 4.4,
      strengths: "ครูทุกคนจัดทำแผนการสอนแบบ Active Learning เน้นให้นักเรียนได้ลงมือปฏิบัติและนำเสนอผลงาน",
      weaknesses: "เทคนิคการตั้งคำถามกระตุ้นกระบวนการคิดขั้นสูง (Higher-order Thinking) ยังต้องพัฒนาเพิ่มขึ้น",
      improvementPlan: "จัดกิจกรรมชุมชนแห่งการเรียนรู้ทางวิชาชีพ (PLC) ด้านการสร้างคำถามกระตุ้นความคิดสร้างสรรค์",
      status: "draft",
      evidenceCount: 4,
    },
    {
      code: "3.2",
      title: "ใช้สื่อ เทคโนโลยีสารสนเทศ และแหล่งเรียนรู้ที่เอื้อต่อการเรียนรู้",
      criteria: "ตรวจสอบจากบันทึกการใช้ห้องสมุด ห้องคอมพิวเตอร์ สื่อการสอนดิจิทัล และการใช้แพลตฟอร์มการเรียนรู้",
      weight: 1.0,
      selfScore: 4.5,
      strengths: "ครูผลิตสื่อดิจิทัลและใช้แอปพลิเคชันเพื่อการศึกษา เช่น Canva, Kahoot, Google Classroom อย่างแพร่หลาย",
      weaknesses: "อุปกรณ์ช่วยสอนประจำบางห้องเรียนต้องได้รับการบำรุงรักษาและอัปเกรดให้ทันสมัย",
      improvementPlan: "จัดสรรงบประมาณซ่อมบำรุงและจัดซื้ออุปกรณ์คอมพิวเตอร์/สมาร์ททีวีประจำห้องเรียนให้ครบถ้วน",
      status: "draft",
      evidenceCount: 3,
    },
  ],
};

interface EvalDbRow {
  id: string;
  evaluation_cycle_id: string;
  indicator_id: string;
  self_score: number | string | null;
  evaluated_score: number | string | null;
  level_quality: string | null;
  strengths: string | null;
  weaknesses: string | null;
  improvement_plan: string | null;
  status: "draft" | "submitted" | "verified" | "approved" | null;
  indicators?: { code?: string; title_th?: string; standard_id?: string } | null;
}

export function EvaluationsModule({
  user,
  client,
  academicYear = "2567",
  onNavigateToEvidence,
}: EvaluationsModuleProps) {
  const sb = client ?? getSupabase();

  const [selectedStandard, setSelectedStandard] = useState(1);
  const [evaluationsState, setEvaluationsState] = useState<Record<number, IndicatorEvaluationState[]>>(
    defaultIndicatorsByStandard
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>("1.1");

  // Fetch live evaluations from Supabase
  const fetchLiveEvaluations = useCallback(async () => {
    if (!sb) return;
    setLoading(true);
    try {
      // 1. Find or verify evaluation_cycle for academic year
      const { data: cycles } = await sb
        .from("evaluation_cycles")
        .select("id, title, status")
        .limit(1)
        .maybeSingle();

      if (cycles?.id) {
        setCycleId(cycles.id);

        // 2. Fetch existing evaluations with indicator details
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
          // Merge fetched rows into state
          setEvaluationsState((prevState) => {
            const nextState = { ...prevState };
            const typedRows = evalRows as unknown as EvalDbRow[];

            typedRows.forEach((row) => {
              const code = row.indicators?.code;
              if (!code) return;

              const stdNum = parseInt(code.split(".")[0], 10);
              if (nextState[stdNum]) {
                nextState[stdNum] = nextState[stdNum].map((item) => {
                  if (item.code === code) {
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
              }
            });

            return nextState;
          });
        }
      }
    } catch (err: unknown) {
      console.warn("fetchLiveEvaluations fallback:", err);
    } finally {
      setLoading(false);
    }
  }, [sb]);

  useEffect(() => {
    void fetchLiveEvaluations();
  }, [fetchLiveEvaluations]);

  // Quality Level Helper
  const getQuality = (score: number) => {
    if (score >= 4.5) return { text: "ยอดเยี่ยม", color: "#10b981", bg: "#e6f9f0" };
    if (score >= 3.75) return { text: "ดีเลิศ", color: "#2563eb", bg: "#eff6ff" };
    if (score >= 3.0) return { text: "ดี", color: "#d97706", bg: "#fffbeb" };
    if (score >= 2.0) return { text: "ปานกลาง", color: "#ea580c", bg: "#fff7ed" };
    return { text: "กำลังพัฒนา", color: "#dc2626", bg: "#fef2f2" };
  };

  // Calculate Standard Average
  const currentStandardItems = useMemo(
    () => evaluationsState[selectedStandard] || [],
    [evaluationsState, selectedStandard]
  );

  const standardStats = useMemo(() => {
    if (!currentStandardItems.length) return { avg: "0.00", num: 0 };
    let totalWeight = 0;
    let weightedSum = 0;

    currentStandardItems.forEach((item) => {
      weightedSum += item.selfScore * item.weight;
      totalWeight += item.weight;
    });

    const avgNum = totalWeight > 0 ? weightedSum / totalWeight : 0;
    return {
      avg: avgNum.toFixed(2),
      num: avgNum,
    };
  }, [currentStandardItems]);

  // Overall School Average across all standards
  const overallStats = useMemo(() => {
    let totalWeight = 0;
    let weightedSum = 0;

    Object.values(evaluationsState).forEach((items) => {
      items.forEach((item) => {
        weightedSum += item.selfScore * item.weight;
        totalWeight += item.weight;
      });
    });

    const avgNum = totalWeight > 0 ? weightedSum / totalWeight : 0;
    return {
      avg: avgNum.toFixed(2),
      num: avgNum,
    };
  }, [evaluationsState]);

  // Handle Score Change
  const handleScoreChange = (code: string, newScore: number) => {
    setEvaluationsState((prev) => {
      const items = prev[selectedStandard] || [];
      const updated = items.map((it) => (it.code === code ? { ...it, selfScore: newScore } : it));
      return { ...prev, [selectedStandard]: updated };
    });
  };

  // Handle Text Field Change
  const handleTextChange = (
    code: string,
    field: "strengths" | "weaknesses" | "improvementPlan",
    value: string
  ) => {
    setEvaluationsState((prev) => {
      const items = prev[selectedStandard] || [];
      const updated = items.map((it) => (it.code === code ? { ...it, [field]: value } : it));
      return { ...prev, [selectedStandard]: updated };
    });
  };

  // Save / Submit Evaluations
  const handleSaveEvaluations = async (targetStatus: "draft" | "submitted" = "draft") => {
    setSaving(true);
    setStatusMessage(null);

    try {
      if (sb) {
        // Query indicator IDs to match codes
        const { data: indList } = await sb.from("indicators").select("id, code");
        const indMap = new Map<string, string>();
        if (indList) {
          indList.forEach((ind: { id: string; code: string }) => indMap.set(ind.code, ind.id));
        }

        const itemsToSave = evaluationsState[selectedStandard] || [];

        // Save each item
        for (const item of itemsToSave) {
          const matchedIndId = item.indicatorId || indMap.get(item.code);
          const qText = getQuality(item.selfScore).text;

          if (matchedIndId && cycleId) {
            await sb.from("evaluations").upsert(
              {
                evaluation_cycle_id: cycleId,
                indicator_id: matchedIndId,
                self_score: item.selfScore,
                level_quality: qText,
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

        // Update local status
        setEvaluationsState((prev) => {
          const items = prev[selectedStandard] || [];
          const updated = items.map((it) => ({ ...it, status: targetStatus }));
          return { ...prev, [selectedStandard]: updated };
        });

        setStatusMessage({
          text:
            targetStatus === "submitted"
              ? "ส่งผลการประเมินตนเอง (SAR) เข้าสู่ระบบเรียบร้อยแล้ว พร้อมให้ผู้บริหารและคณะกรรมการตรวจสอบ"
              : "บันทึกแบบร่างผลการประเมินลงฐานข้อมูลเรียบร้อยแล้ว",
          type: "success",
        });
      } else {
        setStatusMessage({
          text: "บันทึกผลการประเมินเรียบร้อย (Mock mode)",
          type: "success",
        });
      }
    } catch (err: unknown) {
      console.error("Save evaluations error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      setStatusMessage({ text: msg, type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const stdQuality = getQuality(standardStats.num);
  const overallQuality = getQuality(overallStats.num);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Top Banner */}
      <div className="panel" style={{ background: "linear-gradient(135deg, #1b3d68, #112847)", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#89c4f4", fontSize: 13, marginBottom: 4 }}>
              <ChartNoAxesCombined size={18} />
              <span>ระบบบันทึกผลการประเมินตนเองของสถานศึกษา (SAR Self-Assessment Engine)</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#fff" }}>
              ผลการประเมินคุณภาพภายในสถานศึกษา (IQA)
            </h1>
            <p style={{ margin: "6px 0 0", color: "#c5daf0", fontSize: 13 }}>
              เกณฑ์ประเมิน 5 ระดับคุณภาพตามมาตรฐานการศึกษา สังกัดองค์กรปกครองส่วนท้องถิ่น ปีการศึกษา {academicYear}
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {/* Standard Average */}
            <div style={{ background: "#ffffff14", padding: "10px 16px", borderRadius: 10, minWidth: 150 }}>
              <span style={{ fontSize: 11, color: "#b9d4f2", display: "block" }}>
                มาตรฐานที่ {selectedStandard}
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                <strong style={{ fontSize: 22, color: "#fff" }}>{standardStats.avg}</strong>
                <span style={{ fontSize: 12, color: stdQuality.color, fontWeight: 700, background: "#ffffff", padding: "1px 8px", borderRadius: 10 }}>
                  {stdQuality.text}
                </span>
              </div>
            </div>

            {/* Overall School Average */}
            <div style={{ background: "#ffffff22", padding: "10px 16px", borderRadius: 10, minWidth: 150, border: "1px solid #ffffff33" }}>
              <span style={{ fontSize: 11, color: "#dbe8f7", display: "block" }}>
                ภาพรวมทั้ง 3 มาตรฐาน
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                <strong style={{ fontSize: 22, color: "#fff" }}>{overallStats.avg}</strong>
                <span style={{ fontSize: 12, color: overallQuality.color, fontWeight: 700, background: "#ffffff", padding: "1px 8px", borderRadius: 10 }}>
                  {overallQuality.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Feedback Alert */}
      {statusMessage && (
        <div
          className="inline-alert"
          style={{
            background: statusMessage.type === "success" ? "#e6f9f0" : "#fef0f0",
            borderColor: statusMessage.type === "success" ? "#9ee0be" : "#f8b4b4",
            color: statusMessage.type === "success" ? "#0d7845" : "#b91c1c",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {statusMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Standard Tabs Switcher */}
      <div className="table-tabs" style={{ background: "#fff", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)" }}>
        {standardsList.map((s) => (
          <button
            key={s.id}
            className={selectedStandard === s.id ? "selected" : ""}
            onClick={() => setSelectedStandard(s.id)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <BookOpen size={14} />
            <span>{s.code}: {s.name}</span>
          </button>
        ))}
      </div>

      {/* Main Assessment Matrix Panel */}
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div className="panel-title">
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>
                {standardsList.find((s) => s.id === selectedStandard)?.code} — {standardsList.find((s) => s.id === selectedStandard)?.name}
              </h2>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {standardsList.find((s) => s.id === selectedStandard)?.desc}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="primary-button"
              style={{ background: "#ffffff", color: "#1e3a8a", border: "1px solid #bfdbfe" }}
              onClick={() => handleSaveEvaluations("draft")}
              disabled={saving}
            >
              {saving ? <Loader2 size={15} className="spinner" style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
              บันทึกแบบร่าง (Draft)
            </button>

            <button
              className="primary-button"
              onClick={() => handleSaveEvaluations("submitted")}
              disabled={saving}
              style={{ background: "linear-gradient(120deg, #10b981, #059669)", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Send size={15} />
              ส่งผลการประเมิน (Submit SAR)
            </button>
          </div>
        </div>

        {/* Indicators Evaluation Cards */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
            <Loader2 size={28} className="spinner" style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: 13 }}>กำลังโหลดเกณฑ์และผลประเมินจาก Supabase...</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {currentStandardItems.map((item) => {
              const q = getQuality(item.selfScore);
              const isExpanded = expandedCode === item.code;

              return (
                <div
                  key={item.code}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 16,
                    background: "#ffffff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {/* Header Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 360px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            background: "#0f3a68",
                            color: "#fff",
                            padding: "2px 8px",
                            borderRadius: 4,
                          }}
                        >
                          ตัวชี้วัด {item.code}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          น้ำหนัก: {item.weight.toFixed(1)}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 12,
                            background: item.status === "submitted" ? "#e6f9f0" : "#f1f5f9",
                            color: item.status === "submitted" ? "#0d7845" : "#475569",
                            fontWeight: 600,
                          }}
                        >
                          {item.status === "submitted" ? "ส่งแล้ว (Submitted)" : "แบบร่าง (Draft)"}
                        </span>
                      </div>

                      <strong style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.5, display: "block" }}>
                        {item.title}
                      </strong>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                        เกณฑ์พิจารณา: {item.criteria}
                      </p>
                    </div>

                    {/* Score Badge and Toggle Details */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>คะแนนประเมินตนเอง</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: q.color, background: q.bg, padding: "2px 8px", borderRadius: 8 }}>
                            ระดับ{q.text}
                          </span>
                          <span style={{ fontSize: 18, fontWeight: 800, color: "#0f3a68" }}>
                            {item.selfScore.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedCode(isExpanded ? null : item.code)}
                        style={{
                          border: "1px solid #cbd5e1",
                          background: "#f8fafc",
                          borderRadius: 6,
                          padding: "6px 8px",
                          cursor: "pointer",
                          color: "#475569",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                        }}
                      >
                        {isExpanded ? "ย่อ" : "เขียนสรุป SAR"}
                        <ChevronRight
                          size={14}
                          style={{
                            transform: isExpanded ? "rotate(90deg)" : "none",
                            transition: "transform 0.15s ease",
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Rating Selector Buttons (1 to 5) */}
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #edf2f7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>ให้คะแนน:</span>
                      {[
                        { val: 5.0, label: "5 (ยอดเยี่ยม)" },
                        { val: 4.5, label: "4.5" },
                        { val: 4.0, label: "4 (ดีเลิศ)" },
                        { val: 3.5, label: "3.5" },
                        { val: 3.0, label: "3 (ดี)" },
                        { val: 2.0, label: "2 (ปานกลาง)" },
                        { val: 1.0, label: "1 (กำลังพัฒนา)" },
                      ].map((btn) => (
                        <button
                          key={btn.val}
                          type="button"
                          onClick={() => handleScoreChange(item.code, btn.val)}
                          style={{
                            border: "1px solid",
                            borderColor: item.selfScore === btn.val ? "#2563eb" : "#cbd5e1",
                            background: item.selfScore === btn.val ? "#2563eb" : "#ffffff",
                            color: item.selfScore === btn.val ? "#ffffff" : "#334155",
                            borderRadius: 6,
                            padding: "5px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {/* Linked Evidence Count */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#166534",
                          background: "#dcfce7",
                          padding: "3px 8px",
                          borderRadius: 12,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontWeight: 600,
                        }}
                      >
                        <FileCheck2 size={13} /> หลักฐานร่องรอย {item.evidenceCount} รายการ
                      </span>

                      {onNavigateToEvidence && (
                        <button
                          onClick={() => onNavigateToEvidence(item.code)}
                          style={{
                            border: 0,
                            background: "transparent",
                            color: "#2563eb",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          ไปที่คลังหลักฐาน <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detailed SAR Inputs: Strengths, Weaknesses, Improvement Plan */}
                  {isExpanded && (
                    <div style={{ display: "grid", gap: 10, marginTop: 4, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                      <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#1e293b", fontWeight: 600 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981" }}>
                          <Sparkles size={14} /> จุดเด่น (Strengths) ที่โดดเด่นของสถานศึกษา
                        </span>
                        <textarea
                          rows={2}
                          placeholder="ระบุข้อดี จุดแข็ง หรือความสำเร็จที่สถานศึกษาดำเนินการได้ดีตามตัวชี้วัดนี้..."
                          value={item.strengths}
                          onChange={(e) => handleTextChange(item.code, "strengths", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            fontSize: 12,
                            fontFamily: "inherit",
                            resize: "vertical",
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#1e293b", fontWeight: 600 }}>
                        <span style={{ color: "#d97706" }}>จุดที่ควรพัฒนา (Points to Improve)</span>
                        <textarea
                          rows={2}
                          placeholder="ระบุประเด็นหรือข้อจำกัดที่ควรได้รับการปรับปรุงแก้ไข..."
                          value={item.weaknesses}
                          onChange={(e) => handleTextChange(item.code, "weaknesses", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            fontSize: 12,
                            fontFamily: "inherit",
                            resize: "vertical",
                          }}
                        />
                      </label>

                      <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#1e293b", fontWeight: 600 }}>
                        <span style={{ color: "#2563eb" }}>แผนการดำเนินงานเพื่อยกระดับคุณภาพ (Improvement Plan)</span>
                        <textarea
                          rows={2}
                          placeholder="ระบุกิจกรรม โครงการ หรือแนวทางพัฒนาในปีการศึกษาถัดไป..."
                          value={item.improvementPlan}
                          onChange={(e) => handleTextChange(item.code, "improvementPlan", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            fontSize: 12,
                            fontFamily: "inherit",
                            resize: "vertical",
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
