'use client';

import React from 'react';
import Link from 'next/link';
import { FolderLock, ArrowRight } from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

export default function ProfilesPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Route 53 Profiles' }]} />

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--aws-text-primary)' }}>
          Route 53 Profiles
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginTop: '4px' }}>
          Standardize DNS configuration and security policies across multi-account AWS Organizations.
        </p>
      </div>

      <div className="aws-container">
        <div className="aws-container-body" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: 'var(--aws-blue-light)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--aws-blue-primary)',
              marginBottom: '16px',
            }}
          >
            <FolderLock size={28} />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Enterprise DNS Configuration Profiles
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
            Manage sets of DNS configurations, including private hosted zones, resolver rules, and firewall rule groups, and share them across multiple VPCs and AWS accounts.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link href="/hosted-zones" className="aws-btn aws-btn-primary">
              Return to Hosted Zones <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
