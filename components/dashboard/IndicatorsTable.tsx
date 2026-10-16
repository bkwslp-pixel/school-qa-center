"use client";

import { useState } from "react";
import { FileText, ChevronRight, TriangleAlert } from "lucide-react";
import type { Indicator, LoadState } from "@/types/database";

interface IndicatorsTableProps {
  indicators: Indicator[];
  loadState: LoadState;
  hasUser: boolean;
  onViewAll: () => void;
  query: string;
}

export function IndicatorsTable({
  indicators,
  loadState,
  hasUser,
  onViewAll,
  query,
}: IndicatorsTableProps) {
  const [selectedStandard, setSelectedStandard] = useState("s1");

  const standardsList = [
    { id: "s1", name: "มาตรฐานที่ 1 คุณภาพของผู้เรียน" },
    { id: "s2", name: "มาตรฐานที่ 2 กระบวนการบริหารและการจัดการ" },
    { id: "s3", name: "มาตรฐานที่ 3 กระบวนการจัดการเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญ" },
  ];

  const filtered = indicators.filter((item) => {
    const matchesSearch =
      `${item.code} ${item.title_th}`.toLowerCase().includes(query.toLowerCase());
    const matchesStandard = item.standard_id ? item.standard_id === selectedStandard : true;
    return matchesSearch && (query ? true : matchesStandard);
  });

  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <h2>มาตรฐานและตัวชี้วัดการศึกษาขั้นพื้นฐาน</h2>
          <span>ติดตามสถานะผลประเมิน ร่องรอยหลักฐาน และผู้รับผิดชอบ</span>
        </div>
      </div>

      <div className="table-head">
        <div className="table-tabs">
          {standardsList.map((std) => (
            <button
              key={std.id}
              className={selectedStandard === std.id ? "selected" : ""}
              onClick={() => setSelectedStandard(std.id)}
            >
              {std.name}
            </button>
          ))}
        </div>

        <span className={`data-state ${loadState}`}>
          <i />
          {loadState === "mock"
            ? "โหมดข้อมูลตัวอย่าง"
            : loadState === "loading"
            ? "กำลังซิงค์ข้อมูล..."
            : loadState === "error"
            ? "ข้อผิดพลาดสิทธิ์ RLS"
            : hasUser
            ? "เชื่อมต่อฐานข้อมูลเรียบร้อย"
            : "รอเข้าสู่ระบบ"}
        </span>
      </div>

      {loadState === "error" && (
        <div className="inline-alert">
          <TriangleAlert size={16} /> ดึงข้อมูลไม่สำเร็จ
          กรุณาตรวจสอบว่าบัญชีผู้ใช้ได้รับการผูกบทบาท (User Role) ในโรงเรียนและผ่านเงื่อนไข RLS
        </div>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ตัวชี้วัด</th>
              <th>ระดับคุณภาพ</th>
              <th>หลักฐานแนบ</th>
              <th>ผู้รับผิดชอบ</th>
              <th>สถานะการประเมิน</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const quality = item.quality_level ?? (idx % 3 === 0 ? "ดีเยี่ยม" : idx % 3 === 1 ? "ดี" : "ปานกลาง");
              const evidenceCount = item.evidence_count ?? (idx + 2);
              const status = item.status ?? (idx === 3 ? "not_started" : idx === 1 ? "pending_review" : "completed");
              const assignee = item.responsible_person ?? ["กลุ่มสาระฯ ภาษาไทย", "กลุ่มสาระฯ คณิตศาสตร์", "ฝ่ายวิชาการ", "ฝ่ายบริหารทั่วไป", "งานประกันคุณภาพ"][idx % 5];

              return (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{item.code}</strong> {item.title_th}
                  </td>
                  <td>
                    <span
                      className={`pill-status ${
                        quality === "ดีเยี่ยม"
                          ? "good"
                          : quality === "ดี"
                          ? "neutral"
                          : quality === "ปานกลาง"
                          ? "warn"
                          : "bad"
                      }`}
                    >
                      {quality}
                    </span>
                  </td>
                  <td>
                    <span className="evidence-mini">
                      <FileText size={14} />
                      {evidenceCount} ไฟล์
                    </span>
                  </td>
                  <td>{assignee}</td>
                  <td>
                    <span
                      className={`pill-status ${
                        status === "completed"
                          ? "good"
                          : status === "pending_review"
                          ? "warn"
                          : "bad"
                      }`}
                    >
                      {status === "completed"
                        ? "ประเมินเสร็จสิ้น"
                        : status === "pending_review"
                        ? "รอการตรวจสอบ"
                        : "ยังไม่เริ่มบันทึก"}
                    </span>
                  </td>
                </tr>
              );
            })}

            {!filtered.length && (
              <tr>
                <td colSpan={6} className="empty-state">
                  ไม่พบตัวชี้วัดที่ตรงกับเงื่อนไขการค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button className="text-link" onClick={onViewAll}>
        เปิดดูตัวชี้วัดทั้งหมดอย่างละเอียด <ChevronRight size={15} />
      </button>
    </section>
  );
}
