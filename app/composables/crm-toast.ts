export interface CrmToast { id: number; text: string; kind: 'ok' | 'error' | 'info' }

export function useCrmToast() {
  const items = useState<CrmToast[]>('crm-toasts', () => [])
  const push = (text: string, kind: CrmToast['kind'] = 'info', ms = 4200) => {
    const id = Date.now() + Math.random()
    items.value = [...items.value, { id, text, kind }]
    if (import.meta.client) setTimeout(() => { items.value = items.value.filter((t) => t.id !== id) }, ms)
  }
  return {
    items,
    ok: (t: string) => push(t, 'ok'),
    error: (t: string) => push(t, 'error', 6500),
    info: (t: string) => push(t, 'info'),
    dismiss: (id: number) => { items.value = items.value.filter((t) => t.id !== id) },
  }
}
