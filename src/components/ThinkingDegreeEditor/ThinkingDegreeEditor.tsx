import type { ReactNode } from 'react'
import type { ThinkingDegreeEditorProps } from './ThinkingDegreeEditor.api.ts'
import { THINKING_LEVELS } from './ThinkingDegreeEditor.data.ts'
import { useThinkingDegreeEditor } from './ThinkingDegreeEditor.ts'

export function ThinkingDegreeEditor(props: ThinkingDegreeEditorProps): ReactNode {
  const controller = useThinkingDegreeEditor(props)
  const { state } = controller
  if (props.provider === undefined || props.operations === undefined) return null

  return (
    <section className="ctd-root" aria-label={`${props.provider.displayName} 思考等级`}>
      <div className="ctd-heading">
        <span>思考等级</span>
        {state.status === 'loading' ? <span className="ctd-muted">读取中...</span> : null}
      </div>
      {state.error !== undefined ? (
        <div className="ctd-error" role="alert">
          <span>{state.error}</span>
          {state.status === 'error' ? <button type="button" onClick={controller.reload}>重试</button> : null}
        </div>
      ) : null}
      {state.status === 'ready' && state.models.length === 0 ? (
        <p className="ctd-muted">先在此供应商中添加模型，再配置思考等级。</p>
      ) : null}
      {state.status === 'ready' ? state.models.map((model) => {
        const draft = state.drafts[model.id] ?? { efforts: undefined, explicitThinking: false }
        const enabled = draft.efforts ?? {}
        const summary = draft.efforts === undefined ? '使用模型目录默认值' : Object.keys(enabled).join(' / ')
        return (
          <details className="ctd-model" key={model.id}>
            <summary>
              <span className="ctd-model-name">{model.name ?? model.id}</span>
              <span className="ctd-summary">{summary}</span>
            </summary>
            <div className="ctd-body">
              <div className="ctd-presets" aria-label="思考等级预设">
                <button type="button" onClick={() => { controller.usePreset(model.id, 'general') }}>通用</button>
                <button type="button" onClick={() => { controller.usePreset(model.id, 'openai') }}>OpenAI</button>
                <button type="button" onClick={() => { controller.usePreset(model.id, 'deepseek') }}>DeepSeek</button>
                <button type="button" onClick={() => { controller.usePreset(model.id, 'none') }}>恢复默认</button>
              </div>
              <div className="ctd-levels">
                {THINKING_LEVELS.map((level) => {
                  const active = Object.prototype.hasOwnProperty.call(enabled, level)
                  const wireValue = enabled[level]
                  return (
                    <div className="ctd-level" key={level}>
                      <label className="ctd-check">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={event => { controller.toggleLevel(model.id, level, event.currentTarget.checked) }}
                        />
                        <span>{level}</span>
                      </label>
                      <input
                        className="ctd-input"
                        type="text"
                        aria-label={`${model.id} ${level} 发送值`}
                        disabled={!active}
                        value={wireValue ?? ''}
                        placeholder={level === 'off' ? '留空表示不发送' : level}
                        onChange={event => { controller.setWireValue(model.id, level, event.currentTarget.value) }}
                      />
                    </div>
                  )
                })}
              </div>
              <label className="ctd-thinking-toggle">
                <input
                  type="checkbox"
                  checked={draft.explicitThinking}
                  onChange={event => { controller.setExplicitThinking(model.id, event.currentTarget.checked) }}
                />
                <span>发送 DeepSeek 显式 thinking 开关</span>
              </label>
              <div className="ctd-actions">
                {state.savedModel === model.id ? <span className="ctd-saved" role="status">已保存</span> : null}
                <button
                  type="button"
                  className="ctd-save"
                  disabled={!state.writable || state.savingModel !== undefined}
                  onClick={() => { controller.save(model.id) }}
                >
                  {state.savingModel === model.id ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </details>
        )
      }) : null}
    </section>
  )
}
