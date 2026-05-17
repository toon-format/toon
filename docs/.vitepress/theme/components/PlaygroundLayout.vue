<script setup lang="ts">
import type { Delimiter, EncodeOptions } from '../../../../packages/toon/src'
import { useClipboard, useDebounceFn } from '@vueuse/core'
import { unzlibSync, zlibSync } from 'fflate'
import { base64ToUint8Array, stringToUint8Array, uint8ArrayToBase64, uint8ArrayToString } from 'uint8array-extras'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { DEFAULT_DELIMITER, encode } from '../../../../packages/toon/src'
import VPInput from './VPInput.vue'

type InputFormat = 'json' | 'yaml'
type JsonFormat = 'pretty-2' | 'pretty-4' | 'pretty-tab' | 'compact'

interface PlaygroundState extends Required<Pick<EncodeOptions, 'delimiter' | 'indent' | 'keyFolding' | 'flattenDepth'>> {
  input: string
  inputFormat: InputFormat
  jsonFormat: JsonFormat
  /** Pre-YAML share URLs stored input under `json`. Read-only fallback. */
  json?: string
}

function parseInput(text: string, format: InputFormat): unknown {
  return format === 'yaml' ? parseYaml(text) : JSON.parse(text)
}

function stringifyInputYaml(value: unknown): string {
  return stringifyYaml(value, { lineWidth: 0 })
}

const PRESETS = {
  hikes: {
    context: {
      task: 'Our favorite hikes together',
      location: 'Boulder',
      season: 'spring_2025',
    },
    friends: ['ana', 'luis', 'sam'],
    hikes: [
      { id: 1, name: 'Blue Lake Trail', distanceKm: 7.5, elevationGain: 320, companion: 'ana', wasSunny: true },
      { id: 2, name: 'Ridge Overlook', distanceKm: 9.2, elevationGain: 540, companion: 'luis', wasSunny: false },
      { id: 3, name: 'Wildflower Loop', distanceKm: 5.1, elevationGain: 180, companion: 'sam', wasSunny: true },
    ],
  },
  orders: {
    orders: [
      {
        orderId: 'ORD-001',
        customer: { name: 'Alice Chen', email: 'alice@example.com' },
        items: [
          { sku: 'WIDGET-A', quantity: 2, price: 29.99 },
          { sku: 'GADGET-B', quantity: 1, price: 49.99 },
        ],
        total: 109.97,
        status: 'shipped',
      },
      {
        orderId: 'ORD-002',
        customer: { name: 'Bob Smith', email: 'bob@example.com' },
        items: [
          { sku: 'THING-C', quantity: 3, price: 15.00 },
        ],
        total: 45.00,
        status: 'delivered',
      },
    ],
  },
  metrics: {
    metrics: [
      { date: '2025-01-01', views: 5200, clicks: 180, conversions: 24, revenue: 2890.50 },
      { date: '2025-01-02', views: 6100, clicks: 220, conversions: 31, revenue: 3450.00 },
      { date: '2025-01-03', views: 4800, clicks: 165, conversions: 19, revenue: 2100.25 },
      { date: '2025-01-04', views: 5900, clicks: 205, conversions: 28, revenue: 3200.00 },
    ],
  },
  events: {
    logs: [
      { timestamp: '2025-01-15T10:23:45Z', level: 'info', endpoint: '/api/users', statusCode: 200, responseTime: 45 },
      { timestamp: '2025-01-15T10:24:12Z', level: 'error', endpoint: '/api/orders', statusCode: 500, responseTime: 120, error: { message: 'Database timeout', retryable: true } },
      { timestamp: '2025-01-15T10:25:03Z', level: 'info', endpoint: '/api/products', statusCode: 200, responseTime: 32 },
      { timestamp: '2025-01-15T10:26:47Z', level: 'warn', endpoint: '/api/payment', statusCode: 429, responseTime: 5, error: { message: 'Rate limit exceeded', retryable: true } },
    ],
  },
} as const
const DELIMITER_OPTIONS: { value: Delimiter, label: string }[] = [
  { value: ',', label: 'Comma (,)' },
  { value: '\t', label: 'Tab (\\t)' },
  { value: '|', label: 'Pipe (|)' },
]
const JSON_FORMAT_OPTIONS: { value: JsonFormat, label: string, indent: string | number | undefined }[] = [
  { value: 'pretty-2', label: 'Pretty (2 spaces)', indent: 2 },
  { value: 'pretty-4', label: 'Pretty (4 spaces)', indent: 4 },
  { value: 'pretty-tab', label: 'Pretty (tabs)', indent: '\t' },
  { value: 'compact', label: 'Compact', indent: undefined },
]
const DEFAULT_JSON = JSON.stringify(PRESETS.hikes, undefined, 2)
const SHARE_URL_LIMIT = 8 * 1024

