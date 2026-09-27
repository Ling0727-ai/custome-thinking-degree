import { useCallback, useEffect, useState } from 'react'
import type { ThinkingDegreeEditorController, ThinkingDegreeEditorProps } from './ThinkingDegreeEditor.api.ts'
import {
  configurationOf, isClaudeProtocol, PRESETS, THINKING_LEVELS, validateConfiguration,
  type EditorState, type ProviderReasoningConfiguration, type ThinkingLevel,
} from './ThinkingDegreeEditor.data.ts'

const EMPTY_STATE: EditorState = {
  status: 'loading', models: [], api: undefined, reasoning: undefined, compat: {},
  revision: 0, writable: false,
  draft: { efforts: undefined, reasoning: undefined, explicitThinking: false, adaptiveThinking: false },
  mixedEfforts: false, error: undefined, saving: false, saved: false,
}

export function useThinkingDegreeEditor(props: ThinkingDegreeEditorProps): ThinkingDegreeEditorController {
  const [state, setState] = useState<EditorState>(EMPTY_STATE)
  const providerId = props.provider?.provider
  const operations = props.operations

  const load = useCallback(async (): Promise<void> => {
    if (providerId === undefined || operations === undefined) return
    setState(previous => ({ ...previous, status: 'loading', error: undefined }))
    try {
      const snapshot = await operations.loadProvider(providerId)
      const { draft, mixedEfforts } = configurationOf(snapshot)
      setState(previous => ({
        ...previous, ...snapshot, draft, mixedEfforts,
        status: 'ready', error: undefined, saving: false,
      }))
    } catch (error) {
      setState(previous => ({ ...previous, status: 'error', error: error instanceof Error ? error.message : String(error) }))
    }
  }, [operations, providerId])

  useEffect(() => {
    void load()
    if (operations === undefined) return
    return operations.subscribe(() => { void load() })
  }, [load, operations])

  const updateDraft = (mutate: (draft: ProviderReasoningConfiguration) => void, changeEfforts = false): void => {
    setState(previous => {
      const draft = { ...previous.draft, efforts: previous.draft.efforts === undefined ? undefined : { ...previous.draft.efforts } }
      mutate(draft)
      return { ...previous, draft, mixedEfforts: changeEfforts ? false : previous.mixedEfforts, saved: false, error: undefined }
    })
  }

  return {
    state,
    reload: () => { void load() },
    usePreset: (preset) => {
      updateDraft((draft) => {
        const efforts = PRESETS[preset]
        draft.efforts = efforts === undefined ? undefined : { ...efforts }
        if (isClaudeProtocol(state.api)) draft.adaptiveThinking = preset === 'claude' || draft.adaptiveThinking
        else if (state.api === 'openai-completions') draft.explicitThinking = preset === 'deepseek'
        if (draft.reasoning !== undefined && efforts !== undefined && !Object.hasOwn(efforts, draft.reasoning)) {
          draft.reasoning = undefined
        }
      }, true)
    },
    toggleLevel: (rawLevel, enabled) => {
      const level = rawLevel as ThinkingLevel
      if (!THINKING_LEVELS.includes(level)) return
      updateDraft((draft) => {
        const efforts = { ...(draft.efforts ?? {}) }
        if (enabled) efforts[level] = level === 'off' ? null : level
        else delete efforts[level]
        draft.efforts = efforts
        if (!enabled && draft.reasoning === level) draft.reasoning = undefined
      }, true)
    },
    setWireValue: (rawLevel, value) => {
      const level = rawLevel as ThinkingLevel
      if (!THINKING_LEVELS.includes(level)) return
      updateDraft((draft) => {
        draft.efforts = { ...(draft.efforts ?? {}), [level]: level === 'off' && value === '' ? null : value }
      }, true)
    },
    setReasoning: (value) => {
      updateDraft((draft) => { draft.reasoning = value === '' ? undefined : value as ThinkingLevel })
    },
    setExplicitThinking: enabled => { updateDraft(draft => { draft.explicitThinking = enabled }) },
    setAdaptiveThinking: enabled => { updateDraft(draft => { draft.adaptiveThinking = enabled }) },
    save: () => {
      if (providerId === undefined || operations === undefined || state.mixedEfforts) return
      const draft = state.draft
      const error = validateConfiguration(draft, state.api)
      if (error !== undefined) {
        setState(previous => ({ ...previous, error, saved: false }))
        return
      }
      setState(previous => ({ ...previous, saving: true, error: undefined, saved: false }))
      void operations.saveProvider(providerId, draft, state.revision).then((result) => {
        if (!result.ok) {
          setState(previous => ({ ...previous, saving: false, error: result.message }))
          return
        }
        void load().then(() => { setState(previous => ({ ...previous, saved: true })) })
      }).catch((cause: unknown) => {
        setState(previous => ({ ...previous, saving: false, error: cause instanceof Error ? cause.message : String(cause) }))
      })
    },
  }
}
