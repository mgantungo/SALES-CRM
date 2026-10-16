<script setup lang="ts">
/** Upload a file (or take a photo on a phone) and return the uploaded file id. */
const fileId = defineModel<number | null>({ default: null })
const props = defineProps<{ label?: string; docType?: string; client?: string | null; recordType?: string; recordId?: string }>()
const api = useCrmApi()
const toast = useCrmToast()
const name = ref('')
const busy = ref(false)
const onChange = async (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  busy.value = true
  try {
    const r = await api.upload(f, { doc_type: props.docType || 'other', client: props.client || undefined, record_type: props.recordType, record_id: props.recordId, title: f.name })
    fileId.value = r.file.id
    name.value = r.file.name
  } catch (err: any) {
    toast.error(err.message)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <label class="file-pick" :class="{ done: fileId }">
    <CrmIcon :name="fileId ? 'check' : 'camera'" />
    <span class="grow">{{ busy ? 'Uploading…' : fileId ? name : (props.label || 'Take a photo or choose a file') }}</span>
    <input type="file" accept="image/*,application/pdf" capture="environment" class="sr" @change="onChange">
  </label>
</template>

<style scoped>
.file-pick { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 16px; border: 1.5px dashed var(--field); border-radius: 12px; background: var(--panel); cursor: pointer; font-weight: 600; }
.file-pick.done { border-style: solid; border-color: #B7DDC6; background: #F5FBF7; color: var(--green-ink); }
</style>
