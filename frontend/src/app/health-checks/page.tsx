'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Badge from '@/components/common/Badge';
import AwsModal from '@/components/common/AwsModal';
import { api, HealthCheck } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';

export default function HealthChecksPage() {
  const { notify } = useNotification();
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formProtocol, setFormProtocol] = useState('HTTPS');
  const [formTarget, setFormTarget] = useState('');
  const [formPort, setFormPort] = useState(443);
  const [formPath, setFormPath] = useState('/health');
  const [formInterval, setFormInterval] = useState(30);
  const [creating, setCreating] = useState(false);

  const loadChecks = async () => {
    try {
      setLoading(true);
      const data = await api.listHealthChecks();
      setChecks(data);
    } catch (err: any) {
      notify('error', err.message || 'Failed to load health checks', 'API Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecks();
  }, []);

  const handleToggleStatus = async (id: string, name: string) => {
    try {
      const updated = await api.toggleHealthCheck(id);
      notify('info', `Health check '${name}' status updated to ${updated.status}`, 'Status Toggled');
      await loadChecks();
    } catch (err: any) {
      notify('error', err.message || 'Failed to toggle status', 'Error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete health check '${name}'?`)) return;
    try {
      await api.deleteHealthCheck(id);
      notify('success', `Health check '${name}' deleted successfully`, 'Deleted');
      await loadChecks();
    } catch (err: any) {
      notify('error', err.message || 'Failed to delete health check', 'Error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formTarget.trim()) return;

    try {
      setCreating(true);
      const created = await api.createHealthCheck({
        name: formName.trim(),
        protocol: formProtocol,
        ip_or_domain: formTarget.trim(),
        port: Number(formPort),
        path: formPath.trim(),
        request_interval: Number(formInterval),
      });

      notify('success', `Health check '${created.name}' created successfully.`, 'Health Check Created');
      setCreateModalOpen(false);
      setFormName('');
      setFormTarget('');
      await loadChecks();
    } catch (err: any) {
      notify('error', err.message || 'Failed to create health check', 'Error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Health checks' }]} />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--aws-text-primary)' }}>
            Health checks ({checks.length})
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginTop: '4px' }}>
            Monitor the health and performance of your web applications, web servers, and other resources.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="aws-btn aws-btn-normal"
            onClick={loadChecks}
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            className="aws-btn aws-btn-primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={15} /> Create health check
          </button>
        </div>
      </div>

      {/* Health Checks Container */}
      <div className="aws-container">
        <div className="aws-table-wrapper">
          <table className="aws-table">
            <thead>
              <tr>
                <th>Health check name</th>
                <th>Status</th>
                <th>Endpoint</th>
                <th>Protocol & Port</th>
                <th>Request interval</th>
                <th>Health check ID</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--aws-text-secondary)' }}>
                    Loading health checks...
                  </td>
                </tr>
              ) : checks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <Activity size={36} style={{ color: 'var(--aws-text-muted)', marginBottom: '12px' }} />
                    <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
                      No health checks configured
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginBottom: '16px' }}>
                      Route 53 can monitor endpoints and automatically trigger DNS failover.
                    </p>
                    <button
                      type="button"
                      className="aws-btn aws-btn-primary"
                      onClick={() => setCreateModalOpen(true)}
                    >
                      <Plus size={15} /> Create health check
                    </button>
                  </td>
                </tr>
              ) : (
                checks.map((chk) => (
                  <tr key={chk.id}>
                    <td style={{ fontWeight: 600 }}>{chk.name}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(chk.id, chk.name)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="Click to toggle health status (simulation)"
                      >
                        <Badge type={chk.status === 'HEALTHY' ? 'healthy' : 'unhealthy'}>
                          {chk.status} (Click to toggle)
                        </Badge>
                      </button>
                    </td>
                    <td>
                      <code style={{ fontFamily: 'var(--aws-font-mono)', fontSize: '13px' }}>
                        {chk.ip_or_domain}
                        {chk.path}
                      </code>
                    </td>
                    <td>
                      {chk.protocol}:{chk.port}
                    </td>
                    <td>{chk.request_interval} seconds</td>
                    <td>
                      <code style={{ fontFamily: 'var(--aws-font-mono)', fontSize: '12px' }}>{chk.id}</code>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="aws-btn-icon"
                        onClick={() => handleDelete(chk.id, chk.name)}
                        title="Delete health check"
                      >
                        <Trash2 size={15} style={{ color: 'var(--aws-red-status)' }} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Health Check Modal */}
      <AwsModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: 'var(--aws-green-status)' }} />
            Create Health Check
          </div>
        }
        footer={
          <>
            <button
              type="button"
              className="aws-btn aws-btn-normal"
              onClick={() => setCreateModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aws-btn aws-btn-primary"
              onClick={handleCreate}
              disabled={creating || !formName.trim() || !formTarget.trim()}
            >
              {creating ? 'Creating...' : 'Create health check'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="aws-form-group">
            <label className="aws-label">Name</label>
            <input
              type="text"
              className="aws-input"
              placeholder="e.g. production-api-health"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px' }}>
            <div className="aws-form-group">
              <label className="aws-label">Protocol</label>
              <select
                className="aws-select"
                value={formProtocol}
                onChange={(e) => {
                  setFormProtocol(e.target.value);
                  setFormPort(e.target.value === 'HTTPS' ? 443 : e.target.value === 'HTTP' ? 80 : 8080);
                }}
              >
                <option value="HTTPS">HTTPS</option>
                <option value="HTTP">HTTP</option>
                <option value="TCP">TCP</option>
              </select>
            </div>

            <div className="aws-form-group">
              <label className="aws-label">IP Address or Domain</label>
              <input
                type="text"
                className="aws-input mono"
                placeholder="api.example.com"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                required
              />
            </div>

            <div className="aws-form-group">
              <label className="aws-label">Port</label>
              <input
                type="number"
                className="aws-input"
                value={formPort}
                onChange={(e) => setFormPort(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {formProtocol !== 'TCP' && (
            <div className="aws-form-group">
              <label className="aws-label">Path</label>
              <input
                type="text"
                className="aws-input mono"
                placeholder="/health"
                value={formPath}
                onChange={(e) => setFormPath(e.target.value)}
              />
            </div>
          )}

          <div className="aws-form-group">
            <label className="aws-label">Request interval</label>
            <select
              className="aws-select"
              value={formInterval}
              onChange={(e) => setFormInterval(Number(e.target.value))}
            >
              <option value={30}>Standard (30 seconds)</option>
              <option value={10}>Fast (10 seconds)</option>
            </select>
          </div>
        </form>
      </AwsModal>
    </div>
  );
}
