<script setup lang="ts">
/** Log a visit or call: pick how it went, Save. The next step is suggested and the deal moves by itself. */
definePageMeta({ path: '/crm/log' })
const route = useRoute()
const api = useCrmApi()
const { busy, run } = useCrmAction()
const client = ref<string | null>((route.query.client as string) || null)
const opportunity = (route.query.opportunity as string) || undefined
const kind = ref('meeting')
const outcome = ref<string | null>(null)
const next = ref<string | null>(null)
const when = ref<string | null>(null)
const summary = ref('')
const done = ref<any>(null)

const KINDS: [string, string][] = [['call', 'Call'], ['meeting', 'Meeting'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['note', 'Note']]
const OUTCOMES = [
  { id: 'wants_quote', label: 'Wants a quote', next: 'send_quote', when: 'tomorrow' },
  { id: 'positive', label: 'Went well', next: 'meet_again', when: 'next_week' },
  { id: 'needs_time', label: 'Needs time', next: 'call_back', when: 'friday' },
  { id: 'no_answer', label: 'No answer', next: 'call_back', when: 'tomorrow' },
  { id: 'not_interested', label: 'Not interested', next: 'none', when: null },
]
const NEXTS: [string, string][] = [['send_quote', 'Send quote'], ['call_back', 'Call back'], ['meet_again', 'Meet again'], ['none', 'Nothing']]
const WHENS: [string, string][] = [['tomorrow', 'Tomorrow'], ['friday', 'Friday'], ['next_week', 'Next week']]
const pickOutcome = (o: any) => { outcome.value = o.id; next.value = o.next; when.value = o.when }

const save = async () => {
  if (!client.value || !outcome.value) return
  const r = await run(() => api.post('/interactions', {
    client: client.value, opportunity, kind: kind.value, outcome: outcome.value,
    next_action_type: next.value, next_action_due: when.value, summary: summary.value || undefined, source: 'phone',
  }))
  if (r) done.value = r
}

// voice notes where the browser supports it
const listening = ref(false)
const dictate = () => {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { useCrmToast().info('Voice notes are not supported on this browser.'); return }
  const rec = new SR()
  rec.lang = 'en-UG'
  rec.onresult = (e: any) => { summary.value = `${summary.value} ${e.results[0][0].transcript}`.trim() }
  rec.onend = () => { listening.value = false }
  listening.value = true
  rec.start()
}
</script>

<template>
  <CrmShell title="Log a visit or call" back focus>
    <div class="page page-narrow">
      <CrmDone v-if="done" :message="done.message" :message2="done.message2">
        <NuxtLink v-if="outcome === 'wants_quote'" :to="{ path: '/crm/quote', query: { client, opportunity: done.opportunity } }" class="btn btn-primary btn-lg">Send the quote now</NuxtLink>
        <NuxtLink to="/crm" class="btn btn-lg" :class="{ 'btn-primary': outcome !== 'wants_quote' }">Back to today</NuxtLink>
      </CrmDone>

      <template v-else>
        <h1 class="hide-mobile">Log a visit or call</h1>
        <CrmClientPicker v-model="client" label="Who with?" />

        <div role="group" aria-label="Type" class="seg-ctl">
          <button v-for="[k, l] in KINDS" :key="k" :aria-pressed="kind === k" @click="kind = k">{{ l }}</button>
        </div>

        <div class="stack" style="gap: 8px">
          <div class="label"><span class="tap mono">1</span> How did it go?</div>
          <div class="row-wrap"><button v-for="o in OUTCOMES" :key="o.id" class="pick" :aria-pressed="outcome === o.id" @click="pickOutcome(o)">{{ o.label }}</button></div>
        </div>

        <template v-if="outcome">
          <div class="stack" style="gap: 8px">
            <div class="label"><span class="tap mono">2</span> What's next? <span style="text-transform: none; letter-spacing: 0; font-weight: 500">· suggested</span></div>
            <div class="row-wrap"><button v-for="[k, l] in NEXTS" :key="k" class="pick" :aria-pressed="next === k" @click="next = k; if (k !== 'none' && !when) when = 'tomorrow'">{{ l }}</button></div>
            <div v-if="next !== 'none'" class="row-wrap"><button v-for="[k, l] in WHENS" :key="k" class="pick" :aria-pressed="when === k" @click="when = k">{{ l }}</button></div>
          </div>
          <div style="position: relative">
            <label class="sr" for="sm">Notes</label>
            <textarea id="sm" v-model="summary" class="input" rows="3" placeholder="Notes (optional) — or tap the mic" style="padding-right: 58px; width: 100%"></textarea>
            <button class="mic" :class="{ on: listening }" aria-label="Dictate notes" @click="dictate"><CrmIcon name="mic" /></button>
          </div>
        </template>

        <div class="sticky-foot">
          <button class="btn btn-primary btn-lg" :disabled="busy || !client || !outcome" @click="save">
            <span class="tap mono" style="background: #fff; color: var(--blue)">3</span>{{ !client ? 'Choose who you met' : !outcome ? 'Tap how it went' : 'Save' }}
          </button>
          <span class="muted" style="text-align: center">Adds to the client timeline and your Today list</span>
        </div>
      </template>
    </div>
  </CrmShell>
</template>

<style scoped>
.seg-ctl { display: flex; gap: 4px; background: #E6E6E1; padding: 4px; border-radius: 12px; overflow-x: auto; }
.seg-ctl button { flex: 1; min-height: var(--ctl); border: 0; background: transparent; border-radius: 9px; font-weight: 600; color: var(--ink-2); cursor: pointer; white-space: nowrap; padding: 0 10px; }
.seg-ctl button[aria-pressed='true'] { background: #fff; color: var(--ink); box-shadow: 0 1px 2px rgba(0, 0, 0, .12); }
.tap { background: var(--blue); color: #fff; border-radius: 999px; padding: 1px 7px; font-size: 11px; margin-right: 4px; letter-spacing: 0; }
.mic { position: absolute; right: 8px; top: 8px; width: var(--ctl); height: var(--ctl); border-radius: 50%; border: 0; background: var(--blue-soft); color: var(--blue-ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.mic.on { background: var(--blue); color: #fff; }
</style>