// Input state
const inputText = ref(DEFAULT_JSON)
const inputFormat = ref<InputFormat>('json')
const jsonFormat = ref<JsonFormat>('pretty-2')
const currentFormatIndent = computed(() =>
  JSON_FORMAT_OPTIONS.find(opt => opt.value === jsonFormat.value)?.indent,
)
const formattedInput = computed(() => {
  try {
    const data = parseInput(inputText.value, inputFormat.value)
    return inputFormat.value === 'yaml' ? stringifyInputYaml(data) : formatJson(data)
  }
  catch {
    return inputText.value
  }
})

// Encoder options
const delimiter = ref<Delimiter>(DEFAULT_DELIMITER)
const indent = ref(2)
const keyFolding = ref<'off' | 'safe'>('safe')
const flattenDepth = ref(2)

// Encoding output
const encodingResult = computed(() => {
  try {
    const parsedInput = parseInput(inputText.value, inputFormat.value)
    return {
      output: encode(parsedInput, {
        indent: indent.value,
        delimiter: delimiter.value,
        keyFolding: keyFolding.value,
        flattenDepth: flattenDepth.value,
      }),
      error: undefined,
    }
  }
  catch (error) {
    const fallback = inputFormat.value === 'yaml' ? 'Invalid YAML' : 'Invalid JSON'
    return {
      output: '',
      error: error instanceof Error ? error.message : fallback,
    }
  }
})
const toonOutput = computed(() => encodingResult.value.output)
const error = computed(() => encodingResult.value.error)

// Token analysis
const tokenizer = shallowRef<typeof import('gpt-tokenizer') | undefined>()
const inputTokens = computed(() =>
  tokenizer.value?.encode(formattedInput.value).length,
)
const toonTokens = computed(() =>
  tokenizer.value && toonOutput.value ? tokenizer.value.encode(toonOutput.value).length : undefined,
)
const tokenSavings = computed(() => {
  if (!inputTokens.value || !toonTokens.value)
    return

  const diff = inputTokens.value - toonTokens.value
  const percent = Math.abs((diff / inputTokens.value) * 100).toFixed(1)
  const sign = diff > 0 ? '−' : '+'

  return { diff, percent, sign, isSavings: diff > 0 }
})

// UI state
const canShareState = ref(true)
const hasCopiedUrl = ref(false)

const { copy, copied } = useClipboard({ source: toonOutput })
const updateUrl = useDebounceFn(() => {
  const hash = encodeState()
  const baseUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`
  const targetUrl = `${baseUrl}#${hash}`

  if (targetUrl.length > SHARE_URL_LIMIT) {
    canShareState.value = false
    return
  }

  canShareState.value = true
  window.history.replaceState(null, '', `#${hash}`)
}, 300)

watch([inputText, delimiter, indent, keyFolding, flattenDepth, jsonFormat, inputFormat], () => {
  updateUrl()
})

watch(jsonFormat, () => {
  if (inputFormat.value !== 'json')
    return
  try {
    inputText.value = formatJson(JSON.parse(inputText.value))
  }
  catch {}
})

