# 基于第一性原理的自适应 PEV Workflow

> 当前选型与验收以 [workflow-decision.md](workflow-decision.md) 为准(2026-10-16 定案):prd/rc 剥离、粗定 workflow、design 唯一自动检测点 + 人工升级、直接演进 pev。

> 本文保留第一性原理分析,是定案的概念来源。本文三 profile(§3)、阶段 0 自动分诊(§4)、compact-plan(§1 最小流程中的 compact-plan)已被定案废止;§2 风险触发表作为粗定起草指引保留;§1 Planner/Executor/Verifier 最小不变量仍然有效;§6 升级改为 design 唯一检测点 + 人工发起。实施入口见 [tasks.md](tasks.md) W 系列。

## 结论

当前 `pev-lite` 只是删除固定阶段后的另一条固定链，不能解决“按变更风险选择最小充分流程”的问题。

建议把目标定义为：**用风险而不是代码量选择 PEV 阶段；记录跳过依据；风险上升时暂停并升级；所有生命周期命令使用同一条激活流程。**

当前方案理论可行，但还不能直接实施。先验证三件事：

1. 阶段 0 的分诊规则是否能可靠识别需求清晰度和风险。
2. `compact-plan` 是否包含足够信息，使升级后的阶段无需从头重跑。
3. 条件 DAG、`SKIPPED` 持久化和升级检测的实现契约是否明确。

## 1. 最小不变量

PEV 的核心不是固定阶段，而是三个控制点：

### Planner

编码前明确目标、范围、验收条件、影响和风险、实施步骤、验证方式及未决问题。

### Executor

基于已确认的计划实施，并记录实际改动、测试结果、偏差和新风险。

### Verifier

确认需求和验收条件满足、没有回归、改动未超出范围，并且所选流程覆盖了实际风险。

因此最小流程是：

```text
compact-plan → implement → verify
```

若 OpenSpec 行为契约发生变化，则增加 `delta-spec`：

```text
compact-plan → delta-spec → implement → verify
```

`prd`、`catalog`、`design`、`modules`、`api`、`db`、`tasks` 是风险控制点，不是所有变更都必须执行的固定阶段。

## 2. 阶段触发规则

| 风险 | 必要控制点 |
| --- | --- |
| 业务目标不清楚 | `prd` 或需求澄清 |
| 用户可观察行为不清楚 | `spec` |
| 正常、异常或边界场景较多 | `catalog` |
| OpenSpec 行为契约变化 | `delta-spec` |
| 模块职责、边界或部署关系变化 | `design` / `modules` |
| API、事件、命令或跨模块契约变化 | `api` |
| 表、字段、索引或迁移变化 | `db` |
| 需要多个独立或并行任务 | `tasks` |
| 任何行为变化 | `verify` |

以下风险不能仅因“改动很小”而跳过：契约变化、数据迁移、权限或安全边界变化、并发/可靠性/部署/回滚风险，以及根因尚未确认的 Bug。

## 3. 三种 Profile

保留完整 `pev` 作为兼容 profile，并增加风险驱动的 profile。

### Compact

适用：单一部署单元内的单模块变更；需求和根因清楚；不改变 API、事件、数据库、权限契约；不涉及迁移、并发、部署或回滚风险；不需要多个独立任务。

```text
compact-plan → implement → verify
```

`compact-plan` 至少包含：目标、范围、验收条件、影响模块、实施步骤、测试策略，以及不需要 API/DB/架构设计的判断和理由。它必须足以作为后续升级时 `catalog`、`design` 或 `tasks` 的输入。

### Standard

适用：行为较复杂、场景较多、需要架构决策，或需要多个任务，但没有复杂的跨模块契约变化。

```text
spec → catalog → delta-spec → design → tasks → implement → verify
```

`prd` 仅在业务目标不清楚时加入。

### Full

适用：跨模块/跨服务、API 或事件契约变化、数据库 schema 或迁移、新模块或部署边界、权限/安全/并发/可靠性/回滚风险。

```text
prd? → spec → catalog → delta-spec
→ design → modules → api? → db?
→ tasks → implement → verify
```

`api` 和 `db` 根据实际影响独立启用。

## 4. 阶段 0：澄清与分诊

阶段 0 是所有 profile 的共同前置，输出：选定的 profile，以及可审计的风险评估。

### 4.1 需求清晰度

