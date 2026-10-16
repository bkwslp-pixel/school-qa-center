"use client";

import Image from "next/image";
import {
  Home, ClipboardCheck, FolderOpen, ChartNoAxesCombined,
  Activity, FileText, Users, Settings, Cloud, X
} from "lucide-react";
import type { School } from "@/types/database";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  mobileNav: boolean;
  setMobileNav: (open: boolean) => void;
  school: School | null;
  schoolYear: string;
  setSchoolYear: (year: string) => void;
  isAdminOrLeadership?: boolean;
}

export const menuItems = [
  { label: "หน้าหลัก", icon: Home },
  { label: "มาตรฐานและตัวชี้วัด", icon: ClipboardCheck },
  { label: "คลังหลักฐาน", icon: FolderOpen },
  { label: "ผลการประเมิน", icon: ChartNoAxesCombined },
  { label: "งานติดตาม", icon: Activity },
  { label: "รายงาน", icon: FileText },
  { label: "จัดการผู้ใช้", icon: Users, adminOnly: true },
  { label: "ตั้งค่าระบบ", icon: Settings, adminOnly: true },
];

export function Sidebar({
  activeMenu,
  setActiveMenu,
  mobileNav,
  setMobileNav,
  school,
  schoolYear,
  setSchoolYear,
  isAdminOrLeadership = false,
}: SidebarProps) {
  const visibleMenuItems = menuItems.filter(
    (item) => !item.adminOnly || isAdminOrLeadership
  );

  return (
    <>
      {mobileNav && (
        <button
          className="scrim"
          aria-label="ปิดเมนู"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" style={{ background: "#ffffff", padding: 2, overflow: "hidden", display: "grid", placeItems: "center" }}>
            <Image
              src="/logo.png"
              alt="ตราสัญลักษณ์โรงเรียนเทศบาล ๑ บ้านกลาง"
              width={42}
              height={42}
              style={{ objectFit: "contain", width: "100%", height: "100%" }}
              priority
            />
          </div>
          <div>
            <div className="brand-title">School QA Bkms1</div>
            <div className="brand-subtitle">โรงเรียนเทศบาล ๑ บ้านกลาง</div>
          </div>
          <button
            className="icon-button close-mobile"
            onClick={() => setMobileNav(false)}
            aria-label="ปิดเมนู"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="side-nav">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.label;
            return (
              <button
                key={item.label}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  setActiveMenu(item.label);
                  setMobileNav(false);
                }}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="school-name">
            <strong>{school?.name ?? "โรงเรียนเทศบาล ๑ บ้านกลาง"}</strong>
            <span>
              {[school?.district, school?.province].filter(Boolean).join(" ") ||
                "สังกัดเทศบาลตำบลบ้านกลาง จ.ลำพูน"}
            </span>
          </div>

          <label className="select-label">
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

          <div style={{ marginTop: 14 }}>
            <PwaInstallButton />
          </div>

          <div className="drive-status">
            <div className="drive-icon">
              <Cloud size={24} />
            </div>
            <div>
              <strong>คลังหลักฐานระบบ QA</strong>
              <small>Supabase Cloud Storage</small>
              <small className="connected">
                <span /> พร้อมเชื่อมต่อหลักฐาน
              </small>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
