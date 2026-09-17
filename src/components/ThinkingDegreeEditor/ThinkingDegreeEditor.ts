import { useCallback, useEffect, useState } from 'react'
import type { ThinkingDegreeEditorController, ThinkingDegreeEditorProps } from './ThinkingDegreeEditor.api.ts'
import {
  configurationOf, PRESETS, THINKING_LEVELS, validateConfiguration,
  type EditorState, type ModelReasoningConfiguration, type ThinkingLevel,
} from './ThinkingDegreeEditor.data.ts'

const EMPTY_STATE: EditorState = {
  status: 'loading',
  models: [],
  revision: 0,
  writable: false,
  drafts: {},
  error: undefined,
  savingModel: undefined,
  savedModel: undefined,
}

function cloneConfiguration(value: ModelReasoningConfiguration): ModelReasoningConfiguration {
  return { efforts: value.efforts === undefined ? undefined : { ...value.efforts }, explicitThinking: value.explicitThinking }
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
      const drafts = Object.fromEntries(snapshot.models.map(model => [model.id, configurationOf(model)]))
      setState(previous => ({
        ...previous,
        ...snapshot,
        drafts,
        status: 'ready',
        error: undefined,
        savingModel: undefined,
      }))
    } catch (error) {
      setState(previous => ({
        ...previous,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }, [operations, providerId])

  useEffect(() => {
    void load()
    if (operations === undefined) return
    return operations.subscribe(() => { void load() })
  }, [load, operations])

  const updateDraft = (modelId: string, mutate: (draft: ModelReasoningConfiguration) => void): void => {
    setState(previous => {
      const current = previous.drafts[modelId] ?? { efforts: undefined, explicitThinking: false }
      const draft = cloneConfiguration(current)
      mutate(draft)
      return { ...previous, drafts: { ...previous.drafts, [modelId]: draft }, savedModel: undefined, error: undefined }
    })
  }

  return {
    state,
    reload: () => { void load() },
    usePreset: (modelId, preset) => {
      updateDraft(modelId, (draft) => {
        const value = preset === 'none'
          ? { efforts: undefined, explicitThinking: false }
          : PRESETS[preset]
        draft.efforts = value.efforts === undefined ? undefined : { ...value.efforts }
        draft.explicitThinking = value.explicitThinking
      })
    },
    toggleLevel: (modelId, rawLevel, enabled) => {
      const level = rawLevel as ThinkingLevel
      if (!THINKING_LEVELS.includes(level)) return
      updateDraft(modelId, (draft) => {
        const efforts = { ...(draft.efforts ?? {}) }
        if (enabled) efforts[level] = level === 'off' ? null : level
        else delete efforts[level]
        draft.efforts = efforts
      })
    },
    setWireValue: (modelId, rawLevel, value) => {
      const level = rawLevel as ThinkingLevel
      if (!THINKING_LEVELS.includes(level)) return
      updateDraft(modelId, (draft) => {
        draft.efforts = { ...(draft.efforts ?? {}), [level]: level === 'off' && value === '' ? null : value }
      })
    },
    setExplicitThinking: (modelId, enabled) => {
      updateDraft(modelId, (draft) => { draft.explicitThinking = enabled })
    },
    save: (modelId) => {
      const draft = state.drafts[modelId]
      if (draft === undefined || providerId === undefined || operations === undefined) return
      const error = validateConfiguration(draft)
      if (error !== undefined) {
        setState(previous => ({ ...previous, error, savedModel: undefined }))
        return
      }
      setState(previous => ({ ...previous, savingModel: modelId, error: undefined, savedModel: undefined }))
      void operations.saveModel(providerId, modelId, draft, state.revision).then((result) => {
        if (!result.ok) {
          setState(previous => ({ ...previous, savingModel: undefined, error: result.message }))
          return
        }
        void load().then(() => {
          setState(previous => ({ ...previous, savedModel: modelId }))
        })
      })
    },
  }
}
