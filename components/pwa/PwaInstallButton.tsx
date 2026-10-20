"use client";

import { useEffect, useState } from "react";
import { Download, Check, X, Share } from "lucide-react";
import Image from "next/image";
import { useNotification } from "@/components/ui/NotificationProvider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallButton() {
  const { showAlert, showToast } = useNotification();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.update();
        })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err);
        });
    }

    // 2. Check if already running in standalone / installed mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari navigator.standalone check
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 4. Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      showToast("ติดตั้งแอปพลิเคชัน QA Bkms1 สำเร็จแล้ว!", "success", "ติดตั้งเรียบร้อย");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [showToast]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      showAlert({
        title: "วิธีติดตั้งแอปพลิเคชัน QA Bkms1",
        message: "คุณสามารถติดตั้งแอปได้โดยคลิกที่ไอคอน 'ติดตั้ง' (Install App) หรือเครื่องหมายบวก (+) ที่แถบ Address bar ด้านบนของเว็บเบราว์เซอร์ เพื่อเปิดใช้งานเสมือนแอปจริงบนอุปกรณ์ของคุณ",
        buttonText: "เข้าใจแล้ว"
      });
    }
  };

  if (isInstalled) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "#123b5d",
          border: "1px solid #205988",
          color: "#8cdcb8",
          borderRadius: 8,
          padding: "7px 12px",
          fontSize: 11,
          fontWeight: 600,
        }}
        title="กำลังใช้งานในโหมดแอปพลิเคชัน"
      >
        <Check size={14} /> ใช้งานโหมดแอปพลิเคชัน
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          background: "linear-gradient(135deg, #10b981, #059669)",
          color: "#ffffff",
          border: 0,
          borderRadius: 8,
          padding: "7px 13px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
          transition: "transform 0.1s ease, filter 0.15s ease",
        }}
        title="ติดตั้ง School QA Bkms1 ลงในอุปกรณ์ของคุณ"
      >
        <Download size={15} />
        <span>ติดตั้งแอป QA Bkms1</span>
      </button>

      {/* iOS Safari Guide Modal */}
      {showIosGuide && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="login-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(100%, 390px)", textAlign: "center" }}
          >
            <button
              className="modal-close"
              onClick={() => setShowIosGuide(false)}
              aria-label="ปิด"
            >
              <X size={18} />
            </button>

            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: "#ffffff",
                border: "1px solid #dce8f6",
                margin: "0 auto 12px",
                padding: 4,
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <Image
                src="/logo.png"
                alt="โลโก้โรงเรียน"
                width={50}
                height={50}
                style={{ objectFit: "contain" }}
              />
            </div>

            <h2 style={{ fontSize: 17, margin: "0 0 6px" }}>
              วิธีติดตั้งบน iPhone / iPad
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 16px" }}>
              เพิ่มแอป <strong>School QA Bkms1</strong> ลงบนหน้าจอโฮม
            </p>

            <div
              style={{
                display: "grid",
                gap: 12,
                textAlign: "left",
                fontSize: 13,
                background: "#f4f8fd",
                padding: 14,
                borderRadius: 10,
                lineHeight: 1.6,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span
                  style={{
                    background: "#2474f3",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  1
                </span>
                <span>
                  แตะที่ปุ่ม <strong>แชร์ (Share)</strong> <Share size={14} style={{ verticalAlign: "middle", display: "inline" }} /> ที่แถบด้านล่างของ Safari
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span
                  style={{
                    background: "#2474f3",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  2
                </span>
                <span>
                  เลื่อนลงมาแล้วเลือกเมนู <strong>&ldquo;เพิ่มไปยังหน้าจอโฮม&rdquo; (Add to Home Screen)</strong>
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span
                  style={{
                    background: "#2474f3",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  3
                </span>
                <span>
                  แตะคำว่า <strong>&ldquo;เพิ่ม&rdquo; (Add)</strong> ที่มุมขวาบน จะได้ไอคอนแอปบนหน้าจอทันที!
                </span>
              </div>
            </div>

            <button
              className="primary-button"
              style={{ width: "100%", marginTop: 16 }}
              onClick={() => setShowIosGuide(false)}
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  );
}
