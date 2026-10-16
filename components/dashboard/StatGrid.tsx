"use client";

import React from "react";
import { Target, FileCheck2, Clock3, TriangleAlert } from "lucide-react";

interface StatGridProps {
  indicatorCount: number;
  evidenceCount: number;
  pendingCount?: number;
  taskCount: number;
}

export function StatGrid({
  indicatorCount,
  evidenceCount,
  pendingCount = 0,
  taskCount,
}: StatGridProps) {
  const evidencePercent = indicatorCount > 0 ? Math.min(100, Math.round((evidenceCount / indicatorCount) * 100)) : 0;
  const pendingPercent = indicatorCount > 0 ? Math.min(100, Math.round((pendingCount / indicatorCount) * 100)) : 0;
  const taskPercent = taskCount > 0 ? Math.min(100, Math.round((taskCount / (taskCount + 5)) * 100)) : 0;

  return (
    <section className="stat-grid">
      <StatCard
        icon={<Target />}
        tone="blue"
        label="ตัวชี้วัดทั้งหมด"
        value={indicatorCount}
        note="เกณฑ์ประกันคุณภาพ 3 ด้าน"
        progress={indicatorCount > 0 ? 100 : 0}
      />
      <StatCard
        icon={<FileCheck2 />}
        tone="green"
        label="หลักฐานที่เชื่อมโยงแล้ว"
        value={evidenceCount}
        note={evidenceCount > 0 ? `${evidencePercent}% ของตัวชี้วัด` : "เริ่มต้นอัปโหลดหลักฐาน"}
        progress={evidencePercent}
      />
      <StatCard
        icon={<Clock3 />}
        tone="orange"
        label="รอตรวจสอบ / รออนุมัติ"
        value={pendingCount}
        note={pendingCount > 0 ? `${pendingPercent}% รอประเมินรอบนี้` : "ไม่มีรายการรออนุมัติ"}
        progress={pendingPercent}
      />
      <StatCard
        icon={<TriangleAlert />}
        tone="red"
        label="งานที่ต้องดำเนินการ"
        value={taskCount}
        note={taskCount > 0 ? `${taskCount} ภารกิจคงค้างในระบบ` : "ไม่มีงานคงค้างในระบบ"}
        progress={taskPercent}
      />
    </section>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
  note,
  progress,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: number;
  note: string;
  progress: number;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
        <div className="stat-track">
          <i className={tone} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      </div>
    </div>
  );
}
