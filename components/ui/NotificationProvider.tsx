"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Trash2,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "primary";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface AlertDialogOptions {
  title: string;
  message: string;
  buttonText?: string;
  type?: "info" | "success" | "warning" | "error";
  nextStep?: string;
  copyData?: string;
  copyButtonText?: string;
  onConfirm?: () => void;
}

interface NotificationContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  showConfirm: (options: ConfirmDialogOptions) => void;
  showAlert: (options: AlertDialogOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmDialogOptions | null>(null);
  const [alertModal, setAlertModal] = useState<AlertDialogOptions | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [alertCopied, setAlertCopied] = useState(false);

  // Show Toast
  const showToast = useCallback(
    (message: string, type: ToastType = "success", title?: string, duration = 4000) => {
      const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
      const newToast: ToastItem = { id, message, type, title, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Show Confirm Dialog
  const showConfirm = useCallback((options: ConfirmDialogOptions) => {
    setConfirmModal(options);
  }, []);

  // Show Alert Dialog
  const showAlert = useCallback((options: AlertDialogOptions) => {
    setAlertCopied(false);
    setAlertModal(options);
  }, []);

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    try {
      setConfirmBusy(true);
      await confirmModal.onConfirm();
    } finally {
      setConfirmBusy(false);
      setConfirmModal(null);
    }
  };

  const handleCancelAction = () => {
    if (confirmModal?.onCancel) {
      confirmModal.onCancel();
    }
    setConfirmModal(null);
  };

  return (
    <NotificationContext.Provider value={{ showToast, showConfirm, showAlert }}>
      {children}

      {/* Floating Toast Notification Container (Top-Right / Mobile Top-Center) */}
      <div className="premium-toast-container" aria-live="polite">
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";
          const isWarning = toast.type === "warning";
          const isInfo = toast.type === "info";

          return (
            <div
              key={toast.id}
              className={`premium-toast premium-toast-${toast.type}`}
              role="alert"
            >
              <div className="premium-toast-icon">
                {isSuccess && <CheckCircle2 size={20} />}
                {isError && <AlertCircle size={20} />}
                {isWarning && <AlertTriangle size={20} />}
                {isInfo && <Info size={20} />}
              </div>

              <div className="premium-toast-content">
                {toast.title && <strong className="premium-toast-title">{toast.title}</strong>}
                <div className="premium-toast-message">{toast.message}</div>
              </div>

              <button
                type="button"
                className="premium-toast-close"
                onClick={() => removeToast(toast.id)}
                aria-label="ปิดการแจ้งเตือน"
              >
                <X size={15} />
              </button>

              <div
                className="premium-toast-progress"
                style={{ animationDuration: `${toast.duration || 4000}ms` }}
              />
            </div>
          );
        })}
      </div>

      {/* Premium Confirm Modal Dialog */}
      {confirmModal && (
        <div className="modal-backdrop premium-modal-backdrop" onClick={handleCancelAction}>
          <div
            className="premium-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={`premium-dialog-badge badge-${confirmModal.type || "danger"}`}>
              {confirmModal.type === "danger" ? (
                <Trash2 size={26} />
              ) : confirmModal.type === "warning" ? (
                <AlertTriangle size={26} />
              ) : (
                <Sparkles size={26} />
              )}
            </div>

            <h3 className="premium-dialog-title">{confirmModal.title}</h3>
            <p className="premium-dialog-message">{confirmModal.message}</p>

            <div className="premium-dialog-actions">
              <button
                type="button"
                className="premium-btn-cancel"
                onClick={handleCancelAction}
                disabled={confirmBusy}
              >
                {confirmModal.cancelText || "ยกเลิก"}
              </button>
              <button
                type="button"
                className={`premium-btn-confirm btn-${confirmModal.type || "danger"}`}
                onClick={handleConfirmAction}
                disabled={confirmBusy}
              >
                {confirmBusy ? "กำลังดำเนินการ..." : confirmModal.confirmText || "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Alert/Info Modal Dialog with Next Steps & Copy action */}
      {alertModal && (
        <div className="modal-backdrop premium-modal-backdrop" onClick={() => setAlertModal(null)}>
          <div
            className="premium-dialog"
            style={{ maxWidth: 480, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              className={`premium-dialog-badge badge-${
                alertModal.type === "success"
                  ? "success"
                  : alertModal.type === "error"
                  ? "danger"
                  : alertModal.type === "warning"
                  ? "warning"
                  : "primary"
              }`}
            >
              {alertModal.type === "success" ? (
                <CheckCircle2 size={30} />
              ) : alertModal.type === "error" ? (
                <AlertCircle size={30} />
              ) : alertModal.type === "warning" ? (
                <AlertTriangle size={30} />
              ) : (
                <Info size={30} />
              )}
            </div>

            <h3 className="premium-dialog-title">{alertModal.title}</h3>
            <div className="premium-dialog-message" style={{ whiteSpace: "pre-line" }}>
              {alertModal.message}
            </div>

            {/* Next Step / Actionable Instructions */}
            {alertModal.nextStep && (
              <div
                style={{
                  background:
                    alertModal.type === "success"
                      ? "rgba(22, 163, 74, 0.07)"
                      : alertModal.type === "error"
                      ? "rgba(220, 38, 38, 0.07)"
                      : "rgba(2, 132, 199, 0.07)",
                  border: `1px dashed ${
                    alertModal.type === "success"
                      ? "#86efac"
                      : alertModal.type === "error"
                      ? "#fca5a5"
                      : "#7dd3fc"
                  }`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  textAlign: "left",
                  margin: "0 0 1.25rem 0",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 700,
                    marginBottom: 4,
                    color:
                      alertModal.type === "success"
                        ? "#15803d"
                        : alertModal.type === "error"
                        ? "#b91c1c"
                        : "#0284c7",
                  }}
                >
                  <Sparkles size={16} />
                  <span>สิ่งที่ควรดำเนินการต่อไป (Next Steps):</span>
                </div>
                <div style={{ color: "#334155", whiteSpace: "pre-line" }}>
                  {alertModal.nextStep}
                </div>
              </div>
            )}

            {/* Quick Copy Data Button inside modal */}
            {alertModal.copyData && (
              <div style={{ marginBottom: "1.25rem" }}>
                <button
                  type="button"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: alertCopied ? "#16a34a" : "#2563eb",
                    color: "#ffffff",
                    padding: "10px 16px",
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
                  }}
                  onClick={() => {
                    if (alertModal.copyData) {
                      navigator.clipboard.writeText(alertModal.copyData);
                      setAlertCopied(true);
                      setTimeout(() => setAlertCopied(false), 3000);
                    }
                  }}
                >
                  {alertCopied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{alertCopied ? "คัดลอกข้อมูลเรียบร้อยแล้ว!" : alertModal.copyButtonText || "คัดลอกข้อมูลส่งต่อ"}</span>
                </button>
              </div>
            )}

            <div className="premium-dialog-actions">
              <button
                type="button"
                className={`premium-btn-confirm btn-${
                  alertModal.type === "success"
                    ? "success"
                    : alertModal.type === "error"
                    ? "danger"
                    : alertModal.type === "warning"
                    ? "warning"
                    : "primary"
                }`}
                style={{ width: "100%" }}
                onClick={() => {
                  if (alertModal.onConfirm) alertModal.onConfirm();
                  setAlertModal(null);
                }}
              >
                {alertModal.buttonText || "รับทราบ / ดำเนินการต่อ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
