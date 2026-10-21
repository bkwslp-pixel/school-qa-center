"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  CheckCircle2,
  Search,
  Shield,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Link2,
  Share2,
  Send,
  Key,
  ExternalLink,
  Info,
} from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { Profile, UserRoleType, School } from "@/types/database";
import { useNotification } from "@/components/ui/NotificationProvider";

interface UsersModuleProps {
  client?: SupabaseClient | null;
  currentUser?: User | null;
  currentUserRole?: UserRoleType | null;
  school?: School | null;
}

interface ProfileDbRow {
  id: string;
  full_name: string;
  position?: string | null;
  department?: string | null;
  phone?: string | null;
  school_id?: string | null;
  user_roles?: Array<{ role: UserRoleType }> | null;
}

const POSITION_OPTIONS = [
  "ครูผู้ช่วย",
  "ครู",
  "ครูชำนาญการ",
  "ครูชำนาญการพิเศษ",
  "ครูเชี่ยวชาญ",
  "ครูเชี่ยวชาญพิเศษ",
  "รองผู้อำนวยการสถานศึกษา",
  "ผู้อำนวยการสถานศึกษา",
  "บุคลากรทางการศึกษา",
  "อื่นๆ (ระบุเอง)",
];

const DEPARTMENT_OPTIONS = [
  "กลุ่มบริหารงานวิชาการ",
  "กลุ่มบริหารงานบุคคล",
  "กลุ่มบริหารงานทั่วไป",
  "กลุ่มบริหารงานวัดผลและประเมินผล",
  "กลุ่มบริหารงานงบประมาณและแผนงาน",
  "อื่นๆ (ระบุเอง)",
];

