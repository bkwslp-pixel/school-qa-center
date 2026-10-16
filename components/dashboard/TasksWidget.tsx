"use client";

import { CalendarDays, CheckCircle2, Clock3, AlertCircle } from "lucide-react";
import type { Task } from "@/types/database";

interface TasksWidgetProps {
  tasks: Task[];
  onViewAllTasks: () => void;
}

export function TasksWidget({ tasks, onViewAllTasks }: TasksWidgetProps) {
  const fmtDate = (val: string | null) => {
    if (!val) return "ยังไม่กำหนด";
    try {
      return new Intl.DateTimeFormat("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(val));
    } catch {
      return val;
    }
  };

  return (
    <section className="panel" style={{ marginTop: 14 }}>
      <div className="panel-title">
        <div>
          <h2>งานประกันคุณภาพที่ต้องดำเนินการ (Pending Tasks)</h2>
          <span>รายการงานติดตามเอกสารและการประเมินที่ได้รับมอบหมาย</span>
        </div>
        <button className="text-link" onClick={onViewAllTasks}>
          จัดการงานทั้งหมด
        </button>
      </div>

      {tasks.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "32px 16px",
            color: "var(--muted)",
            background: "#f8fafc",
            borderRadius: 10,
            marginTop: 12,
            border: "1px dashed #cbd5e1",
          }}
        >
          <CheckCircle2 size={32} style={{ color: "#10b981", margin: "0 auto 8px" }} />
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
            ไม่มีภารกิจงานคงค้างในระบบ
          </p>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            ท่านสามารถสร้างภารกิจงานใหม่เพื่อมอบหมายงานประกันคุณภาพให้แก่คุณครูผู้รับผิดชอบได้
          </span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, marginTop: 12 }}>
          {tasks.map((task) => {
            const isHigh = task.priority === "high" || task.priority === "urgent";
            const isDone = task.status === "completed";

            return (
              <div
                key={task.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  background: isHigh ? "#fffbfb" : "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: isHigh ? "#ffe2e5" : "#edf2fb",
                      color: isHigh ? "#d33143" : "#3b5680",
                    }}
                  >
                    {isHigh ? "ความสำคัญสูง" : "งานปกติ"}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: "var(--muted)",
                    }}
                  >
                    <CalendarDays size={13} />
                    {fmtDate(task.due_at)}
                  </span>
                </div>

                <strong style={{ fontSize: 13, color: "var(--ink)", marginTop: 2 }}>
                  {task.title}
                </strong>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 4,
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: "#547196" }}>
                    {task.assignee_name ?? "ผู้รับผิดชอบตามตัวชี้วัด"}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      color: isDone ? "#16ad72" : "#ffa62b",
                      fontWeight: 500,
                    }}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle2 size={13} /> เสร็จสิ้น
                      </>
                    ) : isHigh ? (
                      <>
                        <AlertCircle size={13} /> เร่งด่วน
                      </>
                    ) : (
                      <>
                        <Clock3 size={13} /> กำลังทำ
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
