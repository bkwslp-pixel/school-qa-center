"use client";

import React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  onSignIn: (e: React.FormEvent<HTMLFormElement>) => void;
  onSendPasswordRecovery: () => void;
  authBusy: boolean;
  authMessage: string;
  client: SupabaseClient | null;
}

export function LoginModal({
  isOpen,
  onClose,
  email,
  setEmail,
  password,
  setPassword,
  onSignIn,
  onSendPasswordRecovery,
  authBusy,
  authMessage,
  client,
}: LoginModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="ปิด"
        >
          <X size={18} />
        </button>

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

        <h2 id="login-title">เข้าสู่ระบบ School QA Bkms1</h2>
        <p>สำหรับบุคลากรและคณะกรรมการประเมิน โรงเรียนเทศบาล ๑ บ้านกลาง</p>

        <form onSubmit={onSignIn}>
          <label>
            อีเมลสำหรับใช้งาน (@gmail.com)
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="เช่น somchai@gmail.com"
            />
          </label>

          <label>
            รหัสผ่าน
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่านเข้าใช้งาน"
            />
          </label>

          {authMessage && <div className="auth-message">{authMessage}</div>}

          <button
            type="submit"
            className="primary-button login-submit"
            disabled={authBusy || !client}
          >
            {authBusy ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบ"}
          </button>

          <button
            type="button"
            className="text-link"
            style={{ justifyContent: "center", marginTop: 4 }}
            disabled={authBusy || !client}
            onClick={onSendPasswordRecovery}
          >
            ลืมรหัสผ่าน หรือต้องการรับลิงก์ตั้งรหัสผ่านใหม่?
          </button>
        </form>

        {!client && (
          <p className="setup-hint">
            <strong>คำแนะนำการเชื่อมต่อ:</strong> ตรวจสอบว่าได้กำหนดค่า{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> และ{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ในไฟล์ <code>.env.local</code> เรียบร้อยแล้ว
          </p>
        )}
      </div>
    </div>
  );
}
