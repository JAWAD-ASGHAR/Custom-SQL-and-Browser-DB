import React from "react";

export default function AlertModal({
  show,
  title,
  message,
  type = "alert", // "alert" or "confirm"
  variant = "info", // "info", "success", "error", "warning"
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Cancel",
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          button: "bg-[#10b981] hover:bg-[#059669]",
          icon: "✅",
        };
      case "error":
        return {
          button: "bg-[#ef4444] hover:bg-[#dc2626]",
          icon: "❌",
        };
      case "warning":
        return {
          button: "bg-[#f59e0b] hover:bg-[#d97706]",
          icon: "⚠️",
        };
      default:
        return {
          button: "bg-[#3b82f6] hover:bg-[#2563eb]",
          icon: "ℹ️",
        };
    }
  };

  const variantStyles = getVariantStyles();
  if (!show) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && type === "alert") {
      handleConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 lg:p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>{variantStyles.icon}</span>
            {title}
          </h2>
        )}
        <div className="mb-6">
          {typeof message === "string" ? (
            <p className="text-[#e0e0e0] whitespace-pre-line">{message}</p>
          ) : (
            <div className="text-[#e0e0e0]">{message}</div>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          {type === "confirm" && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#e0e0e0] rounded-md font-medium transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 ${variantStyles.button} text-white rounded-md font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
