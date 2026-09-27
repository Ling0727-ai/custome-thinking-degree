import type { ReactNode } from 'react'
import type { ThinkingDegreeEditorProps } from './ThinkingDegreeEditor.api.ts'
import { CLAUDE_LEVELS, CLAUDE_WIRE_VALUES, isClaudeProtocol, THINKING_LEVELS } from './ThinkingDegreeEditor.data.ts'
import { useThinkingDegreeEditor } from './ThinkingDegreeEditor.ts'

export function ThinkingDegreeEditor(props: ThinkingDegreeEditorProps): ReactNode {
  const controller = useThinkingDegreeEditor(props)
  const { state } = controller
  if (props.provider === undefined || props.operations === undefined) return null
  const claude = isClaudeProtocol(state.api)
  const levels = claude ? CLAUDE_LEVELS : THINKING_LEVELS
  const enabled = state.draft.efforts ?? {}

  return (
    <section className="ctd-root" aria-label={`${props.provider.displayName} 思考等级`}>
      <div className="ctd-heading">
        <span>分组思考等级</span>
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
      {state.status === 'ready' && state.models.length > 0 ? (
        <div className="ctd-body">
          <div className="ctd-muted">作用于该分组的 {state.models.length} 个模型 · {claude ? 'Claude Messages' : state.api ?? '当前协议'}</div>
          {state.mixedEfforts ? <p className="ctd-error" role="status">模型当前的等级映射不一致或已禁用思考，请先选择预设，再统一保存。</p> : null}
          <div className="ctd-presets" aria-label="思考等级预设">
            {claude ? <button type="button" onClick={() => { controller.usePreset('claude') }}>Claude</button> : (
              <>
                <button type="button" onClick={() => { controller.usePreset('general') }}>通用</button>
                <button type="button" onClick={() => { controller.usePreset('openai') }}>OpenAI</button>
                {state.api === 'openai-completions' ? <button type="button" onClick={() => { controller.usePreset('deepseek') }}>DeepSeek</button> : null}
              </>
            )}
            <button type="button" onClick={() => { controller.usePreset('none') }}>恢复模型默认</button>
          </div>
          <label className="ctd-default">
            <span>分组默认强度</span>
            <select value={state.draft.reasoning ?? ''} onChange={event => { controller.setReasoning(event.currentTarget.value) }}>
              <option value="">跟随会话设置</option>
              {levels.filter(level => state.draft.efforts === undefined || Object.hasOwn(enabled, level)).map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>
          <div className="ctd-levels" aria-label="分组可用等级">
            {levels.map((level) => {
              const active = Object.hasOwn(enabled, level)
              const wireValue = enabled[level]
              return (
                <div className="ctd-level" key={level}>
                  <label className="ctd-check">
                    <input type="checkbox" checked={active} onChange={event => { controller.toggleLevel(level, event.currentTarget.checked) }} />
                    <span>{level}</span>
                  </label>
                  {claude && level !== 'off' ? (
                    <select className="ctd-input" aria-label={`${level} Claude effort`} disabled={!active} value={wireValue ?? level}
                      onChange={event => { controller.setWireValue(level, event.currentTarget.value) }}>
                      {CLAUDE_WIRE_VALUES.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  ) : (
                    <input className="ctd-input" type="text" aria-label={`${level} 发送值`} disabled={!active || claude}
                      value={wireValue ?? ''} placeholder={level === 'off' ? '留空表示不发送' : level}
                      onChange={event => { controller.setWireValue(level, event.currentTarget.value) }} />
                  )}
                </div>
              )
            })}
          </div>
          {claude ? (
            <label className="ctd-thinking-toggle">
              <input type="checkbox" checked={state.draft.adaptiveThinking}
                onChange={event => { controller.setAdaptiveThinking(event.currentTarget.checked) }} />
              <span>自适应思考（thinking.type=adaptive，output_config.effort）</span>
            </label>
          ) : state.api === 'openai-completions' ? (
            <label className="ctd-thinking-toggle">
              <input type="checkbox" checked={state.draft.explicitThinking}
                onChange={event => { controller.setExplicitThinking(event.currentTarget.checked) }} />
              <span>发送 DeepSeek 显式 thinking 开关</span>
            </label>
          ) : null}
          <div className="ctd-actions">
            {state.saved ? <span className="ctd-saved" role="status">已保存</span> : null}
            <button type="button" className="ctd-save" disabled={!state.writable || state.saving || state.mixedEfforts}
              onClick={controller.save}>{state.saving ? '保存中...' : '保存分组'}</button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
