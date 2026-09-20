import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-models/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { ThinkingDegreeEditor } from '../components/ThinkingDegreeEditor/ThinkingDegreeEditor.tsx'
import type { ThinkingDegreeEditorOperations } from '../components/ThinkingDegreeEditor/ThinkingDegreeEditor.api.ts'
import {
  initializeReasoningEfforts,
  updateModel,
  type ModelReasoningConfiguration,
  type ProviderModel,
  type ProviderSnapshot,
} from '../components/ThinkingDegreeEditor/ThinkingDegreeEditor.data.ts'

const SETTINGS_NAMESPACE = 'llm-pi-ai'
const STYLE_ID = 'dsh-plugin-custom-thinking-degree'

const CSS = `
.ctd-root{border-top:0.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);margin-top:12px;padding-top:12px}
.ctd-heading{align-items:center;color:var(--dsw-alias-label-primary);display:flex;font-size:13px;font-weight:600;justify-content:space-between;margin-bottom:8px}
.ctd-muted,.ctd-summary{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400}
.ctd-model{border-top:0.5px solid var(--dsw-alias-border-l2)}
.ctd-model:last-child{border-bottom:0.5px solid var(--dsw-alias-border-l2)}
.ctd-model>summary{align-items:center;cursor:pointer;display:grid;gap:8px;grid-template-columns:minmax(100px,1fr) minmax(120px,2fr);list-style-position:outside;padding:9px 4px}
.ctd-model>summary:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ctd-model-name,.ctd-summary{min-width:0;overflow-wrap:anywhere}
.ctd-model-name{color:var(--dsw-alias-label-primary)}
.ctd-summary{text-align:right}
.ctd-body{padding:4px 4px 12px}
.ctd-presets{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.ctd-presets button,.ctd-error button{border:0.5px solid var(--dsw-alias-border-l3);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;font-size:12px;padding:5px 9px}
.ctd-presets button:hover,.ctd-error button:hover{background:var(--dsw-alias-interactive-bg-hover)}
.ctd-levels{display:grid;gap:6px}
.ctd-level{align-items:center;display:grid;gap:10px;grid-template-columns:92px minmax(0,1fr)}
.ctd-check,.ctd-thinking-toggle{align-items:center;color:var(--dsw-alias-label-secondary);display:flex;font-size:12px;gap:7px}
.ctd-check input,.ctd-thinking-toggle input{accent-color:var(--dsw-alias-brand-primary)}
.ctd-input{box-sizing:border-box;min-width:0;width:100%;border:0.5px solid var(--dsw-alias-border-l4);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;padding:6px 8px}
.ctd-input:focus{border-color:var(--dsw-alias-brand-primary);outline:none}
.ctd-input::placeholder{color:var(--dsw-alias-label-dimmed)}
.ctd-input:disabled{opacity:.5}
.ctd-thinking-toggle{margin-top:10px}
.ctd-actions{align-items:center;display:flex;justify-content:flex-end;gap:10px;margin-top:12px}
.ctd-save{background:var(--dsw-alias-button-primary-fill);border:none;border-radius:6px;color:var(--dsw-alias-label-primary-foreground);cursor:pointer;font:inherit;font-size:12px;min-width:68px;padding:6px 10px}
.ctd-save:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.ctd-save:disabled{cursor:not-allowed;opacity:.5}
.ctd-error{align-items:center;color:var(--dsw-alias-state-error-primary);display:flex;font-size:12px;justify-content:space-between;gap:10px;margin:8px 0}
.ctd-saved{color:var(--dsw-alias-state-success-primary);font-size:12px}
@media(max-width:560px){.ctd-level{grid-template-columns:1fr}.ctd-model>summary{grid-template-columns:1fr}.ctd-summary{text-align:left}}
`

interface ConfigurableProviderEntry {
  provider: string
  settingsNs: string
  declared?: boolean
}

interface SettingsNamespace {
  ns: string
  value: unknown
  user?: unknown
  revision: number
}

