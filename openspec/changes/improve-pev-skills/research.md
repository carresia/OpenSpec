# 自适应 PEV Workflow 调研结论

> 当前选型与验收以 [workflow-decision.md](workflow-decision.md) 为准(2026-10-16 定案):prd/rc 剥离、粗定 workflow、design 唯一检测点 + 手动升级、直接演进 pev。本文研究方法与事实仍然有效;方案形态已被定案取代——阶段 0 自动分诊改为起草指引(第 1 节),compact-plan 删除(第 2 节),契约以定案的 `.openspec-workflow.json` 为准(第 3 节)。

## 结论

日期：2026-10-16。方法：源码与既有文档检查、逻辑反例分析。未执行真实需求分诊实验，也未验证升级端到端可用性；以下方案是实施方向，不是完成证明。

1. 阶段 0 当前不能可靠地自动识别需求清晰度和风险。它适合作为低成本预筛选器，不适合作为无证据放行器。——定案采纳此结论并走得更远:不做自动分诊,模型按风险触发表起草、人逐条确认。
2. 当前 `compact-plan` 不足以保证升级后接续。补充风险决策、证据、假设和升级触发条件后，可以避免重复澄清和重复定位；新增专业风险阶段仍需重新检查。——定案删除 compact-plan:目标/范围/验收由澄清产物承接,跳过依据由 skip 记录承接,升级接续由 upgrade 事件的 reopens/explore 承接。
3. 条件 DAG、`SKIPPED` 持久化和升级检测目前没有完整实现契约。第一版不引入通用条件 DSL，采用动态阶段选择 加一份 workflow state。——定案维持此方向,契约细节见 workflow-decision.md。

## 事实

- `schemas/pev/schema.yaml` 只声明静态 `requires` 依赖。
- PEV 阶段只有在 `.pev/<round>/<runDir>/state.json` 为 `COMPLETE` 且最终输出存在时才算完成。参见 `src/core/pev/state.ts`。
- 归档晋升遍历 schema 声明的 PEV artifact；非 `COMPLETE` 状态会被记录为 `unverified`。参见 `src/core/pev/promotion.ts`。
- 现有 `skip_specs` 只处理生成到 `specs/` 的 artifact，不是通用阶段跳过机制。
- `pev-lite` 是删除固定阶段后的另一条固定链，不是动态路由器。

## 1. 阶段 0

需求长度、明确动词、文件名和验收条件只能说明文本形式清楚，不能证明 API、数据库、权限、并发、可靠性、部署或回滚风险已经排除。

当前 7 个风险维度也没有直接覆盖并发、可靠性、部署、回滚和性能风险。没有真实需求样本、假阳性率和假阴性率，不能宣称规则已经可靠。

最小可行规则：

- 预检只决定是否需要继续澄清。
- 每个风险判断都必须有证据引用。
- 无法证明为 `no` 的维度记为 `unknown`，`unknown` 不得进入 `compact`。
- 高影响风险统一阻止 `compact`，不依赖代码行数。
- 第一版不做机器学习分类器；先用真实样例回测。

## 2. `compact-plan`

`compact-plan` 不是完整设计文档，而是保存“为什么允许走 compact”以及“什么情况会推翻这个判断”。最小字段：

```yaml
version: 1
profile: compact
goal: ...
scope:
  in: [...]
  out: [...]
acceptance:
  - id: AC-1
    statement: ...
    verification: ...
affected_units:
  - name: ...
    deployment_boundary: ...
    paths: [...]
risk_decisions:
  api_changes:
    decision: no
    evidence: ["path:lines claim"]
assumptions:
  - id: A-1
    statement: ...
    invalidates: [api_changes]
implementation:
  steps: [...]
verification:
  tests: [...]
upgrade_triggers: [...]
```

升级后复用目标、范围、定位和已确认风险；新增的 API、DB、模块、并发或部署阶段仍需完成自身检查。不能承诺完全不重跑。