watch(inputFormat, (next, prev) => {
  if (prev === next)
    return
  try {
    const data = parseInput(inputText.value, prev)
    inputText.value = next === 'yaml' ? stringifyInputYaml(data) : formatJson(data)
  }
  catch {}
})

onMounted(() => {
  loadTokenizer()

  const hash = window.location.hash.slice(1)
  if (!hash)
    return

  const state = decodeState(hash)
  if (state) {
    inputText.value = state.input ?? state.json
    delimiter.value = state.delimiter
    indent.value = state.indent
    keyFolding.value = state.keyFolding ?? 'safe'
    flattenDepth.value = state.flattenDepth ?? 2
    jsonFormat.value = state.jsonFormat ?? 'pretty-2'
    inputFormat.value = state.inputFormat ?? 'json'
  }
})

function formatJson(value: unknown) {
  return JSON.stringify(value, undefined, currentFormatIndent.value)
}

function encodeState() {
  const state: PlaygroundState = {
    input: inputText.value,
    inputFormat: inputFormat.value,
    delimiter: delimiter.value,
    indent: indent.value,
    keyFolding: keyFolding.value,
    flattenDepth: flattenDepth.value,
    jsonFormat: jsonFormat.value,
  }

  const compressedData = zlibSync(stringToUint8Array(JSON.stringify(state)))
  return uint8ArrayToBase64(compressedData, { urlSafe: true })
}

function decodeState(hash: string) {
  try {
    const bytes = base64ToUint8Array(hash)
    const decompressedData = unzlibSync(bytes)
    const decodedData = uint8ArrayToString(decompressedData)
    if (decodedData)
      return JSON.parse(decodedData) as PlaygroundState
  }
  catch {}
}

function loadPreset(name: keyof typeof PRESETS) {
  const data = PRESETS[name]
  inputText.value = inputFormat.value === 'yaml' ? stringifyInputYaml(data) : formatJson(data)
}

async function copyShareUrl() {
  if (!canShareState.value)
    return

  await navigator.clipboard.writeText(window.location.href)
  hasCopiedUrl.value = true
  setTimeout(() => (hasCopiedUrl.value = false), 2000)
}

async function loadTokenizer() {
  tokenizer.value ??= await import('gpt-tokenizer')
}
</script>

