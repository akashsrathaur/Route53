'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="aws-breadcrumbs" aria-label="Breadcrumb">
      <Link href="/" className="aws-breadcrumb-item" title="Route 53 Root">
        <Home size={14} style={{ opacity: 0.7 }} />
        <span>Route 53</span>
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <div key={idx} className="aws-breadcrumb-item">
            <ChevronRight size={12} className="aws-breadcrumb-sep" />
            {isLast || !item.href ? (
              <span className="aws-breadcrumb-active">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
