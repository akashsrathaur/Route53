'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Search,
  Moon,
  Sun,
  Bell,
  Terminal,
  HelpCircle,
  ChevronDown,
  User,
  Shield,
  LogOut,
  ExternalLink,
  Check,
  Zap,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

export default function ConsoleHeader({ onOpenShortcuts }: { onOpenShortcuts?: () => void }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { currentUser, users, switchUser } = useAuth();
  const { notify } = useNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener for '/' search focus and '?' shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        onOpenShortcuts?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenShortcuts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/hosted-zones?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="aws-topbar">
      {/* Left section: Logo and Service */}
      <div className="aws-topbar-left">
        <Link href="/" className="aws-logo-wrap" title="AWS Route 53 Console">
          <div className="aws-logo-icon">53</div>
          <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px' }}>AWS</span>
          <span style={{ color: '#879596', fontWeight: 400, margin: '0 2px' }}>|</span>
          <span style={{ fontWeight: 600, color: '#f8fafc' }}>Route 53</span>
        </Link>

        {/* Global Search */}
        <form onSubmit={handleSearchSubmit} className="aws-topbar-search">
          <Search size={15} className="aws-topbar-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search zones, records, or services [Alt+S]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="aws-topbar-search-kbd">/</span>
        </form>
      </div>

      {/* Right section: Region, Notifications, Theme, User */}
      <div className="aws-topbar-right">
        {/* Route 53 Region (Always Global) */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="aws-topbar-btn"
            onClick={() => setRegionMenuOpen(!regionMenuOpen)}
            title="Route 53 DNS is a Global Service"
          >
            <Globe size={15} style={{ color: '#ec7211' }} />
            <span style={{ fontWeight: 600 }}>Global</span>
            <ChevronDown size={13} style={{ color: '#879596' }} />
          </button>

          {regionMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                width: '260px',
                backgroundColor: 'var(--aws-bg-container)',
                border: '1px solid var(--aws-border-subtle)',
                borderRadius: '6px',
                boxShadow: 'var(--aws-shadow-md)',
                padding: '12px',
                zIndex: 1001,
                color: 'var(--aws-text-primary)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aws-text-secondary)', marginBottom: '6px' }}>
                SERVICE SCOPE
              </div>
              <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--aws-green-status)' }}>
                <Check size={16} /> Route 53 is Global (All Regions)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--aws-text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                Hosted zones and DNS health checks automatically replicate across AWS global edge locations.
              </div>
            </div>
          )}
        </div>

        {/* CloudShell Simulator */}
        <button
          type="button"
          className="aws-topbar-btn"
          title="AWS CloudShell CLI"
          onClick={() => notify('info', 'AWS CloudShell simulated terminal ready. Use DNS Query Tester in hosted zones.', 'CloudShell')}
        >
          <Terminal size={15} />
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="aws-topbar-btn"
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            title="Notifications"
          >
            <Bell size={15} />
          </button>

          {notifMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                width: '300px',
                backgroundColor: 'var(--aws-bg-container)',
                border: '1px solid var(--aws-border-subtle)',
                borderRadius: '6px',
                boxShadow: 'var(--aws-shadow-md)',
                padding: '12px',
                zIndex: 1001,
                color: 'var(--aws-text-primary)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>AWS Health & Alerts</span>
                <span className="aws-badge aws-badge-healthy">All Systems Normal</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--aws-text-secondary)', padding: '8px 0', borderTop: '1px solid var(--aws-border-light)' }}>
                Route 53 100% SLA DNS query resolution active across 160+ Edge Locations.
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Trigger */}
        <button
          type="button"
          className="aws-topbar-btn"
          title="Keyboard Shortcuts (?)"
          onClick={() => onOpenShortcuts?.()}
        >
          <HelpCircle size={15} />
        </button>

        {/* Light/Dark Mode Switcher */}
        <button
          type="button"
          className="aws-topbar-btn"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          onClick={toggleTheme}
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} style={{ color: '#ff9900' }} />}
        </button>

        {/* User / IAM Account Dropdown */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="aws-account-badge"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div
              className="aws-user-avatar"
              style={{ backgroundColor: currentUser?.avatar_color || '#ec7211' }}
            >
              {currentUser?.username.charAt(0).toUpperCase() || 'A'}
            </div>
            <span style={{ fontWeight: 600, color: '#ffffff', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.username || 'root-account'}
            </span>
            <span style={{ color: '#879596', fontSize: '11px' }}>@</span>
            <span style={{ color: '#d5dbdb', fontSize: '12px' }}>
              {currentUser?.account_id.substring(0, 4) || '4920'}...
            </span>
            <ChevronDown size={13} style={{ color: '#879596', marginLeft: '2px' }} />
          </button>

          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '320px',
                backgroundColor: 'var(--aws-bg-container)',
                border: '1px solid var(--aws-border-subtle)',
                borderRadius: '8px',
                boxShadow: 'var(--aws-shadow-lg)',
                padding: '16px',
                zIndex: 1002,
                color: 'var(--aws-text-primary)',
              }}
            >
              {/* Current Account Card */}
              <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--aws-border-light)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--aws-text-secondary)', textTransform: 'uppercase' }}>
                  ACTIVE IAM SESSION
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <div
                    className="aws-user-avatar"
                    style={{
                      width: '32px',
                      height: '32px',
                      fontSize: '14px',
                      backgroundColor: currentUser?.avatar_color || '#ec7211',
                    }}
                  >
                    {currentUser?.username.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{currentUser?.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--aws-text-secondary)' }}>
                      Role: <strong style={{ color: 'var(--aws-blue-primary)' }}>{currentUser?.role}</strong>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--aws-text-secondary)', marginTop: '8px' }}>
                  Account ID: <code>{currentUser?.account_id}</code> ({currentUser?.account_alias})
                </div>
              </div>

              {/* IAM Role Switcher */}
              <div style={{ paddingTop: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--aws-border-light)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--aws-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  SWITCH IAM USER / ROLE
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={async () => {
                        await switchUser(u.id);
                        setUserMenuOpen(false);
                        notify('info', `Switched session to ${u.username} (${u.role})`, 'IAM Role Changed');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid transparent',
                        background: currentUser?.id === u.id ? 'var(--aws-bg-selected)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'var(--aws-text-primary)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: u.avatar_color,
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{u.username}</div>
                          <div style={{ fontSize: '11px', color: 'var(--aws-text-secondary)' }}>{u.role}</div>
                        </div>
                      </div>
                      {currentUser?.id === u.id && <Check size={14} style={{ color: 'var(--aws-blue-primary)' }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions & Sign out */}
              <div style={{ paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link
                  href="/login"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--aws-red-status)', fontWeight: 600 }}
                  onClick={() => setUserMenuOpen(false)}
                >
                  <LogOut size={14} /> Sign out of Console
                </Link>
                <a
                  href="https://aws.amazon.com/route53/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--aws-text-link)' }}
                >
                  AWS Docs <ExternalLink size={11} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
