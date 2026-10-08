# Proposal: add-pev-verification-gates

## Why

2026-10-08 取证（mechunit llm-client-infra change）：执行 agent 未调用 PEV 技能、两分钟手写 8 个阶段的产物并镜像进 `.pev/<轮次>/*/output/` 后，`validate --strict` 判 valid（只查结构）、`status` 报 1/10 但不阻断、promotion 只看文件存在照常晋升、归档全程无感。PEV 的验证强制力全部驻留在技能内部，CLI 的每个消费点都不消费 `state.json`——“按 PASS 判定完成”只存在于 status 显示层，未验证内容拿到绿灯，改造的核心价值（未验证 = 无效）形同虚设。

## What Changes

- **instructions 硬拒 blocked 工件**：请求的工件存在未完成前置时，instructions 拒绝下发并非零退出，错误信息指出缺口阶段的 `.pev/<轮次>/<runDir>/state.json` 路径。对带依赖边的所有 schema 生效。**BREAKING**：原行为是照常返回内容、`blocked` 仅作状态字段。
- **validate 查 provenance**：`--strict` 模式下，pev schema 的 change 中任一带 `pev` 绑定的工件未达 COMPLETE 即判 invalid，逐工件报错；非 strict 模式对未 COMPLETE 工件输出 warning，不判 invalid。
- **promotion 拒绝未验证产物**：`promotePevArtifacts` 在 state.json 缺失或非 COMPLETE 时返回新状态 `unverified` 且不复制；`missing`、`conflict` 同样不复制。
- **archive 拒绝归档**：晋升结果中任一条不是 `promoted` 时归档中止，错误信息附 pev-log 表格。
- **PEV 技能可检测**：`doctor` 列出本机已发现的 PEV 技能；`new change` 使用 pev schema、以及 instructions 下发 pev 工件时，对应技能不在本机则当场警告。
- **apply 技能硬前置**：`openspec-apply-change` 技能文本增加条款——存在未 COMPLETE 的前置工件即停止实施。

## Capabilities

### New Capabilities

- `pev-verification-gates`：未 COMPLETE 的 PEV 工件在所有消费点（instructions / validate / promotion / archive）被视为不存在并被拒绝，以及 PEV 技能缺失的可检测性。

### Modified Capabilities

- `pev-integration`：晋升语义从“缺失产物不阻断但显式记录”改为“缺失/未验证产物拒绝晋升且阻断归档”。
- `cli-artifact-workflow`：Instructions Command 对 blocked 工件从“返回内容”改为“拒绝下发”。

## Impact

- 源码：`src/core/pev/promotion.ts`、`src/core/archive.ts`、`src/core/validation/validator.ts`、`src/commands/change.ts`（validate action）、`src/core/artifact-graph/instruction-loader.ts`、`src/commands/workflow/instructions.ts`、`src/commands/doctor.ts`、`skills/openspec-apply-change/SKILL.md`。
- 判定复用：唯一权威检查仍是 `isPevStageComplete`（state.json `status === "COMPLETE"` 且 output 存在），不新造机制。
- 兼容性：既有通过技能链产出的 change（state.json COMPLETE）不受影响；手写绕过的存量 change 将被全部门禁锁死，属预期行为。
- 依赖：无新增运行时依赖。
