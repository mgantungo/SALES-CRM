<script setup lang="ts">
/** Client-facing proposal, ready to print or save as PDF from the browser. Never shows costs. */
definePageMeta({ path: '/crm/proposals/:id/print' })
const route = useRoute()
const api = useCrmApi()
const d = ref<any>(null)
onMounted(async () => {
  d.value = await api.get(`/proposals/${route.params.id}`, route.query.version ? { version: route.query.version } : undefined)
  await nextTick()
  if (route.query.auto !== '0') setTimeout(() => window.print(), 400)
})
const print = () => window.print()
</script>

<template>
  <div v-if="d" class="doc">
    <header class="between" style="align-items: flex-start">
      <div class="row"><div class="logo">VG</div><div><strong style="font-size: 18px">Vision Group</strong><div class="muted">Integrated media proposal</div></div></div>
      <div style="text-align: right"><div class="num">{{ d.proposal.reference }} · v{{ d.version.version_number }}</div><div class="muted">{{ crmDate(d.version.createdAt) }}</div></div>
    </header>
    <section class="stack" style="gap: 4px">
      <span class="label">Prepared for</span>
      <strong style="font-size: 20px">{{ d.proposal.client.company_name }}</strong>
      <span v-if="d.proposal.client.contact_person">Attention: {{ d.proposal.client.contact_person }}</span>
    </section>
    <h1>{{ d.proposal.title }}</h1>
    <p v-if="d.version.executive_summary" style="white-space: pre-line">{{ d.version.executive_summary }}</p>
    <table class="table">
      <thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Amount (UGX)</th></tr></thead>
      <tbody>
        <tr v-for="l in d.version.lines" :key="l.id"><td>{{ l.description }}<div v-if="l.start_date" class="muted small">{{ crmDate(l.start_date) }} – {{ crmDate(l.end_date) }}</div></td><td class="r mono">{{ l.quantity }}</td><td class="r mono">{{ crmFull(l.selling_price) }}</td></tr>
        <tr v-if="d.version.discount_total"><td colspan="2">Package discount</td><td class="r mono">−{{ crmFull(d.version.discount_total) }}</td></tr>
        <tr><td colspan="2"><strong>Total</strong></td><td class="r mono"><strong>{{ crmFull(d.version.net_total) }}</strong></td></tr>
      </tbody>
    </table>
    <section class="stack" style="gap: 4px">
      <span class="label">Terms</span>
      <span>Payment within {{ d.version.payment_terms_days }} days of invoice. Valid until {{ crmDate(d.version.valid_until) }}.</span>
      <span class="muted">{{ d.version.terms }}</span>
    </section>
    <footer class="muted small">Prices in Uganda shillings. Taxes as applicable.</footer>
    <button class="btn btn-primary no-print" @click="print">Print / save as PDF</button>
  </div>
</template>

<style scoped>
.doc { max-width: 820px; margin: 0 auto; padding: 40px 32px; background: #fff; min-height: 100vh; display: flex; flex-direction: column; gap: 22px; }
.logo { width: 44px; height: 44px; border-radius: 10px; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
@media print { .no-print { display: none; } .doc { padding: 0; } }
</style>
