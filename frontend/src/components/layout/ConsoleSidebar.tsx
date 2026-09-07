'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Network,
  Activity,
  Globe2,
  ShieldCheck,
  Server,
  FolderLock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function ConsoleSidebar() {
  const pathname = usePathname();
  const [zoneCount, setZoneCount] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function loadCount() {
      try {
        const zones = await api.listHostedZones();
        setZoneCount(zones.length);
      } catch {
        // ignore
      }
    }
    loadCount();
  }, [pathname]);

  const navSections = [
    {
      title: 'DNS MANAGEMENT',
      items: [
        { label: 'Dashboard', href: '/', icon: LayoutDashboard, exact: true },
        {
          label: 'Hosted zones',
          href: '/hosted-zones',
          icon: Layers,
          badge: zoneCount !== null ? zoneCount.toString() : undefined,
        },
        { label: 'Traffic policies', href: '/traffic-policies', icon: Network },
      ],
    },
    {
      title: 'MONITORING & CHECKS',
      items: [
        { label: 'Health checks', href: '/health-checks', icon: Activity },
      ],
    },
    {
      title: 'DOMAINS',
      items: [
        { label: 'Registered domains', href: '/domains', icon: Globe2 },
      ],
    },
    {
      title: 'DNS FIREWALL & RESOLVER',
      items: [
        { label: 'Resolver VPCs', href: '/resolver', icon: Server },
        { label: 'DNS Firewall', href: '/resolver', icon: ShieldCheck },
      ],
    },
    {
      title: 'APPLICATION RECOVERY',
      items: [
        { label: 'Profiles', href: '/profiles', icon: FolderLock },
      ],
    },
  ];

  if (collapsed) {
    return (
      <aside
        style={{
          width: '56px',
          backgroundColor: 'var(--aws-bg-container)',
          borderRight: '1px solid var(--aws-border-light)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="aws-btn-icon"
          title="Expand sidebar"
        >
          <ChevronRight size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="aws-sidebar">
      {/* Sidebar Header */}
      <div className="aws-sidebar-header">
        <div className="aws-sidebar-title">
          <span>Route 53</span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="aws-btn-icon"
          title="Collapse sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="aws-sidebar-content">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} style={{ marginBottom: '12px' }}>
            <div className="aws-nav-group-title">{section.title}</div>
            {section.items.map((item, iIdx) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={iIdx}
                  href={item.href}
                  className={`aws-nav-link ${isActive ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon size={16} style={{ opacity: isActive ? 1 : 0.7 }} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && <span className="aws-nav-badge">{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
