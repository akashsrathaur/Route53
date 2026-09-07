'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, User, Key, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

export default function LoginPage() {
  const router = useRouter();
  const { users, switchUser } = useAuth();
  const { notify } = useNotification();

  const [authType, setAuthType] = useState<'root' | 'iam'>('root');
  const [username, setUsername] = useState('root-account');
  const [password, setPassword] = useState('••••••••••••');
  const [accountId, setAccountId] = useState('4920-3184-9102');
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);

    try {
      const match = users.find((u) => u.username === username);
      if (match) {
        await switchUser(match.id);
      }
      notify('success', `Signed in as ${username}`, 'AWS Console Session');
      router.push('/hosted-zones');
    } catch (err: any) {
      notify('error', 'Sign in failed. Please try again.', 'Auth Error');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#f8fafc',
      }}
    >
      {/* AWS Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #ec7211 0%, #eb5f07 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '18px',
            color: '#ffffff',
          }}
        >
          53
        </div>
        <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>Amazon Web Services</span>
      </div>

      {/* Sign-in Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Sign in to AWS Console</h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
          Select an IAM session or sign in as root account to manage Route 53 DNS.
        </p>

        {/* Auth Type Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            padding: '4px',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthType('root');
              setUsername('root-account');
            }}
            style={{
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: authType === 'root' ? '#ec7211' : 'transparent',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            Root user
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthType('iam');
              setUsername(users.find((u) => u.username !== 'root-account')?.username || 'alex.devops');
            }}
            style={{
              padding: '8px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: authType === 'iam' ? '#ec7211' : 'transparent',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            IAM user
          </button>
        </div>

        <form onSubmit={handleSignIn}>
          {authType === 'iam' && (
            <div className="aws-form-group">
              <label className="aws-label" style={{ color: '#f8fafc' }}>
                Account ID (12 digits) or alias
              </label>
              <input
                type="text"
                className="aws-input"
                style={{ backgroundColor: '#0f172a', borderColor: '#475569', color: '#f8fafc' }}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              />
            </div>
          )}

          <div className="aws-form-group">
            <label className="aws-label" style={{ color: '#f8fafc' }}>
              {authType === 'root' ? 'Root user email address' : 'IAM user name'}
            </label>
            <input
              type="text"
              className="aws-input"
              style={{ backgroundColor: '#0f172a', borderColor: '#475569', color: '#f8fafc' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="aws-form-group">
            <label className="aws-label" style={{ color: '#f8fafc' }}>
              Password
            </label>
            <input
              type="password"
              className="aws-input"
              style={{ backgroundColor: '#0f172a', borderColor: '#475569', color: '#f8fafc' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Quick Demo Personas */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
              Quick Demo Personas:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setUsername(u.username);
                    setAuthType(u.username === 'root-account' ? 'root' : 'iam');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: username === u.username ? '#334155' : '#0f172a',
                    border: '1px solid #475569',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: u.avatar_color }} />
                    <div>
                      <strong>{u.username}</strong>
                      <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '6px' }}>({u.role})</span>
                    </div>
                  </div>
                  {username === u.username && <Check size={14} style={{ color: '#ff9900' }} />}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="aws-btn aws-btn-primary"
            style={{ width: '100%', height: '40px', fontSize: '15px' }}
            disabled={signingIn}
          >
            {signingIn ? 'Signing in...' : 'Sign in to Console'}
          </button>
        </form>
      </div>
    </div>
  );
}
