import { describe, expect, it } from 'vitest'
import {
  claudeDefaults, configurationOf, PRESETS, updateModels, updateProviderCompat, validateConfiguration,
  type ProviderReasoningConfiguration, type ProviderSnapshot,
} from '../src/components/ThinkingDegreeEditor/ThinkingDegreeEditor.data.ts'

const config = (overrides: Partial<ProviderReasoningConfiguration> = {}): ProviderReasoningConfiguration => ({
  efforts: PRESETS.claude, reasoning: 'high', explicitThinking: false, adaptiveThinking: true, ...overrides,
})

function snapshot(overrides: Partial<ProviderSnapshot> = {}): ProviderSnapshot {
  return {
    api: 'anthropic-messages', models: [{ id: 'claude-opus-5-5' }], compat: {},
    reasoning: undefined, revision: 1, writable: true, ...overrides,
  }
}

describe('provider-level thinking configuration', () => {
  it('uses an independent Claude mapping and adaptive thinking for Messages models', () => {
    const models = [{ id: 'claude-opus-5-5', contextWindow: 128000 }, { id: 'claude-sonnet-5', name: 'Sonnet' }]
    const updated = updateModels(models, config(), 'anthropic-messages')
    expect(updated).toEqual(models.map(model => ({ ...model, reasoningEfforts: PRESETS.claude })))
    expect(updated[0]?.reasoningEfforts).not.toHaveProperty('xhigh')
    expect(updateProviderCompat({ supportsTemperature: false }, config(), 'anthropic-messages'))
      .toEqual({ supportsTemperature: false, forceAdaptiveThinking: true })
  })

  it('replaces a legacy OpenAI-style map on Claude without carrying DeepSeek switches', () => {
    const legacy = { off: null, minimal: 'minimal', low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' }
    expect(configurationOf(snapshot({ models: [{ id: 'claude-opus-5-5', reasoningEfforts: legacy }] })).draft.efforts)
      .toEqual(PRESETS.claude)
    expect(updateModels([{ id: 'claude-opus-5-5', compat: { forceAdaptiveThinking: false, allowEmptySignature: true } }], config(), 'anthropic-messages')[0]?.compat)
      .toEqual({ allowEmptySignature: true })
  })

  it('keeps OpenAI completions switches separate and preserves unrelated fields', () => {
    const draft = config({ efforts: PRESETS.deepseek, explicitThinking: true, adaptiveThinking: false })
    const [updated] = updateModels([{ id: 'reasoner', compat: { supportsDeveloperRole: false } }], draft, 'openai-completions')
    expect(updated).toMatchObject({ reasoningEfforts: PRESETS.deepseek, compat: { supportsDeveloperRole: false, thinkingFormat: 'deepseek' } })
    expect(updateProviderCompat({ supportsReasoningEffort: false }, draft, 'openai-completions'))
      .toEqual({ supportsReasoningEffort: false, thinkingFormat: 'deepseek' })
    expect(updateProviderCompat({}, draft, 'anthropic-messages')).toEqual({ forceAdaptiveThinking: false })
  })

  it('supports inheriting catalog capabilities and requires a preset for mixed model mappings', () => {
    const mixed = configurationOf(snapshot({ models: [
      { id: 'a', reasoningEfforts: { high: 'high' } }, { id: 'b', reasoningEfforts: { max: 'max' } },
    ] }))
    expect(mixed.mixedEfforts).toBe(true)
    expect(configurationOf(snapshot({ models: [{ id: 'disabled', reasoningEfforts: false }] })).mixedEfforts).toBe(true)
    const [updated] = updateModels([{ id: 'a', reasoningEfforts: { high: 'high' }, compat: { allowEmptySignature: true } }],
      config({ efforts: undefined, reasoning: undefined }), 'anthropic-messages')
    expect(updated).toEqual({ id: 'a', compat: { allowEmptySignature: true } })
  })

  it('defaults Claude groups to adaptive thinking and migrates the legacy map', () => {
    const legacy = { off: null, minimal: 'minimal', low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' }
    const patch = claudeDefaults([{ id: 'a', reasoningEfforts: legacy }, { id: 'b', reasoningEfforts: { high: 'custom' } }], { supportsTemperature: false })
    expect(patch?.compat).toEqual({ supportsTemperature: false, forceAdaptiveThinking: true })
    expect(patch?.models?.[0]?.reasoningEfforts).toEqual(PRESETS.claude)
    expect(patch?.models?.[1]?.reasoningEfforts).toEqual({ high: 'custom' })
    expect(claudeDefaults([{ id: 'a' }], { forceAdaptiveThinking: false })).toBeUndefined()
    expect(configurationOf(snapshot()).draft.adaptiveThinking).toBe(true)
  })

  it('allows custom Claude effort values and rejects unavailable default strengths', () => {
    const custom = config({ efforts: { off: null, minimal: 'low', high: 'xhigh', xhigh: 'max', max: 'custom-effort' }, reasoning: 'xhigh' })
    expect(validateConfiguration(custom, 'anthropic-messages')).toBeUndefined()
    expect(updateModels([{ id: 'claude-opus-5-5' }], custom, 'anthropic-messages')[0]?.reasoningEfforts).toEqual(custom.efforts)
    expect(validateConfiguration(config({ efforts: { off: 'disabled', high: 'high' } }), 'anthropic-messages')).toContain('off')
    expect(validateConfiguration(config({ efforts: { off: null } }), 'anthropic-messages')).toContain('非 off')
    expect(validateConfiguration(config({ efforts: { high: 'high' }, reasoning: 'max' }), 'anthropic-messages')).toContain('默认思考等级')
    expect(validateConfiguration(config(), 'anthropic-messages')).toBeUndefined()
  })
})
