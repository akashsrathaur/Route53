'use client';

import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '/', desc: 'Focus global search' },
    { key: '?', desc: 'Show this keyboard shortcuts cheat sheet' },
    { key: 'Esc', desc: 'Close open modals or drawers' },
    { key: 'g then h', desc: 'Navigate to Hosted Zones' },
    { key: 'g then d', desc: 'Navigate to Dashboard' },
    { key: 'g then c', desc: 'Navigate to Health Checks' },
  ];

  return (
    <div className="aws-modal-backdrop" onClick={onClose}>
      <div className="aws-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aws-modal-header">
          <div className="aws-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={20} style={{ color: 'var(--aws-orange-primary)' }} />
            Keyboard Shortcuts
          </div>
          <button type="button" className="aws-btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="aws-modal-body">
          <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginBottom: '16px' }}>
            Accelerate your AWS Route 53 workflow using quick navigation keys and shortcuts:
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {shortcuts.map((s, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--aws-border-light)' }}>
                  <td style={{ padding: '10px 0' }}>
                    <kbd
                      style={{
                        backgroundColor: 'var(--aws-bg-secondary)',
                        border: '1px solid var(--aws-border-strong)',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '12px',
                        fontFamily: 'var(--aws-font-mono)',
                        fontWeight: 600,
                        color: 'var(--aws-text-primary)',
                      }}
                    >
                      {s.key}
                    </kbd>
                  </td>
                  <td style={{ padding: '10px 0', fontSize: '14px', color: 'var(--aws-text-primary)' }}>
                    {s.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="aws-modal-footer">
          <button type="button" className="aws-btn aws-btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
