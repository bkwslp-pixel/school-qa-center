"use client";

import { useState } from "react";
import Image from "next/image";
import { GraduationCap, Plus, Calendar } from "lucide-react";

interface WelcomeBannerProps {
  levels: string[];
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  schoolYear: string;
  setSchoolYear: (year: string) => void;
  availableYears?: string[];
  onAddAcademicYear?: (year: string) => Promise<void>;
  isAdminOrLeadership?: boolean;
  assessmentScope: string;
  setAssessmentScope: (scope: string) => void;
  onRefresh: () => void;
}

export function WelcomeBanner({
  levels,
  selectedLevel,
  setSelectedLevel,
  schoolYear,
  setSchoolYear,
  availableYears,
  onAddAcademicYear,
  isAdminOrLeadership = false,
  assessmentScope,
  setAssessmentScope,
  onRefresh,
}: WelcomeBannerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState("");
  const [addingYear, setAddingYear] = useState(false);

  const displayYears =
    availableYears && availableYears.length > 0
      ? availableYears
      : ["2569", "2568", "2567", "2566"];

  const handleAddYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanYear = newYearInput.trim();
    if (!cleanYear || !/^\d{4}$/.test(cleanYear)) {
      alert("กรุณากรอกปีการศึกษาเป็นตัวเลข 4 หลัก เช่น 2568 หรือ 2570");
      return;
    }
    setAddingYear(true);
    try {
      if (onAddAcademicYear) {
        await onAddAcademicYear(cleanYear);
      }
      setShowAddModal(false);
      setNewYearInput("");
    } finally {
      setAddingYear(false);
    }
  };
  return (
    <section className="welcome-panel">
      <div className="welcome-copy">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 14,
              background: "#ffffff",
              padding: 4,
              boxShadow: "0 4px 14px rgba(24, 59, 104, 0.12)",
              border: "1px solid #dce8f6",
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Image
              src="/logo.png"
              alt="ตราสัญลักษณ์โรงเรียนเทศบาล ๑ บ้านกลาง"
              width={50}
              height={50}
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
          <div>
            <p style={{ margin: 0 }}>ยินดีต้อนรับสู่</p>
            <h1 style={{ margin: 0 }}>School QA Bkms1</h1>
          </div>
        </div>
        <p className="welcome-description">
          ระบบบริหารจัดการข้อมูลประกันคุณภาพสถานศึกษาอัจฉริยะ
          <br />
          โรงเรียนเทศบาล ๑ บ้านกลาง สังกัดเทศบาลตำบลบ้านกลาง จ.ลำพูน
        </p>
      </div>

      <div className="filter-panel">
        <strong>ระดับการศึกษา</strong>
        <div className="level-pills">
          {levels.map((l, i) => (
            <button
              key={l}
              className={`level-pill level-${i} ${selectedLevel === l ? "active" : ""}`}
              onClick={() => setSelectedLevel(l)}
              style={{
                boxShadow: selectedLevel === l ? "0 0 0 2px #2067d8" : "none",
                fontWeight: selectedLevel === l ? 700 : 500,
              }}
            >
              <GraduationCap size={16} />
              {l}
            </button>
          ))}
        </div>

        <div className="filter-row">
          <label>
            ปีการศึกษา
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
              >
                {displayYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
              {isAdminOrLeadership && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  title="เพิ่มปีการศึกษาใหม่"
                  style={{
                    background: "#eff6ff",
                    color: "#2563eb",
                    border: "1px solid #bfdbfe",
                    borderRadius: 6,
                    padding: "6px 8px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Plus size={14} /> เพิ่มปี
                </button>
              )}
            </div>
          </label>

          <label>
            กรอบการประเมิน
            <select
              value={assessmentScope}
              onChange={(e) => setAssessmentScope(e.target.value)}
            >
              <option value="ทั้งภายในและภายนอก">ทั้งภายในและภายนอก (IQA & EQA)</option>
              <option value="ภายใน">ประเมินภายใน (IQA)</option>
              <option value="ภายนอก">ประเมินภายนอก (สมศ.)</option>
            </select>
          </label>

          <button
            className="primary-button"
            type="button"
            onClick={onRefresh}
          >
            อัปเดตข้อมูล
          </button>
        </div>
      </div>

      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !addingYear && setShowAddModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              padding: 24,
              maxWidth: 420,
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Calendar size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                  เพิ่มปีการศึกษาใหม่
                </h3>
                <small style={{ color: "#64748b" }}>
                  กำหนดปีการศึกษาสำหรับบันทึกและประเมินผลประกันคุณภาพ
                </small>
              </div>
            </div>

            <form onSubmit={handleAddYearSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  ระบุปีการศึกษา (พ.ศ.)
                </label>
                <input
                  type="text"
                  placeholder="เช่น 2568 หรือ 2570"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  maxLength={4}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "block" }}>
                  * ระบบจะเพิ่มปีนี้ลงในฐานข้อมูลและนำไปใช้กรองข้อมูลทันที
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  disabled={addingYear}
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={addingYear || !newYearInput.trim()}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: addingYear ? "not-allowed" : "pointer",
                    opacity: addingYear ? 0.7 : 1,
                  }}
                >
                  {addingYear ? "กำลังบันทึก..." : "บันทึกปีการศึกษา"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
