const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export interface ResourceTag {
  key: string;
  value: string;
}

export interface HostedZone {
  id: string;
  name: string;
  description?: string;
  type: 'PUBLIC' | 'PRIVATE';
  vpc_id?: string | null;
  vpc_region?: string | null;
  record_count: number;
  comment?: string | null;
  created_at: string;
  updated_at?: string | null;
  tags: ResourceTag[];
}

export interface DnsRecord {
  id: string;
  hosted_zone_id: string;
  name: string;
  type: string;
  ttl: number;
  values: string[];
  is_alias: boolean;
  alias_target?: string | null;
  alias_target_type?: string | null;
  alias_evaluate_target_health?: boolean;
  routing_policy: 'SIMPLE' | 'WEIGHTED' | 'GEOLOCATION' | 'LATENCY' | 'FAILOVER' | 'MULTIVALUE';
  weight?: number | null;
  set_identifier?: string | null;
  geo_location?: string | null;
  latency_region?: string | null;
  failover_role?: string | null;
  health_check_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface HealthCheck {
  id: string;
  name: string;
  protocol: string;
  ip_or_domain: string;
  port: number;
  path: string;
  request_interval: number;
  failure_threshold: number;
  status: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
  inverted: boolean;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  account_id: string;
  account_alias: string;
  avatar_color: string;
}

export interface DashboardStats {
  total_hosted_zones: number;
  public_zones: number;
  private_zones: number;
  total_records: number;
  total_health_checks: number;
  healthy_checks: number;
  unhealthy_checks: number;
  total_traffic_policies: number;
  total_domains: number;
  query_volume_24h: { timestamp: string; queries: number }[];
}

export interface DnsTestResult {
  record_name: string;
  record_type: string;
  status: string;
  response_code: number;
  answers: string[];
  ttl: number;
  nameserver: string;
  query_time_ms: number;
  timestamp: string;
  raw_response: string;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errorDetail = `Request failed with status ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // ignore json parse error
      }
      throw new Error(errorDetail);
    }

    return await res.json();
  } catch (error: any) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Hosted Zones
  async listHostedZones(params?: { search?: string; type?: string }): Promise<HostedZone[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.type && params.type !== 'ALL') query.append('type', params.type);
    return request<HostedZone[]>(`/api/hosted-zones?${query.toString()}`);
  },

  async getHostedZone(id: string): Promise<HostedZone> {
    return request<HostedZone>(`/api/hosted-zones/${id}`);
  },

  async createHostedZone(data: {
    name: string;
    description?: string;
    type: string;
    vpc_id?: string;
    vpc_region?: string;
    comment?: string;
    tags?: ResourceTag[];
  }): Promise<HostedZone> {
    return request<HostedZone>('/api/hosted-zones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateHostedZone(id: string, data: { description?: string; comment?: string; tags?: ResourceTag[] }): Promise<HostedZone> {
    return request<HostedZone>(`/api/hosted-zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteHostedZone(id: string, force: boolean = false): Promise<{ message: string; id: string }> {
    return request<{ message: string; id: string }>(`/api/hosted-zones/${id}?force=${force}`, {
      method: 'DELETE',
    });
  },

  // DNS Records
  async listRecords(zoneId: string, params?: { search?: string; type?: string; routing_policy?: string }): Promise<DnsRecord[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.type && params.type !== 'ALL') query.append('type', params.type);
    if (params?.routing_policy && params.routing_policy !== 'ALL') query.append('routing_policy', params.routing_policy);
    return request<DnsRecord[]>(`/api/hosted-zones/${zoneId}/records?${query.toString()}`);
  },

  async createRecord(zoneId: string, data: Partial<DnsRecord>): Promise<DnsRecord> {
    return request<DnsRecord>(`/api/hosted-zones/${zoneId}/records`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async batchCreateRecords(zoneId: string, records: Partial<DnsRecord>[]): Promise<DnsRecord[]> {
    return request<DnsRecord[]>(`/api/hosted-zones/${zoneId}/records/batch`, {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
  },

  async batchDeleteRecords(zoneId: string, recordIds: string[]): Promise<{ message: string; deleted_count: number }> {
    return request<{ message: string; deleted_count: number }>(`/api/hosted-zones/${zoneId}/records/batch-delete`, {
      method: 'POST',
      body: JSON.stringify({ record_ids: recordIds }),
    });
  },

  async updateRecord(zoneId: string, recordId: string, data: Partial<DnsRecord>): Promise<DnsRecord> {
    return request<DnsRecord>(`/api/hosted-zones/${zoneId}/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteRecord(zoneId: string, recordId: string): Promise<{ message: string; id: string }> {
    return request<{ message: string; id: string }>(`/api/hosted-zones/${zoneId}/records/${recordId}`, {
      method: 'DELETE',
    });
  },

  async importBind(zoneId: string, zoneContent: string): Promise<{ imported_count: number; records: DnsRecord[]; warnings: string[] }> {
    return request(`/api/hosted-zones/${zoneId}/records/import-bind`, {
      method: 'POST',
      body: JSON.stringify({ zone_content: zoneContent }),
    });
  },

  getExportUrl(zoneId: string, format: 'bind' | 'json'): string {
    return `${API_BASE_URL}/api/hosted-zones/${zoneId}/export?format=${format}`;
  },

  // DNS Tester
  async testDnsQuery(data: { record_name: string; record_type: string; resolver_ip?: string }): Promise<DnsTestResult> {
    return request<DnsTestResult>('/api/test-dns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Health Checks
  async listHealthChecks(): Promise<HealthCheck[]> {
    return request<HealthCheck[]>('/api/health-checks');
  },

  async createHealthCheck(data: Partial<HealthCheck>): Promise<HealthCheck> {
    return request<HealthCheck>('/api/health-checks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async toggleHealthCheck(id: string): Promise<HealthCheck> {
    return request<HealthCheck>(`/api/health-checks/${id}/toggle-status`, {
      method: 'POST',
    });
  },

  async deleteHealthCheck(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/health-checks/${id}`, {
      method: 'DELETE',
    });
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/api/dashboard/stats');
  },

  // Auth / Users
  async getCurrentUser(): Promise<User> {
    return request<User>('/api/auth/me');
  },

  async listUsers(): Promise<User[]> {
    return request<User[]>('/api/auth/users');
  },

  async switchUser(userId: string): Promise<User> {
    return request<User>(`/api/auth/switch-user/${userId}`, {
      method: 'POST',
    });
  },
};
