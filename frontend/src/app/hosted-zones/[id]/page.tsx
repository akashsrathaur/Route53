'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Download,
  Upload,
  Play,
  Terminal,
  AlertTriangle,
  Info,
  Globe,
  Lock,
  ArrowUpDown,
  ExternalLink,
  ChevronDown,
  Shield,
  Server,
  Zap,
} from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Badge from '@/components/common/Badge';
import AwsModal from '@/components/common/AwsModal';
import AwsDrawer from '@/components/common/AwsDrawer';
import { api, HostedZone, DnsRecord, DnsTestResult } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'PTR', 'SRV', 'CAA', 'SOA'];
const ROUTING_POLICIES = ['SIMPLE', 'WEIGHTED', 'GEOLOCATION', 'LATENCY', 'FAILOVER', 'MULTIVALUE'];

export default function HostedZoneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const zoneId = params.id as string;
  const { notify } = useNotification();

  const [zone, setZone] = useState<HostedZone | null>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'details' | 'tags'>('records');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [policyFilter, setPolicyFilter] = useState('ALL');
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [copiedZoneId, setCopiedZoneId] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<'name' | 'type' | 'ttl' | 'routing_policy'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Quick Create Record Drawer
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [formRecordName, setFormRecordName] = useState('');
  const [formRecordType, setFormRecordType] = useState('A');
  const [formTtl, setFormTtl] = useState(300);
  const [formValues, setFormValues] = useState('');
  const [formIsAlias, setFormIsAlias] = useState(false);
  const [formAliasTarget, setFormAliasTarget] = useState('');
  const [formAliasType, setFormAliasType] = useState('CloudFront distribution');
  const [formRoutingPolicy, setFormRoutingPolicy] = useState('SIMPLE');
  const [formWeight, setFormWeight] = useState<number | ''>('');
  const [formSetId, setFormSetId] = useState('');
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Record Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DnsRecord | null>(null);
  const [editValues, setEditValues] = useState('');
  const [editTtl, setEditTtl] = useState(300);
  const [editIsAlias, setEditIsAlias] = useState(false);
  const [editAliasTarget, setEditAliasTarget] = useState('');
  const [editWeight, setEditWeight] = useState<number | ''>('');
  const [updatingRecord, setUpdatingRecord] = useState(false);

  // Delete Record Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);

  // Test DNS Record Query Simulator Modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testQueryName, setTestQueryName] = useState('');
  const [testQueryType, setTestQueryType] = useState('A');
  const [testingDns, setTestingDns] = useState(false);
  const [testResult, setTestResult] = useState<DnsTestResult | null>(null);

  // BIND Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [importing, setImporting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [z, recs] = await Promise.all([api.getHostedZone(zoneId), api.listRecords(zoneId)]);
      setZone(z);
      setRecords(recs);
    } catch (err: any) {
      notify('error', err.message || 'Failed to load hosted zone details', 'API Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (zoneId) {
      loadData();
    }
  }, [zoneId]);

  const handleCopyZoneId = () => {
    if (!zone) return;
    navigator.clipboard.writeText(zone.id);
    setCopiedZoneId(true);
    setTimeout(() => setCopiedZoneId(false), 2000);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Find assigned Name Servers from NS record
  const nameServers = useMemo(() => {
    const nsRec = records.find((r) => r.type === 'NS' && r.name === zone?.name);
    return nsRec?.values || [];
  }, [records, zone]);

  // Filter & Sort records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        const matchesSearch =
          !search ||
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.values.some((v) => v.toLowerCase().includes(search.toLowerCase())) ||
          (r.alias_target && r.alias_target.toLowerCase().includes(search.toLowerCase()));

        const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
        const matchesPolicy = policyFilter === 'ALL' || r.routing_policy === policyFilter;
        return matchesSearch && matchesType && matchesPolicy;
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
  }, [records, search, typeFilter, policyFilter, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const selectedRecords = records.filter((r) => selectedRecordIds.includes(r.id));
  const singleSelectedRecord = selectedRecords.length === 1 ? selectedRecords[0] : null;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRecordIds(paginatedRecords.map((r) => r.id));
    } else {
      setSelectedRecordIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Create Record Submit
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zone) return;

    try {
      setCreatingRecord(true);
      setCreateError(null);

      const valLines = formValues
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean);

      const created = await api.createRecord(zone.id, {
        name: formRecordName.trim() || zone.name,
        type: formRecordType,
        ttl: formIsAlias ? 300 : Number(formTtl),
        values: formIsAlias ? [] : valLines,
        is_alias: formIsAlias,
        alias_target: formIsAlias ? formAliasTarget.trim() : undefined,
        alias_target_type: formIsAlias ? formAliasType : undefined,
        routing_policy: formRoutingPolicy as any,
        weight: formRoutingPolicy === 'WEIGHTED' && formWeight !== '' ? Number(formWeight) : undefined,
        set_identifier: formSetId.trim() || undefined,
      });

      notify('success', `DNS record for '${created.name}' (${created.type}) created successfully.`, 'Record Created');
      setCreateDrawerOpen(false);
      // Reset form
      setFormRecordName('');
      setFormValues('');
      setFormAliasTarget('');
      setFormIsAlias(false);
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create record');
    } finally {
      setCreatingRecord(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!singleSelectedRecord) return;
    setEditingRecord(singleSelectedRecord);
    setEditValues(singleSelectedRecord.values.join('\n'));
    setEditTtl(singleSelectedRecord.ttl);
    setEditIsAlias(singleSelectedRecord.is_alias);
    setEditAliasTarget(singleSelectedRecord.alias_target || '');
    setEditWeight(singleSelectedRecord.weight ?? '');
    setEditModalOpen(true);
  };

  // Save Edit Record
  const handleSaveEdit = async () => {
    if (!editingRecord || !zone) return;

    try {
      setUpdatingRecord(true);
      const valLines = editValues
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean);

      await api.updateRecord(zone.id, editingRecord.id, {
        ttl: editIsAlias ? 300 : Number(editTtl),
        values: editIsAlias ? [] : valLines,
        is_alias: editIsAlias,
        alias_target: editIsAlias ? editAliasTarget.trim() : undefined,
        weight: editingRecord.routing_policy === 'WEIGHTED' && editWeight !== '' ? Number(editWeight) : undefined,
      });

      notify('success', `Record '${editingRecord.name}' updated successfully.`, 'Record Updated');
      setEditModalOpen(false);
      await loadData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to update record', 'Update Failed');
    } finally {
      setUpdatingRecord(false);
    }
  };

  // Delete Records
  const handleDeleteRecords = async () => {
    if (selectedRecordIds.length === 0 || !zone) return;

    try {
      setDeletingRecord(true);
      await api.batchDeleteRecords(zone.id, selectedRecordIds);
      notify('success', `Deleted ${selectedRecordIds.length} DNS record(s) successfully.`, 'Records Deleted');
      setSelectedRecordIds([]);
      setDeleteModalOpen(false);
      await loadData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to delete records', 'Delete Failed');
    } finally {
      setDeletingRecord(false);
    }
  };

  // Open DNS Test Query Tool
  const handleOpenTestTool = (record?: DnsRecord) => {
    const targetRec = record || singleSelectedRecord;
    if (targetRec) {
      setTestQueryName(targetRec.name);
      setTestQueryType(targetRec.type);
    } else if (zone) {
      setTestQueryName(zone.name);
      setTestQueryType('A');
    }
    setTestResult(null);
    setTestModalOpen(true);
  };

  // Run DNS Query Simulation
  const handleRunDnsTest = async () => {
    if (!testQueryName.trim()) return;
    try {
      setTestingDns(true);
      const res = await api.testDnsQuery({
        record_name: testQueryName.trim(),
        record_type: testQueryType,
      });
      setTestResult(res);
    } catch (err: any) {
      notify('error', err.message || 'DNS Query simulation failed', 'Query Error');
    } finally {
      setTestingDns(false);
    }
  };

  // BIND Import
  const handleImportBind = async () => {
    if (!zone || !importContent.trim()) return;
    try {
      setImporting(true);
      const res = await api.importBind(zone.id, importContent);
      notify('success', `Imported ${res.imported_count} record(s) into ${zone.name}`, 'BIND Import Complete');
      setImportModalOpen(false);
      setImportContent('');
      await loadData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to import BIND file', 'Import Error');
    } finally {
      setImporting(false);
    }
  };

  if (loading && !zone) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--aws-text-secondary)' }}>
        Loading hosted zone and DNS records...
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="aws-container" style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Hosted Zone Not Found</h2>
        <p style={{ marginTop: '8px', color: 'var(--aws-text-secondary)' }}>
          The requested hosted zone <code>{zoneId}</code> does not exist or has been deleted.
        </p>
        <Link href="/hosted-zones" className="aws-btn aws-btn-primary" style={{ marginTop: '16px' }}>
          Back to Hosted Zones
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Hosted zones', href: '/hosted-zones' },
          { label: zone.name },
        ]}
      />

      {/* Flagship Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--aws-text-primary)' }}>
              {zone.name}
            </h1>
            <Badge type={zone.type === 'PUBLIC' ? 'public' : 'private'}>
              {zone.type === 'PUBLIC' ? 'Public' : 'Private'}
            </Badge>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '13px',
              color: 'var(--aws-text-secondary)',
              marginTop: '6px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Hosted zone ID:</span>
              <code style={{ fontFamily: 'var(--aws-font-mono)', fontWeight: 600 }}>{zone.id}</code>
              <button
                type="button"
                className="aws-btn-icon"
                style={{ width: '20px', height: '20px' }}
                onClick={handleCopyZoneId}
                title="Copy Zone ID"
              >
                {copiedZoneId ? (
                  <Check size={12} style={{ color: 'var(--aws-green-status)' }} />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>

            <span>•</span>
            <span>{records.length} Records</span>

            {zone.type === 'PRIVATE' && zone.vpc_id && (
              <>
                <span>•</span>
                <span>
                  VPC: <code>{zone.vpc_id}</code> ({zone.vpc_region || 'us-east-1'})
                </span>
              </>
            )}

            {zone.description && (
              <>
                <span>•</span>
                <span>{zone.description}</span>
              </>
            )}
          </div>
        </div>

        {/* Global Zone Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="aws-btn aws-btn-normal"
            onClick={() => handleOpenTestTool()}
            title="Test DNS Record Resolution"
          >
            <Terminal size={14} style={{ color: 'var(--aws-orange-primary)' }} />
            Test record
          </button>

          <button
            type="button"
            className="aws-btn aws-btn-normal"
            onClick={() => setImportModalOpen(true)}
            title="Import BIND zone file"
          >
            <Upload size={14} /> Import BIND
          </button>

          <a
            href={api.getExportUrl(zone.id, 'bind')}
            target="_blank"
            rel="noreferrer"
            className="aws-btn aws-btn-normal"
            title="Export to BIND"
          >
            <Download size={14} /> Export (BIND)
          </a>

          <button
            type="button"
            className="aws-btn aws-btn-primary"
            onClick={() => {
              setCreateError(null);
              setCreateDrawerOpen(true);
            }}
          >
            <Plus size={15} /> Create record
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="aws-tabs">
        <button
          type="button"
          className={`aws-tab ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          Records ({records.length})
        </button>
        <button
          type="button"
          className={`aws-tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Hosted zone details
        </button>
        <button
          type="button"
          className={`aws-tab ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          Tags ({zone.tags?.length || 0})
        </button>
      </div>

      {/* TAB 1: Records */}
      {activeTab === 'records' && (
        <div className="aws-container">
          {/* Action Toolbar */}
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
            {/* Search & Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
                <Search
                  size={14}
                  style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--aws-text-muted)' }}
                />
                <input
                  type="text"
                  className="aws-input"
                  style={{ paddingLeft: '32px', height: '34px' }}
                  placeholder="Filter by record name or value"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Type Filter */}
              <select
                className="aws-select"
                style={{ width: '130px', height: '34px' }}
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Types</option>
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* Policy Filter */}
              <select
                className="aws-select"
                style={{ width: '160px', height: '34px' }}
                value={policyFilter}
                onChange={(e) => {
                  setPolicyFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Policies</option>
                {ROUTING_POLICIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions for Selected Records */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="aws-btn aws-btn-normal"
                disabled={!singleSelectedRecord}
                onClick={handleOpenEdit}
                title="Edit selected record"
              >
                <Edit2 size={13} /> Edit record
              </button>

              <button
                type="button"
                className="aws-btn aws-btn-normal"
                disabled={selectedRecordIds.length === 0}
                onClick={() => setDeleteModalOpen(true)}
                style={{
                  color: selectedRecordIds.length > 0 ? 'var(--aws-red-status)' : undefined,
                  borderColor: selectedRecordIds.length > 0 ? 'var(--aws-red-border)' : undefined,
                }}
                title="Delete selected record(s)"
              >
                <Trash2 size={13} /> Delete
              </button>

              <button
                type="button"
                className="aws-btn-icon"
                onClick={loadData}
                title="Refresh records"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* DNS Records Table */}
          <div className="aws-table-wrapper">
            <table className="aws-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={paginatedRecords.length > 0 && selectedRecordIds.length === paginatedRecords.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="sortable" onClick={() => handleSort('name')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Record name <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleSort('type')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Type <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleSort('routing_policy')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Routing policy <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Differentiator / Weight</th>
                  <th>Alias</th>
                  <th>Value / Route traffic to</th>
                  <th className="sortable" onClick={() => handleSort('ttl')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      TTL (seconds) <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Test</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--aws-text-secondary)' }}>
                        No records match the filter criteria.
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((rec) => {
                    const isSelected = selectedRecordIds.includes(rec.id);
                    const isApexSoaNs = (rec.type === 'SOA' || rec.type === 'NS') && rec.name === zone.name;

                    return (
                      <tr
                        key={rec.id}
                        className={isSelected ? 'selected' : ''}
                        onClick={() => handleToggleSelect(rec.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(rec.id)}
                          />
                        </td>

                        {/* Record Name */}
                        <td style={{ fontWeight: 600, color: 'var(--aws-text-primary)' }}>
                          <span style={{ fontFamily: 'var(--aws-font-mono)', fontSize: '13px' }}>
                            {rec.name}
                          </span>
                          {isApexSoaNs && (
                            <span
                              style={{
                                marginLeft: '6px',
                                fontSize: '10px',
                                padding: '1px 5px',
                                backgroundColor: 'var(--aws-bg-secondary)',
                                borderRadius: '3px',
                                color: 'var(--aws-text-muted)',
                              }}
                            >
                              Core System
                            </span>
                          )}
                        </td>

                        {/* Type Badge */}
                        <td>
                          <Badge type="record-type">{rec.type}</Badge>
                        </td>

                        {/* Routing Policy */}
                        <td>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>
                            {rec.routing_policy}
                          </span>
                        </td>

                        {/* Differentiator / Weight */}
                        <td style={{ fontSize: '13px', color: 'var(--aws-text-secondary)' }}>
                          {rec.routing_policy === 'WEIGHTED' ? (
                            <span>Weight: <strong>{rec.weight ?? '-'}</strong> ({rec.set_identifier || 'Set 1'})</span>
                          ) : rec.routing_policy === 'LATENCY' ? (
                            <span>Region: <strong>{rec.latency_region || '-'}</strong></span>
                          ) : rec.routing_policy === 'GEOLOCATION' ? (
                            <span>Location: <strong>{rec.geo_location || '-'}</strong></span>
                          ) : rec.routing_policy === 'FAILOVER' ? (
                            <span>Role: <strong>{rec.failover_role || 'PRIMARY'}</strong></span>
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Alias */}
                        <td>
                          {rec.is_alias ? (
                            <span style={{ color: 'var(--aws-blue-primary)', fontWeight: 600, fontSize: '12px' }}>
                              Yes ({rec.alias_target_type || 'Alias'})
                            </span>
                          ) : (
                            <span style={{ color: 'var(--aws-text-muted)', fontSize: '12px' }}>No</span>
                          )}
                        </td>

                        {/* Value / Route traffic to */}
                        <td style={{ maxWidth: '340px' }}>
                          {rec.is_alias ? (
                            <code style={{ fontFamily: 'var(--aws-font-mono)', fontSize: '12px', color: 'var(--aws-blue-primary)' }}>
                              {rec.alias_target}
                            </code>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {rec.values.map((v, vIdx) => (
                                <code
                                  key={vIdx}
                                  style={{
                                    fontFamily: 'var(--aws-font-mono)',
                                    fontSize: '12px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: 'block',
                                  }}
                                  title={v}
                                >
                                  {v}
                                </code>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* TTL */}
                        <td style={{ fontSize: '13px' }}>{rec.ttl}</td>

                        {/* Test Button */}
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="aws-btn aws-btn-normal aws-btn-sm"
                            style={{ height: '26px', padding: '2px 8px' }}
                            onClick={() => handleOpenTestTool(rec)}
                            title="Simulate DNS query resolution"
                          >
                            <Play size={11} style={{ fill: 'currentColor' }} /> Dig
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {filteredRecords.length > 0 && (
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
                {Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length} records
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
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
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
      )}

      {/* TAB 2: Hosted Zone Details */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* General Details */}
          <div className="aws-container" style={{ margin: 0 }}>
            <div className="aws-container-header">
              <div className="aws-container-title">Hosted zone summary</div>
            </div>
            <div className="aws-container-body">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--aws-border-light)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--aws-text-secondary)', width: '40%' }}>Hosted zone ID</td>
                    <td style={{ padding: '10px 0', fontWeight: 600 }}><code>{zone.id}</code></td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--aws-border-light)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--aws-text-secondary)' }}>Domain name</td>
                    <td style={{ padding: '10px 0', fontWeight: 600 }}>{zone.name}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--aws-border-light)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--aws-text-secondary)' }}>Type</td>
                    <td style={{ padding: '10px 0' }}>
                      <Badge type={zone.type === 'PUBLIC' ? 'public' : 'private'}>
                        {zone.type === 'PUBLIC' ? 'Public Hosted Zone' : 'Private Hosted Zone'}
                      </Badge>
                    </td>
                  </tr>
                  {zone.type === 'PRIVATE' && (
                    <>
                      <tr style={{ borderBottom: '1px solid var(--aws-border-light)' }}>
                        <td style={{ padding: '10px 0', color: 'var(--aws-text-secondary)' }}>Associated VPC</td>
                        <td style={{ padding: '10px 0', fontWeight: 600 }}><code>{zone.vpc_id}</code></td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--aws-border-light)' }}>
                        <td style={{ padding: '10px 0', color: 'var(--aws-text-secondary)' }}>VPC Region</td>
                        <td style={{ padding: '10px 0' }}>{zone.vpc_region || 'us-east-1'}</td>
                      </tr>
                    </>
                  )}
                  <tr style={{ borderBottom: '1px solid var(--aws-border-light)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--aws-text-secondary)' }}>Record count</td>
                    <td style={{ padding: '10px 0', fontWeight: 600 }}>{records.length}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--aws-border-light)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--aws-text-secondary)' }}>Created at</td>
                    <td style={{ padding: '10px 0' }}>{new Date(zone.created_at).toUTCString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 0', color: 'var(--aws-text-secondary)' }}>Comment</td>
                    <td style={{ padding: '10px 0' }}>{zone.comment || 'None'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Assigned AWS Name Servers */}
          <div className="aws-container" style={{ margin: 0 }}>
            <div className="aws-container-header">
              <div className="aws-container-title">Assigned AWS Name Servers</div>
            </div>
            <div className="aws-container-body">
              <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginBottom: '12px' }}>
                Delegate your domain registration to the following 4 authoritative Route 53 Anycast name servers:
              </p>
              <div
                style={{
                  backgroundColor: 'var(--aws-bg-secondary)',
                  border: '1px solid var(--aws-border-subtle)',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {nameServers.length > 0 ? (
                  nameServers.map((ns, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--aws-font-mono)', fontSize: '13px' }}>
                      <Server size={14} style={{ color: 'var(--aws-orange-primary)' }} />
                      <code>{ns}</code>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--aws-text-secondary)' }}>
                    Name servers initializing...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Tags */}
      {activeTab === 'tags' && (
        <div className="aws-container">
          <div className="aws-container-header">
            <div className="aws-container-title">Resource Tags ({zone.tags?.length || 0})</div>
          </div>
          <div className="aws-container-body">
            {zone.tags && zone.tags.length > 0 ? (
              <table className="aws-table" style={{ maxWidth: '600px' }}>
                <thead>
                  <tr>
                    <th>Tag Key</th>
                    <th>Tag Value</th>
                  </tr>
                </thead>
                <tbody>
                  {zone.tags.map((t, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{t.key}</td>
                      <td>{t.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: 'var(--aws-text-secondary)', fontSize: '13px' }}>
                No tags associated with this hosted zone.
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK CREATE RECORD DRAWER (AWS Cloudscape Style) */}
      <AwsDrawer
        isOpen={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        width="620px"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} style={{ color: 'var(--aws-orange-primary)' }} />
            Quick create record in {zone.name}
          </div>
        }
        footer={
          <>
            <button
              type="button"
              className="aws-btn aws-btn-normal"
              onClick={() => setCreateDrawerOpen(false)}
              disabled={creatingRecord}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aws-btn aws-btn-primary"
              onClick={handleCreateRecord}
              disabled={creatingRecord}
            >
              {creatingRecord ? 'Creating record...' : 'Create records'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateRecord}>
          {createError && (
            <div className="aws-alert aws-alert-error" style={{ marginBottom: '16px' }}>
              <Info size={16} />
              <div>
                <strong>Error creating record:</strong> {createError}
              </div>
            </div>
          )}

          {/* Record Name */}
          <div className="aws-form-group">
            <label className="aws-label">Record name</label>
            <div className="aws-label-desc">
              Specify the subdomain or leave empty for zone apex.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                className="aws-input"
                placeholder="e.g. www or api"
                value={formRecordName}
                onChange={(e) => setFormRecordName(e.target.value)}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--aws-text-secondary)' }}>
                .{zone.name}
              </span>
            </div>
          </div>

          {/* Record Type */}
          <div className="aws-form-group">
            <label className="aws-label">Record type</label>
            <div className="aws-label-desc">
              DNS record format specification.
            </div>
            <select
              className="aws-select"
              value={formRecordType}
              onChange={(e) => setFormRecordType(e.target.value)}
            >
              <option value="A">A - Routes traffic to an IPv4 address and some AWS resources</option>
              <option value="AAAA">AAAA - Routes traffic to an IPv6 address and some AWS resources</option>
              <option value="CNAME">CNAME - Routes traffic to another domain name and some AWS resources</option>
              <option value="TXT">TXT - Used to verify email senders (SPF/DKIM/DMARC) and domain ownership</option>
              <option value="MX">MX - Routes mail to mail servers with priority numbers</option>
              <option value="NS">NS - Name server record</option>
              <option value="PTR">PTR - Pointer record for reverse DNS</option>
              <option value="SRV">SRV - Service locator (priority weight port target)</option>
              <option value="CAA">CAA - Certification Authority Authorization</option>
            </select>
          </div>

          {/* Alias Toggle */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--aws-bg-secondary)',
              border: '1px solid var(--aws-border-subtle)',
              borderRadius: '6px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Alias</div>
              <div style={{ fontSize: '12px', color: 'var(--aws-text-secondary)' }}>
                Route traffic to an AWS resource (CloudFront, S3 website, ALB, or Route 53 record) at no query cost.
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formIsAlias}
                onChange={(e) => setFormIsAlias(e.target.checked)}
              />
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{formIsAlias ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          {/* If Alias: Target endpoints */}
          {formIsAlias ? (
            <div className="aws-form-group">
              <label className="aws-label">Route traffic to</label>
              <select
                className="aws-select"
                style={{ marginBottom: '10px' }}
                value={formAliasType}
                onChange={(e) => setFormAliasType(e.target.value)}
              >
                <option value="CloudFront distribution">Alias to CloudFront distribution</option>
                <option value="S3 website endpoint">Alias to S3 website endpoint</option>
                <option value="Application/Network Load Balancer">Alias to Application and Classic Load Balancer</option>
                <option value="Another Route 53 record">Alias to another record in this hosted zone</option>
              </select>
              <input
                type="text"
                className="aws-input mono"
                placeholder={
                  formAliasType === 'CloudFront distribution'
                    ? 'd111111abcdef8.cloudfront.net.'
                    : formAliasType === 'S3 website endpoint'
                    ? 's3-website-us-east-1.amazonaws.com.'
                    : 'my-load-balancer-123.us-east-1.elb.amazonaws.com.'
                }
                value={formAliasTarget}
                onChange={(e) => setFormAliasTarget(e.target.value)}
                required
              />
            </div>
          ) : (
            /* If Not Alias: Value / Target textarea */
            <div className="aws-form-group">
              <label className="aws-label">Value</label>
              <div className="aws-label-desc">
                Enter one or more target values separated by new lines.
                {formRecordType === 'A' && ' Example: 192.0.2.1'}
                {formRecordType === 'AAAA' && ' Example: 2001:0db8:85a3:0000:0000:8a2e:0370:7334'}
                {formRecordType === 'CNAME' && ' Example: target.example.com.'}
                {formRecordType === 'MX' && ' Example: 10 mail.example.com.'}
                {formRecordType === 'TXT' && ' Example: "v=spf1 include:_spf.google.com ~all"'}
                {formRecordType === 'SRV' && ' Example: 10 50 5060 sip.example.com.'}
                {formRecordType === 'CAA' && ' Example: 0 issue "letsencrypt.org"'}
              </div>
              <textarea
                className="aws-textarea mono"
                rows={4}
                placeholder={
                  formRecordType === 'A'
                    ? '192.0.2.14\n192.0.2.15'
                    : formRecordType === 'CNAME'
                    ? 'cname.target-service.com.'
                    : formRecordType === 'MX'
                    ? '10 mail.example.com.\n20 backup-mail.example.com.'
                    : formRecordType === 'TXT'
                    ? '"v=spf1 include:_spf.google.com ~all"'
                    : 'target-endpoint-value'
                }
                value={formValues}
                onChange={(e) => setFormValues(e.target.value)}
                required={!formIsAlias}
              />
            </div>
          )}

          {/* TTL */}
          {!formIsAlias && (
            <div className="aws-form-group">
              <label className="aws-label">TTL (seconds)</label>
              <div className="aws-label-desc">
                Time to live: duration that DNS resolvers cache this record.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  className="aws-input"
                  style={{ width: '160px' }}
                  value={formTtl}
                  onChange={(e) => setFormTtl(Number(e.target.value))}
                  min={0}
                  max={2147483647}
                />
                <span style={{ fontSize: '13px', color: 'var(--aws-text-secondary)' }}>
                  ({formTtl === 300 ? '5 mins - default' : formTtl === 60 ? '1 min' : formTtl === 3600 ? '1 hour' : `${formTtl}s`})
                </span>
              </div>
            </div>
          )}

          {/* Routing Policy */}
          <div className="aws-form-group">
            <label className="aws-label">Routing policy</label>
            <div className="aws-label-desc">
              How Route 53 determines which record to return in response to queries.
            </div>
            <select
              className="aws-select"
              value={formRoutingPolicy}
              onChange={(e) => setFormRoutingPolicy(e.target.value)}
            >
              <option value="SIMPLE">Simple routing - Single or multiple randomized endpoints</option>
              <option value="WEIGHTED">Weighted routing - Route traffic based on specified weights</option>
              <option value="GEOLOCATION">Geolocation routing - Route based on geographic location</option>
              <option value="LATENCY">Latency routing - Route to lowest network latency AWS region</option>
              <option value="FAILOVER">Failover routing - Active-passive failover with health checks</option>
              <option value="MULTIVALUE">Multi-value answer - Up to 8 healthy records returned</option>
            </select>
          </div>

          {/* Conditional policy fields */}
          {formRoutingPolicy === 'WEIGHTED' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label className="aws-label">Weight (0-255)</label>
                <input
                  type="number"
                  className="aws-input"
                  placeholder="e.g. 100"
                  min={0}
                  max={255}
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <label className="aws-label">Set identifier</label>
                <input
                  type="text"
                  className="aws-input"
                  placeholder="e.g. blue-fleet"
                  value={formSetId}
                  onChange={(e) => setFormSetId(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
        </form>
      </AwsDrawer>

      {/* EDIT RECORD MODAL */}
      <AwsModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit2 size={18} style={{ color: 'var(--aws-orange-primary)' }} />
            Edit record: {editingRecord?.name} ({editingRecord?.type})
          </div>
        }
        footer={
          <>
            <button
              type="button"
              className="aws-btn aws-btn-normal"
              onClick={() => setEditModalOpen(false)}
              disabled={updatingRecord}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aws-btn aws-btn-primary"
              onClick={handleSaveEdit}
              disabled={updatingRecord}
            >
              {updatingRecord ? 'Saving changes...' : 'Save changes'}
            </button>
          </>
        }
      >
        <div>
          {editingRecord && (editingRecord.type === 'SOA' || (editingRecord.type === 'NS' && editingRecord.name === zone.name)) && (
            <div className="aws-alert aws-alert-warning" style={{ marginBottom: '16px' }}>
              <AlertTriangle size={16} />
              <div>
                <strong>System Core Record:</strong> Modifying NS or SOA records on zone apex may impact DNS resolution delegation for the entire domain.
              </div>
            </div>
          )}

          {/* Alias toggle */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editIsAlias}
                onChange={(e) => setEditIsAlias(e.target.checked)}
              />
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Alias enabled</span>
            </label>
          </div>

          {editIsAlias ? (
            <div className="aws-form-group">
              <label className="aws-label">Alias target endpoint</label>
              <input
                type="text"
                className="aws-input mono"
                value={editAliasTarget}
                onChange={(e) => setEditAliasTarget(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="aws-form-group">
              <label className="aws-label">Value / Route traffic to</label>
              <textarea
                className="aws-textarea mono"
                rows={5}
                value={editValues}
                onChange={(e) => setEditValues(e.target.value)}
              />
            </div>
          )}

          {!editIsAlias && (
            <div className="aws-form-group">
              <label className="aws-label">TTL (seconds)</label>
              <input
                type="number"
                className="aws-input"
                style={{ width: '160px' }}
                value={editTtl}
                onChange={(e) => setEditTtl(Number(e.target.value))}
              />
            </div>
          )}

          {editingRecord?.routing_policy === 'WEIGHTED' && (
            <div className="aws-form-group">
              <label className="aws-label">Weight (0-255)</label>
              <input
                type="number"
                className="aws-input"
                style={{ width: '160px' }}
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          )}
        </div>
      </AwsModal>

      {/* DELETE RECORD(S) CONFIRMATION MODAL */}
      <AwsModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--aws-red-status)' }}>
            <AlertTriangle size={20} />
            Delete DNS Record(s)
          </div>
        }
        footer={
          <>
            <button
              type="button"
              className="aws-btn aws-btn-normal"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deletingRecord}
            >
              Cancel
            </button>
            <button
              type="button"
              className="aws-btn aws-btn-danger"
              onClick={handleDeleteRecords}
              disabled={deletingRecord}
            >
              {deletingRecord ? 'Deleting...' : 'Delete records'}
            </button>
          </>
        }
      >
        <div>
          <p style={{ fontSize: '14px', marginBottom: '12px' }}>
            Are you sure you want to delete the following <strong>{selectedRecordIds.length}</strong> DNS record(s)?
          </p>

          <ul style={{ paddingLeft: '20px', marginBottom: '16px', fontSize: '13px' }}>
            {selectedRecords.map((r) => (
              <li key={r.id} style={{ marginBottom: '4px' }}>
                <code style={{ fontFamily: 'var(--aws-font-mono)' }}>{r.name}</code> (<strong>{r.type}</strong>) - {r.values.join(', ') || r.alias_target}
              </li>
            ))}
          </ul>
        </div>
      </AwsModal>

      {/* INTERACTIVE DNS QUERY RESOLUTION TESTER MODAL */}
      <AwsModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        maxWidth="lg"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} style={{ color: 'var(--aws-orange-primary)' }} />
            Route 53 DNS Query Resolution Tester
          </div>
        }
        footer={
          <>
            <button
              type="button"
              className="aws-btn aws-btn-normal"
              onClick={() => setTestModalOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className="aws-btn aws-btn-primary"
              onClick={handleRunDnsTest}
              disabled={testingDns || !testQueryName.trim()}
            >
              {testingDns ? 'Simulating query...' : 'Send DNS query'}
            </button>
          </>
        }
      >
        <div>
          <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginBottom: '16px' }}>
            Simulate authoritative DNS resolution against Route 53 Anycast name servers for any record in this hosted zone.
          </p>

          {/* Query Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label className="aws-label">Query Record Name</label>
              <input
                type="text"
                className="aws-input mono"
                placeholder={zone.name}
                value={testQueryName}
                onChange={(e) => setTestQueryName(e.target.value)}
              />
            </div>

            <div>
              <label className="aws-label">Query Type</label>
              <select
                className="aws-select"
                value={testQueryType}
                onChange={(e) => setTestQueryType(e.target.value)}
              >
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Display */}
          {testResult && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>Response Status:</span>
                  <span
                    className={`aws-badge ${testResult.status === 'NOERROR' ? 'aws-badge-healthy' : 'aws-badge-unhealthy'}`}
                  >
                    {testResult.status} (RCODE: {testResult.response_code})
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--aws-text-secondary)' }}>
                  Latency: <strong>{testResult.query_time_ms} ms</strong> | Server: <code>{testResult.nameserver}</code>
                </div>
              </div>

              {/* Raw DiG Output Terminal */}
              <div
                style={{
                  backgroundColor: '#0f172a',
                  color: '#38bdf8',
                  fontFamily: 'var(--aws-font-mono)',
                  fontSize: '12px',
                  padding: '16px',
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                  overflowX: 'auto',
                  border: '1px solid #1e293b',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
                }}
              >
                {testResult.raw_response}
              </div>
            </div>
          )}
        </div>
      </AwsModal>

      {/* BIND ZONE FILE IMPORT MODAL */}
      <AwsModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        maxWidth="lg"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} style={{ color: 'var(--aws-orange-primary)' }} />
            Import BIND Zone File into {zone.name}
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
            Paste the contents of your RFC 1035 standard BIND zone file. Directives like <code>$ORIGIN</code> and <code>$TTL</code> along with <code>A</code>, <code>AAAA</code>, <code>CNAME</code>, <code>TXT</code>, <code>MX</code>, and <code>SRV</code> records will be automatically parsed into this hosted zone.
          </p>

          <div className="aws-form-group">
            <label className="aws-label">Zone File Content</label>
            <textarea
              className="aws-textarea mono"
              rows={12}
              placeholder={`$ORIGIN ${zone.name}
$TTL 300
@               IN  A       192.0.2.1
www             IN  CNAME   ${zone.name}
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