## 3. 最小实现契约

> 本节被 2026-10-16 定案取代:profile 字段、status 字段、risk 块删除;阶段集合改为"只增不减的 active/skip 覆盖";升级改为 design 唯一检测点 + 人工发起。现行契约见 [workflow-decision.md](workflow-decision.md) 的"状态文件契约"一节。以下为当时的调研记录,保留作对照。

建议工作流状态文件位于 change 目录：`.openspec-workflow.json`。以下为候选示例，不是现有 CLI 支持的协议；示例 ID 需在对应 profile schema 中先定义。

它是 active profile、active artifacts、skip 依据、风险判断和升级历史的唯一事实源。第一版不拆出 `risk-assessment.yaml` 与 `skipped.json`，避免多份状态互相矛盾。

```json
{
  "version": 1,
  "profile": "compact",
  "status": "ACTIVE",
  "active": ["plan", "implement", "verify"],
  "skipped": {
    "api": {
      "reason": "未改变外部接口契约",
      "evidence": ["已检查接口定义"],
      "decidedBy": "planner"
    }
  },
  "risk": {
    "api_changes": {"decision": "no", "evidence": ["已检查接口定义"]}
  },
  "upgrades": []
}
```

契约要求：

- `SKIPPED` 必须有 `reason`、`evidence` 和 `decidedBy`。(定案保留此条,2026-10-16 拍板)
- profile 只能 `compact → standard → full` 升级，不能降级。(已废止,改为阶段集合只增不减)
- 升级必须暂停当前实施，并追加带证据的升级事件。API 契约变化按本文方向升级到 full，不是 standard。(已废止,改为 reopens 语义:被重开阶段的原 COMPLETE 作废,依赖图自然阻塞,无独立 PAUSED 状态)
- 未列入 active 不能自动视为跳过；每个被省略的适用阶段必须有显式记录，并验证下游能获得替代输入。(定案保留,细化为 active ∪ skipped 覆盖校验)
- 文件缺失才走旧行为；文件损坏、未知 ID、重复或冲突阶段、无证据跳过必须报错，不得静默回退。(定案保留)
- 升级必须一起更新阶段集合、依赖、风险和失效产物；只修改 profile 标签不构成升级。(定案保留精神:只加 active 不留 upgrade 事件不构成升级)
- `active` 中的名称必须是当前 schema 的 artifact ID；抽象阶段名不能直接写入状态。(定案保留)
- `status`、`instructions`、`validate`、`archive` 最终必须读取同一份 active state。(定案保留)
- 第一版只提供显式升级 API；不通过代码 diff 自动推断完整语义风险。(定案保留:自动检测只剩 design 一处,其余靠人工发起)

## 实施边界

当前只完成文档。下一步先定 pev schema 演进(删 prd/spec)、替代输入和状态迁移,补 delta specs,再测试先行实现。status/instructions/apply/validate/archive 必须一起通过一致性测试,不发布只有读取链的半成品。条件 DSL、独立 risk-monitor 服务和自动语义 diff 不在第一版内。

## 验收反例

> 反例中的 compact 语境已失效,按定案改写为粗定反例;"design 时才暴露"一条对应唯一自动检测点。

1. 目标清楚但根因未知：先排障，不进 workflow(粗定起草指引同此)。
2. 单模块新增索引：激活 design-db,不因代码少而 skip。
3. 不改 API/DB 的并发或回滚风险：粗定不得 skip 对应控制点,起草指引的不可跳过清单同此。
4. design 中发现响应契约变化：design 检测点提出升级,人确认后追加 design-api(及前置),reopens 重开下游。
5. 状态损坏或缺跳过证据：所有生命周期入口拒绝继续。
6. 无状态文件的旧 change：保持现有完成和归档规则。

这些是待执行的验收场景，不是已经通过的实测结果。粗定的人确认不能代替风险证据;起草指引是提示,不是自动放行器。