先自动检查需求是否包含明确目标、范围、验收条件和相关模块。检查不通过时，只针对缺失信息提出必要问题，覆盖目标、范围、验收和主要风险即可，不要求固定问满一组问题。

如果回答仍然模糊，进入 `requirement-clarify`，产出 `spec.md` 后再分诊。即使预检通过，若后续无法判断风险，也必须回退并记录原因。

### 4.2 风险评估

读取 `spec.md` 或原始需求，进行轻量探索，只判断是否触及下列维度，不在此阶段完成设计：

```yaml
api_changes: no
db_changes: no
cross_module: no
security: no
migration: no
multi_task: no
uncertainty: no
```

每个维度必须有 `yes/no` 和一句证据。路由结果不能只存在于模型的隐式判断中。

推荐规则：

- 全部为 `no`：`compact`；
- `multi_task: yes` 且没有契约、跨模块或高风险变化：`standard`；
- `api_changes`、`db_changes`、`cross_module` 或其他高影响风险为 `yes`：`full`。

用户可以确认或修改推荐，但修改也要记录。

## 5. 引擎约束

### 5.1 条件 DAG

可以在 schema 中声明 `when` 条件，也可以先由路由器生成 active DAG。实现形式待定，但必须保证：

- 条件有明确的求值规则；
- 跳过阶段有原因和证据；
- 跳过后依赖图仍然可解锁；
- `apply`、`status`、`validate`、`archive` 使用同一条 active DAG；
- 实施开始后默认冻结路由，只允许向更完整 profile 升级。

### 5.2 `SKIPPED` 状态

不能用 artifact 不存在表示跳过，也不能把跳过伪装成 `COMPLETE`。最少应持久化：

```json
{
  "status": "SKIPPED",
  "reason": "未改变外部契约",
  "evidence": ["未修改接口定义", "未修改数据结构"],
  "decidedBy": "planner"
}
```

如果依据不足，不能标记 `SKIPPED`，应选择更完整的 profile。

### 5.3 任务规划器输入

`tasks` 不应硬依赖 `architecture`。它应接受当前 profile 合法的规划输入：`architecture`、`compact-plan` 或 `spec`，避免为了满足输入契约而制造无意义的架构阶段。

## 6. 实施中的升级

若实施发现原风险评估遗漏了更高风险：

1. 立即暂停当前任务；
2. 记录原 profile、新 profile、原因、证据和遗漏原因；
3. 更新风险评估；
4. 补跑新增风险所需的阶段；
5. 基于新产物更新任务清单；
6. 从更新后的任务继续实施。

升级只能向上，不能降级。补跑阶段应复用 `compact-plan` 已确认的目标、范围和影响信息，并检查与既有产物的一致性。

实现前仍需确定：谁检测升级、检测规则是什么、何时检测，以及暂停和通知如何持久化。没有这些协议，升级机制不能实施。

## 7. 对本提案的判断

`improve-pev-skills` 同时触及多个 skill 的协作、verifier/evidence 规则、schema、状态、归档和交互模型，属于 workflow architecture change，不适合 Compact，至少应采用 Standard；若 schema、状态和生命周期实现一起变化，则采用 Full。

`pev-lite` 可以作为过渡 profile 或 schema 能力实验，但不应作为自适应 PEV 的最终设计。

## 8. 实施前验证

先用五类样例回测：

1. 根因明确的单模块修复；
2. 单模块行为变更；
3. 小代码量但有 API/事件变化；
4. 有迁移或跨服务影响的变更；
5. 初看简单、实施中才暴露高风险的变更。

每个样例只需记录：需求清晰度判断、风险评估及证据、profile、激活/跳过阶段、是否升级、补跑结果、最终验证覆盖，以及成本和返工情况。

验证重点：

- 阶段触发是否覆盖真实风险；
- 跳过理由是否可审计；
- `compact-plan` 是否足以支撑升级；
- 升级是否及时且不会静默继续；
- 相比固定完整流程，成本是否下降而风险覆盖不下降。

## 9. 推荐顺序

1. 固化 Planner、Executor、Verifier 不变量。
2. 固化风险维度和阶段触发规则。
3. 实现 `compact / standard / full` profile。
4. 选定 active DAG 和 `SKIPPED` 的持久化方案。
5. 放宽 task planner 的规划输入契约。
6. 实现升级检测和补跑流程。
7. 用五类样例回测，再决定 `pev-lite` 是别名、过渡实现还是删除。
