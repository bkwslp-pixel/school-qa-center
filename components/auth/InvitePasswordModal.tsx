"use client";

import React from "react";
import Image from "next/image";
import type { SupabaseClient } from "@supabase/supabase-js";

interface InvitePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  password: string;
  setPassword: (p: string) => void;
  confirmPassword: string;
  setConfirmPassword: (p: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  authBusy: boolean;
  message: string;
  client: SupabaseClient | null;
}

export function InvitePasswordModal({
  isOpen,
  onClose,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onSubmit,
  authBusy,
  message,
  client,
}: InvitePasswordModalProps) {
  if (!isOpen) return null;

  const isSuccess = message.startsWith("ตั้งรหัสผ่านเรียบร้อย");

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-password-title"
      >
        <div className="login-symbol" style={{ background: "#ffffff", padding: 4, border: "1px solid #dce8f6", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "grid", placeItems: "center" }}>
          <Image
            src="/logo.png"
            alt="ตราสัญลักษณ์โรงเรียนเทศบาล ๑ บ้านกลาง"
            width={44}
            height={44}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        <h2 id="invite-password-title">ตั้งรหัสผ่านสำหรับบัญชี</h2>
        <p>กำหนดรหัสผ่านเพื่อเริ่มใช้งานระบบประกันคุณภาพ School QA Bkms1</p>

        {message && <div className="auth-message">{message}</div>}

        {isSuccess ? (
          <button
            type="button"
            className="primary-button login-submit"
            onClick={onClose}
          >
            เข้าสู่ระบบและเริ่มใช้งาน
          </button>
        ) : (
          <form onSubmit={onSubmit}>
            <label>
              รหัสผ่านใหม่
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ความยาวอย่างน้อย 8 ตัวอักษร"
              />
            </label>
            <label>
              ยืนยันรหัสผ่านใหม่อีกครั้ง
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านตรงกันทั้งสองช่อง"
              />
            </label>
            <button
              type="submit"
              className="primary-button login-submit"
              disabled={authBusy || !client}
            >
              {authBusy ? "กำลังบันทึกรหัสผ่าน..." : "บันทึกและเปิดใช้งานบัญชี"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
