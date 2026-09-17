import type {
  ModelReasoningConfiguration, ProviderModel, ProviderSnapshot,
} from './ThinkingDegreeEditor.data.ts'

export interface ThinkingDegreeEditorOperations {
  loadProvider(provider: string): Promise<ProviderSnapshot>
  saveModel(
    provider: string,
    modelId: string,
    configuration: ModelReasoningConfiguration,
    expectedRevision: number,
  ): Promise<{ ok: true } | { ok: false; message: string }>
  subscribe(listener: () => void): () => void
}

export interface ThinkingDegreeEditorProps {
  provider?: {
    provider: string
    displayName: string
    declared?: boolean
  }
  operations?: ThinkingDegreeEditorOperations
}

export interface ThinkingDegreeEditorController {
  state: {
    status: 'loading' | 'ready' | 'error'
    error: string | undefined
    models: ProviderModel[]
    revision: number
    writable: boolean
    drafts: Record<string, ModelReasoningConfiguration>
    savingModel: string | undefined
    savedModel: string | undefined
  }
  reload(): void
  usePreset(modelId: string, preset: 'general' | 'openai' | 'deepseek' | 'none'): void
  toggleLevel(modelId: string, level: string, enabled: boolean): void
  setWireValue(modelId: string, level: string, value: string): void
  setExplicitThinking(modelId: string, enabled: boolean): void
  save(modelId: string): void
}
