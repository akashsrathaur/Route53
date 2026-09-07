'use client';

import React from 'react';
import Link from 'next/link';
import { Server, ShieldCheck, ArrowRight } from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

export default function ResolverPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Route 53 Resolver' }]} />

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--aws-text-primary)' }}>
          Route 53 Resolver & DNS Firewall
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginTop: '4px' }}>
          Recursive DNS resolver for hybrid cloud architectures and DNS query filtering.
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
            <Server size={28} />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Hybrid DNS Inbound/Outbound Endpoints
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
            Route 53 Resolver answers DNS queries for VPCs and on-premises networks across AWS Direct Connect or VPN connections.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link href="/hosted-zones" className="aws-btn aws-btn-primary">
              View Private Hosted Zones <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
