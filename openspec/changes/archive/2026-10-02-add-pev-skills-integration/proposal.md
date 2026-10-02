# Proposal: add-pev-skills-integration

## Why

OpenSpec 与 PEV 家族 skills（product-manager、requirement-clarify、behavior-decompose、architecture-design、module-design）目前割裂：PEV 在 `.pev/<轮次>/` 完成规划与设计，产物止步工作区；OpenSpec 的原生工作流不调用 PEV，也不认识 PEV 的 PASS / Evidence Ledger 契约。开发者要在两套工具间手动搬运产物、无法统一回溯“为什么这么定”。本次在 OpenSpec 源码层原生打通，而非脆弱外挂。

## What Changes

- 新增 `pev` 完成后端：artifact 可声明 `pev: { skill, runDir, output }`，阶段完成判定从“文件存在”升级为“PEV skill 的 `state.status === 'COMPLETE'` 且 `output/` 产物已渲染”。
- 新增 PEV 产物晋升：`archive` 时把 `.pev/<轮次>/<runDir>/output/` 晋升到 change 目录与 `openspec/artifacts/`，并写 `pev-log.md` 留痕。
- 发起需求时（`new change`）为 pev schema 创建 `.pev/<轮次>/` 轮次目录，并把 `pev_round` 写入 `.openspec.yaml`。
- PRD 阶段源码级注入 `openspec/specs/` 既有能力清单，强制生成“引用的既有能力”章节。
- 新增可扩展的 PEV skill 注册表（扫描 `~/skills/` 与 `~/.claude/skills/`，识别带 `.pev` 契约的 skill）。
- 内置 `pev` 工作流 schema（`schemas/pev/`，与 `spec-driven` 同级）：prd → spec → catalog → specs → design → modules → tasks 七阶段流水线，其中 prd/spec/catalog/design/modules 声明 `pev` 绑定，specs/tasks 为直写阶段。

## Capabilities

### New Capabilities
- `pev-integration`: PEV 家族 skills 与 OpenSpec 变更生命周期的原生对接——轮次绑定、完成判定、产物晋升、能力复用、留痕回溯、可扩展发现。

### Modified Capabilities
<!-- 本次为源码级新增能力，不改变既有 capability 的 spec 级行为；验证通过后再补充对 artifact-graph / cli-archive 的 delta。 -->

## Impact

- 源码：`src/core/artifact-graph/*`、`src/core/archive.ts`、`src/utils/change-utils.ts`、`src/core/change-metadata/schema.ts`；新增 `src/core/pev/*`。
- 数据：`openspec/changes/<change>/.openspec.yaml` 新增 `pev_round`；新增 `openspec/artifacts/` 目录。
- 内置 schema：新增 `schemas/pev/schema.yaml` 与 `schemas/pev/templates/*`（与 `spec-driven` 同级）。
- 依赖：无新增运行时依赖（复用现有 yaml/zod/fast-glob/node:fs）。
