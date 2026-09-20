# DSH 自定义模型思考等级插件

这个插件在 DSH 的“设置 → 模型”页面中，为 `llm-pi-ai` 自定义供应商的每个手动模型增加思考等级编辑器。保存后，聊天输入框的模型菜单会自动出现“推理等级”，选择值会随请求发送到供应商端点。

## 功能

- 启用插件后，自动给尚未声明等级的手动供应商模型补齐 `off / minimal / low / medium / high / xhigh / max`
- 已有自定义映射或显式 `reasoningEfforts: false` 的模型保持不变
- 通用预设：`off / low / medium / high / max`
- OpenAI 预设：`minimal / low / medium / high / xhigh`
- DeepSeek 预设：`off / low / high / max`，并发送显式 `thinking.type`
- 可以逐级启用、停用，并自定义实际发送的 `reasoning_effort` 值
- “恢复默认”会移除模型上的覆盖，重新继承模型目录或供应商默认值
- 使用 DSH 设置 revision 做并发写保护，不覆盖其他页面刚保存的配置
- 颜色全部取自 DSH `--dsw-alias-*` 语义令牌，浅色与深色主题下都保持可读

## 构建

构建客户端 bundle 需要一个 DSH 源码 checkout。默认从插件目录的 `../../deepseek-harness` 查找，也可以显式设置：

```powershell
$env:DSH_CHECKOUT = "C:\path\to\deepseek-harness"
pnpm install
pnpm run lint:struct
pnpm test
pnpm run build
```

## 安装到 DSH

完成构建后，在 DSH 的“插件”页面选择“安装插件”，输入仓库目录的绝对路径；也可以输入 `pnpm pack` 生成的 `.tgz` 路径。PowerShell 可用以下命令取得当前目录：

```powershell
(Resolve-Path .).Path
```

安装完成后启用 `dsh-plugin-custom-thinking-degree`，刷新当前 DSH 页面。插件会自动初始化手动供应商模型，聊天输入框的模型菜单会直接出现“推理等级”。如需调整映射，再进入“设置 → 模型”，展开自定义供应商下方的“思考等级”并保存。

## 请求行为

插件写入的是 DSH 原生 `llm-pi-ai.providers.<provider>.models[].reasoningEfforts` 配置，不会拦截或重写请求。DSH 的模型目录负责展示等级，`llm-pi-ai` 适配器负责校验并转换为供应商协议参数。

`off` 的发送值留空时，不发送 `reasoning_effort`。如果模型默认会思考，请使用 DeepSeek 预设或勾选“发送 DeepSeek 显式 thinking 开关”，使关闭状态发送 `thinking: { type: "disabled" }`。
