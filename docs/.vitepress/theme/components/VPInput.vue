<script setup lang="ts">
defineProps<{
  label: string
  id: string
}>()
</script>

<template>
  <div class="VPInput">
    <label :for="id" class="label">{{ label }}</label>
    <div class="input-wrapper">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.VPInput {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.input-wrapper :deep(select),
.input-wrapper :deep(input) {
  padding: 0 10px;
  height: 32px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  transition: border-color 0.25s;
}

.input-wrapper :deep(select):hover,
.input-wrapper :deep(input):hover,
.input-wrapper :deep(select):focus,
.input-wrapper :deep(input):focus {
  border-color: var(--vp-c-brand-1);
}

.input-wrapper :deep(select:disabled),
.input-wrapper :deep(input:disabled) {
  color: var(--vp-c-text-3);
  background-color: var(--vp-c-bg-soft);
  border-color: var(--vp-c-divider);
  cursor: not-allowed;
}

.input-wrapper :deep(select:disabled):hover,
.input-wrapper :deep(input:disabled):hover,
.input-wrapper :deep(select:disabled):focus,
.input-wrapper :deep(input:disabled):focus {
  border-color: var(--vp-c-divider);
}

.input-wrapper :deep(input[type="number"]) {
  width: 70px;
}
</style>
