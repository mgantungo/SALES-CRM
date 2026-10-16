<script setup lang="ts">
const props = defineProps<{ name: string; size?: number }>()
const PATHS: Record<string, string> = {
  today: 'M5 12l5 5 9-10',
  clients: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M3 21h18M8 8h3M8 12h3M8 16h3',
  deals: 'M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v6h-4z',
  earnings: 'M12 8c4 0 7-1.3 7-3s-3-3-7-3-7 1.3-7 3 3 3 7 3zM5 5v6c0 1.7 3 3 7 3s7-1.3 7-3V5M5 11v6c0 1.7 3 3 7 3s7-1.3 7-3v-6',
  team: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7M18 14a5 5 0 0 1 4 6v1',
  company: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6M3 21h18',
  approvals: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
  projects: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  finance: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  admin: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4',
  plus: 'M12 5v14M5 12h14',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  back: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  log: 'M4 5h16v11H8l-4 4z',
  quote: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  warn: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  check: 'M5 12l5 5 9-10',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  move: 'M4 12h6l-3-3M20 12h-6l3 3',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
}
</script>

<template>
  <svg :width="props.size || 20" :height="props.size || 20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none">
    <path :d="PATHS[props.name] || PATHS.more" />
  </svg>
</template>
