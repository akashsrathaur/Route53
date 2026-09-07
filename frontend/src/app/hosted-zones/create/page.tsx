'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Lock,
  Plus,
  Trash2,
  Info,
  Layers,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { api, ResourceTag } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';

export default function CreateHostedZonePage() {
  const router = useRouter();
  const { notify } = useNotification();

  const [domainName, setDomainName] = useState('');
  const [description, setDescription] = useState('');
  const [zoneType, setZoneType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [vpcId, setVpcId] = useState('vpc-01a9f4c3');
  const [vpcRegion, setVpcRegion] = useState('us-east-1');
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<ResourceTag[]>([
    { key: 'Environment', value: 'production' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddTag = () => {
    setTags([...tags, { key: '', value: '' }]);
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, idx) => idx !== index));
  };

  const handleTagChange = (index: number, field: 'key' | 'value', value: string) => {
    const nextTags = [...tags];
    nextTags[index][field] = value;
    setTags(nextTags);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) {
      setErrorMsg('Please specify a valid domain name.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const created = await api.createHostedZone({
        name: domainName.trim(),
        description: description.trim(),
        type: zoneType,
        vpc_id: zoneType === 'PRIVATE' ? vpcId : undefined,
        vpc_region: zoneType === 'PRIVATE' ? vpcRegion : undefined,
        comment: comment.trim() || undefined,
        tags: tags.filter((t) => t.key.trim()),
      });

      notify(
        'success',
        `Hosted zone for '${created.name}' created with 4 Name Servers and 1 SOA record.`,
        'Hosted Zone Created'
      );
      router.push(`/hosted-zones/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create hosted zone');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Hosted zones', href: '/hosted-zones' },
          { label: 'Create hosted zone' },
        ]}
      />

      <form onSubmit={handleSubmit}>
        {/* Header with Actions */}
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
              Create hosted zone
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--aws-text-secondary)', marginTop: '4px' }}>
              Define the domain name and choose between public internet routing or VPC-private routing.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/hosted-zones" className="aws-btn aws-btn-normal">
              Cancel
            </Link>
            <button
              type="submit"
              className="aws-btn aws-btn-primary"
              disabled={submitting || !domainName.trim()}
            >
              {submitting ? 'Creating zone...' : 'Create hosted zone'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="aws-alert aws-alert-error" style={{ marginBottom: '20px' }}>
            <Info size={18} />
            <div>
              <strong>Failed to create hosted zone:</strong> {errorMsg}
            </div>
          </div>
        )}

        {/* Configuration Card */}
        <div className="aws-container">
          <div className="aws-container-header">
            <div className="aws-container-title">Hosted zone configuration</div>
          </div>

          <div className="aws-container-body">
            {/* Domain Name */}
            <div className="aws-form-group">
              <label className="aws-label" htmlFor="domainName">
                Domain name <span style={{ color: 'var(--aws-red-status)' }}>*</span>
              </label>
              <div className="aws-label-desc">
                The name of the domain that you want to route traffic for (e.g. <code>example.com</code> or <code>subdomain.example.com</code>).
              </div>
              <input
                id="domainName"
                type="text"
                className="aws-input"
                style={{ maxWidth: '480px' }}
                placeholder="example.com"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="aws-form-group">
              <label className="aws-label" htmlFor="description">
                Description - <em>optional</em>
              </label>
              <div className="aws-label-desc">
                An optional description to help distinguish this hosted zone across your AWS account.
              </div>
              <input
                id="description"
                type="text"
                className="aws-input"
                style={{ maxWidth: '640px' }}
                placeholder="Production public website and API services"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Type Radio Cards */}
            <div className="aws-form-group">
              <label className="aws-label">Type</label>
              <div className="aws-label-desc">
                Choose how Route 53 should respond to queries for this hosted zone.
              </div>

              <div className="aws-radio-group">
                {/* Public Option */}
                <div
                  className={`aws-radio-card ${zoneType === 'PUBLIC' ? 'active' : ''}`}
                  onClick={() => setZoneType('PUBLIC')}
                >
                  <input
                    type="radio"
                    name="zoneType"
                    checked={zoneType === 'PUBLIC'}
                    onChange={() => setZoneType('PUBLIC')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Globe size={16} style={{ color: 'var(--aws-blue-primary)' }} />
                      Public hosted zone
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--aws-text-secondary)', marginTop: '4px' }}>
                      Routes internet traffic on public nameservers globally across AWS Anycast edge locations.
                    </div>
                  </div>
                </div>

                {/* Private Option */}
                <div
                  className={`aws-radio-card ${zoneType === 'PRIVATE' ? 'active' : ''}`}
                  onClick={() => setZoneType('PRIVATE')}
                >
                  <input
                    type="radio"
                    name="zoneType"
                    checked={zoneType === 'PRIVATE'}
                    onChange={() => setZoneType('PRIVATE')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={16} style={{ color: '#7e22ce' }} />
                      Private hosted zone
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--aws-text-secondary)', marginTop: '4px' }}>
                      Routes traffic only within one or more Virtual Private Clouds (VPCs) that you specify.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Private Zone VPC Association */}
            {zoneType === 'PRIVATE' && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--aws-bg-secondary)',
                  border: '1px solid var(--aws-border-subtle)',
                  borderRadius: '6px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>
                  VPC to associate with the hosted zone
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '640px' }}>
                  <div className="aws-form-group" style={{ marginBottom: 0 }}>
                    <label className="aws-label">VPC Region</label>
                    <select
                      className="aws-select"
                      value={vpcRegion}
                      onChange={(e) => setVpcRegion(e.target.value)}
                    >
                      <option value="us-east-1">US East (N. Virginia) [us-east-1]</option>
                      <option value="us-west-2">US West (Oregon) [us-west-2]</option>
                      <option value="eu-west-1">Europe (Ireland) [eu-west-1]</option>
                      <option value="eu-central-1">Europe (Frankfurt) [eu-central-1]</option>
                      <option value="ap-southeast-1">Asia Pacific (Singapore) [ap-southeast-1]</option>
                    </select>
                  </div>

                  <div className="aws-form-group" style={{ marginBottom: 0 }}>
                    <label className="aws-label">VPC ID</label>
                    <input
                      type="text"
                      className="aws-input"
                      value={vpcId}
                      onChange={(e) => setVpcId(e.target.value)}
                      placeholder="vpc-01a9f4c3"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Comment */}
            <div className="aws-form-group">
              <label className="aws-label" htmlFor="comment">
                Comment - <em>optional</em>
              </label>
              <textarea
                id="comment"
                className="aws-textarea"
                rows={3}
                style={{ maxWidth: '640px' }}
                placeholder="Internal notes or ticket reference"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tags Card */}
        <div className="aws-container">
          <div className="aws-container-header">
            <div>
              <div className="aws-container-title">Tags - <em>optional</em></div>
              <div className="aws-container-description">
                Key-value pairs to organize, track costs, or manage access for this hosted zone.
              </div>
            </div>
            <button
              type="button"
              className="aws-btn aws-btn-normal aws-btn-sm"
              onClick={handleAddTag}
            >
              <Plus size={13} /> Add new tag
            </button>
          </div>

          <div className="aws-container-body">
            {tags.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--aws-text-secondary)' }}>
                No tags applied. Click <strong>Add new tag</strong> to attach metadata.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tags.map((tag, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="text"
                      className="aws-input"
                      style={{ maxWidth: '240px' }}
                      placeholder="Key (e.g. Environment)"
                      value={tag.key}
                      onChange={(e) => handleTagChange(idx, 'key', e.target.value)}
                    />
                    <input
                      type="text"
                      className="aws-input"
                      style={{ maxWidth: '280px' }}
                      placeholder="Value (e.g. production)"
                      value={tag.value}
                      onChange={(e) => handleTagChange(idx, 'value', e.target.value)}
                    />
                    <button
                      type="button"
                      className="aws-btn-icon"
                      onClick={() => handleRemoveTag(idx)}
                      title="Remove tag"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Link href="/hosted-zones" className="aws-btn aws-btn-normal">
            Cancel
          </Link>
          <button
            type="submit"
            className="aws-btn aws-btn-primary"
            disabled={submitting || !domainName.trim()}
          >
            {submitting ? 'Creating zone...' : 'Create hosted zone'}
          </button>
        </div>
      </form>
    </div>
  );
}
