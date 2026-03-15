import { API_URL, authHeaders, apiFetch } from './client'

// --- Types ---

export interface GmailStatus {
  connected: boolean
  email: string
  last_sync_at: string | null
  is_active: boolean
}

export interface SyncJob {
  id: number
  status: 'pending' | 'fetching' | 'classifying' | 'parsing' | 'completed' | 'failed'
  total_messages: number
  processed_messages: number
  new_messages: number
  extracted_count: number
  error_message: string
  started_at: string
  completed_at: string | null
}

export interface SyncTriggerResponse {
  sync_job_id: number
}

export interface EmailMessageItem {
  id: number
  message_id: string
  sender: string
  subject: string
  received_at: string
  snippet: string
  source_type: string
  is_processed: boolean
}

export interface EmailMessageList {
  items: EmailMessageItem[]
  total: number
  page: number
  page_size: number
}

export interface SenderRule {
  id: number
  sender_pattern: string
  source_type: string
  is_enabled: boolean
}

export interface ExtractedData {
  id: number
  email_id: number
  data_type: string
  data_json: Record<string, unknown>
  confidence: number
  is_verified: boolean
  created_at: string
}

// --- OAuth ---

export async function getGoogleAuthUrl(): Promise<{ url: string; code_verifier: string }> {
  const res = await apiFetch(`${API_URL}/api/oauth/google/auth-url`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to get auth URL')
  return res.json()
}

export async function exchangeGoogleCode(code: string, codeVerifier: string): Promise<{ email: string; connected: boolean }> {
  const res = await apiFetch(`${API_URL}/api/oauth/google/callback`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: codeVerifier }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'OAuth callback failed')
  }
  return res.json()
}

// --- Gmail Status ---

export async function getGmailStatus(): Promise<GmailStatus> {
  const res = await apiFetch(`${API_URL}/api/gmail/status`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch Gmail status')
  return res.json()
}

export async function disconnectGmail(): Promise<void> {
  const res = await apiFetch(`${API_URL}/api/gmail/disconnect`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to disconnect Gmail')
}

// --- Sync ---

export async function triggerSync(): Promise<SyncTriggerResponse> {
  const res = await apiFetch(`${API_URL}/api/gmail/sync`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? 'Failed to trigger sync')
  }
  return res.json()
}

export async function getSyncJob(id: number): Promise<SyncJob> {
  const res = await apiFetch(`${API_URL}/api/gmail/sync/${id}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch sync job')
  return res.json()
}

// --- Messages ---

export async function getMessages(params: {
  page?: number
  page_size?: number
  source_type?: string
} = {}): Promise<EmailMessageList> {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v))
  })
  const res = await apiFetch(`${API_URL}/api/gmail/messages?${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch messages')
  return res.json()
}

// --- Sender Rules ---

export async function getSenderRules(): Promise<SenderRule[]> {
  const res = await apiFetch(`${API_URL}/api/gmail/rules`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch sender rules')
  return res.json()
}

export async function createSenderRule(data: {
  sender_pattern: string
  source_type: string
  is_enabled?: boolean
}): Promise<SenderRule> {
  const res = await apiFetch(`${API_URL}/api/gmail/rules`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create sender rule')
  return res.json()
}

export async function updateSenderRule(id: number, data: {
  is_enabled?: boolean
  source_type?: string
}): Promise<SenderRule> {
  const res = await apiFetch(`${API_URL}/api/gmail/rules/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update sender rule')
  return res.json()
}

export async function deleteSenderRule(id: number): Promise<void> {
  const res = await apiFetch(`${API_URL}/api/gmail/rules/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete sender rule')
}

// --- Extracted Data ---

export async function getExtractedData(params: {
  data_type?: string
} = {}): Promise<ExtractedData[]> {
  const qs = new URLSearchParams()
  if (params.data_type) qs.set('data_type', params.data_type)
  const res = await apiFetch(`${API_URL}/api/gmail/extracted?${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch extracted data')
  return res.json()
}

// --- Investments ---

export interface MFHolding {
  scheme_name: string
  total_units: number
  total_invested: number
  latest_nav: number
  current_value: number
  pnl: number
  pnl_pct: number
  sip_count: number
  last_allocated: string
}

export interface UpcomingSIP {
  scheme_name: string
  amount: number | null
  due_date: string
}

export interface InvestmentSummary {
  total_invested: number
  total_current: number
  total_pnl: number
  total_pnl_pct: number
  holdings_count: number
  holdings: MFHolding[]
  upcoming_sips: UpcomingSIP[]
}

export async function getInvestmentSummary(): Promise<InvestmentSummary> {
  const res = await apiFetch(`${API_URL}/api/gmail/investments`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch investment summary')
  return res.json()
}

export async function verifyExtractedData(id: number): Promise<void> {
  const res = await apiFetch(`${API_URL}/api/gmail/extracted/${id}/verify`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to verify extracted data')
}
