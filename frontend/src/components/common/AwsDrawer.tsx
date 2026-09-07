'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface AwsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export default function AwsDrawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = '600px',
}: AwsDrawerProps) {
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

  return (
    <>
      <div className="aws-drawer-backdrop" onClick={onClose} />
      <div className="aws-drawer" style={{ maxWidth: width }}>
        <div className="aws-modal-header">
          <div className="aws-modal-title">{title}</div>
          <button type="button" className="aws-btn-icon" onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        <div className="aws-modal-body" style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>

        {footer && <div className="aws-modal-footer">{footer}</div>}
      </div>
    </>
  );
}
