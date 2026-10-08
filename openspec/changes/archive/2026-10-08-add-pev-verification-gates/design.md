# Design: add-pev-verification-gates

## 核心原则

未 COMPLETE 即不存在。所有门禁复用唯一权威判定 `isPevStageComplete`（`src/core/pev/state.ts:37-45`：state.json `status === "COMPLETE"` 且 output 交付物存在），不新造检测机制。门禁只加在消费点（读方），生成侧（技能委托）保持文字契约不变——生成永远可被手写伪造，消费点拒绝才能闭环。

## 各门禁机制

### 1. instructions 硬拒 blocked 工件

`instruction-loader.ts` 已计算 blocked（`graph.getBlocked(completed)`，含传递依赖）。改动在 `src/commands/workflow/instructions.ts` 出口：请求的工件处于 blocked → 抛错、非零退出、不渲染指令内容。错误信息逐个列出未完成前置：PEV 绑定工件给 `.pev/<round>/<runDir>/state.json` 路径，直写工件给 `generates` 路径。路径一律 `path.join` 拼接（仓库跨平台规则）。

`status` 命令的 "Next: openspec instructions <artifact>" 提示不变——它指向的永远是非 blocked 工件。

### 2. validate 查 provenance

在 validate 流程（`src/commands/change.ts:509` validate action → `src/core/validation/validator.ts`）增加 PEV provenance 检查：change 的 schema 含 `pev` 绑定工件时，逐工件跑 `isPevStageComplete`。`--strict`：任一未达标即 invalid，错误含工件名与 runDir。非 strict：同样检查但降级为 warning 输出，不改变判定。检查结果走现有 issue/warning 结构，不新造输出通道。

### 3. promotion 拒绝未验证产物

`promotePevArtifacts`（`src/core/pev/promotion.ts:59`）调整判定顺序：**先查 state，后查文件**。state.json 缺失或非 COMPLETE → 新状态 `unverified`，不复制（即使 output 存在——这正是 10-08 绕过形态）。state 达标但 output 缺失 → `missing`。目标冲突 → `conflict`。仅 state 达标且无冲突才 `promoted`。`PromotionResult.status` 联合类型增加 `'unverified'`。

### 4. archive 拒绝

`src/core/archive.ts:1683` 处晋升完成后检查结果：任一条非 `promoted` → 抛错中止归档，错误信息渲染 pev-log 同款表格（复用 `writePevLog` 的行构造逻辑），change 目录不动。放在 spec 合并之前，避免半归档状态。

### 5. PEV 技能可检测

- `doctor`：新增 PEV 技能发现段，列出 `discoverPevSkills()` 结果。
- `new change`：schema 含 `pev` 工件时，将 schema 声明的技能名与 `discoverPevSkills()` 结果做显式列表比对（仓库规则：显式查找，不用模式匹配），缺失即警告，不阻断创建。
- instructions：下发 `pev` 绑定工件指令时同样比对，缺失即随指令附带警告。

### 6. apply 技能硬前置

`skills/openspec-apply-change/SKILL.md` 增加条款：实施前 `openspec status --change <name> --json`，存在未完成前置工件（尤其 `pev` 工件未 COMPLETE）即停止并报告，不开始写任务代码。该技能随 CLI 分发，改动对所有项目生效。

## 夹具与测试策略

共享一个"10-08 绕过形态"夹具：`.pev/<round>/<runDir>/output/` 存在、state.json 不存在，change 目录有手写文件。四道门禁各一个断言拒绝的测试 + 一个"技能链正常产出（state COMPLETE）不受影响"的对照测试。现有 `test/core/pev/full-chain.test.ts` 扩展断言。

## 平台注意

- 所有路径 `path.join()`，不硬编码分隔符（Windows CI 规则）。
- `unverified` 等新枚举值同步进 `PromotionResult` 类型，不改既有字段的含义。
