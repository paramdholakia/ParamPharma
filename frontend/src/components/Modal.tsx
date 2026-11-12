import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white dark:bg-slate-900 shadow-2xl border-1.5 border-slate-900 dark:border-slate-700 w-full ${maxWidth} flex flex-col max-h-[90vh] overflow-hidden executive-card`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between bg-slate-100 dark:bg-slate-800 shrink-0">
          <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono tracking-wider">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{children}</div>
      </div>
    </div>
  );
};
