'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      icon: <AlertTriangle className="h-6 w-6" />,
      buttonVariant: 'danger' as const,
    },
    warning: {
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      icon: <AlertCircle className="h-6 w-6" />,
      buttonVariant: 'primary' as const,
    },
    info: {
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      icon: <Info className="h-6 w-6" />,
      buttonVariant: 'primary' as const,
    },
  };

  const style = variantStyles[variant] || variantStyles.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop com blur */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => !isLoading && onClose()}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200 border border-slate-100 z-10 text-left">
        <button
          onClick={() => !isLoading && onClose()}
          disabled={isLoading}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 ${style.iconBg}`}>
            {style.icon}
          </div>

          <div className="flex-1 pr-4">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={style.buttonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            className="text-xs"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
