"use client";

import { Menu, Search, Bell, Users, LogOut, ChevronDown, KeyRound } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { LoadState, UserRoleType } from "@/types/database";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

interface TopbarProps {
  mobileNav: boolean;
  setMobileNav: (open: boolean) => void;
  query: string;
  setQuery: (q: string) => void;
  user: User | null;
  userRole?: UserRoleType | null;
  loadState: LoadState;
  onSignOut: () => void;
  onOpenLogin: () => void;
  onOpenChangePassword?: () => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
}

export function Topbar({
  mobileNav,
  setMobileNav,
  query,
  setQuery,
  user,
  userRole,
  loadState,
  onSignOut,
  onOpenLogin,
  onOpenChangePassword,
  notificationCount = 3,
  onNotificationClick,
}: TopbarProps) {
  const getRoleTitle = (role?: UserRoleType | null) => {
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

  return (
    <header className="topbar">
      <button
        className="icon-button menu-toggle"
        aria-label="เปิดเมนู"
        onClick={() => setMobileNav(!mobileNav)}
      >
        <Menu size={22} />
      </button>

      <div className="searchbox">
        <Search size={18} />
        <input
          placeholder="ค้นหาตัวชี้วัด เอกสาร หรือชื่องาน..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button aria-label="ค้นหา">
          <Search size={17} />
        </button>
      </div>

      <div className="top-actions">
        <PwaInstallButton />

        <button
          className="icon-button notification"
          aria-label="การแจ้งเตือนงานติดตาม"
          title={`${notificationCount} งานที่ต้องดำเนินการ (คลิกเพื่อเปิดดูงานติดตาม)`}
          onClick={onNotificationClick}
        >
          <Bell size={21} />
          {notificationCount > 0 && <i>{notificationCount}</i>}
        </button>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div className="profile-button" style={{ cursor: "default" }}>
              <div className="avatar">
                <Users size={18} />
              </div>
              <span>
                <strong>{user.email}</strong>
                <small>{getRoleTitle(userRole)}</small>
              </span>
            </div>

            {onOpenChangePassword && (
              <button
                type="button"
                className="icon-button"
                onClick={onOpenChangePassword}
                title="เปลี่ยนรหัสผ่านส่วนตัว"
                aria-label="เปลี่ยนรหัสผ่านส่วนตัว"
                style={{
                  background: "#ffffff",
                  border: "1px solid #dce8f6",
                  color: "#1d4ed8",
                  cursor: "pointer",
                }}
              >
                <KeyRound size={17} />
              </button>
            )}

            <button
              type="button"
              className="icon-button"
              onClick={onSignOut}
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
              style={{
                background: "#ffffff",
                border: "1px solid #fecaca",
                color: "#dc2626",
                cursor: "pointer",
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        ) : (
          <button className="profile-button" onClick={onOpenLogin}>
            <div className="avatar">
              <Users size={18} />
            </div>
            <span>
              <strong>เข้าสู่ระบบ</strong>
              <small>
                {loadState === "mock" ? "โหมดสาธิต" : "เข้าสู่ระบบเพื่อจัดการ"}
              </small>
            </span>
            <ChevronDown size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