<template>
  <div class="playground">
    <div class="playground-container">
      <!-- Header -->
      <header class="playground-header">
        <h1>Playground</h1>
        <p>Convert JSON or YAML to TOON in real time.</p>
      </header>

      <!-- Options Bar -->
      <div class="options-bar">
        <VPInput id="inputFormat" label="Input format">
          <select id="inputFormat" v-model="inputFormat">
            <option value="json">
              JSON
            </option>
            <option value="yaml">
              YAML
            </option>
          </select>
        </VPInput>

        <VPInput id="delimiter" label="Delimiter">
          <select id="delimiter" v-model="delimiter">
            <option v-for="opt in DELIMITER_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </VPInput>

        <VPInput id="indent" label="Indent">
          <input
            id="indent"
            v-model.number="indent"
            type="number"
            min="0"
            max="8"
          >
        </VPInput>

        <VPInput id="keyFolding" label="Key Folding">
          <select id="keyFolding" v-model="keyFolding">
            <option value="off">
              Off
            </option>
            <option value="safe">
              Safe
            </option>
          </select>
        </VPInput>

        <VPInput id="flattenDepth" label="Flatten Depth">
          <input
            id="flattenDepth"
            v-model.number="flattenDepth"
            type="number"
            min="1"
            max="10"
            :disabled="keyFolding === 'off'"
          >
        </VPInput>

        <VPInput id="preset" label="Preset">
          <select id="preset" @change="(e) => loadPreset((e.target as HTMLSelectElement).value as keyof typeof PRESETS)">
            <option value="" disabled selected>
              Load example…
            </option>
            <option value="hikes">
              Hikes (mixed structure)
            </option>
            <option value="orders">
              Orders (nested objects)
            </option>
            <option value="metrics">
              Metrics (tabular data)
            </option>
            <option value="events">
              Events (semi-uniform)
            </option>
          </select>
        </VPInput>

        <VPInput v-if="inputFormat === 'json'" id="jsonFormat" label="JSON Baseline">
          <select id="jsonFormat" v-model="jsonFormat">
            <option v-for="opt in JSON_FORMAT_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </VPInput>

        <button
          class="share-button"
          :class="[hasCopiedUrl && 'copied']"
          :aria-label="
            !canShareState
              ? 'State too large to share via URL'
              : hasCopiedUrl
                ? 'Link copied!'
                : 'Copy shareable URL'
          "
          :title="!canShareState ? 'State too large to share via URL' : undefined"
          :disabled="!canShareState"
          :aria-disabled="!canShareState"
          @click="copyShareUrl"
        >
          <span class="vpi-link" :class="[hasCopiedUrl && 'check']" aria-hidden="true" />
          <template v-if="!canShareState">
            Too large to share
          </template>
          <template v-else>
            {{ hasCopiedUrl ? 'Copied!' : 'Share' }}
          </template>
        </button>
      </div>

      <!-- Editor Container -->
      <div class="editor-container">
        <!-- Input -->
        <div class="editor-pane">
          <div class="pane-header">
            <span class="pane-title">{{ inputFormat === 'yaml' ? 'YAML Input' : 'JSON Input' }}</span>
            <span class="pane-stats">
              <span class="stat-primary" title="Token count of the formatted input">{{ inputTokens ?? '…' }} tokens</span>
              <span class="stat-secondary">{{ formattedInput.length }} chars</span>
            </span>
          </div>
          <textarea
            id="input"
            v-model="inputText"
            class="editor-textarea"
            spellcheck="false"
            :aria-label="inputFormat === 'yaml' ? 'YAML input' : 'JSON input'"
            :aria-describedby="error ? 'parse-error' : undefined"
            :aria-invalid="!!error"
            :placeholder="inputFormat === 'yaml' ? 'Enter YAML here…' : 'Enter JSON here…'"
          />
        </div>

        <!-- TOON Output -->
        <div class="editor-pane">
          <div class="pane-header">
            <span class="pane-title">
              TOON Output
              <span v-if="tokenSavings" class="savings-badge" :class="[!tokenSavings.isSavings && 'increase']">
                {{ tokenSavings.sign }}{{ tokenSavings.percent }}%
              </span>
            </span>
            <span class="pane-stats">
              <span class="stat-primary">{{ toonTokens ?? '…' }} tokens</span>
              <span class="stat-secondary">{{ toonOutput.length }} chars</span>
            </span>
          </div>
          <div class="editor-output">
            <button
              v-if="!error"
              class="copy-button"
              :class="[copied && 'copied']"
              :aria-label="copied ? 'Copied to clipboard' : 'Copy to clipboard'"
              :aria-pressed="copied"
              @click="copy()"
            />
            <pre v-if="!error"><code>{{ toonOutput }}</code></pre>
            <div v-else id="parse-error" role="alert" class="error-message">
              {{ error }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playground {
  padding: 32px 24px 32px;
}

@media (min-width: 768px) {
  .playground {
    padding: 48px 32px 48px;
  }
}

@media (min-width: 960px) {
  .playground {
    padding: 48px 32px 48px;
  }
}

.playground-container {
  max-width: 1400px;
  margin: 0 auto;
}

.playground-header {
  margin-bottom: 24px;
}

.playground-header h1 {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 40px;
  color: var(--vp-c-text-1);
  margin: 0 0 8px;
}

@media (min-width: 768px) {
  .playground-header h1 {
    font-size: 32px;
  }
}

.playground-header p {
  font-size: 16px;
  line-height: 28px;
  color: var(--vp-c-text-2);
}

.options-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

@media (max-width: 768px) {
  .options-bar {
    gap: 8px;
  }
}

.vpi-link {
  --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E");
  display: inline-block;
  width: 1em;
  height: 1em;
  -webkit-mask: var(--icon) no-repeat;
  mask: var(--icon) no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  background-color: currentColor;
}

.vpi-link.check {
  --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E");
}

.share-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 32px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  transition: border-color 0.25s, color 0.25s;
  margin-left: auto;
}

