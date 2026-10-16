"use client";

import { useState, useEffect } from "react";
import { Settings, Save, CheckCircle2, AlertCircle, Loader2, Building, Calendar } from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { School } from "@/types/database";

interface SettingsModuleProps {
  school: School | null;
  client?: SupabaseClient | null;
  user?: User | null;
  onUpdateSchool?: (data: Partial<School>) => void;
  onYearChange?: (year: string) => void;
  currentYearProp?: string;
}

export function SettingsModule({
  school,
  client,
  onUpdateSchool,
  onYearChange,
  currentYearProp = "2567",
}: SettingsModuleProps) {
  const sb = client ?? getSupabase();

  const [schoolName, setSchoolName] = useState(school?.name ?? "โรงเรียนเทศบาล ๑ บ้านกลาง");
  const [affiliation, setAffiliation] = useState(
    school?.affiliation ?? "สังกัดเทศบาลตำบลบ้านกลาง กรมส่งเสริมการปกครองท้องถิ่น"
  );
  const [district, setDistrict] = useState(school?.district ?? "อำเภอเมืองลำพูน");
  const [province, setProvince] = useState(school?.province ?? "จังหวัดลำพูน");
  const [schoolCode, setSchoolCode] = useState(school?.code ?? "51010001");
  const [address, setAddress] = useState(school?.address ?? "ตำบลบ้านกลาง อำเภอเมืองลำพูน จังหวัดลำพูน");
  const [phone, setPhone] = useState(school?.phone ?? "053-581-xxx");
  const [website, setWebsite] = useState(school?.website ?? "");
  const [currentYear, setCurrentYear] = useState(currentYearProp);
  const [storageType, setStorageType] = useState("supabase");

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Sync state if school prop updates
  useEffect(() => {
    if (school) {
      if (school.name) setSchoolName(school.name);
      if (school.affiliation) setAffiliation(school.affiliation);
      if (school.district) setDistrict(school.district);
      if (school.province) setProvince(school.province);
      if (school.code) setSchoolCode(school.code);
      if (school.address) setAddress(school.address);
      if (school.phone) setPhone(school.phone);
      if (school.website) setWebsite(school.website);
    }
  }, [school]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const updatedSchoolData: Partial<School> = {
        name: schoolName.trim(),
        code: schoolCode.trim() || null,
        affiliation: affiliation.trim() || null,
        district: district.trim() || null,
        province: province.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
      };

      if (sb) {
        if (school?.id) {
          // Update existing school
          const { error: schoolErr } = await sb
            .from("schools")
            .update({
              ...updatedSchoolData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", school.id);

          if (schoolErr) {
            throw new Error(`บันทึกข้อมูลโรงเรียนไม่สำเร็จ: ${schoolErr.message}`);
          }
        } else {
          // Insert new school record
          const { data: newSchool, error: insErr } = await sb
            .from("schools")
            .insert(updatedSchoolData)
            .select("id")
            .single();

          if (insErr) {
            throw new Error(`สร้างข้อมูลโรงเรียนไม่สำเร็จ: ${insErr.message}`);
          }
          if (newSchool?.id) {
            updatedSchoolData.id = newSchool.id;
          }
        }

        // Upsert academic year if school id is available
        const targetSchoolId = school?.id ?? updatedSchoolData.id;
        if (targetSchoolId) {
          // Mark all previous years inactive
          await sb
            .from("academic_years")
            .update({ is_active: false })
            .eq("school_id", targetSchoolId);

          // Upsert current year as active
          await sb.from("academic_years").upsert(
            {
              school_id: targetSchoolId,
              year: currentYear,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "school_id,year" }
          );
        }

        setStatusMessage({ text: "บันทึกการตั้งค่าระบบและข้อมูลสถานศึกษาลงฐานข้อมูลเรียบร้อยแล้ว", type: "success" });
      } else {
        setStatusMessage({ text: "บันทึกการตั้งค่าระบบเรียบร้อย (Mock mode)", type: "success" });
      }

      // Propagate changes to parent
      if (onUpdateSchool) onUpdateSchool(updatedSchoolData);
      if (onYearChange) onYearChange(currentYear);
    } catch (err: unknown) {
      console.error("Save settings error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      setStatusMessage({ text: msg, type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Banner */}
      <div className="panel" style={{ background: "linear-gradient(135deg, #183b68, #102747)", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8abff7", fontSize: 13, marginBottom: 4 }}>
              <Settings size={18} />
              <span>การกำหนดค่าระบบและข้อมูลสถานศึกษา (System Configuration)</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#fff" }}>ตั้งค่าระบบ School QA Center</h1>
            <p style={{ margin: "6px 0 0", color: "#bad6f7", fontSize: 13 }}>
              ปรับแต่งข้อมูลสถานศึกษา วงรอบปีการศึกษา และการเชื่อมต่อคลังหลักฐาน โรงเรียนเทศบาล ๑ บ้านกลาง
            </p>
          </div>
        </div>
      </div>

      {/* Status Feedback */}
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

      <form onSubmit={handleSave} style={{ display: "grid", gap: 16 }}>
        {/* School Info */}
        <div className="panel">
          <div className="panel-title" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Building size={18} color="#2674f5" />
              <div>
                <h2 style={{ margin: 0, fontSize: 16 }}>ข้อมูลพื้นฐานของสถานศึกษา</h2>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>ข้อมูลนี้จะปรากฏบนหัวรายงาน SAR และเอกสารราชการทั้งหมด</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#324e75" }}>
              ชื่อสถานศึกษา <span style={{ color: "#d93838" }}>*</span>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                disabled={saving}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d5e2f3", fontSize: 13 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#324e75" }}>
              รหัสสถานศึกษา (10 หลัก)
              <input
                type="text"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                disabled={saving}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d5e2f3", fontSize: 13 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#324e75", gridColumn: "1 / -1" }}>
              หน่วยงานต้นสังกัด
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                disabled={saving}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d5e2f3", fontSize: 13 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#324e75" }}>
              อำเภอ / เขต
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={saving}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d5e2f3", fontSize: 13 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#324e75" }}>
              จังหวัด
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                disabled={saving}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d5e2f3", fontSize: 13 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#324e75" }}>
              ที่อยู่สถานศึกษา
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={saving}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d5e2f3", fontSize: 13 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#324e75" }}>
              เบอร์โทรศัพท์ติดต่อ
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d5e2f3", fontSize: 13 }}
              />
            </label>
          </div>
        </div>

        {/* Evaluation & Storage */}
        <div className="panel">
          <div className="panel-title" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={18} color="#2674f5" />
              <div>
                <h2 style={{ margin: 0, fontSize: 16 }}>รอบปีการศึกษาและพื้นที่จัดเก็บหลักฐาน</h2>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>กำหนดค่าเริ่มต้นสำหรับปีการศึกษาที่เปิดรับการประเมินและคลังไฟล์</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#324e75" }}>
              ปีการศึกษาปัจจุบันที่ใช้งาน
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(e.target.value)}
                disabled={saving}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d5e2f3", fontSize: 13 }}
              >
                <option value="2567">2567 (ปีการศึกษาปัจจุบัน)</option>
                <option value="2568">2568</option>
                <option value="2569">2569</option>
                <option value="2566">2566 (ปีการศึกษาย้อนหลัง)</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, color: "#324e75" }}>
              บริการจัดเก็บไฟล์หลักฐาน (Storage Provider)
              <select
                value={storageType}
                onChange={(e) => setStorageType(e.target.value)}
                disabled={saving}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d5e2f3", fontSize: 13 }}
              >
                <option value="supabase">Supabase Storage (`qa-evidence` bucket — แนะนำ)</option>
                <option value="gdrive">Google Drive API Integration</option>
              </select>
            </label>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="primary-button"
            disabled={saving}
            style={{ padding: "10px 24px", display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="spinner" style={{ animation: "spin 1s linear infinite" }} />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save size={16} /> บันทึกการตั้งค่าทั้งหมด
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
