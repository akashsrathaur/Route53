'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import ConsoleHeader from '@/components/layout/ConsoleHeader';
import ConsoleSidebar from '@/components/layout/ConsoleSidebar';
import FlashMessages from '@/components/layout/FlashMessages';
import ShortcutsModal from '@/components/layout/ShortcutsModal';

export default function ConsoleLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // If login page, don't show full AWS console layout
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <FlashMessages />
        {children}
      </main>
    );
  }

  return (
    <div className="aws-console-shell">
      <ConsoleHeader onOpenShortcuts={() => setShortcutsOpen(true)} />
      <div className="aws-console-main-layout">
        <ConsoleSidebar />
        <main className="aws-console-content">
          <FlashMessages />
          {children}
        </main>
      </div>
      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
