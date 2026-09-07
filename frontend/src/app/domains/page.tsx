'use client';

import React from 'react';
import Link from 'next/link';
import { Globe2, ArrowRight } from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

export default function DomainsPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Registered domains' }]} />

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--aws-text-primary)' }}>
          Registered Domains
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginTop: '4px' }}>
          Domain registration, DNSSEC management, and contact profile administration.
        </p>
      </div>

      <div className="aws-container">
        <div className="aws-container-body" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#ede9fe',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8b5cf6',
              marginBottom: '16px',
            }}
          >
            <Globe2 size={28} />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Domain Registration & Delegation
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--aws-text-secondary)',
              maxWidth: '560px',
              margin: '0 auto 24px',
              lineHeight: 1.5,
            }}
          >
            Register new domains, transfer existing domains, or automatically link registered domains to your Route 53 Public Hosted Zones.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link href="/hosted-zones" className="aws-btn aws-btn-primary">
              Manage Hosted Zones <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
