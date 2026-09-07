'use client';

import React from 'react';
import { Globe, Lock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface BadgeProps {
  type?: 'public' | 'private' | 'healthy' | 'unhealthy' | 'record-type' | 'default';
  children: React.ReactNode;
}

export default function Badge({ type = 'default', children }: BadgeProps) {
  if (type === 'public') {
    return (
      <span className="aws-badge aws-badge-public">
        <Globe size={12} />
        {children}
      </span>
    );
  }

  if (type === 'private') {
    return (
      <span className="aws-badge aws-badge-private">
        <Lock size={12} />
        {children}
      </span>
    );
  }

  if (type === 'healthy') {
    return (
      <span className="aws-badge aws-badge-healthy">
        <CheckCircle2 size={12} />
        {children}
      </span>
    );
  }

  if (type === 'unhealthy') {
    return (
      <span className="aws-badge aws-badge-unhealthy">
        <XCircle size={12} />
        {children}
      </span>
    );
  }

  if (type === 'record-type') {
    return <span className="aws-badge aws-badge-type">{children}</span>;
  }

  return (
    <span
      className="aws-badge"
      style={{
        backgroundColor: 'var(--aws-bg-secondary)',
        color: 'var(--aws-text-secondary)',
        border: '1px solid var(--aws-border-subtle)',
      }}
    >
      {children}
    </span>
  );
}