.share-button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.share-button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.share-button.copied {
  border-color: var(--vp-c-green-1);
  color: var(--vp-c-green-1);
}

.share-button:disabled {
  color: var(--vp-c-text-3);
  border-color: var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  cursor: not-allowed;
}

.editor-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .editor-container {
    grid-template-columns: 1fr;
  }
}

.editor-pane {
  display: flex;
  flex-direction: column;
  min-height: 500px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.25s;
}

@media (max-width: 768px) {
  .editor-pane {
    min-height: 400px;
  }
}

.editor-pane:focus-within {
  border-color: var(--vp-c-brand-1);
}

.pane-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
}

.pane-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.5;
}

.pane-stats {
  display: flex;
  gap: 12px;
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--vp-c-text-2);
  text-transform: none;
  letter-spacing: normal;
}

.stat-primary {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.stat-secondary {
  color: var(--vp-c-text-3);
}

.savings-badge {
  display: inline-flex;
  padding: 2px 6px;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--vp-c-green-1);
  background: var(--vp-c-green-soft);
  border-radius: 4px;
  text-transform: none;
  letter-spacing: normal;
}

.savings-badge.increase {
  color: var(--vp-c-yellow-1);
  background: var(--vp-c-yellow-soft);
}

.copy-button {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  border: 1px solid var(--vp-code-copy-code-border-color);
  border-radius: 4px;
  width: 40px;
  height: 40px;
  background-color: var(--vp-code-copy-code-bg);
  opacity: 0;
  cursor: pointer;
  background-image: var(--vp-icon-copy);
  background-position: 50%;
  background-size: 20px;
  background-repeat: no-repeat;
  transition: border-color 0.25s, background-color 0.25s, opacity 0.25s;
}

.editor-output:hover .copy-button,
.copy-button:focus {
  opacity: 1;
}

.copy-button:hover:not(:disabled),
.copy-button.copied {
  border-color: var(--vp-code-copy-code-hover-border-color);
  background-color: var(--vp-code-copy-code-hover-bg);
}

.copy-button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.copy-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.copy-button.copied,
.copy-button:hover.copied {
  border-radius: 0 4px 4px 0;
  background-image: var(--vp-icon-copied);
}

.copy-button.copied::before,
.copy-button:hover.copied::before {
  position: relative;
  top: -1px;
  transform: translateX(calc(-100% - 1px));
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid var(--vp-code-copy-code-hover-border-color);
  border-right: 0;
  border-radius: 4px 0 0 4px;
  padding: 0 10px;
  width: fit-content;
  height: 40px;
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-code-copy-code-active-text);
  background-color: var(--vp-code-copy-code-hover-bg);
  white-space: nowrap;
  content: var(--vp-code-copy-copied-text-content);
}

.copy-button[aria-pressed="true"] {
  opacity: 1;
}

.editor-textarea,
.editor-output {
  flex: 1;
  padding: 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.875rem;
  line-height: 1.7;
}

.editor-textarea {
  resize: none;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}

.editor-output {
  position: relative;
  overflow: auto;
  background: var(--vp-code-block-bg);
}

.editor-output pre {
  margin: 0;
  white-space: pre;
}

.error-message {
  color: var(--vp-c-danger-1);
  padding: 8px 12px;
  background: var(--vp-c-danger-soft);
  border-radius: 4px;
  font-size: 0.875rem;
  font-family: var(--vp-font-family-base);
}
</style>
