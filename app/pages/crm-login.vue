<script setup lang="ts">
// Same company login as SFA (VGAMS). The session is kept server-side as 'crm_session'.
definePageMeta({ path: '/crm/login' })
const route = useRoute()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const emailError = ref('')
const error = ref('')
const busy = ref(false)
const me = useState<any>('crm-me')

function validateEmail() {
  const v = email.value.toLowerCase().trim()
  if (!v) emailError.value = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) emailError.value = 'Invalid email format'
  else if (!v.endsWith('@newvision.co.ug')) emailError.value = 'Email must end with @newvision.co.ug'
  else emailError.value = ''
  return !emailError.value
}

const canSubmit = computed(() => !!email.value && !!password.value && !emailError.value && !busy.value)

const submit = async () => {
  error.value = ''
  if (!validateEmail()) return
  busy.value = true
  try {
    const r: any = await $fetch('/api/crm-login', {
      method: 'POST',
      body: { email: email.value.toLowerCase().trim(), password: password.value },
    })
    me.value = r.me
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/crm') ? route.query.next : '/crm'
    await navigateTo(r.me?.needs_setup ? '/crm/setup' : next)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.statusMessage || 'Login failed. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login">
    <form class="card pad-lg stack-lg" style="width: min(420px, 100%)" novalidate @submit.prevent="submit">
      <div class="row">
        <div class="logo">VG</div>
        <div><strong style="font-size: 17px">Vision Group CRM</strong><div class="muted">Sign in with your company email</div></div>
      </div>

      <label class="field">
        <span>Email address</span>
        <input v-model="email" type="email" autocomplete="username" placeholder="name@newvision.co.ug"
               :aria-invalid="!!emailError" @blur="validateEmail" @input="emailError && validateEmail()">
        <small v-if="emailError" class="bad">{{ emailError }}</small>
        <small v-else class="muted">Use your @newvision.co.ug email</small>
      </label>

      <label class="field">
        <span>Password</span>
        <div class="pw">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required>
          <button type="button" class="pw-toggle" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
      </label>

      <div v-if="error" class="bad-box" role="alert">{{ error }}</div>
      <button class="btn btn-primary btn-lg" :disabled="!canSubmit">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
      <p class="muted" style="text-align: center; margin: 0">Forgot your password? Contact your system administrator.</p>
    </form>
  </div>
</template>

<style scoped>
.login { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.logo { width: 44px; height: 44px; border-radius: 10px; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.pw { position: relative; }
.pw input { width: 100%; padding-right: 64px; }
.pw-toggle { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: 0; cursor: pointer; font: inherit; font-size: 13px; color: var(--muted, #666); }
.bad { color: var(--bad, #c62828); }
</style>