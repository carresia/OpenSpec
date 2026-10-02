# Design: add-pev-skills-integration

## Context

OpenSpec 的生命周期是“schema → artifact graph → instructions → archive”，完成度由 `detectCompleted` 按文件存在性判定，归档由 `ArchiveCommand` 合并 delta specs 后搬目录。PEV skills 以 `.pev/<轮次>/<runDir>/` 为契约，PASS 后渲染 `output/`，`state.json` 记录 `status`/`iteration`/evidence。两套契约的事实源需在 OpenSpec 侧统一。

## Goals / Non-Goals

**Goals:**
- 让 OpenSpec 原生识别 PEV 的“PASS 即完成”，而不是文件存在。
- 让 PEV 的 `output/` 产物确定性晋升进 change 目录并归档留痕。
- 让 PRD 阶段强制读取 `openspec/specs/` 并产出能力引用清单。
- 新增 PEV skill 只改数据（schema 声明），不改粘合层代码。

**Non-Goals:**
- 不改任何 PEV skill 的 `.pev/` 契约与 validate.py。
- 不由 OpenSpec CLI 代为执行 PEV 状态机（该动作由 agent 完成）。
- 不展开 stores 跨仓、社区分发。

## Decisions

- **D1 双后端完成判定**：`ArtifactSchema` 增 `pev` 声明，`detectCompleted` 对 `pev` artifact 读 `state.json` 判 COMPLETE，其余保持文件存在。理由：复用现有 graph，只增一条判定分支。
- **D2 轮次绑定走元数据**：`createChange` 建 `.pev/<轮次>/` 并把 `pev_round` 写入 `.openspec.yaml`；`loadChangeContext` 读它构造 roundDir。理由：change ↔ round 一一对应且可恢复。
- **D3 晋升在 archive 统一执行**：`promotePevArtifacts` 在 spec merge 之后、moveDirectory 之前跑，产出 `pev-log.md`。理由：归档是唯一有完整上下文的收口点。
- **D4 能力复用走指令注入**：`generateInstructions` 对 prd 层 artifact 注入 `capabilityInventory`，模板 + instruction 双约束。理由：源码级强制，而非仅 prompt 提示。
- **D5 skill 注册表动态发现**：扫描 `~/skills/` 与 `~/.claude/skills/`，以 `scripts/validate.py` 存在识别 PEV skill。理由：家族持续新增，不硬编码清单。

## Risks / Trade-offs

- **fork 维护成本**：改源码后需跟进上游升级，冲突集中在 artifact-graph 与 archive。
- **双目录一致风险**：`.pev/` 与 change 产物可能漂移；以 `state.status==='COMPLETE'` 为权威信号兜底，未 PASS 不判定完成。
- **直写阶段完成依据造假**：非 pev artifact 仍走文件存在；靠 tasks/implement-report 留痕，归档前校验。
