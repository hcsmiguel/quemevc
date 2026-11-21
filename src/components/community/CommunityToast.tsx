import { useEffect, type FC } from 'react';
import { X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface CommunityToastProps {
  toast: ToastData | null;
  hasSelectionBar?: boolean;
  onClose: () => void;
}

export const CommunityToast: FC<CommunityToastProps> = ({
  toast,
  hasSelectionBar = false,
  onClose,
}) => {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-200 pointer-events-auto ${
        hasSelectionBar ? 'bottom-20 sm:bottom-22' : 'bottom-6'
      }`}
    >
      <div className="bg-[#2B2420] text-[#F6F2EA] px-4 py-2.5 rounded-[6px] shadow-lg text-xs font-sans flex items-center gap-3 min-w-[240px] max-w-[90vw] justify-between border border-[#2B2420]">
        <span className="truncate">{toast.message}</span>
        <div className="flex items-center gap-2 shrink-0">
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onClose();
              }}
              className="text-[#F6F2EA] font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer text-xs"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar notificação"
            className="text-[#A39A90] hover:text-[#F6F2EA] transition-colors p-0.5 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
