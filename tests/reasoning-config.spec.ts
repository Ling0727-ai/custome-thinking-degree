import { describe, expect, it } from 'vitest'
import {
  configurationOf, initializeReasoningEfforts, PRESETS, updateModel, validateConfiguration,
} from '../src/components/ThinkingDegreeEditor/ThinkingDegreeEditor.data.ts'

describe('thinking degree model configuration', () => {
  it('applies a preset without losing unrelated model fields', () => {
    const models = [{ id: 'reasoner', name: 'Reasoner', contextWindow: 128000, compat: { maxTokensField: 'max_tokens' } }]
    const [updated] = updateModel(models, 'reasoner', PRESETS.deepseek)
    expect(updated).toMatchObject({
      id: 'reasoner',
      name: 'Reasoner',
      contextWindow: 128000,
      reasoningEfforts: { off: null, low: 'low', high: 'high', max: 'max' },
      compat: { maxTokensField: 'max_tokens', thinkingFormat: 'deepseek' },
    })
  })

  it('restores inheritance and removes only the plugin-owned compat field', () => {
    const [updated] = updateModel([{
      id: 'reasoner',
      reasoningEfforts: { high: 'ultra' },
      compat: { thinkingFormat: 'deepseek', supportsDeveloperRole: false },
    }], 'reasoner', { efforts: undefined, explicitThinking: false })
    expect(updated).toEqual({ id: 'reasoner', compat: { supportsDeveloperRole: false } })
    expect(configurationOf(updated!)).toEqual({ efforts: undefined, explicitThinking: false })
  })

  it('initializes only models without an explicit reasoning declaration', () => {
    const first = initializeReasoningEfforts([
      { id: 'new-model', name: 'New Model' },
      { id: 'custom', reasoningEfforts: { high: 'ultra' } },
      { id: 'disabled', reasoningEfforts: false },
    ])
    expect(first.changed).toBe(true)
    expect(first.models[0]?.reasoningEfforts).toEqual({
      off: null,
      minimal: 'minimal',
      low: 'low',
      medium: 'medium',
      high: 'high',
      xhigh: 'xhigh',
      max: 'max',
    })
    expect(first.models[1]?.reasoningEfforts).toEqual({ high: 'ultra' })
    expect(first.models[2]?.reasoningEfforts).toBe(false)

    const second = initializeReasoningEfforts(first.models)
    expect(second.changed).toBe(false)
    expect(second.models).toEqual(first.models)
  })

  it('rejects empty or off-only configurations', () => {
    expect(validateConfiguration({ efforts: {}, explicitThinking: false })).toContain('至少启用')
    expect(validateConfiguration({ efforts: { off: null }, explicitThinking: false })).toContain('非 off')
    expect(validateConfiguration({ efforts: { high: '' }, explicitThinking: false })).toContain('不能为空')
    expect(validateConfiguration(PRESETS.general)).toBeUndefined()
  })
})
