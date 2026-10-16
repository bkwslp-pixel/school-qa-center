"use client";

import { Menu, Search, Bell, Users, LogOut, ChevronDown } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { LoadState } from "@/types/database";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

interface TopbarProps {
  mobileNav: boolean;
  setMobileNav: (open: boolean) => void;
  query: string;
  setQuery: (q: string) => void;
  user: User | null;
  loadState: LoadState;
  onSignOut: () => void;
  onOpenLogin: () => void;
  notificationCount?: number;
}

export function Topbar({
  mobileNav,
  setMobileNav,
  query,
  setQuery,
  user,
  loadState,
  onSignOut,
  onOpenLogin,
  notificationCount = 3,
}: TopbarProps) {
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
          aria-label="การแจ้งเตือน"
          title={`${notificationCount} งานที่ต้องดำเนินการ`}
        >
          <Bell size={21} />
          {notificationCount > 0 && <i>{notificationCount}</i>}
        </button>

        {user ? (
          <button
            className="profile-button"
            onClick={onSignOut}
            title="คลิกเพื่อออกจากระบบ"
          >
            <div className="avatar">
              <Users size={18} />
            </div>
            <span>
              <strong>{user.email}</strong>
              <small>บุคลากร / ออกจากระบบ</small>
            </span>
            <LogOut size={16} />
          </button>
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
