import type { ProviderReasoningConfiguration, ProviderSnapshot } from './ThinkingDegreeEditor.data.ts'

export interface ThinkingDegreeEditorOperations {
  loadProvider(provider: string): Promise<ProviderSnapshot>
  saveProvider(
    provider: string,
    configuration: ProviderReasoningConfiguration,
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
  state: import('./ThinkingDegreeEditor.data.ts').EditorState
  reload(): void
  usePreset(preset: import('./ThinkingDegreeEditor.data.ts').Preset): void
  toggleLevel(level: string, enabled: boolean): void
  setWireValue(level: string, value: string): void
  setReasoning(level: string): void
  setExplicitThinking(enabled: boolean): void
  setAdaptiveThinking(enabled: boolean): void
  save(): void
}
