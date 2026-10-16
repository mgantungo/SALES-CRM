/** Formatting helpers shared by all CRM screens. */
export function crmMoney(v: any, withCurrency = true): string {
  const n = Number(v || 0)
  let s: string
  if (Math.abs(n) >= 1e9) s = `${(Math.round(n / 1e7) / 100).toString()}B`
  else if (Math.abs(n) >= 1e6) s = `${(Math.round(n / 1e5) / 10).toString()}M`
  else if (Math.abs(n) >= 1e3) s = `${Math.round(n / 1e3)}K`
  else s = String(Math.round(n))
  return withCurrency ? `UGX ${s}` : s
}

export function crmFull(v: any): string {
  return Number(v || 0).toLocaleString('en-GB')
}

export function crmDate(v: any): string {
  if (!v) return ''
  const d = new Date(String(v).length === 10 ? `${v}T12:00:00` : v)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

export function crmDateTime(v: any): string {
  if (!v) return ''
  return new Date(v).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function crmAgo(days: number | null | undefined): string {
  if (days === null || days === undefined) return 'Never contacted'
  if (days <= 0) return 'Seen today'
  if (days === 1) return 'Seen yesterday'
  return `Seen ${days}d ago`
}

export function crmInitials(name?: string | null): string {
  return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const PALETTE = ['#1F4FD1', '#0E5E52', '#8A3B00', '#5B2A9E', '#173E9E', '#9A1C13', '#3A404B', '#0F5C37']
export function crmColor(seed?: string | null): string {
  let h = 0
  for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]!
}

export function crmToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const CRM_STATE_CHIP: Record<string, string> = {
  draft: '', in_review: 'c-warn', approved: 'c-ok', submitted: 'c-sales', negotiating: 'c-sales', accepted: 'c-ok', rejected: 'c-bad', expired: 'c-bad', superseded: '',
  open: 'c-sales', won: 'c-ok', lost: 'c-bad',
  pending: '', in_progress: 'c-del', blocked: 'c-bad', completed: 'c-ok', cancelled: '', active: 'c-del', planned: '', on_hold: 'c-warn',
  not_billed: '', requested: 'c-warn', invoiced: 'c-fin', issued: 'c-fin', part_paid: 'c-fin', paid: 'c-ok', overdue: 'c-bad', written_off: 'c-bad',
  accrued: 'c-sales', eligible: 'c-fin', reversed: 'c-bad',
}

export function crmLabel(s?: string | null): string {
  if (!s) return ''
  const t = String(s).replace(/_/g, ' ')
  return t[0]!.toUpperCase() + t.slice(1)
}

export const CRM_ROLE_LABEL: Record<string, string> = {
  salesperson: 'Salesperson', product_manager: 'Product manager', supervisor: 'Group manager', senior_manager: 'Senior sales manager',
  executive: 'Executive', project_manager: 'Project manager', finance: 'Finance', procurement: 'Procurement', admin: 'CRM administrator',
}
