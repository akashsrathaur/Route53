'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Layers,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Download,
  Upload,
  AlertTriangle,
  ArrowUpDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Badge from '@/components/common/Badge';
import AwsModal from '@/components/common/AwsModal';
import { api, HostedZone } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';

function HostedZonesListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotification();

  const [zones, setZones] = useState<HostedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<'name' | 'type' | 'record_count' | 'created_at'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteForce, setDeleteForce] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [importing, setImporting] = useState(false);

  const loadZones = async () => {
    try {
      setLoading(true);
      const data = await api.listHostedZones();
      setZones(data);
    } catch (err: any) {
      notify('error', err.message || 'Failed to load hosted zones', 'API Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filtered & Sorted Zones
  const filteredZones = useMemo(() => {
    return zones
      .filter((z) => {
        const matchesSearch =
          !search ||
          z.name.toLowerCase().includes(search.toLowerCase()) ||
          z.id.toLowerCase().includes(search.toLowerCase()) ||
          (z.description && z.description.toLowerCase().includes(search.toLowerCase())) ||
          (z.comment && z.comment.toLowerCase().includes(search.toLowerCase()));

        const matchesType = typeFilter === 'ALL' || z.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA! < valB!) return sortAsc ? -1 : 1;
        if (valA! > valB!) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [zones, search, typeFilter, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredZones.length / pageSize));
  const paginatedZones = filteredZones.slice((page - 1) * pageSize, page * pageSize);

  const selectedZones = zones.filter((z) => selectedZoneIds.includes(z.id));
  const singleSelectedZone = selectedZones.length === 1 ? selectedZones[0] : null;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedZoneIds(paginatedZones.map((z) => z.id));
    } else {
      setSelectedZoneIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedZoneIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    if (selectedZoneIds.length === 0) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      for (const id of selectedZoneIds) {
        await api.deleteHostedZone(id, deleteForce);
      }
      notify('success', `Deleted ${selectedZoneIds.length} hosted zone(s) successfully`, 'Hosted Zone Deleted');
      setSelectedZoneIds([]);
      setDeleteModalOpen(false);
      setDeleteForce(false);
      await loadZones();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete hosted zone');
    } finally {
      setDeleting(false);
    }
  };

  const handleImportBind = async () => {
    if (!singleSelectedZone || !importContent.trim()) return;
    try {
      setImporting(true);
      const res = await api.importBind(singleSelectedZone.id, importContent);
      notify('success', `Successfully imported ${res.imported_count} DNS record(s)`, 'BIND Import Complete');
      setImportModalOpen(false);
      setImportContent('');
      await loadZones();
      router.push(`/hosted-zones/${singleSelectedZone.id}`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to parse BIND zone file', 'Import Failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Hosted zones' }]} />

      {/* Page Header */}
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
            Hosted zones ({zones.length})
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginTop: '4px' }}>
            A hosted zone contains DNS records that tell Route 53 how to respond to queries for a domain.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {singleSelectedZone && (
            <>
              <button
                type="button"
                className="aws-btn aws-btn-normal"
                onClick={() => setImportModalOpen(true)}
                title="Import BIND zone file"
              >
                <Upload size={14} /> Import BIND
              </button>

              <div style={{ position: 'relative', display: 'inline-block' }}>
                <a
                  href={api.getExportUrl(singleSelectedZone.id, 'bind')}
                  target="_blank"
                  rel="noreferrer"
                  className="aws-btn aws-btn-normal"
                  title="Export zone to RFC 1035 BIND format"
                >
                  <Download size={14} /> Export (BIND)
                </a>
              </div>

              <a
                href={api.getExportUrl(singleSelectedZone.id, 'json')}
                target="_blank"
                rel="noreferrer"
                className="aws-btn aws-btn-normal"
                title="Export zone to JSON"
              >
                <Download size={14} /> Export (JSON)
              </a>

              <Link
                href={`/hosted-zones/${singleSelectedZone.id}`}
                className="aws-btn aws-btn-normal"
              >
                View records <ChevronRight size={14} />
              </Link>
            </>
          )}

          <button
            type="button"
            className="aws-btn aws-btn-normal"
            disabled={selectedZoneIds.length === 0}
            onClick={() => {
              setDeleteError(null);
              setDeleteForce(false);
              setDeleteModalOpen(true);
            }}
            style={{
              color: selectedZoneIds.length > 0 ? 'var(--aws-red-status)' : undefined,
              borderColor: selectedZoneIds.length > 0 ? 'var(--aws-red-border)' : undefined,
            }}
          >
            <Trash2 size={14} /> Delete
          </button>

          <Link href="/hosted-zones/create" className="aws-btn aws-btn-primary">
            <Plus size={15} /> Create hosted zone
          </Link>
        </div>
      </div>

      {/* Main Container with Table & Filter Bar */}
      <div className="aws-container">
        {/* Table Filter Toolbar */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--aws-border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--aws-text-muted)' }}
              />
              <input
                type="text"
                className="aws-input"
                style={{ paddingLeft: '32px', height: '34px' }}
                placeholder="Find hosted zones (e.g. domain, ID)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} style={{ color: 'var(--aws-text-secondary)' }} />
              <select
                className="aws-select"
                style={{ width: '150px', height: '34px' }}
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Types</option>
                <option value="PUBLIC">Public Hosted Zone</option>
                <option value="PRIVATE">Private Hosted Zone</option>
              </select>
            </div>
          </div>

          {/* Right Tools: Refresh & Pagination Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="aws-btn-icon"
              onClick={loadZones}
              title="Refresh table"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            <span style={{ fontSize: '13px', color: 'var(--aws-text-secondary)' }}>
              {filteredZones.length} of {zones.length} zone(s)
            </span>
          </div>
        </div>

        {/* Hosted Zones Table */}
        <div className="aws-table-wrapper">
          <table className="aws-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={paginatedZones.length > 0 && selectedZoneIds.length === paginatedZones.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="sortable" onClick={() => handleSort('name')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Hosted zone name <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="sortable" onClick={() => handleSort('type')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Type <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Description</th>
                <th className="sortable" onClick={() => handleSort('record_count')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Records <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Hosted zone ID</th>
                <th>VPC Details</th>
                <th>Comment</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--aws-text-secondary)' }}>
                    Loading hosted zones...
                  </td>
                </tr>
              ) : paginatedZones.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                      <Layers size={36} style={{ color: 'var(--aws-text-muted)', marginBottom: '12px' }} />
                      <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                        No hosted zones found
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginBottom: '16px' }}>
                        {search || typeFilter !== 'ALL'
                          ? 'No hosted zones match your search filters.'
                          : 'Get started by creating your first authoritative DNS hosted zone.'}
                      </p>
                      <Link href="/hosted-zones/create" className="aws-btn aws-btn-primary">
                        <Plus size={15} /> Create hosted zone
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedZones.map((zone) => {
                  const isSelected = selectedZoneIds.includes(zone.id);
                  return (
                    <tr
                      key={zone.id}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => handleToggleSelect(zone.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(zone.id)}
                        />
                      </td>

                      {/* Domain Name */}
                      <td style={{ fontWeight: 600 }}>
                        <Link
                          href={`/hosted-zones/${zone.id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: 'var(--aws-text-link)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {zone.name}
                        </Link>
                      </td>

                      {/* Type Badge */}
                      <td>
                        <Badge type={zone.type === 'PUBLIC' ? 'public' : 'private'}>
                          {zone.type === 'PUBLIC' ? 'Public' : 'Private'}
                        </Badge>
                      </td>

                      {/* Description */}
                      <td style={{ color: 'var(--aws-text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {zone.description || '-'}
                      </td>

                      {/* Records Count */}
                      <td style={{ fontWeight: 600 }}>{zone.record_count}</td>

                      {/* Hosted Zone ID with Copy Button */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <code style={{ fontFamily: 'var(--aws-font-mono)', fontSize: '12px' }}>{zone.id}</code>
                          <button
                            type="button"
                            className="aws-btn-icon"
                            style={{ width: '22px', height: '22px' }}
                            onClick={(e) => handleCopyId(zone.id, e)}
                            title="Copy Zone ID"
                          >
                            {copiedId === zone.id ? (
                              <Check size={12} style={{ color: 'var(--aws-green-status)' }} />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* VPC Details */}
                      <td style={{ fontSize: '12px', color: 'var(--aws-text-secondary)' }}>
                        {zone.type === 'PRIVATE' && zone.vpc_id ? (
                          <span>
                            <code>{zone.vpc_id}</code> ({zone.vpc_region || 'us-east-1'})
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Comment */}
                      <td style={{ color: 'var(--aws-text-secondary)', fontSize: '12px' }}>
                        {zone.comment || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        {filteredZones.length > 0 && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--aws-border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '13px',
              color: 'var(--aws-text-secondary)',
            }}
          >
            <div>
              Showing {(page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, filteredZones.length)} of {filteredZones.length} entries
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Rows per page:</span>
                <select
                  className="aws-select"
                  style={{ width: '70px', height: '28px', padding: '2px 6px' }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className="aws-btn aws-btn-normal aws-btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="aws-btn aws-btn-normal aws-btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AwsModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--aws-red-status)' }}>
            <AlertTriangle size={20} />
            Delete Hosted Zone(s)
          </div>
        }
        footer={
          <>
            <button
              type="button"
              className="aws-btn aws-btn-normal"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aws-btn aws-btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        <div>
          <p style={{ fontSize: '14px', marginBottom: '12px' }}>
            Are you sure you want to delete the following <strong>{selectedZoneIds.length}</strong> hosted zone(s)?
          </p>

          <ul style={{ paddingLeft: '20px', marginBottom: '16px', fontSize: '13px' }}>
            {selectedZones.map((z) => (
              <li key={z.id} style={{ marginBottom: '4px' }}>
                <strong>{z.name}</strong> (<code>{z.id}</code>) - {z.record_count} record(s)
              </li>
            ))}
          </ul>

          {deleteError && (
            <div className="aws-alert aws-alert-error" style={{ marginBottom: '16px' }}>
              <AlertTriangle size={16} />
              <div>
                <strong>Deletion Blocked:</strong> {deleteError}
              </div>
            </div>
          )}

          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--aws-bg-secondary)',
              border: '1px solid var(--aws-border-subtle)',
              borderRadius: '6px',
              fontSize: '13px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={deleteForce}
                onChange={(e) => setDeleteForce(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span>
                <strong>Force Delete:</strong> Cascade and permanently remove all custom DNS records associated with this zone.
              </span>
            </label>
          </div>
        </div>
      </AwsModal>

      {/* BIND Zone File Import Modal */}
      <AwsModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        maxWidth="lg"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} style={{ color: 'var(--aws-orange-primary)' }} />
            Import BIND Zone File into {singleSelectedZone?.name}
          </div>
        }
        footer={
          <>
            <button
              type="button"
              className="aws-btn aws-btn-normal"
              onClick={() => setImportModalOpen(false)}
              disabled={importing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aws-btn aws-btn-primary"
              onClick={handleImportBind}
              disabled={importing || !importContent.trim()}
            >
              {importing ? 'Importing...' : 'Parse & Import Records'}
            </button>
          </>
        }
      >
        <div>
          <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginBottom: '12px' }}>
            Paste the contents of your RFC 1035 standard BIND zone file. Directives like <code>$ORIGIN</code> and <code>$TTL</code> along with <code>A</code>, <code>AAAA</code>, <code>CNAME</code>, <code>TXT</code>, <code>MX</code>, and <code>SRV</code> records will be automatically parsed.
          </p>

          <div className="aws-form-group">
            <label className="aws-label">Zone File Content</label>
            <textarea
              className="aws-textarea mono"
              rows={12}
              placeholder={`$ORIGIN ${singleSelectedZone?.name || 'example.com.'}
$TTL 300
@               IN  A       192.0.2.1
www             IN  CNAME   ${singleSelectedZone?.name || 'example.com.'}
mail            IN  MX  10  mail.example.com.
_dmarc          IN  TXT     "v=DMARC1; p=none"`}
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
            />
          </div>
        </div>
      </AwsModal>
    </div>
  );
}

export default function HostedZonesListPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--aws-text-secondary)' }}>Loading hosted zones...</div>}>
      <HostedZonesListContent />
    </Suspense>
  );
}
