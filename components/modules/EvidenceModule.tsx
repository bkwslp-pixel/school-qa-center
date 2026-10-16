"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderOpen,
  Upload,
  Search,
  FileText,
  ImageIcon,
  ExternalLink,
  Filter,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { EvidenceRecord, School, Indicator } from "@/types/database";
import { useNotification } from "@/components/ui/NotificationProvider";

interface EvidenceModuleProps {
  school?: School | null;
  user?: User | null;
  client?: SupabaseClient | null;
  indicators?: Indicator[];
  academicYear?: string;
  onEvidenceCountChange?: (count: number) => void;
}

const sampleEvidence: EvidenceRecord[] = [
  {
    id: "e1",
    title: "รายงานผลการทดสอบระดับชาติขั้นพื้นฐาน (O-NET) ปีการศึกษา 2566",
    description: "สรุปเปรียบเทียบค่าคะแนนเฉลี่ยระดับโรงเรียนกับระดับประเทศ",
    evidence_type: "document",
    file_path: "demo/onet-2566-summary.pdf",
    file_size_bytes: 2450000,
    academic_year: "2567",
    status: "active",
    uploader_name: "ฝ่ายวิชาการ",
    indicator_code: "1.1",
    created_at: "2025-02-10T10:30:00Z",
  },
  {
    id: "e2",
    title: "โครงการส่งเสริมคุณธรรม จริยธรรม และวิถีพุทธประจำโรงเรียน",
    description: "ภาพกิจกรรมและรายงานสรุปประเมินความพึงพอใจโครงการ",
    evidence_type: "image",
    file_path: "demo/morality-project-photo.jpg",
    file_size_bytes: 5800000,
    academic_year: "2567",
    status: "active",
    uploader_name: "งานกิจกรรมพัฒนาผู้เรียน",
    indicator_code: "1.2",
    created_at: "2025-02-14T14:20:00Z",
  },
  {
    id: "e3",
    title: "โฟลเดอร์ร่องรอยการนิเทศภายในและการจัดการเรียนรู้เชิงรุก (Active Learning)",
    description: "Google Drive Folder บันทึกแผนการสอนและคลิปวิดีโอการสอน",
    evidence_type: "drive_file",
    external_url: "https://drive.google.com/drive/folders/qa-banklang-active-learning",
    academic_year: "2567",
    status: "active",
    uploader_name: "ฝ่ายพัฒนาวิชาการ",
    indicator_code: "3.1",
    created_at: "2025-02-18T09:15:00Z",
  },
  {
    id: "e4",
    title: "รายงานผลการประเมินความสามารถด้านการอ่าน (RT) ชั้น ป.1",
    description: "ผลคะแนนการอ่านออกเสียงและการอ่านรู้เรื่อง",
    evidence_type: "document",
    file_path: "demo/rt-p1-results.pdf",
    file_size_bytes: 1200000,
    academic_year: "2567",
    status: "active",
    uploader_name: "ครูประจำชั้น ป.1",
    indicator_code: "1.3",
    created_at: "2025-02-22T11:00:00Z",
  },
  {
    id: "e5",
    title: "คู่มือแผนปฏิบัติการประจำปีและแผนพัฒนาคุณภาพการศึกษา 5 ปี",
    description: "อนุมัติโดยคณะกรรมการสถานศึกษาขั้นพื้นฐาน",
    evidence_type: "document",
    file_path: "demo/strategic-plan-2566-2570.pdf",
    file_size_bytes: 8400000,
    academic_year: "2567",
    status: "active",
    uploader_name: "งานแผนงานและงบประมาณ",
    indicator_code: "2.1",
    created_at: "2025-03-01T15:45:00Z",
  },
];

const fallbackIndicatorOptions = [
  { code: "1.1", label: "1.1 พัฒนาการด้านร่างกาย สมวัย มีสุขนิสัยที่ดี" },
  { code: "1.2", label: "1.2 คุณธรรม จริยธรรม และค่านิยมที่พึงประสงค์" },
  { code: "1.3", label: "1.3 ความสามารถในการอ่าน คิดวิเคราะห์ และเขียน" },
  { code: "1.4", label: "1.4 ทักษะการใช้เทคโนโลยีดิจิทัลและการสื่อสาร" },
  { code: "1.5", label: "1.5 สุขภาวะทางจิตและสังคม มีผลสัมฤทธิ์ตามเกณฑ์" },
  { code: "2.1", label: "2.1 เป้าหมาย วิสัยทัศน์ และพันธกิจที่ชัดเจน" },
  { code: "3.1", label: "3.1 การจัดการเรียนรู้ผ่านการปฏิบัติจริง (Active Learning)" },
];

