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
  type?: "info" | "success" | "warning";
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

      {/* Premium Alert/Info Modal Dialog */}
      {alertModal && (
        <div className="modal-backdrop premium-modal-backdrop" onClick={() => setAlertModal(null)}>
          <div
            className="premium-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="premium-dialog-badge badge-primary">
              <Info size={26} />
            </div>

            <h3 className="premium-dialog-title">{alertModal.title}</h3>
            <p className="premium-dialog-message">{alertModal.message}</p>

            <div className="premium-dialog-actions">
              <button
                type="button"
                className="premium-btn-confirm btn-primary"
                style={{ width: "100%" }}
                onClick={() => setAlertModal(null)}
              >
                {alertModal.buttonText || "เข้าใจแล้ว"}
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
