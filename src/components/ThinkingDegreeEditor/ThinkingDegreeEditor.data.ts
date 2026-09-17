export const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const

export type ThinkingLevel = typeof THINKING_LEVELS[number]
export type ReasoningEfforts = Partial<Record<ThinkingLevel, string | null>>

export interface ModelReasoningConfiguration {
  efforts: ReasoningEfforts | undefined
  explicitThinking: boolean
}

export interface ProviderModel {
  id: string
  name?: string
  reasoningEfforts?: ReasoningEfforts | false
  compat?: Record<string, unknown>
  [key: string]: unknown
}

export interface ProviderSnapshot {
  models: ProviderModel[]
  revision: number
  writable: boolean
}

export interface EditorState extends ProviderSnapshot {
  status: 'loading' | 'ready' | 'error'
  error: string | undefined
  drafts: Record<string, ModelReasoningConfiguration>
  savingModel: string | undefined
  savedModel: string | undefined
}

export const AUTO_REASONING_CONFIGURATION: ModelReasoningConfiguration = {
  efforts: {
    off: null,
    minimal: 'minimal',
    low: 'low',
    medium: 'medium',
    high: 'high',
    xhigh: 'xhigh',
    max: 'max',
  },
  explicitThinking: false,
}

export const PRESETS: Record<'general' | 'openai' | 'deepseek', ModelReasoningConfiguration> = {
  general: {
    efforts: { off: null, low: 'low', medium: 'medium', high: 'high', max: 'max' },
    explicitThinking: false,
  },
  openai: {
    efforts: { minimal: 'minimal', low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh' },
    explicitThinking: false,
  },
  deepseek: {
    efforts: { off: null, low: 'low', high: 'high', max: 'max' },
    explicitThinking: true,
  },
}

export function configurationOf(model: ProviderModel): ModelReasoningConfiguration {
  return {
    efforts: model.reasoningEfforts === false || model.reasoningEfforts === undefined
      ? undefined
      : { ...model.reasoningEfforts },
    explicitThinking: model.compat?.['thinkingFormat'] === 'deepseek',
  }
}

export function initializeReasoningEfforts(models: readonly ProviderModel[]): {
  changed: boolean
  models: ProviderModel[]
} {
  let changed = false
  const initialized = models.map((model) => {
    if (Object.prototype.hasOwnProperty.call(model, 'reasoningEfforts')) return { ...model }
    changed = true
    return {
      ...model,
      reasoningEfforts: { ...AUTO_REASONING_CONFIGURATION.efforts },
    }
  })
  return { changed, models: initialized }
}

export function updateModel(
  models: readonly ProviderModel[],
  modelId: string,
  configuration: ModelReasoningConfiguration,
): ProviderModel[] {
  return models.map((model) => {
    if (model.id !== modelId) return { ...model }
    const next: ProviderModel = { ...model }
    if (configuration.efforts === undefined) delete next.reasoningEfforts
    else next.reasoningEfforts = { ...configuration.efforts }

    const compat = { ...(model.compat ?? {}) }
    if (configuration.explicitThinking) compat['thinkingFormat'] = 'deepseek'
    else delete compat['thinkingFormat']
    if (Object.keys(compat).length === 0) delete next.compat
    else next.compat = compat
    return next
  })
}

export function validateConfiguration(configuration: ModelReasoningConfiguration): string | undefined {
  if (configuration.efforts === undefined) return undefined
  const entries = Object.entries(configuration.efforts)
  if (entries.length === 0) return '请至少启用一个思考等级。'
  if (!entries.some(([level]) => level !== 'off')) return '至少需要一个非 off 的思考等级。'
  for (const [level, value] of entries) {
    if (level !== 'off' && (typeof value !== 'string' || value.trim().length === 0)) {
      return `${level} 的发送值不能为空。`
    }
    if (typeof value === 'string' && value.length === 0) return `${level} 的发送值不能为空字符串。`
  }
  return undefined
}
