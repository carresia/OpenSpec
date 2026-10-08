# pev-integration 变更

## REMOVED Requirements

- `### Requirement: PEV 产物晋升入变更目录`
  - 移除原因：其场景「缺失产物不阻断但需显式记录」与验证门禁直接矛盾——取证（2026-10-08）表明"不阻断 + 留痕"不足以阻止未验证内容混入归档。
  - 迁移路径：由下方 ADDED 的「PEV 产物仅在验证通过后晋升」整体接替，语义从"尽力晋升 + 记录"改为"验证通过才晋升、否则阻断归档"；跨能力总契约见 `pev-verification-gates`。

## ADDED Requirements

### Requirement: PEV 产物仅在验证通过后晋升

归档时，OpenSpec SHALL 把 `.pev/<轮次>/<runDir>/output/` 的最终交付物晋升到 change 目录中 `generates` 声明的路径；若 artifact 声明了 `promotes`，还应晋升到 `openspec/artifacts/` 对应路径。晋升以该工件通过验证（state.json `status === "COMPLETE"`）为前提；未验证、缺失或冲突的工件不复制任何文件，并使归档整体拒绝。

#### Scenario: 验证通过的产物晋升到 change 目录

- **WHEN** 执行 `openspec archive <change>`，该 change 绑定了一个 PEV 轮次目录，且工件 state.json 为 `COMPLETE`
- **THEN** 该工件的 `output/` 交付物被复制到 change 目录对应路径，`pev-log.md` 记录阶段、轮次、迭代与 verdict

#### Scenario: 未验证或缺失产物阻断归档

- **WHEN** 某 PEV artifact 的 state.json 缺失或非 `COMPLETE`（记 `unverified`），或其 `output/` 交付物不存在（记 `missing`），或晋升目标与 output 内容不一致（记 `conflict`）
- **THEN** 该工件不被复制，归档拒绝执行，留痕表格中可见各工件状态
