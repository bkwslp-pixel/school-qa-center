"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Plus,
  CheckCircle2,
  Calendar,
  Users,
  Trash2,
  Search,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { Task, School, Indicator } from "@/types/database";

interface TaskDbRow {
  id: string;
  school_id?: string;
  indicator_id?: string | null;
  assignee_id?: string | null;
  title: string;
  description?: string | null;
  status: "pending" | "in_progress" | "submitted" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  due_at: string | null;
  created_at?: string;
  profiles?: { full_name?: string } | null;
  indicators?: { code?: string; title_th?: string } | null;
}

interface TasksModuleProps {
  initialTasks?: Task[];
  school?: School | null;
  user?: User | null;
  client?: SupabaseClient | null;
  indicators?: Indicator[];
  onTasksChange?: () => void;
}

export function TasksModule({
  initialTasks = [],
  school,
  user,
  client,
  indicators,
  onTasksChange,
}: TasksModuleProps) {
  const sb = client ?? getSupabase();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [newAssignee, setNewAssignee] = useState("ฝ่ายวิชาการ / คณะทำงานประกันคุณภาพ");
  const [selectedIndicatorCode, setSelectedIndicatorCode] = useState("");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch tasks live from Supabase
  const fetchTasks = useCallback(async () => {
    if (!sb) return;
    setLoading(true);
    try {
      const { data, error } = await sb
        .from("tasks")
        .select(
          `
          id,
          school_id,
          indicator_id,
          assignee_id,
          title,
          description,
          status,
          priority,
          due_at,
          created_at,
          profiles:assignee_id(full_name),
          indicators:indicator_id(code, title_th)
        `
        )
        .order("status", { ascending: true })
        .order("due_at", { ascending: true });

      if (error) {
        console.warn("Could not fetch live tasks:", error.message);
        return;
      }

      if (data && data.length > 0) {
        const rawTasks = data as unknown as TaskDbRow[];
        const mapped: Task[] = rawTasks.map((t) => ({
          id: t.id,
          school_id: t.school_id,
          indicator_id: t.indicator_id,
          assignee_id: t.assignee_id,
          assignee_name:
            t.profiles?.full_name ||
            t.description?.match(/ผู้รับผิดชอบ:\s*(.+)/)?.[1] ||
            "คณะทำงานประกันคุณภาพ",
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          due_at: t.due_at,
          created_at: t.created_at,
        }));
        setTasks(mapped);
      }
    } catch (err) {
      console.error("fetchTasks error:", err);
    } finally {
      setLoading(false);
    }
  }, [sb]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  // Toggle status completed / in_progress
  const handleToggleDone = async (task: Task) => {
    const nextStatus = task.status === "completed" ? "in_progress" : "completed";
    setBusyId(task.id);

    try {
      if (sb) {
        const { error } = await sb
          .from("tasks")
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq("id", task.id);

        if (error) {
          throw new Error("อัปเดตสถานะไม่สำเร็จ: " + error.message);
        }
        await fetchTasks();
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
        );
      }

      if (onTasksChange) onTasksChange();
    } catch (err: unknown) {
      console.error("Toggle task error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปเดต";
      setStatusMessage({ text: msg, type: "error" });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setBusyId(null);
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const dueTimestamp = newDueDate ? `${newDueDate}T23:59:59+07:00` : null;

      // Find indicator_id if selected
      let indicatorId: string | null = null;
      if (selectedIndicatorCode && indicators) {
        const found = indicators.find((i) => i.code === selectedIndicatorCode);
        if (found) indicatorId = found.id;
      }

      if (sb) {
        const taskData: {
          title: string;
          description: string;
          priority: "low" | "normal" | "high" | "urgent";
          status: "in_progress";
          due_at: string | null;
          school_id?: string;
          indicator_id?: string;
          assignee_id?: string;
        } = {
          title: newTitle.trim(),
          description: newDescription.trim() || `ผู้รับผิดชอบ: ${newAssignee}`,
          priority: newPriority,
          status: "in_progress",
          due_at: dueTimestamp,
        };

        if (school?.id) taskData.school_id = school.id;
        if (indicatorId) taskData.indicator_id = indicatorId;
        if (user?.id) taskData.assignee_id = user.id;

        const { error } = await sb.from("tasks").insert(taskData);
        if (error) {
          throw new Error("สร้างงานไม่สำเร็จ: " + error.message);
        }

        setStatusMessage({ text: "สร้างภารกิจงานประกันคุณภาพใหม่เรียบร้อยแล้ว", type: "success" });
        await fetchTasks();
      } else {
        const newTask: Task = {
          id: "task-" + Date.now(),
          title: newTitle,
          description: newDescription || undefined,
          status: "in_progress",
          priority: newPriority,
          due_at: dueTimestamp,
          assignee_name: newAssignee,
        };
        setTasks([newTask, ...tasks]);
        setStatusMessage({ text: "เพิ่มงานตัวอย่างเรียบร้อย (Mock mode)", type: "success" });
      }

      if (onTasksChange) onTasksChange();

      // Reset
      setNewTitle("");
      setNewDescription("");
      setShowNewModal(false);
    } catch (err: unknown) {
      console.error("Create task error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสร้างงาน";
      setStatusMessage({ text: msg, type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Delete Task
  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`คุณต้องการลบงาน "${task.title}" ใช่หรือไม่?`)) return;

    setBusyId(task.id);
    try {
      if (sb) {
        const { error } = await sb.from("tasks").delete().eq("id", task.id);
        if (error) {
          throw new Error("ลบงานไม่สำเร็จ: " + error.message);
        }
        await fetchTasks();
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
      }

      setStatusMessage({ text: "ลบรายการงานเรียบร้อยแล้ว", type: "success" });
      if (onTasksChange) onTasksChange();
    } catch (err: unknown) {
      console.error("Delete task error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบ";
      setStatusMessage({ text: msg, type: "error" });
    } finally {
      setBusyId(null);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const fmtDate = (val: string | null | undefined) => {
    if (!val) return "ไม่ระบุ";
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

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.assignee_name ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "urgent"
        ? t.priority === "urgent" || t.priority === "high"
        : t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const inProgressCount = tasks.filter((t) => t.status !== "completed").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const urgentCount = tasks.filter((t) => t.priority === "urgent" || t.priority === "high").length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Banner */}
      <div className="panel" style={{ background: "linear-gradient(135deg, #1f375b, #12223a)", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#87bbfa", fontSize: 13, marginBottom: 4 }}>
              <Activity size={18} />
              <span>ระบบมอบหมายและติดตามงานประกันคุณภาพ (QA Task Manager)</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#fff" }}>งานติดตามและการดำเนินงานประกันคุณภาพ</h1>
            <p style={{ margin: "6px 0 0", color: "#c1d7f5", fontSize: 13 }}>
              กำกับติดตามการจัดเตรียมเอกสารหลักฐาน การประเมิน และการตรวจรายงานประจำปี โรงเรียนเทศบาล ๑ บ้านกลาง
            </p>
          </div>

          <button
            className="primary-button"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => setShowNewModal(true)}
          >
            <Plus size={16} /> สร้างภารกิจงานใหม่
          </button>
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

      {/* Filter and Search Bar */}
      <div className="panel" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f3f7fc", padding: "6px 12px", borderRadius: 8, border: "1px solid #e7eef8", width: "min(100%, 340px)" }}>
            <Search size={16} color="#7890b2" />
            <input
              type="text"
              placeholder="ค้นหาชื่องาน รายละเอียด หรือผู้รับผิดชอบ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 0, outline: 0, background: "transparent", fontSize: 12, width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>สถานะ:</span>
            {[
              { id: "all", label: `ทั้งหมด (${tasks.length})` },
              { id: "in_progress", label: `กำลังดำเนินงาน (${inProgressCount})` },
              { id: "urgent", label: `ด่วน/สำคัญ (${urgentCount})` },
              { id: "completed", label: `เสร็จสิ้นแล้ว (${completedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  border: "1px solid",
                  borderColor: statusFilter === tab.id ? "#2072f4" : "#d8e3f2",
                  background: statusFilter === tab.id ? "#eff5ff" : "#fff",
                  color: statusFilter === tab.id ? "#1b6fe8" : "#4a668e",
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
          <Loader2 size={28} className="spinner" style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
          <p style={{ margin: 0, fontSize: 13 }}>กำลังโหลดงานติดตามจาก Supabase...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "36px 20px" }}>
          <Clock size={36} color="#9bb4d0" style={{ margin: "0 auto 10px" }} />
          <h3 style={{ margin: "0 0 6px", fontSize: 15, color: "#163a63" }}>ไม่มีงานที่ตรงกับเงื่อนไขการค้นหา</h3>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--muted)" }}>
            คุณสามารถสร้างงานใหม่เพื่อมอบหมายการเตรียมเอกสารหรือติดตามการประเมินได้
          </p>
          <button
            className="primary-button"
            style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => setShowNewModal(true)}
          >
            <Plus size={16} /> สร้างงานใหม่
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((task) => {
            const isDone = task.status === "completed";
            const isUrgent = task.priority === "urgent" || task.priority === "high";
            const isBusy = busyId === task.id;

            return (
              <div
                key={task.id}
                className="panel"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  padding: "14px 18px",
                  borderLeft: isUrgent ? "4px solid #f04455" : isDone ? "4px solid #16ad72" : "4px solid #2674f5",
                  background: isDone ? "#fafcfe" : "#fff",
                  opacity: isDone ? 0.75 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "1 1 320px" }}>
                  <button
                    onClick={() => handleToggleDone(task)}
                    disabled={isBusy}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: isDone ? "#16ad72" : "#9bb0cd",
                      cursor: isBusy ? "wait" : "pointer",
                      display: "grid",
                      placeItems: "center",
                      padding: 0,
                    }}
                    title={isDone ? "คลิกเพื่อยกเลิกการเสร็จสิ้น" : "คลิกเพื่อทำเครื่องหมายว่าเสร็จสิ้นแล้ว"}
                  >
                    {isBusy ? (
                      <Loader2 size={24} className="spinner" style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                      <CheckCircle2 size={24} />
                    )}
                  </button>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 7px",
                          borderRadius: 10,
                          fontWeight: 600,
                          background: isUrgent ? "#ffe2e5" : "#eef4fd",
                          color: isUrgent ? "#d33143" : "#325c94",
                        }}
                      >
                        {task.priority === "urgent"
                          ? "เร่งด่วนที่สุด"
                          : task.priority === "high"
                          ? "ความสำคัญสูง"
                          : "งานปกติ"}
                      </span>

                      <span style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={13} /> กำหนดส่ง: {fmtDate(task.due_at)}
                      </span>
                    </div>

                    <strong
                      style={{
                        fontSize: 14,
                        color: "var(--ink)",
                        textDecoration: isDone ? "line-through" : "none",
                        lineHeight: 1.4,
                        display: "block",
                      }}
                    >
                      {task.title}
                    </strong>

                    {task.description && (
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "#627e9f", display: "flex", alignItems: "center", gap: 4 }}>
                    <Users size={14} /> {task.assignee_name ?? "คณะทำงานประกันคุณภาพ"}
                  </span>

                  <button
                    className="primary-button"
                    style={{
                      padding: "5px 12px",
                      fontSize: 11,
                      background: isDone ? "#e5edf7" : undefined,
                      color: isDone ? "#3b557c" : undefined,
                      cursor: "pointer",
                    }}
                    onClick={() => handleToggleDone(task)}
                    disabled={isBusy}
                  >
                    {isDone ? "เปิดงานอีกครั้ง" : "ทำเสร็จแล้ว"}
                  </button>

                  <button
                    onClick={() => handleDeleteTask(task)}
                    disabled={isBusy}
                    style={{
                      background: "#fff1f1",
                      border: "1px solid #ffd1d1",
                      color: "#d93838",
                      borderRadius: 6,
                      padding: "5px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                    title="ลบภารกิจงาน"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Task Modal */}
      {showNewModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowNewModal(false)}>
          <div className="login-modal" style={{ width: "min(100%, 500px)" }} onClick={(e) => e.stopPropagation()}>
            <h2 id="modal-title">สร้างงานประกันคุณภาพใหม่</h2>
            <p>มอบหมายงานจัดเตรียมเอกสารหรือติดตามการประเมิน โรงเรียนเทศบาล ๑ บ้านกลาง</p>

            <form onSubmit={handleCreateTask}>
              <label>
                ชื่องานที่ต้องทำ <span style={{ color: "#d93838" }}>*</span>
                <input
                  type="text"
                  required
                  placeholder="เช่น สรุปรายงานผลการประเมินตนเอง (SAR) ภาคเรียนที่ 2..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </label>

              <label>
                รายละเอียดของงาน
                <textarea
                  rows={2}
                  placeholder="ระบุสิ่งที่ต้องเตรียม เอกสาร หรือข้อมูลที่ต้องการ..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    fontSize: 12,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>
                  ผู้รับผิดชอบ <span style={{ color: "#d93838" }}>*</span>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ฝ่ายวิชาการ หรือ ชื่อครู"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                  />
                </label>

                <label>
                  ผูกกับตัวชี้วัด (ถ้ามี)
                  <select
                    value={selectedIndicatorCode}
                    onChange={(e) => setSelectedIndicatorCode(e.target.value)}
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {indicators?.map((ind) => (
                      <option key={ind.code} value={ind.code}>
                        {ind.code} {ind.title_th.substring(0, 30)}...
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>
                  ระดับความสำคัญ
                  <select
                    value={newPriority}
                    onChange={(e) =>
                      setNewPriority(e.target.value as "low" | "normal" | "high" | "urgent")
                    }
                  >
                    <option value="normal">ปกติ</option>
                    <option value="high">สูง</option>
                    <option value="urgent">เร่งด่วน</option>
                  </select>
                </label>

                <label>
                  วันครบกำหนด
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button type="submit" className="primary-button" style={{ flex: 1 }}>
                  บันทึกงาน
                </button>
                <button
                  type="button"
                  className="primary-button"
                  style={{ background: "#e5edf7", color: "#324e75" }}
                  onClick={() => setShowNewModal(false)}
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