interface SettingsDocument {
  namespaces: SettingsNamespace[]
  writable: boolean
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function namespaceOf(document: SettingsDocument): SettingsNamespace {
  const namespace = document.namespaces.find(entry => entry.ns === SETTINGS_NAMESPACE)
  if (namespace === undefined) throw new Error('llm-pi-ai 设置命名空间不可用。')
  return namespace
}

function modelsOf(namespace: SettingsNamespace, provider: string): ProviderModel[] {
  const source = namespace.user ?? namespace.value
  const providers = record(source)?.['providers']
  const profile = record(record(providers)?.[provider])
  const models = profile?.['models']
  if (!Array.isArray(models)) return []
  return models.flatMap((model) => {
    const parsed = record(model)
    return typeof parsed?.['id'] === 'string' ? [parsed as ProviderModel] : []
  })
}

async function initializeCustomProviderModels(ctx: ClientContext): Promise<void> {
  const [settingsResponse, directoryResponse] = await Promise.all([
    ctx.remote.settings.describe(),
    ctx.remote.llm.listConfigurableProviders(),
  ])
  if (!settingsResponse.ok || !directoryResponse.ok || !settingsResponse.value.writable) return

  const document = settingsResponse.value as SettingsDocument
  const namespace = namespaceOf(document)
  const declaredProviders = (directoryResponse.value as ConfigurableProviderEntry[])
    .filter(entry => entry.declared === true && entry.settingsNs === SETTINGS_NAMESPACE)
    .map(entry => entry.provider)
  const ops = declaredProviders.flatMap((provider) => {
    const initialized = initializeReasoningEfforts(modelsOf(namespace, provider))
    return initialized.changed
      ? [{ op: 'set' as const, path: ['providers', provider, 'models'], value: initialized.models as never }]
      : []
  })
  if (ops.length === 0) return

  const response = await ctx.remote.settings.mutate(SETTINGS_NAMESPACE, ops, namespace.revision)
  if (!response.ok && response.error.code !== 'settings/conflict') {
    console.warn(`[custom-thinking-degree] automatic initialization failed: ${response.error.message}`)
  }
}

function installAutomaticInitialization(ctx: ClientContext): () => void {
  let running = false
  let rerun = false
  const schedule = (): void => {
    if (running) {
      rerun = true
      return
    }
    running = true
    void initializeCustomProviderModels(ctx)
      .catch((error: unknown) => {
        console.warn('[custom-thinking-degree] automatic initialization failed:', error)
      })
      .finally(() => {
        running = false
        if (rerun) {
          rerun = false
          schedule()
        }
      })
  }
  schedule()
  const disposers = [
    ctx.remote.$on('settings/document-updated', (namespace: string) => {
      if (namespace === SETTINGS_NAMESPACE) schedule()
    }),
    ctx.remote.$on('llm/adapters-updated', schedule),
  ]
  return () => { for (const dispose of disposers) dispose() }
}

function operations(ctx: ClientContext): ThinkingDegreeEditorOperations {
  const describe = async (): Promise<SettingsDocument> => {
    const response = await ctx.remote.settings.describe()
    if (!response.ok) throw new Error(response.error.message)
    return response.value as SettingsDocument
  }
  return {
    loadProvider: async (provider): Promise<ProviderSnapshot> => {
      const document = await describe()
      const namespace = namespaceOf(document)
      return { models: modelsOf(namespace, provider), revision: namespace.revision, writable: document.writable }
    },
    saveModel: async (
      provider: string,
      modelId: string,
      configuration: ModelReasoningConfiguration,
      expectedRevision: number,
    ) => {
      try {
        const document = await describe()
        if (!document.writable) return { ok: false, message: '当前设置文档是只读的。' }
        const namespace = namespaceOf(document)
        if (namespace.revision !== expectedRevision) {
          return { ok: false, message: '设置已在其他位置更新，请重新读取后再保存。' }
        }
        const current = modelsOf(namespace, provider)
        if (!current.some(model => model.id === modelId)) {
          return { ok: false, message: `模型 ${modelId} 已不存在。` }
        }
        const next = updateModel(current, modelId, configuration)
        const response = await ctx.remote.settings.mutate(
          SETTINGS_NAMESPACE,
          [{ op: 'set', path: ['providers', provider, 'models'], value: next as never }],
          expectedRevision,
        )
        return response.ok ? { ok: true } : { ok: false, message: response.error.message }
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) }
      }
    },
    subscribe: listener => ctx.remote.$on('settings/document-updated', (namespace: string) => {
      if (namespace === SETTINGS_NAMESPACE) listener()
    }),
  }
}

export const inject = ['slots', 'remote', 'remote.settings', 'remote.llm']

export function apply(ctx: ClientContext): void {
  const editorOperations = operations(ctx)
  ctx.effect(() => installAutomaticInitialization(ctx), 'custom-thinking-degree: automatic initialization')
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset['plugin'] = STYLE_ID
    style.textContent = CSS
    document.head.append(style)
    return () => { style.remove() }
  }, 'custom-thinking-degree: styles')

  ctx.slots.inject('settings.models.provider-card', () => ctx.slots.register({
    name: 'settings.models.provider-card',
    key: SETTINGS_NAMESPACE,
    inject: () => ({ operations: editorOperations }),
  }, ThinkingDegreeEditor))
}
