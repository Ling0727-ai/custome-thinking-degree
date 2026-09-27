export const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const
export const CLAUDE_LEVELS = ['off', 'low', 'medium', 'high', 'max'] as const
export const CLAUDE_WIRE_VALUES = ['low', 'medium', 'high', 'max'] as const

export type ThinkingLevel = typeof THINKING_LEVELS[number]
export type ReasoningEfforts = Partial<Record<ThinkingLevel, string | null>>
export type Preset = 'general' | 'openai' | 'deepseek' | 'claude' | 'none'

export interface ProviderReasoningConfiguration {
  efforts: ReasoningEfforts | undefined
  reasoning: ThinkingLevel | undefined
  explicitThinking: boolean
  adaptiveThinking: boolean
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
  api: string | undefined
  reasoning: ThinkingLevel | undefined
  compat: Record<string, unknown>
  revision: number
  writable: boolean
}

export interface EditorState extends ProviderSnapshot {
  status: 'loading' | 'ready' | 'error'
  error: string | undefined
  draft: ProviderReasoningConfiguration
  mixedEfforts: boolean
  saving: boolean
  saved: boolean
}

export const PRESETS: Record<Preset, ReasoningEfforts | undefined> = {
  general: { off: null, low: 'low', medium: 'medium', high: 'high', max: 'max' },
  openai: { minimal: 'minimal', low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh' },
  deepseek: { off: null, low: 'low', high: 'high', max: 'max' },
  claude: { off: null, low: 'low', medium: 'medium', high: 'high', max: 'max' },
  none: undefined,
}

export function isClaudeProtocol(api: string | undefined): boolean {
  return api === 'anthropic-messages'
}

export function configurationOf(snapshot: ProviderSnapshot): { draft: ProviderReasoningConfiguration; mixedEfforts: boolean } {
  const efforts = snapshot.models.map(model => model.reasoningEfforts === false ? false : model.reasoningEfforts)
  const signature = (value: ReasoningEfforts | false | undefined): string =>
    JSON.stringify(value === false || value === undefined ? value : THINKING_LEVELS.map(level => [level, value[level]]))
  const mixedEfforts = efforts.some(value => signature(value) !== signature(efforts[0])) || efforts[0] === false
  const current = efforts[0]
  const claude = isClaudeProtocol(snapshot.api)
  const legacyAuto = claude && current !== false && current !== undefined
    && signature(current) === signature({ off: null, minimal: 'minimal', low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' })
  return {
    mixedEfforts,
    draft: {
      efforts: legacyAuto ? { ...PRESETS.claude } : mixedEfforts || current === false || current === undefined ? undefined : { ...current },
      reasoning: snapshot.reasoning,
      explicitThinking: !claude && snapshot.compat['thinkingFormat'] === 'deepseek',
      adaptiveThinking: claude && snapshot.compat['forceAdaptiveThinking'] !== false,
    },
  }
}

export function updateModels(
  models: readonly ProviderModel[],
  configuration: ProviderReasoningConfiguration,
  api: string | undefined,
): ProviderModel[] {
  return models.map((model) => {
    const next: ProviderModel = { ...model }
    if (configuration.efforts === undefined) delete next.reasoningEfforts
    else next.reasoningEfforts = { ...configuration.efforts }

    const compat = { ...(model.compat ?? {}) }
    if (isClaudeProtocol(api)) delete compat['forceAdaptiveThinking']
    else if (api === 'openai-completions') {
      if (configuration.explicitThinking) compat['thinkingFormat'] = 'deepseek'
      else if (compat['thinkingFormat'] === 'deepseek') delete compat['thinkingFormat']
    }
    if (Object.keys(compat).length === 0) delete next.compat
    else next.compat = compat
    return next
  })
}

export function updateProviderCompat(
  compat: Record<string, unknown>,
  configuration: ProviderReasoningConfiguration,
  api: string | undefined,
): Record<string, unknown> {
  const next = { ...compat }
  if (isClaudeProtocol(api)) next['forceAdaptiveThinking'] = configuration.adaptiveThinking
  else if (api === 'openai-completions') {
    if (configuration.explicitThinking) next['thinkingFormat'] = 'deepseek'
    else if (next['thinkingFormat'] === 'deepseek') delete next['thinkingFormat']
  }
  return next
}

export function validateConfiguration(configuration: ProviderReasoningConfiguration, api: string | undefined): string | undefined {
  if (configuration.efforts === undefined) return undefined
  const entries = Object.entries(configuration.efforts)
  if (entries.length === 0) return '请至少启用一个思考等级。'
  if (!entries.some(([level]) => level !== 'off')) return '至少需要一个非 off 的思考等级。'
  for (const [level, value] of entries) {
    if (level !== 'off' && (typeof value !== 'string' || value.trim().length === 0)) return `${level} 的发送值不能为空。`
    if (typeof value === 'string' && value.length === 0) return `${level} 的发送值不能为空字符串。`
    if (isClaudeProtocol(api) && (level === 'minimal' || level === 'xhigh' || (level !== 'off' && !CLAUDE_WIRE_VALUES.includes(value as typeof CLAUDE_WIRE_VALUES[number])))) {
      return 'Claude Messages 仅支持 low、medium、high、max 的统一等级映射。'
    }
  }
  if (configuration.reasoning !== undefined && !Object.hasOwn(configuration.efforts, configuration.reasoning)) {
    return '默认思考等级必须在启用的等级中。'
  }
  return undefined
}
