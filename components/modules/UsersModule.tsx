"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, CheckCircle2, Search, Shield, AlertCircle, Loader2 } from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { Profile, UserRoleType, School } from "@/types/database";

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

export function UsersModule({
  client,
  currentUserRole,
  school,
}: UsersModuleProps) {
  const sb = client ?? getSupabase();

  const [userList, setUserList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRoleType>("teacher");
  const [invitePosition, setInvitePosition] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("กลุ่มงานวิชาการ");
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (!inviteName.trim()) return;

    setBusy(true);
    setAlertMsg(null);

    try {
      if (sb) {
        const newProfileId = "user-" + Date.now();
        const profilePayload: {
          id: string;
          full_name: string;
          position: string;
          department: string;
          school_id?: string;
        } = {
          id: newProfileId,
          full_name: inviteName.trim(),
          position: invitePosition.trim() || "ครูผู้สอน",
          department: inviteDepartment.trim() || "กลุ่มงานวิชาการ",
        };

        if (school?.id) {
          profilePayload.school_id = school.id;
        }

        const { error: profileErr } = await sb.from("profiles").insert(profilePayload);

        if (!profileErr && school?.id) {
          // Insert role
          await sb.from("user_roles").insert({
            user_id: newProfileId,
            school_id: school.id,
            role: inviteRole,
          });
        }

        await fetchUsers();
        setAlertMsg({
          text: `เพิ่มข้อมูลบุคลากร "${inviteName}" และบันทึกสิทธิ์ (${getRoleLabel(inviteRole)}) เรียบร้อยแล้ว`,
          type: "success",
        });
      } else {
        const newUser: Profile = {
          id: "usr-" + Date.now(),
          full_name: inviteName.trim(),
          position: invitePosition.trim() || "ครูผู้สอน",
          department: inviteDepartment.trim() || "กลุ่มงานวิชาการ",
          role: inviteRole,
        };
        setUserList([newUser, ...userList]);
        setAlertMsg({
          text: `จำลองการเพิ่มข้อมูลบุคลากร "${inviteName}" เรียบร้อย (Mock mode)`,
          type: "success",
        });
      }

      setInviteEmail("");
      setInviteName("");
      setInvitePosition("");
      setShowInviteModal(false);
    } catch (err: unknown) {
      console.error("Invite user error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      setAlertMsg({ text: msg, type: "error" });
    } finally {
      setBusy(false);
      setTimeout(() => setAlertMsg(null), 5000);
    }
  };

  const getRoleLabel = (role?: UserRoleType) => {
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
                  <th style={{ width: "8%", textAlign: "center" }}>ลำดับ</th>
                  <th style={{ width: "30%" }}>ชื่อ - นามสกุล</th>
                  <th style={{ width: "22%" }}>ตำแหน่ง</th>
                  <th style={{ width: "22%" }}>กลุ่มงาน / สังกัด</th>
                  <th style={{ width: "18%" }}>บทบาทและสิทธิ์</th>
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
                อีเมลสำหรับเข้าใช้งาน
                <input
                  type="email"
                  placeholder="teacher@banklang.ac.th"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={busy}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>
                  ตำแหน่ง
                  <input
                    type="text"
                    placeholder="เช่น ครูผู้ช่วย, ครูชำนาญการ"
                    value={invitePosition}
                    onChange={(e) => setInvitePosition(e.target.value)}
                    disabled={busy}
                  />
                </label>

                <label>
                  กลุ่มงาน / ฝ่าย
                  <input
                    type="text"
                    placeholder="เช่น งานวิชาการ, กิจกรรม"
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    disabled={busy}
                  />
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
