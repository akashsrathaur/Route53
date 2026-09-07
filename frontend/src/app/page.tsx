'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Activity,
  Network,
  Globe2,
  Plus,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Terminal,
  FileCode,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Badge from '@/components/common/Badge';
import { api, DashboardStats } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const maxQueries = stats
    ? Math.max(...stats.query_volume_24h.map((p) => p.queries), 1000)
    : 1000;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Dashboard' }]} />

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--aws-text-primary)' }}>
            Route 53 Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginTop: '4px' }}>
            Centralized Domain Name System (DNS) routing, health monitoring, and domain management.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="aws-btn aws-btn-normal"
            onClick={loadStats}
            title="Refresh statistics"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link href="/hosted-zones/create" className="aws-btn aws-btn-primary">
            <Plus size={15} /> Create hosted zone
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Card 1: Hosted Zones */}
        <div className="aws-container" style={{ margin: 0 }}>
          <div className="aws-container-body" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--aws-text-secondary)' }}>
                DNS HOSTED ZONES
              </span>
              <Layers size={18} style={{ color: 'var(--aws-blue-primary)' }} />
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--aws-text-primary)',
                margin: '8px 0',
              }}
            >
              {stats?.total_hosted_zones ?? 0}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--aws-text-secondary)',
                marginBottom: '12px',
              }}
            >
              <span>{stats?.public_zones ?? 0} Public</span>
              <span>•</span>
              <span>{stats?.private_zones ?? 0} Private</span>
              <span>•</span>
              <span>{stats?.total_records ?? 0} Records</span>
            </div>
            <Link
              href="/hosted-zones"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              View hosted zones <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 2: Health Checks */}
        <div className="aws-container" style={{ margin: 0 }}>
          <div className="aws-container-body" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--aws-text-secondary)' }}>
                HEALTH CHECKS
              </span>
              <Activity size={18} style={{ color: 'var(--aws-green-status)' }} />
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--aws-text-primary)',
                margin: '8px 0',
              }}
            >
              {stats?.total_health_checks ?? 0}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--aws-text-secondary)',
                marginBottom: '12px',
              }}
            >
              <span style={{ color: 'var(--aws-green-status)', fontWeight: 600 }}>
                {stats?.healthy_checks ?? 0} Healthy
              </span>
              <span>•</span>
              <span style={{ color: stats?.unhealthy_checks ? 'var(--aws-red-status)' : 'inherit' }}>
                {stats?.unhealthy_checks ?? 0} Unhealthy
              </span>
            </div>
            <Link
              href="/health-checks"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              View health checks <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 3: Traffic Policies */}
        <div className="aws-container" style={{ margin: 0 }}>
          <div className="aws-container-body" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--aws-text-secondary)' }}>
                TRAFFIC POLICIES
              </span>
              <Network size={18} style={{ color: 'var(--aws-orange-primary)' }} />
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--aws-text-primary)',
                margin: '8px 0',
              }}
            >
              {stats?.total_traffic_policies ?? 3}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--aws-text-secondary)',
                marginBottom: '12px',
              }}
            >
              Global multi-region failover & latency routing
            </div>
            <Link
              href="/traffic-policies"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Configure policies <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 4: Domains */}
        <div className="aws-container" style={{ margin: 0 }}>
          <div className="aws-container-body" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--aws-text-secondary)' }}>
                REGISTERED DOMAINS
              </span>
              <Globe2 size={18} style={{ color: '#8b5cf6' }} />
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--aws-text-primary)',
                margin: '8px 0',
              }}
            >
              {stats?.total_domains ?? 8}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--aws-text-secondary)',
                marginBottom: '12px',
              }}
            >
              Auto-renewal enabled across active TLDs
            </div>
            <Link
              href="/domains"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Manage domains <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* 24h DNS Query Telemetry Chart */}
      <div className="aws-container">
        <div className="aws-container-header">
          <div>
            <div className="aws-container-title">
              <TrendingUp size={18} style={{ color: 'var(--aws-orange-primary)' }} />
              24-Hour Global DNS Query Volume
            </div>
            <div className="aws-container-description">
              Simulated authoritative query traffic across 160+ AWS Anycast Edge Locations
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="aws-badge aws-badge-healthy">
              <CheckCircle2 size={12} /> 100% Authoritative SLA
            </span>
          </div>
        </div>

        <div className="aws-container-body">
          <div className="aws-chart-bar-container">
            {stats?.query_volume_24h.map((point, idx) => {
              const heightPercent = Math.max(8, Math.round((point.queries / maxQueries) * 100));
              return (
                <div key={idx} className="aws-chart-col" title={`${point.timestamp}: ${point.queries.toLocaleString()} queries`}>
                  <div
                    className="aws-chart-bar"
                    style={{ height: `${heightPercent}%` }}
                  />
                  {idx % 4 === 0 && (
                    <span className="aws-chart-label">{point.timestamp}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions & Guidance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Quick Launchpad */}
        <div className="aws-container" style={{ margin: 0 }}>
          <div className="aws-container-header">
            <div className="aws-container-title">Quick Launchpad</div>
          </div>
          <div className="aws-container-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              href="/hosted-zones/create"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: '1px solid var(--aws-border-subtle)',
                borderRadius: '6px',
                color: 'var(--aws-text-primary)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--aws-blue-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--aws-blue-primary)',
                }}
              >
                <Plus size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Create Public or Private Hosted Zone</div>
                <div style={{ fontSize: '12px', color: 'var(--aws-text-secondary)' }}>
                  Authoritative DNS container with automatic NS and SOA records
                </div>
              </div>
            </Link>

            <Link
              href="/hosted-zones"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: '1px solid var(--aws-border-subtle)',
                borderRadius: '6px',
                color: 'var(--aws-text-primary)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  backgroundColor: '#fff8f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--aws-orange-primary)',
                }}
              >
                <FileCode size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Import BIND Zone File</div>
                <div style={{ fontSize: '12px', color: 'var(--aws-text-secondary)' }}>
                  Migrate existing DNS records from RFC 1035 zone files
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* AWS DNS Health & Security Summary */}
        <div className="aws-container" style={{ margin: 0 }}>
          <div className="aws-container-header">
            <div className="aws-container-title">DNS Security & Compliance</div>
          </div>
          <div className="aws-container-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--aws-green-status)' }} />
                <div>
                  <strong>AWS Anycast Routing:</strong> Queries resolved by closest edge location
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--aws-green-status)' }} />
                <div>
                  <strong>DDoS Mitigation:</strong> AWS Shield Standard active across all zones
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--aws-green-status)' }} />
                <div>
                  <strong>DNSSEC Signing:</strong> Ready for cryptographic validation
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