export function EvidenceModule({
  school,
  user,
  client,
  indicators,
  academicYear = "2567",
  onEvidenceCountChange,
}: EvidenceModuleProps) {
  const { showToast, showConfirm, showAlert } = useNotification();
  const sb = client ?? getSupabase();

  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>(sampleEvidence);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIndicatorCode, setNewIndicatorCode] = useState("1.1");
  const [newType, setNewType] = useState<"document" | "image" | "drive_file" | "link">("document");
  const [newUrl, setNewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Feedback states
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Available indicators for dropdown
  const indicatorOptions =
    indicators && indicators.length > 0
      ? indicators.map((ind) => ({
          code: ind.code,
          label: `${ind.code} ${ind.title_th}`,
          id: ind.id,
        }))
      : fallbackIndicatorOptions.map((f) => ({ ...f, id: undefined }));

  // Load live data from Supabase
  const fetchEvidence = useCallback(async () => {
    if (!sb) return;
    setLoading(true);
    try {
      // Query evidence_records with uploader and links
      const { data, error } = await sb
        .from("evidence_records")
        .select(
          `
          id,
          school_id,
          title,
          description,
          evidence_type,
          file_path,
          external_url,
          file_size_bytes,
          mime_type,
          academic_year,
          status,
          uploader_id,
          created_at,
          profiles:uploader_id(full_name),
          evidence_links(
            indicator_id,
            indicators(code, title_th)
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not fetch live evidence, using mock:", error.message);
        return;
      }

interface EvidenceDbRow {
  id: string;
  school_id?: string;
  title: string;
  description?: string | null;
  evidence_type: "document" | "image" | "link" | "drive_file";
  file_path?: string | null;
  external_url?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  academic_year?: string | null;
  status?: "draft" | "active" | "archived";
  uploader_id?: string | null;
  created_at: string;
  profiles?: { full_name?: string } | null;
  evidence_links?: Array<{
    indicator_id?: string;
    indicators?: { code?: string; title_th?: string } | null;
  }> | null;
}

      if (data && data.length > 0) {
        const rawRows = data as unknown as EvidenceDbRow[];
        const mapped: EvidenceRecord[] = rawRows.map((item) => {
          // Extract linked indicator code if exists
          const link = item.evidence_links?.[0];
          const indicatorCode = link?.indicators?.code || undefined;
          const uploaderName = item.profiles?.full_name || "บุคลากรทางการศึกษา";

          return {
            id: item.id,
            school_id: item.school_id,
            title: item.title,
            description: item.description,
            evidence_type: item.evidence_type,
            file_path: item.file_path,
            external_url: item.external_url,
            file_size_bytes: item.file_size_bytes,
            mime_type: item.mime_type,
            academic_year: item.academic_year || academicYear,
            status: item.status || "active",
            uploader_id: item.uploader_id,
            uploader_name: uploaderName,
            indicator_code: indicatorCode,
            created_at: item.created_at,
          };
        });

        setEvidenceList(mapped);
        if (onEvidenceCountChange) {
          onEvidenceCountChange(mapped.length);
        }
      }
    } catch (err) {
      console.error("fetchEvidence error:", err);
    } finally {
      setLoading(false);
    }
  }, [sb, academicYear, onEvidenceCountChange]);

  useEffect(() => {
    void fetchEvidence();
  }, [fetchEvidence]);

  // Handle file or link submission
  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setStatusMessage(null);
    setUploading(true);

    try {
      let filePath: string | null = null;
      let fileSize: number | null = null;
      let mimeType: string | null = null;

      // Handle Storage upload if file is selected
      if ((newType === "document" || newType === "image") && selectedFile) {
        if (!sb) {
          throw new Error("Supabase client ไม่พร้อมใช้งาน");
        }

        fileSize = selectedFile.size;
        mimeType = selectedFile.type;

        // Generate sanitized unique path: [academicYear]/[indicatorCode]/[timestamp]-[filename]
        const cleanName = selectedFile.name
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .substring(0, 50);
        const storagePath = `${academicYear}/${newIndicatorCode}/${Date.now()}_${cleanName}`;

        const { error: uploadErr } = await sb.storage
          .from("qa-evidence")
          .upload(storagePath, selectedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadErr) {
          throw new Error(`การอัปโหลดไฟล์ไปยัง Storage ล้มเหลว: ${uploadErr.message}`);
        }

        filePath = storagePath;
      }

      // Check if online with Supabase to insert record
      if (sb) {
        const recordData: {
          title: string;
          description: string | null;
          evidence_type: "document" | "image" | "link" | "drive_file";
          file_path: string | null;
          external_url: string | null;
          file_size_bytes: number | null;
          mime_type: string | null;
          academic_year: string;
          status: string;
          school_id?: string;
          uploader_id?: string;
        } = {
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          evidence_type: newType,
          file_path: filePath,
          external_url: newUrl.trim() || null,
          file_size_bytes: fileSize,
          mime_type: mimeType,
          academic_year: academicYear,
          status: "active",
        };

        if (school?.id) {
          recordData.school_id = school.id;
        }
        if (user?.id) {
          recordData.uploader_id = user.id;
        }

        const { data: newRecord, error: insertErr } = await sb
          .from("evidence_records")
          .insert(recordData)
          .select("id")
          .single();

        if (insertErr) {
          throw new Error(`บันทึกข้อมูลหลักฐานไม่สำเร็จ: ${insertErr.message}`);
        }

        // Try linking to indicator if possible
        if (newRecord?.id) {
          const selectedOption = indicatorOptions.find((o) => o.code === newIndicatorCode);
          let targetIndicatorId = selectedOption?.id;

          // If ID not in options, query by code
          if (!targetIndicatorId) {
            const { data: indData } = await sb
              .from("indicators")
              .select("id")
              .eq("code", newIndicatorCode)
              .maybeSingle();
            targetIndicatorId = indData?.id;
          }

          if (targetIndicatorId) {
            await sb.from("evidence_links").insert({
              evidence_id: newRecord.id,
              indicator_id: targetIndicatorId,
            });
          }
        }

        setStatusMessage({ text: "อัปโหลดและบันทึกหลักฐานเข้าระบบเรียบร้อยแล้ว", type: "success" });
        showToast("อัปโหลดและเชื่อมโยงหลักฐานเข้าระบบสำเร็จ", "success", "บันทึกเรียบร้อย");
        await fetchEvidence();
      } else {
        // Fallback for local demo preview
        const fallbackItem: EvidenceRecord = {
          id: "ev-" + Date.now(),
          title: newTitle,
          description: newDescription || "เอกสารหลักฐานแนบเข้าระบบ",
          evidence_type: newType,
          external_url: newUrl || undefined,
          file_path: filePath || `/storage/qa/${newTitle}.pdf`,
          file_size_bytes: fileSize || (selectedFile ? selectedFile.size : 1500000),
          academic_year: academicYear,
          status: "active",
          uploader_name: user ? "ผู้ใช้งานปัจจุบัน" : "คุณครูผู้รับผิดชอบ",
          indicator_code: newIndicatorCode,
          created_at: new Date().toISOString(),
        };
        setEvidenceList((prev) => [fallbackItem, ...prev]);
        setStatusMessage({ text: "บันทึกตัวอย่างหลักฐานเรียบร้อย (Mock mode)", type: "success" });
        showToast("บันทึกตัวอย่างหลักฐานเรียบร้อย (Mock mode)", "success", "บันทึกเรียบร้อย");
      }

      // Reset form
      setNewTitle("");
      setNewDescription("");
      setNewUrl("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowUploadModal(false);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลด";
      setStatusMessage({ text: msg, type: "error" });
      showToast(msg, "error", "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
      setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  // Handle Delete with Premium Confirm Dialog
  const handleDeleteEvidence = (item: EvidenceRecord) => {
    showConfirm({
      title: "ยืนยันการลบเอกสารหลักฐาน",
      message: `คุณต้องการลบเอกสาร "${item.title}" ออกจากระบบฐานข้อมูลใช่หรือไม่? เมื่อลบแล้วจะไม่สามารถกู้คืนได้`,
      confirmText: "ลบเอกสาร",
      cancelText: "ยกเลิก",
      type: "danger",
      onConfirm: async () => {
        setDeletingId(item.id);
        try {
          if (sb) {
            // 1. Remove from storage if exists
            if (item.file_path && !item.file_path.startsWith("demo/")) {
              await sb.storage.from("qa-evidence").remove([item.file_path]);
            }

            // 2. Remove record
            const { error: delErr } = await sb.from("evidence_records").delete().eq("id", item.id);
            if (delErr) {
              throw new Error("ลบรายการไม่สำเร็จ: " + delErr.message);
            }
            await fetchEvidence();
          } else {
            setEvidenceList((prev) => prev.filter((e) => e.id !== item.id));
          }
          showToast(`ลบเอกสาร "${item.title}" เรียบร้อยแล้ว`, "success", "ลบสำเร็จ");
          setStatusMessage({ text: "ลบเอกสารหลักฐานเรียบร้อยแล้ว", type: "success" });
        } catch (err: unknown) {
          console.error("Delete error:", err);
          const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบ";
          showToast(msg, "error", "ลบไม่สำเร็จ");
          setStatusMessage({ text: msg, type: "error" });
        } finally {
          setDeletingId(null);
          setTimeout(() => setStatusMessage(null), 4000);
        }
      },
    });
  };

  // Get file URL for viewing/download
  const handleOpenEvidence = (item: EvidenceRecord) => {
    if (item.external_url) {
      window.open(item.external_url, "_blank", "noopener,noreferrer");
      return;
    }

    if (item.file_path) {
      if (!sb || item.file_path.startsWith("demo/")) {
        showAlert({
          title: "ระบบจำลองการเปิดเอกสารหลักฐาน",
          message: `กำลังจำลองการเปิดไฟล์: ${item.title}\nที่อยู่ไฟล์: ${item.file_path}\n(สามารถคลิกเปิดเอกสารจริงได้ทันทีหลังจากจัดเก็บไฟล์ขึ้น Cloud Storage)`,
          buttonText: "เข้าใจแล้ว"
        });
        return;
      }

      // Generate public or signed URL
      const { data } = sb.storage.from("qa-evidence").getPublicUrl(item.file_path);
      if (data?.publicUrl) {
        window.open(data.publicUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  const fmtSize = (bytes?: number | null) => {
    if (!bytes) return "ลิงก์ภายนอก";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const fmtDate = (isoStr: string) => {
    try {
      return new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  const filtered = evidenceList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.indicator_code ?? "").includes(search);
    const matchesType = typeFilter === "all" || item.evidence_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Top Banner */}
      <div className="panel" style={{ background: "linear-gradient(135deg, #123b5d, #0d2840)", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#82d6c3", fontSize: 13, marginBottom: 4 }}>
              <FolderOpen size={18} />
              <span>คลังหลักฐานดิจิทัล (Digital Evidence Vault)</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#fff" }}>คลังหลักฐานและร่องรอยการปฏิบัติงาน</h1>
            <p style={{ margin: "6px 0 0", color: "#c0d8eb", fontSize: 13 }}>
              จัดเก็บเอกสาร แฟ้มสะสมงาน ภาพกิจกรรม และลิงก์ Google Drive เชื่อมโยงตามตัวชี้วัด IQA & EQA
            </p>
          </div>

          <button
            className="primary-button"
            style={{ background: "linear-gradient(120deg, #10b981, #059669)", display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={16} /> อัปโหลด / แนบหลักฐานใหม่
          </button>
        </div>
      </div>

      {/* Status Feedback Toast/Alert */}
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

      {/* Control Bar */}
      <div className="panel" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f3f7fc", padding: "6px 12px", borderRadius: 8, border: "1px solid #e7eef8", width: "min(100%, 360px)" }}>
            <Search size={16} color="#7890b2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อเอกสาร คำอธิบาย หรือรหัสตัวชี้วัด (เช่น 1.1)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 0, outline: 0, background: "transparent", fontSize: 12, width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <Filter size={15} color="#6a82a4" />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>ประเภท:</span>
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "document", label: "เอกสาร PDF/Word" },
              { id: "image", label: "รูปภาพ" },
              { id: "drive_file", label: "Google Drive" },
              { id: "link", label: "ลิงก์เว็บไซต์" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                style={{
                  border: "1px solid",
                  borderColor: typeFilter === t.id ? "#2072f4" : "#d8e3f2",
                  background: typeFilter === t.id ? "#eff5ff" : "#fff",
                  color: typeFilter === t.id ? "#1b6fe8" : "#4a668e",
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Evidence Cards Grid */}
      {loading ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
          <Loader2 size={28} className="spinner" style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
          <p style={{ margin: 0, fontSize: 13 }}>กำลังโหลดข้อมูลคลังหลักฐานจาก Supabase...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px 20px" }}>
          <FolderOpen size={40} color="#9bb4d0" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#163a63" }}>ไม่พบเอกสารหลักฐานที่ค้นหา</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--muted)" }}>
            ยังไม่มีรายการเอกสารที่ตรงกับเงื่อนไข หรือยังไม่ได้อัปโหลดหลักฐานสำหรับตัวชี้วัดนี้
          </p>
          <button
            className="primary-button"
            style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => setShowUploadModal(true)}
          >
            <Plus size={16} /> อัปโหลดเอกสารแรก
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {filtered.map((item) => {
            const isDoc = item.evidence_type === "document";
            const isDrive = item.evidence_type === "drive_file";
            const isImg = item.evidence_type === "image";
            const isDel = deletingId === item.id;

            return (
              <div
                key={item.id}
                className="panel"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                  transition: "box-shadow 0.2s ease, transform 0.2s ease",
                  opacity: isDel ? 0.5 : 1,
                  position: "relative",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: isDrive ? "#e8f8f5" : isDoc ? "#eaf2ff" : isImg ? "#fff3e5" : "#f1f5f9",
                        color: isDrive ? "#0d8c6b" : isDoc ? "#2067d8" : isImg ? "#c46a00" : "#475569",
                      }}
                    >
                      {isDrive ? <ExternalLink size={13} /> : isDoc ? <FileText size={13} /> : isImg ? <ImageIcon size={13} /> : <ExternalLink size={13} />}
                      {isDrive ? "Google Drive" : isDoc ? "เอกสาร (Document)" : isImg ? "ภาพถ่ายหลักฐาน" : "ลิงก์ภายนอก"}
                    </span>

                    {item.indicator_code && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: "#f0f4f9",
                          color: "#1c3c66",
                          padding: "2px 7px",
                          borderRadius: 4,
                        }}
                      >
                        ตัวชี้วัด {item.indicator_code}
                      </span>
                    )}
                  </div>

                  <strong style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink)", display: "block" }}>
                    {item.title}
                  </strong>
                  {item.description && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                      {item.description}
                    </p>
                  )}
                </div>

                <div style={{ borderTop: "1px solid #edf2f8", paddingTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#617d9e", marginBottom: 8 }}>
                    <span>{item.uploader_name || "บุคลากร"}</span>
                    <span>{fmtSize(item.file_size_bytes)} • {fmtDate(item.created_at)}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                    <button
                      onClick={() => handleOpenEvidence(item)}
                      style={{
                        background: "#f0f7ff",
                        border: "1px solid #cce3ff",
                        color: "#1b6ee4",
                        borderRadius: 6,
                        padding: "5px 10px",
                        fontSize: 11,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        cursor: "pointer",
                      }}
                      title="เปิดดูหรือดาวน์โหลด"
                    >
                      {item.external_url ? <ExternalLink size={13} /> : <Download size={13} />}
                      {item.external_url ? "เปิดลิงก์" : "ดาวน์โหลด / ดูไฟล์"}
                    </button>

                    <button
                      onClick={() => handleDeleteEvidence(item)}
                      disabled={isDel}
                      style={{
                        background: "#fff1f1",
                        border: "1px solid #ffd1d1",
                        color: "#d93838",
                        borderRadius: 6,
                        padding: "5px 8px",
                        fontSize: 11,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        cursor: isDel ? "not-allowed" : "pointer",
                      }}
                      title="ลบเอกสารหลักฐาน"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload / Link Modal */}
      {showUploadModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="login-modal" style={{ width: "min(100%, 520px)" }} onClick={(e) => e.stopPropagation()}>
            <h2 id="modal-title">แนบหลักฐานร่องรอยตัวชี้วัด</h2>
            <p>บันทึกไฟล์เข้า Supabase Storage หรือแนบลิงก์ Google Drive เชื่อมโยงตัวชี้วัด</p>

            <form onSubmit={handleAddEvidence}>
              <label>
                ชื่อเอกสาร / โครงการ / หลักฐาน <span style={{ color: "#d93838" }}>*</span>
                <input
                  type="text"
                  required
                  placeholder="เช่น รายงานผลการทดสอบ RT ชั้น ป.1 ปีการศึกษา 2567"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  disabled={uploading}
                />
              </label>

              <label>
                คำอธิบายเพิ่มเติม / สรุปสาระสำคัญ
                <textarea
                  rows={2}
                  placeholder="ระบุรายละเอียดคร่าวๆ ของเอกสารหรือกิจกรรมที่เกี่ยวข้อง..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  disabled={uploading}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    fontSize: 12,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </label>

              <label>
                ผูกกับตัวชี้วัด
                <select
                  value={newIndicatorCode}
                  onChange={(e) => setNewIndicatorCode(e.target.value)}
                  disabled={uploading}
                >
                  {indicatorOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                ประเภทของหลักฐาน
                <select
                  value={newType}
                  onChange={(e) =>
                    setNewType(e.target.value as "document" | "image" | "drive_file" | "link")
                  }
                  disabled={uploading}
                >
                  <option value="document">เอกสาร PDF / Word / Excel (ไฟล์)</option>
                  <option value="image">ภาพถ่ายกิจกรรม (JPG / PNG / WebP)</option>
                  <option value="drive_file">ลิงก์ Google Drive Folder หรือไฟล์</option>
                  <option value="link">ลิงก์เว็บไซต์ หรือระบบภายนอก</option>
                </select>
              </label>

              {newType === "drive_file" || newType === "link" ? (
                <div>
                  <label>
                    URL ลิงก์ {newType === "drive_file" ? "Google Drive (ไฟล์หรือโฟลเดอร์)" : "เว็บไซต์"} <span style={{ color: "#d93838" }}>*</span>
                    <input
                      type="url"
                      required
                      placeholder={
                        newType === "drive_file"
                          ? "https://drive.google.com/drive/folders/... หรือ https://drive.google.com/file/d/..."
                          : "https://..."
                      }
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      disabled={uploading}
                    />
                  </label>

                  {newType === "drive_file" && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: 6,
                        padding: "8px 10px",
                        fontSize: 11,
                        color: "#166534",
                        marginTop: 6,
                        lineHeight: 1.5,
                      }}
                    >
                      💡 <strong>ข้อแนะนำ:</strong> เหมาะสำหรับจัดเก็บโฟลเดอร์ภาพกิจกรรม คลิปการสอน หรือแฟ้มสะสมงานขนาดใหญ่ โดยไม่ใช้โควต้าพื้นที่ Supabase (กรุณาตั้งค่าใน Google Drive ให้เป็น <em>&quot;ทุกคนที่มีลิงก์มีสิทธิ์ดู&quot;</em>)
                      {newUrl.includes("drive.google.com") && (
                        <div style={{ marginTop: 4 }}>
                          <a
                            href={newUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#15803d", textDecoration: "underline", fontWeight: 600 }}
                          >
                            ↗ คลิกที่นี่เพื่อทดสอบเปิดลิงก์ Google Drive
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <label>
                  เลือกไฟล์อัปโหลด (ขนาดไม่เกิน 50MB) <span style={{ color: "#d93838" }}>*</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setSelectedFile(f);
                    }}
                    disabled={uploading}
                  />
                  {selectedFile && (
                    <span style={{ fontSize: 11, color: "#166534", marginTop: 4, display: "block" }}>
                      เลือกแล้ว: {selectedFile.name} ({fmtSize(selectedFile.size)})
                    </span>
                  )}
                </label>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  type="submit"
                  className="primary-button"
                  style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="spinner" style={{ animation: "spin 1s linear infinite" }} />
                      กำลังอัปโหลด...
                    </>
                  ) : (
                    "บันทึกเข้าคลังหลักฐาน"
                  )}
                </button>
                <button
                  type="button"
                  className="primary-button"
                  style={{ background: "#e5edf7", color: "#324e75" }}
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
