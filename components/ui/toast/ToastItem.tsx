import React from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '../../../lib/cn';
import type { Toast, ToastTone } from './types';

const TONES: Record<ToastTone, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <CheckCircle2 size={18} />, accent: 'text-emerald-400' },
  error: { icon: <XCircle size={18} />, accent: 'text-red-400' },
  warning: { icon: <AlertTriangle size={18} />, accent: 'text-amber-400' },
  info: { icon: <Info size={18} />, accent: 'text-sky-400' },
};

export const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const tone = TONES[toast.tone];

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-80 items-start gap-3 rounded-2xl border border-white/10',
        'bg-[#1a1b1e]/95 p-3.5 shadow-2xl shadow-black/50 backdrop-blur-xl',
        'animate-in fade-in slide-in-from-bottom-2',
      )}
    >
      <span className={cn('mt-0.5 shrink-0', tone.accent)}>{tone.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs leading-relaxed text-discord-textMuted">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
};
