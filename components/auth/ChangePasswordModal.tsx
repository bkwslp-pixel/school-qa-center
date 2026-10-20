"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  client: SupabaseClient | null;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  user,
  client,
}: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!client || !user) return;

    if (newPassword.length < 6) {
      setMessage({ text: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: "รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง", type: "error" });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const { error } = await client.auth.updateUser({ password: newPassword.trim() });
      if (error) {
        throw error;
      }
      setMessage({
        text: "เปลี่ยนรหัสผ่านสำเร็จเรียบร้อย! ท่านสามารถใช้รหัสผ่านใหม่นี้ในการเข้าใช้งานครั้งถัดไป",
        type: "success",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน";
      setMessage({ text: msg, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setMessage(null);
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleClose}>
      <div
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        style={{ width: "min(100%, 460px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={handleClose} aria-label="ปิด">
          <X size={18} />
        </button>

        <div
          className="login-symbol"
          style={{
            background: "#ffffff",
            padding: 4,
            border: "1px solid #dce8f6",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Image
            src="/logo.png"
            alt="ตราสัญลักษณ์โรงเรียนเทศบาล ๑ บ้านกลาง"
            width={44}
            height={44}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        <h2 id="change-password-title">เปลี่ยนรหัสผ่านส่วนตัว</h2>
        <p style={{ margin: "4px 0 16px", color: "#64748b", fontSize: 13 }}>
          สำหรับบัญชี: <strong style={{ color: "#1e3a5f" }}>{user?.email}</strong>
        </p>

        {message && (
          <div
            className="inline-alert"
            style={{
              background: message.type === "success" ? "#e8f8f2" : "#fef2f2",
              borderColor: message.type === "success" ? "#a6edd2" : "#fecaca",
              color: message.type === "success" ? "#0c7850" : "#b91c1c",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              fontSize: 13,
              padding: "10px 14px",
              borderRadius: 8,
            }}
          >
            {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {message?.type === "success" ? (
          <button
            type="button"
            className="primary-button login-submit"
            onClick={handleClose}
          >
            ตกลงและปิดหน้าต่าง
          </button>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              รหัสผ่านใหม่ <span style={{ color: "#d93838" }}>*</span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="ความยาวอย่างน้อย 6 ตัวอักษร"
                  disabled={busy}
                  style={{ width: "100%", paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute",
                    right: 10,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
                    padding: 4,
                  }}
                  aria-label={showPass ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label>
              ยืนยันรหัสผ่านใหม่อีกครั้ง <span style={{ color: "#d93838" }}>*</span>
              <input
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่ให้ตรงกัน"
                disabled={busy}
              />
            </label>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="submit"
                className="primary-button login-submit"
                disabled={busy || !client}
                style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}
              >
                {busy ? <Loader2 size={16} className="spinner" style={{ animation: "spin 1s linear infinite" }} /> : <KeyRound size={16} />}
                {busy ? "กำลังบันทึกรหัสผ่าน..." : "บันทึกรหัสผ่านใหม่"}
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ background: "#e5edf7", color: "#324e75" }}
                onClick={handleClose}
                disabled={busy}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
