'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

export default function FlashMessages() {
  const { notifications, dismiss } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {notifications.map((n) => {
        let Icon = CheckCircle2;
        let alertClass = 'aws-alert-success';

        if (n.type === 'error') {
          Icon = AlertCircle;
          alertClass = 'aws-alert-error';
        } else if (n.type === 'warning') {
          Icon = AlertTriangle;
          alertClass = 'aws-alert-warning';
        } else if (n.type === 'info') {
          Icon = Info;
          alertClass = 'aws-alert-info';
        }

        return (
          <div key={n.id} className={`aws-alert ${alertClass}`}>
            <Icon size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              {n.title && <div style={{ fontWeight: 700, marginBottom: '2px' }}>{n.title}</div>}
              <div>{n.message}</div>
            </div>
            {n.dismissible && (
              <button
                type="button"
                onClick={() => dismiss(n.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                  opacity: 0.7,
                  padding: '2px',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
