'use client';

import React from 'react';
import Link from 'next/link';
import { Network, Plus, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

export default function TrafficPoliciesPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Traffic policies' }]} />

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--aws-text-primary)' }}>
          Traffic policies
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginTop: '4px' }}>
          Visual DNS traffic flow builder for complex multi-region latency and failover architectures.
        </p>
      </div>

      <div className="aws-container">
        <div className="aws-container-body" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: '#fff8f2',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--aws-orange-primary)',
              marginBottom: '16px',
            }}
          >
            <Network size={28} />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Traffic Flow Policy Builder
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
            Create sophisticated routing configurations using an interactive graphical flowchart to route end users to the best endpoint based on geolocation, latency, health checks, and weighted load.
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
