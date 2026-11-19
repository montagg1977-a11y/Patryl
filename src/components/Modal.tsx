import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${maxWidth} bg-ink-800 border border-ink-600 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-scale-in`}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 bg-ink-800/95 backdrop-blur border-b border-ink-600 z-10">
          <h2 className="text-lg font-bold text-white pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-ink-600 hover:bg-ink-500 transition-colors text-ink-100"
            aria-label="Закрити"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
