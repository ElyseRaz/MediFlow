"use client";

import { FiAlertTriangle } from "react-icons/fi";

type Props = {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  isPending?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmer",
  isPending = false,
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-[400px] p-6">
        <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center mb-4 ${danger ? "bg-red-50" : "bg-amber-50"}`}>
          <FiAlertTriangle size={22} className={danger ? "text-[#E24B4A]" : "text-[#EF9F27]"} aria-hidden="true" />
        </div>
        <h3 id="confirm-modal-title" className="text-[#1a1e2a] font-bold text-[16px] mb-2">{title}</h3>
        <div className="text-[#737e94] text-[13px] mb-6">{message}</div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 px-4 py-2 rounded-[8px] text-[13px] font-medium text-[#737e94] border border-[#e0e5ed] hover:bg-[#f6f7fa] transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`flex-1 px-4 py-2 rounded-[8px] text-[13px] font-semibold text-white transition-colors disabled:opacity-60 ${
              danger ? "bg-[#E24B4A] hover:bg-red-600" : "bg-[#EF9F27] hover:bg-amber-500"
            }`}
          >
            {isPending ? "En cours…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
