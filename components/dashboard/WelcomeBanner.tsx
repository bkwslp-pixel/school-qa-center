"use client";

import Image from "next/image";
import { GraduationCap } from "lucide-react";

interface WelcomeBannerProps {
  levels: string[];
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  schoolYear: string;
  setSchoolYear: (year: string) => void;
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
  assessmentScope,
  setAssessmentScope,
  onRefresh,
}: WelcomeBannerProps) {
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
            <select
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
            >
              <option value="2567">2567</option>
              <option value="2568">2568</option>
              <option value="2569">2569</option>
            </select>
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
    </section>
  );
}
