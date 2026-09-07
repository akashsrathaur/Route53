'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface AwsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function AwsModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
}: AwsModalProps) {
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass =
    maxWidth === 'lg' ? 'aws-modal-lg' : maxWidth === 'sm' ? '' : maxWidth === 'xl' ? 'aws-modal-lg' : '';

  return (
    <div className="aws-modal-backdrop" onClick={onClose}>
      <div
        className={`aws-modal ${maxWidthClass}`}
        style={maxWidth === 'xl' ? { maxWidth: '1000px' } : {}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aws-modal-header">
          <div className="aws-modal-title">{title}</div>
          <button type="button" className="aws-btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="aws-modal-body">{children}</div>

        {footer && <div className="aws-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
