# pev-integration Specification

## Purpose
让 OpenSpec 在变更生命周期中原生对接 PEV 家族 skills 的 `.pev/` 契约：按 PASS 判定阶段完成、晋升产物、复用既有能力并留痕回溯。

## Requirements

### Requirement: PEV 阶段完成按 PASS 判定

当 workflow schema 的 artifact 声明了 `pev` 绑定时，该 artifact 的完成状态 SHALL 由对应 PEV skill 的 `state.status === "COMPLETE"` 且其 `output/` 交付物已渲染来判定，而不是仅凭 `generates` 文件是否存在。

#### Scenario: 未 PASS 的产物不判定完成

- **WHEN** 某 artifact 声明 `pev`，且 `.pev/<轮次>/<runDir>/state.json` 的 `status` 不是 `COMPLETE`
- **THEN** `openspec status` 将该 artifact 报告为未完成，即使 change 目录下已存在同名文件

#### Scenario: PASS 后判定完成

- **WHEN** 该 artifact 的 `state.status === "COMPLETE"` 且 `output/` 交付物存在
- **THEN** `openspec status` 将该 artifact 报告为 done，并解锁其下游 artifact

### Requirement: PEV 产物晋升入变更目录

归档时，OpenSpec SHALL 把 `.pev/<轮次>/<runDir>/output/` 的最终交付物晋升到 change 目录中 `generates` 声明的路径；若 artifact 声明了 `promotes`，还应晋升到 `openspec/artifacts/` 对应路径。

#### Scenario: 产物晋升到 change 目录

- **WHEN** 执行 `openspec archive <change>`，且该 change 绑定了一个 PEV 轮次目录
- **THEN** 各 PEV artifact 的 `output/` 交付物被复制到 change 目录对应路径，`pev-log.md` 记录阶段、轮次、迭代与 verdict

#### Scenario: 缺失产物不阻断但需显式记录

- **WHEN** 某 PEV artifact 的 `output/` 交付物不存在
- **THEN** 晋升结果将该 artifact 记为 `missing`，归档不因此静默成功，留痕中可见

### Requirement: 发起需求时绑定 PEV 轮次

当使用的 schema 含 `pev` 绑定 artifact 时，创建 change SHALL 同时创建 `.pev/<轮次>/` 轮次目录，并把轮次名写入该 change 的 `.openspec.yaml` 的 `pev_round` 字段。

#### Scenario: 创建含 pev 后端的 change

- **WHEN** 执行 `openspec new change <name>`，其 schema 声明了至少一个 `pev` artifact
- **THEN** `.pev/prd-<日期>/` 轮次目录被创建，且 `.openspec.yaml` 含 `pev_round`

### Requirement: PRD 阶段注入既有能力清单

PRD 层 artifact 的 instructions SHALL 注入由 `openspec/specs/` 生成的“既有能力引用清单”，并要求 PRD 逐项标注复用 / 修改 / 新增。

#### Scenario: 存在既有能力时注入清单

- **WHEN** `openspec/specs/` 下存在 capability 的 `spec.md`
- **THEN** prd artifact 的 instructions 含 `capabilityInventory`，列出各 capability 的 path 与 requirement 标题

### Requirement: PEV skill 可扩展发现

OpenSpec SHALL 通过扫描 `~/skills/` 与 `~/.claude/skills/` 发现带 `.pev` 契约的 PEV skills，新增 skill 仅需在 schema 中声明即可接入。

#### Scenario: 发现已安装的 PEV skills

- **WHEN** 运行 PEV skill 发现逻辑
- **THEN** 返回 `product-manager`、`requirement-clarify`、`behavior-decompose`、`architecture-design`、`module-design` 等 skill 名