export function UsersModule({
  client,
  currentUserRole,
  school,
}: UsersModuleProps) {
  const { showToast, showAlert } = useNotification();
  const sb = client ?? getSupabase();

  const [userList, setUserList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("Bkwslp@2026");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRoleType>("teacher");
  const [selectedPositionOption, setSelectedPositionOption] = useState("ครูชำนาญการ");
  const [customPosition, setCustomPosition] = useState("");
  const [selectedDepartmentOption, setSelectedDepartmentOption] = useState("กลุ่มบริหารงานวิชาการ");
  const [customDepartment, setCustomDepartment] = useState("");
  const [createdUserInfo, setCreatedUserInfo] = useState<{
    name: string;
    email: string;
    pass: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);

  // Dynamic Site URL detection
  const getSiteUrl = useCallback(() => {
    if (typeof window !== "undefined" && window.location.origin) {
      return window.location.origin;
    }
    return "https://school-qa-center.vercel.app";
  }, []);

  const getRoleLabel = useCallback((role?: UserRoleType) => {
    switch (role) {
      case "admin":
        return "ผู้ดูแลระบบ (Admin)";
      case "school_leadership":
        return "ผู้บริหารสถานศึกษา";
      case "external_evaluator":
        return "ผู้ตรวจประเมินภายนอก";
      default:
        return "ครูผู้รับผิดชอบตัวชี้วัด";
    }
  }, []);

  // Quick Action: Copy live system link
  const handleCopySystemLink = () => {
    const url = getSiteUrl();
    navigator.clipboard.writeText(url);
    showToast(`คัดลอกลิงก์ระบบเรียบร้อย: ${url}`, "success", "คัดลอกสำเร็จ");
  };

  // Quick Action: Copy message template for LINE group
  const handleCopyGeneralTemplate = () => {
    const siteUrl = getSiteUrl();
    const template = `📢 แจ้งบุคลากรโรงเรียนเทศบาล ๑ บ้านกลาง\nขอเชิญเข้าใช้งานระบบประกันคุณภาพการศึกษา (School QA Center)\n\n🌐 ลิงก์เข้าสู่ระบบ:\n${siteUrl}\n\n👤 ชื่อผู้ใช้: อีเมล Gmail ของคุณครูที่แจ้งไว้กับฝ่ายประกันคุณภาพ\n🔑 รหัสผ่านเริ่มต้น: Bkwslp@2026\n\n📌 สิ่งที่ต้องดำเนินการ:\n1. เข้าสู่ระบบตามลิงก์ด้านบน\n2. ตรวจสอบตัวชี้วัดประกันคุณภาพที่ท่านรับผิดชอบ\n3. แนบไฟล์หลักฐาน หรือกรอกผลการประเมินตนเอง (SAR) ตามกำหนดเวลา\n\nหากติดปัญหาการเข้าใช้งาน สามารถติดต่อผู้ดูแลระบบได้ทันทีครับ/ค่ะ`;
    navigator.clipboard.writeText(template);
    showToast("คัดลอกข้อความแม่แบบสำหรับส่งเข้ากลุ่ม LINE เรียบร้อยแล้ว", "success", "คัดลอกสำเร็จ");
  };

  // Copy individual login instructions for a specific user
  const handleCopyUserLoginInfo = (u: Profile) => {
    const siteUrl = getSiteUrl();
    const defaultPass = "Bkwslp@2026";
    const message = `🏫 ข้อมูลเข้าใช้งานระบบประกันคุณภาพ School QA Center (รร.เทศบาล ๑ บ้านกลาง)\n\n👤 ชื่อ-สกุล: ${u.full_name}\n💼 ตำแหน่ง: ${u.position || "ครูผู้สอน"}\n🏢 ฝ่าย/กลุ่มงาน: ${u.department || "กลุ่มบริหารงานวิชาการ"}\n🔑 รหัสผ่านเริ่มต้น: ${defaultPass}\n🏷️ สิทธิ์ในระบบ: ${getRoleLabel(u.role)}\n\n🌐 ลิงก์เข้าสู่ระบบ:\n${siteUrl}\n\n📌 ขั้นตอนการใช้งาน:\n1. เปิดลิงก์ด้านบนผ่านเว็บเบราว์เซอร์ (มือถือหรือคอมพิวเตอร์)\n2. เข้าสู่ระบบด้วยอีเมล Gmail ของท่าน และรหัสผ่าน ${defaultPass}\n3. เข้าตรวจเช็คและแนบหลักฐานประกันคุณภาพตามตัวชี้วัดที่ได้รับมอบหมาย`;

    navigator.clipboard.writeText(message);
    showToast(`คัดลอกข้อมูลส่งต่อสำหรับ "${u.full_name}" สำเร็จ`, "success", "คัดลอกสำเร็จ");
  };

  // Open modal popup showing individual user login details
  const handleShowUserLoginModal = (u: Profile) => {
    const siteUrl = getSiteUrl();
    const defaultPass = "Bkwslp@2026";
    const message = `🏫 ข้อมูลเข้าใช้งานระบบประกันคุณภาพ School QA Center (รร.เทศบาล ๑ บ้านกลาง)\n\n👤 ชื่อ-สกุล: ${u.full_name}\n💼 ตำแหน่ง: ${u.position || "ครูผู้สอน"}\n🏢 ฝ่าย/กลุ่มงาน: ${u.department || "กลุ่มบริหารงานวิชาการ"}\n🔑 รหัสผ่านเริ่มต้น: ${defaultPass}\n🏷️ สิทธิ์ในระบบ: ${getRoleLabel(u.role)}\n\n🌐 ลิงก์เข้าสู่ระบบ:\n${siteUrl}\n\n📌 ขั้นตอนการใช้งาน:\n1. เปิดลิงก์ด้านบนผ่านเว็บเบราว์เซอร์\n2. เข้าสู่ระบบด้วยอีเมล Gmail ของท่าน และรหัสผ่าน ${defaultPass}\n3. เข้าตรวจเช็คและแนบหลักฐานประกันคุณภาพตามตัวชี้วัดที่ได้รับมอบหมาย`;

    showAlert({
      title: `ข้อมูลการเข้าสู่ระบบ: ${u.full_name}`,
      message: `ตำแหน่ง: ${u.position || "-"}\nฝ่ายงาน: ${u.department || "-"}\nบทบาท: ${getRoleLabel(u.role)}\nรหัสผ่านเริ่มต้น: ${defaultPass}\nลิงก์เข้าสู่ระบบ: ${siteUrl}`,
      type: "info",
      nextStep: "สามารถกดปุ่ม 'คัดลอกข้อความสำหรับส่งให้ครูท่านนี้' ด้านล่าง เพื่อนำไปส่งทางแชท LINE หรืออีเมลให้คุณครูท่านนี้ได้ทันที",
      copyData: message,
      copyButtonText: "📋 คัดลอกข้อความสำหรับส่งให้ครูท่านนี้",
      buttonText: "ปิดหน้าต่าง",
    });
  };

  // Fetch users from Supabase
  const fetchUsers = useCallback(async () => {
    if (!sb) return;
    setLoading(true);
    try {
      const { data, error } = await sb
        .from("profiles")
        .select(
          `
          id,
          full_name,
          position,
          department,
          phone,
          school_id,
          user_roles(role)
        `
        )
        .order("created_at", { ascending: false });

      if (!error && data) {
        const typedRows = data as unknown as ProfileDbRow[];
        const mapped: Profile[] = typedRows.map((p) => {
          const role = p.user_roles?.[0]?.role || "teacher";
          return {
            id: p.id,
            full_name: p.full_name,
            position: p.position || "ครูผู้สอน",
            department: p.department || "กลุ่มสาระการเรียนรู้",
            phone: p.phone,
            role,
          };
        });
        setUserList(mapped);
      }
    } catch (err: unknown) {
      console.warn("fetchUsers fallback:", err);
    } finally {
      setLoading(false);
    }
  }, [sb]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const filtered = userList.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.department ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.position ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      selectedRoleFilter === "all" || u.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) {
      showAlert({
        title: "กรอกข้อมูลไม่ครบถ้วน",
        message: "กรุณาระบุชื่อ - สกุล ของบุคลากร",
        type: "warning",
        buttonText: "เข้าใจแล้ว",
      });
      return;
    }
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      showAlert({
        title: "รูปแบบอีเมลไม่ถูกต้อง",
        message: "กรุณาระบุอีเมลสำหรับเข้าสู่ระบบ (เช่น example@gmail.com)",
        type: "warning",
        buttonText: "เข้าใจแล้ว",
      });
      return;
    }
    if (invitePassword.length < 6) {
      showAlert({
        title: "รหัสผ่านสั้นเกินไป",
        message: "รหัสผ่านเริ่มต้นต้องมีความยาวอย่างน้อย 6 ตัวอักษร",
        type: "warning",
        buttonText: "เข้าใจแล้ว",
      });
      return;
    }

    const finalPosition =
      selectedPositionOption === "อื่นๆ (ระบุเอง)"
        ? customPosition.trim()
        : selectedPositionOption;

    if (!finalPosition) {
      showAlert({
        title: "กรอกข้อมูลไม่ครบถ้วน",
        message: "กรุณาระบุตำแหน่งของบุคลากร",
        type: "warning",
        buttonText: "เข้าใจแล้ว",
      });
      return;
    }

    const finalDepartment =
      selectedDepartmentOption === "อื่นๆ (ระบุเอง)"
        ? customDepartment.trim()
        : selectedDepartmentOption;

    if (!finalDepartment) {
      showAlert({
        title: "กรอกข้อมูลไม่ครบถ้วน",
        message: "กรุณาระบุกลุ่มงานหรือฝ่ายของบุคลากร",
        type: "warning",
        buttonText: "เข้าใจแล้ว",
      });
      return;
    }

    setBusy(true);
    setAlertMsg(null);

    const siteUrl = getSiteUrl();
    const fullShareText = `🏫 ข้อมูลเข้าใช้งานระบบ School QA Center (รร.เทศบาล ๑ บ้านกลาง)\n\n👤 ชื่อ-สกุล: ${inviteName.trim()}\n📧 อีเมลเข้าสู่ระบบ: ${inviteEmail.trim()}\n🔑 รหัสผ่านเริ่มต้น: ${invitePassword.trim()}\n🏷️ สิทธิ์ในระบบ: ${getRoleLabel(inviteRole)}\n\n🌐 ลิงก์เข้าสู่ระบบ:\n${siteUrl}\n\n📌 ขั้นตอนการเข้าใช้งาน:\n1. เปิดลิงก์ ${siteUrl} ผ่านเว็บเบราว์เซอร์\n2. กรอกอีเมล (${inviteEmail.trim()}) และรหัสผ่านเริ่มต้น (${invitePassword.trim()})\n3. กดปุ่ม "เข้าสู่ระบบ" เพื่อตรวจสอบภารกิจและอัปโหลดหลักฐานประกันคุณภาพ`;

    try {
      if (sb) {
        const res = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            password: invitePassword.trim(),
            fullName: inviteName.trim(),
            position: finalPosition,
            department: finalDepartment,
            role: inviteRole,
            schoolId:
              school?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(school.id)
                ? school.id
                : null,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "เกิดข้อผิดพลาดในการสร้างบัญชี");
        }

        setCreatedUserInfo({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          pass: invitePassword.trim(),
          role: getRoleLabel(inviteRole),
        });

        await fetchUsers();

        // Show Rich Alert Modal with Next Steps & Copy Button
        showAlert({
          title: "สร้างบัญชีและเพิ่มบุคลากรสำเร็จ!",
          message: `ระบบได้ลงทะเบียนบัญชีให้กับ "${inviteName.trim()}" เรียบร้อยแล้ว\nอีเมลเข้าสู่ระบบ: ${inviteEmail.trim()}\nรหัสผ่านเริ่มต้น: ${invitePassword.trim()}`,
          type: "success",
          nextStep: `แนวทางการดำเนินงานต่อไป:\n1. กดปุ่ม "คัดลอกข้อมูลและลิงก์ส่งให้ครู" ด้านล่าง\n2. ส่งข้อความนี้ให้คุณครูผ่านช่องทาง LINE (กลุ่มงานหรือแชทส่วนตัว)\n3. แนะนำให้คุณครูลองกดเข้าลิงก์ ${siteUrl} และเข้าสู่ระบบเพื่อตรวจสอบตัวชี้วัดที่ได้รับมอบหมาย`,
          copyData: fullShareText,
          copyButtonText: "📋 คัดลอกข้อมูลและลิงก์ส่งให้ครูทันที",
          buttonText: "เสร็จสิ้น",
        });

        showToast(`สร้างบัญชีบุคลากร "${inviteName}" สำเร็จ!`, "success", "สร้างสำเร็จ");
      } else {
        const newUser: Profile = {
          id: "usr-" + Date.now(),
          full_name: inviteName.trim(),
          position: finalPosition,
          department: finalDepartment,
          role: inviteRole,
        };
        setUserList([newUser, ...userList]);
        setCreatedUserInfo({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          pass: invitePassword.trim(),
          role: getRoleLabel(inviteRole),
        });

        showAlert({
          title: "จำลองการเพิ่มข้อมูลบุคลากรเรียบร้อย (Mock mode)",
          message: `ชื่อ-สกุล: ${inviteName.trim()}\nอีเมล: ${inviteEmail.trim()}\nรหัสผ่านเริ่มต้น: ${invitePassword.trim()}`,
          type: "success",
          nextStep: "ท่านสามารถคัดลอกข้อความด้านล่างเพื่อทดลองนำไปส่งต่อได้",
          copyData: fullShareText,
          copyButtonText: "📋 คัดลอกข้อความและลิงก์ส่งต่อ",
          buttonText: "เข้าใจแล้ว",
        });
      }

      setInviteEmail("");
      setInviteName("");
      setSelectedPositionOption("ครูชำนาญการ");
      setCustomPosition("");
      setSelectedDepartmentOption("กลุ่มบริหารงานวิชาการ");
      setCustomDepartment("");
      setInvitePassword("Bkwslp@2026");
      setShowInviteModal(false);
    } catch (err: unknown) {
      console.error("Invite user error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      showAlert({
        title: "เกิดข้อผิดพลาดในการสร้างบัญชี",
        message: `ไม่สามารถสร้างบัญชีได้: ${msg}`,
        type: "error",
        nextStep: "กรุณาตรวจสอบว่าอีเมล Gmail ถูกต้องหรือไม่ และไม่ได้ซ้ำกับบัญชีที่มีอยู่เดิมในระบบ หรือตรวจสอบสิทธิ์ของผู้ดูแลระบบ (Admin)",
        buttonText: "รับทราบและแก้ไขข้อมูล",
      });
    } finally {
      setBusy(false);
    }
  };

  const getRoleBadge = (role?: UserRoleType) => {
    switch (role) {
      case "admin":
        return <span style={{ background: "#ffebe8", color: "#d93826", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>ผู้ดูแลระบบ (Admin)</span>;
      case "school_leadership":
        return <span style={{ background: "#e8effe", color: "#1967d2", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>ผู้บริหารสถานศึกษา</span>;
      case "external_evaluator":
        return <span style={{ background: "#fef7e0", color: "#b06000", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>ผู้ตรวจประเมินภายนอก</span>;
      default:
        return <span style={{ background: "#e6f4ea", color: "#137333", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>ครูผู้รับผิดชอบตัวชี้วัด</span>;
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Banner */}
      <div className="panel" style={{ background: "linear-gradient(135deg, #16365c, #0e223b)", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8abff7", fontSize: 13, marginBottom: 4, flexWrap: "wrap" }}>
              <Users size={18} />
              <span>การบริหารจัดการผู้ใช้งานและสิทธิ์เข้าถึง (RBAC)</span>
              {currentUserRole && (
                <span style={{ fontSize: 11, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 10, color: "#fff" }}>
                  สิทธิ์ปัจจุบัน: {getRoleLabel(currentUserRole)}
                </span>
              )}
            </div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#fff" }}>บุคลากรและคณะกรรมการประเมิน</h1>
            <p style={{ margin: "6px 0 0", color: "#bad6f7", fontSize: 13 }}>
              กำหนดบทบาท สิทธิ์การเข้าถึงข้อมูลตามนโยบาย Row Level Security (RLS) โรงเรียนเทศบาล ๑ บ้านกลาง
            </p>
          </div>

          <button className="primary-button" onClick={() => setShowInviteModal(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <UserPlus size={16} /> เพิ่ม / เชิญผู้ใช้งานใหม่
          </button>
        </div>
      </div>

      {/* Quick Sharing & Guidance Card */}
      <div
        className="panel"
        style={{
          background: "#ffffff",
          border: "1px solid #bfdbfe",
          borderRadius: 14,
          padding: "18px 20px",
          boxShadow: "0 4px 16px rgba(37, 99, 235, 0.06)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Share2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, color: "#0f2e54", fontWeight: 700 }}>
                ข้อมูลและลิงก์สำหรับส่งต่อให้บุคลากรเข้าใช้งาน (Personnel Login Access)
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                คัดลอกลิงก์เว็บไซต์และรหัสผ่านเริ่มต้นเพื่อส่งต่อให้ครูผู้สอนทาง LINE หรืออีเมล
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="primary-button"
              style={{
                background: "#2563eb",
                fontSize: 12,
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={handleCopyGeneralTemplate}
            >
              <Send size={14} /> คัดลอกข้อความแม่แบบส่งกลุ่ม LINE
            </button>
          </div>
        </div>

        {/* Quick URL & Password display */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
            background: "#f8fafc",
            padding: 14,
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Link2 size={14} color="#2563eb" />
              <span>ลิงก์ระบบ QA (สำหรับให้ครูคลิกเข้าใช้งาน):</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                readOnly
                value={getSiteUrl()}
                style={{
                  flex: 1,
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: "#0f172a",
                }}
              />
              <button
                type="button"
                onClick={handleCopySystemLink}
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap",
                }}
              >
                <Copy size={13} /> คัดลอกลิงก์
              </button>
              <a
                href={getSiteUrl()}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  textDecoration: "none",
                }}
                title="เปิดหน้าเว็บในแท็บใหม่"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Key size={14} color="#f59e0b" />
              <span>รหัสผ่านเริ่มต้นของบุคลากร (Default Password):</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                readOnly
                value="Bkwslp@2026"
                style={{
                  flex: 1,
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("Bkwslp@2026");
                  showToast("คัดลอกรหัสผ่านเริ่มต้นเรียบร้อย (Bkwslp@2026)", "success", "คัดลอกสำเร็จ");
                }}
                style={{
                  background: "#fef3c7",
                  border: "1px solid #fde68a",
                  color: "#b45309",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  whiteSpace: "nowrap",
                }}
              >
                <Copy size={13} /> คัดลอกรหัสผ่าน
              </button>
            </div>
          </div>
        </div>

        {/* 3 Steps guidance */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 10,
            fontSize: 12,
            color: "#475569",
          }}
        >
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px", borderRadius: 8 }}>
            <strong style={{ color: "#166534", display: "block", marginBottom: 2 }}>
              1. เพิ่มบัญชีด้วย @gmail ของครู
            </strong>
            กดปุ่ม &quot;เพิ่ม / เชิญผู้ใช้งานใหม่&quot; ด้านบน กรอกชื่อและอีเมล Gmail ของคุณครู
          </div>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px 12px", borderRadius: 8 }}>
            <strong style={{ color: "#1e40af", display: "block", marginBottom: 2 }}>
              2. ก๊อปลิงก์ & รหัสผ่านส่งให้ครู
            </strong>
            กดปุ่ม &quot;คัดลอกส่งครู&quot; ที่แถวรายชื่อบุคลากร แล้วส่งทาง LINE หรืออีเมล
          </div>
          <div style={{ background: "#fdf4ff", border: "1px solid #f0abfc", padding: "10px 12px", borderRadius: 8 }}>
            <strong style={{ color: "#86198f", display: "block", marginBottom: 2 }}>
              3. ครูล็อกอินและเริ่มทำงาน QA
            </strong>
            ครูเข้าใช้งานเพื่อตรวจสอบตัวชี้วัด แนบหลักฐาน และกรอกผลประเมินตนเอง (SAR)
          </div>
        </div>
      </div>

      {/* Success Notification with Copy info */}
      {createdUserInfo && (
        <div
          className="panel"
          style={{
            background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
            border: "1px solid #86efac",
            color: "#166534",
            padding: 16,
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 15 }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <span>สร้างบัญชีบุคลากรสำเร็จเรียบร้อย!</span>
              </div>
              <p style={{ margin: "6px 0 10px", fontSize: 13, color: "#15803d" }}>
                ท่านสามารถคัดลอกข้อมูลด้านล่างเพื่อส่งให้บุคลากรเข้าใช้งานระบบได้ทันที
              </p>
              <div
                style={{
                  background: "#ffffff",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #bbf7d0",
                  fontSize: 13,
                  display: "grid",
                  gap: 4,
                  color: "#1e293b",
                }}
              >
                <div><strong>ชื่อ - สกุล:</strong> {createdUserInfo.name}</div>
                <div><strong>อีเมลเข้าสู่ระบบ:</strong> <code>{createdUserInfo.email}</code></div>
                <div>
                  <strong>รหัสผ่านเริ่มต้น:</strong>{" "}
                  <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontWeight: 700, color: "#0f172a" }}>
                    {createdUserInfo.pass}
                  </code>
                </div>
                <div><strong>สิทธิ์การใช้งาน:</strong> {createdUserInfo.role}</div>
                <div><strong>ลิงก์เข้าสู่ระบบ:</strong> <code>{getSiteUrl()}</code></div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
              <button
                type="button"
                className="primary-button"
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  padding: "8px 14px",
                }}
                onClick={() => {
                  const textToCopy = `🏫 ข้อมูลเข้าใช้งานระบบ School QA Center (รร.เทศบาล ๑ บ้านกลาง)\n\n👤 ชื่อผู้ใช้/อีเมล: ${createdUserInfo.email}\n🔑 รหัสผ่านเริ่มต้น: ${createdUserInfo.pass}\n🏷️ บทบาท: ${createdUserInfo.role}\n🌐 ลิงก์เข้าสู่ระบบ: ${getSiteUrl()}\n\n📌 ขั้นตอน:\n1. เปิดลิงก์ด้านบน\n2. เข้าสู่ระบบด้วยอีเมลและรหัสผ่านเริ่มต้น\n3. เข้าตรวจเช็คและแนบหลักฐานประกันคุณภาพตามตัวชี้วัด`;
                  navigator.clipboard.writeText(textToCopy);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                  showToast("คัดลอกข้อมูลส่งให้บุคลากรเรียบร้อยแล้ว", "success", "คัดลอกสำเร็จ");
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "คัดลอกแล้ว!" : "คัดลอกข้อมูลส่งให้บุคลากร"}
              </button>
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: "7px 12px",
                  borderRadius: 6,
                }}
                onClick={() => setCreatedUserInfo(null)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {alertMsg && (
        <div
          className="inline-alert"
          style={{
            background: alertMsg.type === "success" ? "#e8f8f2" : "#fef2f2",
            borderColor: alertMsg.type === "success" ? "#a6edd2" : "#fecaca",
            color: alertMsg.type === "success" ? "#0c7850" : "#b91c1c",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {alertMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Control & Table */}
      <div className="panel">
        {/* Role Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
          {[
            { id: "all", label: "ทั้งหมด" },
            { id: "teacher", label: "ครูผู้รับผิดชอบตัวชี้วัด" },
            { id: "school_leadership", label: "ผู้บริหารสถานศึกษา" },
            { id: "admin", label: "ผู้ดูแลระบบ (Admin)" },
            { id: "external_evaluator", label: "ผู้ตรวจประเมินภายนอก" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRoleFilter(tab.id)}
              style={{
                border: "1px solid",
                borderColor: selectedRoleFilter === tab.id ? "#2563eb" : "#e2e8f0",
                background: selectedRoleFilter === tab.id ? "#eff6ff" : "#fff",
                color: selectedRoleFilter === tab.id ? "#1d4ed8" : "#475569",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: selectedRoleFilter === tab.id ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
              {tab.id !== "all" && (
                <span style={{ marginLeft: 6, opacity: 0.75, fontSize: 11 }}>
                  ({userList.filter((u) => u.role === tab.id).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Role Policy Explanation Banner */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
            color: "#166534",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Shield size={18} color="#16a34a" style={{ flexShrink: 0 }} />
          <div>
            <strong>แนวทางการกำหนดสิทธิ์:</strong> ครูผู้รับผิดชอบตัวชี้วัดมีสิทธิ์เต็มในการอัปโหลดหลักฐานและกรอกผลประเมินตนเองตามตัวชี้วัดที่ได้รับมอบหมาย โดยเมนูจัดการผู้ใช้นี้จะสงวนสิทธิ์เฉพาะผู้ดูแลระบบและฝ่ายบริหารเท่านั้น
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f3f7fc", padding: "6px 12px", borderRadius: 8, border: "1px solid #e7eef8", width: 320 }}>
            <Search size={16} color="#7890b2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ ตำแหน่ง หรือฝ่ายงาน..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 0, outline: 0, background: "transparent", fontSize: 12, width: "100%" }}
            />
          </div>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>ทั้งหมด {filtered.length} บัญชีในระบบ</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
            <Loader2 size={28} className="spinner" style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: 13 }}>กำลังโหลดรายชื่อบุคลากรจาก Supabase...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>
            <Users size={40} color="#9bb4d0" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "#163a63" }}>ยังไม่มีรายชื่อบุคลากรในระบบ</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--muted)" }}>
              ท่านสามารถเริ่มต้นเพิ่มรายชื่อคุณครู หรือคณะกรรมการประกันคุณภาพ เพื่อกำหนดสิทธิ์การใช้งานได้ทันที
            </p>
            <button
              className="primary-button"
              style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => setShowInviteModal(true)}
            >
              <UserPlus size={16} /> เพิ่มบุคลากรคนแรก
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "6%", textAlign: "center" }}>ลำดับ</th>
                  <th style={{ width: "24%" }}>ชื่อ - นามสกุล</th>
                  <th style={{ width: "18%" }}>ตำแหน่ง</th>
                  <th style={{ width: "18%" }}>กลุ่มงาน / สังกัด</th>
                  <th style={{ width: "16%" }}>บทบาทและสิทธิ์</th>
                  <th style={{ width: "18%", textAlign: "center" }}>ส่งข้อมูลเข้าใช้งาน</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((userItem, idx) => (
                  <tr key={userItem.id}>
                    <td style={{ textAlign: "center" }}>{idx + 1}</td>
                    <td>
                      <strong style={{ color: "#0f2e54", fontSize: 13 }}>{userItem.full_name}</strong>
                    </td>
                    <td>{userItem.position}</td>
                    <td>{userItem.department}</td>
                    <td>{getRoleBadge(userItem.role)}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleCopyUserLoginInfo(userItem)}
                          title="คัดลอกข้อความและลิงก์ส่งให้ครูท่านนี้"
                          style={{
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            color: "#1d4ed8",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Copy size={12} />
                          <span>คัดลอกส่งครู</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShowUserLoginModal(userItem)}
                          title="เปิดดูข้อมูลและรายละเอียดการเข้าใช้งาน"
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #cbd5e1",
                            color: "#475569",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: 11,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Info size={12} />
                          <span>ดูข้อมูล</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => !busy && setShowInviteModal(false)}>
          <div className="login-modal" style={{ width: "min(100%, 480px)" }} onClick={(e) => e.stopPropagation()}>
            <h2 id="modal-title">เพิ่มบุคลากรเข้าสู่ระบบ QA</h2>
            <p>กำหนดบทบาท สิทธิ์การบันทึกข้อมูลและแนบหลักฐาน โรงเรียนเทศบาล ๑ บ้านกลาง</p>

            <form onSubmit={handleInvite}>
              <label>
                ชื่อ - สกุล ผู้ใช้งาน <span style={{ color: "#d93838" }}>*</span>
                <input
                  type="text"
                  required
                  placeholder="เช่น นางสาววิภา รักเรียน"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  disabled={busy}
                />
              </label>

              <label>
                อีเมลสำหรับเข้าใช้งาน (@gmail.com) <span style={{ color: "#d93838" }}>*</span>
                <input
                  type="email"
                  required
                  placeholder="เช่น teacher.bkw@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={busy}
                />
                <span style={{ fontSize: 11, color: "#2563eb", marginTop: 2, display: "block" }}>
                  💡 ใช้อีเมล Gmail ของคุณครูสำหรับล็อกอินเข้าสู่ระบบ
                </span>
              </label>

              <label>
                รหัสผ่านเริ่มต้นสำหรับเข้าใช้งาน <span style={{ color: "#d93838" }}>*</span>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="เช่น Bkwslp@2026"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    disabled={busy}
                    style={{ width: "100%", paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 10,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#64748b",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                    }}
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "block" }}>
                  บุคลากรจะใช้รหัสผ่านนี้เพื่อล็อกอินเข้าสู่ระบบผ่านหน้าเว็บ
                </span>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>
                  ตำแหน่ง / วิทยฐานะ
                  <select
                    value={selectedPositionOption}
                    onChange={(e) => setSelectedPositionOption(e.target.value)}
                    disabled={busy}
                  >
                    {POSITION_OPTIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                  {selectedPositionOption === "อื่นๆ (ระบุเอง)" && (
                    <input
                      type="text"
                      required
                      placeholder="ระบุตำแหน่ง เช่น เจ้าหน้าที่ธุรการ"
                      value={customPosition}
                      onChange={(e) => setCustomPosition(e.target.value)}
                      disabled={busy}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </label>

                <label>
                  กลุ่มงาน / ฝ่าย
                  <select
                    value={selectedDepartmentOption}
                    onChange={(e) => setSelectedDepartmentOption(e.target.value)}
                    disabled={busy}
                  >
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  {selectedDepartmentOption === "อื่นๆ (ระบุเอง)" && (
                    <input
                      type="text"
                      required
                      placeholder="ระบุกลุ่มงานหรือฝ่าย"
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                      disabled={busy}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </label>
              </div>

              <label>
                บทบาทและสิทธิ์ (Role)
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRoleType)}
                  disabled={busy}
                >
                  <option value="teacher">ครูผู้รับผิดชอบตัวชี้วัด (Teacher)</option>
                  <option value="school_leadership">ผู้บริหารสถานศึกษา (School Leadership)</option>
                  <option value="external_evaluator">ผู้ตรวจประเมินภายนอก (External Evaluator)</option>
                  <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </label>

              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: 8, fontSize: 11, color: "#64748b", display: "flex", gap: 6, alignItems: "center" }}>
                <Shield size={16} color="#2563eb" />
                <span>สิทธิ์การใช้งานจะถูกควบคุมผ่าน Supabase Row Level Security (RLS)</span>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button type="submit" className="primary-button" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }} disabled={busy}>
                  {busy ? <Loader2 size={16} className="spinner" style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={16} />}
                  บันทึกข้อมูลบุคลากร
                </button>
                <button
                  type="button"
                  className="primary-button"
                  style={{ background: "#e5edf7", color: "#324e75" }}
                  onClick={() => setShowInviteModal(false)}
                  disabled={busy}
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
