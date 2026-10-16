# 动态 Workflow 定案(2026-10-16)

> 本文是 improve-pev-skills 新 workflow 主线的唯一选型与验收依据。
> 研究过程见 [research.md](research.md),概念溯源见 [first-principles-workflow.md](first-principles-workflow.md),技能优化(A/B 组)与实现设计见 [design.md](design.md),任务见 [tasks.md](tasks.md) W 系列。
> 旧内容(三条固定 profile、pev-lite、阶段 0 自动分诊、compact-plan、独立 risk-assessment 文件)全部废止,不再作为并行方案。

## 用户目标

用风险而不是代码量选择 PEV 阶段;记录跳过依据;风险上升时升级;所有生命周期命令使用同一条激活流程。

## 2026-10-16 拍板的四项决策

1. **prd 与 rc 剥离出 workflow**。product-manager(prd)与 requirement-clarify(rc)照常运行,但不再是 workflow 阶段;rc 的澄清产物落在 change 目录,作为外部输入;pev schema 删除 `prd`、`spec` 两个阶段(2026-10-16 拍板)。
2. **未涉及的阶段设为 skip,skip 的阶段零产出**。无 state.json、无 output、无模板指令;跳过依据记录在 workflow state 里,不产出阶段工件。OpenSpec 源码不支持就改源码,PEV 技能不支持就改技能(代价分析见下文)。
3. **粗定 workflow 的时点:需求澄清 + 初步项目探索之后**。模型按风险触发表起草阶段组合,人逐条确认,CLI 校验后写入 workflow state。取代阶段 0 自动分诊。
4. **升级检测只发生在 design 之后**。api/db/modules 的设计都在方案设计之后,且方案设计包含详细代码现状探索,所以 design 是唯一自动检测点;design 产出后没有发现需要升级的,后续阶段不再检测(用户拍板,接受不完善)。design 检测点之后保留**人工发起升级**的口子(2026-10-16 拍板);模型可以提示疑点,只有人确认才改 workflow。

## workflow 形状

```text
[workflow 外]  prd、rc 照常运行;澄清产物(工程 spec)落在 change 目录
[workflow 内]
  W0   初步项目探索 + 粗定 workflow(模型起草,人确认)→ 写 .openspec-workflow.json
  执行  catalog? → specs? → design(含详细代码现状探索)→【升级检测点,唯一一次】
        → modules? → design-api? → design-db? → tasks → implement
        (带 ? 的阶段未涉及即 skip,零产出)
```

阶段菜单 = 演进后的 pev schema:catalog、specs、design、modules、design-api、design-db、tasks、implement 共 8 个 artifact(7 个带 pev 绑定 + specs 直写)。tasks 在第一版不可跳过:implement 的输入契约依赖任务清单,先保住替代输入的确定性,回测后再考虑放开。

## 状态文件契约(候选,实施时定稿)

文件:change 目录下 `.openspec-workflow.json`,是激活阶段、跳过依据、升级历史的唯一事实源。

```json
{
  "version": 1,
  "entry": {
    "requirement": "requirement.md",
    "exploration": "exploration-notes.md"
  },
  "active": ["catalog", "design", "tasks", "implement"],
  "skipped": {
    "modules": {
      "reason": "无模块边界变化",
      "evidence": ["architecture.md 交互表全部为既有进程内调用"],
      "decidedBy": "user"
    }
  },
  "upgrades": []
}
```

- `active` ∪ `skipped` 必须覆盖 schema 全部 artifact;缺一个报错,不自动视为跳过。
- `tasks` 在第一版不可 skip(implement 的输入契约依赖任务清单);skip tasks 视为非法状态,回测后再考虑放开。
- SKIPPED 必须有 `reason`、`evidence`、`decidedBy` 三个字段(2026-10-16 拍板保留 evidence;人的逐条确认是粗定时的依据,证据用于事后单独回看时复原判断链)。
- 阶段集合只增不减;每次新增阶段在 `upgrades` 追加事件:`{date, reason, evidence, decidedBy, added, reopens, explore}`。
- `reopens` = 新增阶段的所有下游 active 阶段(默认 tasks、implement);被重开阶段的原 COMPLETE 作废,依赖图随之重新阻塞,须重跑。
- `explore` = 升级后补充需要探索的内容,由新增阶段的技能在其自身流程中消化(如 api 阶段先探现状接口面)。
- 依赖闭包:active 阶段的每个 `requires` 必须是 active(须完成)或 skipped(由替代输入满足);替代输入的充分性由各技能自身的输入校验把关(映射见下)。
- `entry.requirement` 指向的文件必须存在,缺失报错;`entry.exploration` 可选。
- 无状态文件的旧 change 保持现行为;文件损坏、未知 ID、覆盖不全、无证据 skip、依赖断裂,所有生命周期入口报错,不静默回退。
- `status`、`instructions`、`apply`、`validate`、`archive` 读同一份 active state;把 SKIPPED 当 COMPLETE 视为错误。

替代输入映射(起草指引 + 技能输入契约,实施时逐技能核对):

| 被跳过 | 下游替代输入 | 依据 |
| --- | --- | --- |
| catalog | 澄清 spec(design/specs 的输入) | architecture-design 接受"已批准 Spec"为输入 |
| specs | 无下游 | specs 是终端 artifact |
| modules | design 产物(api/db 的输入) | api/db 技能接受"架构设计直接承接" |
| design-api / design-db | tasks 的 arch_source 取 design 产物 | planning-and-task-breakdown 的必填上游是架构产物 |
| design | tasks 的 arch_source 取澄清 spec 的实施决策段 | B2 后 spec.md 含 Implementation Decisions;需实施时核对 |

## 起草指引(粗定时模型对照,取代阶段 0 自动分诊)

| 风险 | 应激活的控制点 |
| --- | --- |
| 用户可观察行为不清楚 | 先回 rc 澄清,再进 workflow |
| 行为场景较多 | `catalog` |
| OpenSpec 行为契约变化 | `catalog` + `specs` |
| 模块职责、边界或部署关系变化 | `design`、`modules` |
| API、事件、命令或跨模块契约变化 | `design`、`modules`、`design-api` |
| 表、字段、索引或迁移变化 | `design`、`modules`、`design-db` |
| 任何行为变化 | `implement`(tasks 第一版必选) |

以下风险不能仅因"改动很小"而跳过对应控制点:契约变化、数据迁移、权限或安全边界变化、并发/可靠性/部署/回滚风险、根因未确认的 Bug(先排障再进 workflow)。

判据边界说明(源 cospowers `scale-boundary.md`,经 tasks 8.6/8.9 回测核验,粗定时判断 modules/design-api/design-db 是否 skip 用):

- "单模块"以部署与所有权为准,不以代码目录为准;同一服务内部的多个包算单模块,跨服务、跨仓库算多模块。
- "跨模块交互"看契约是否变化:只读调用现有稳定接口、不改其契约的不算;在为扩展设计的登记位(注册表/分发扩点)新增条目属加法式扩展,不算;需要对方改接口、改数据结构或改流程的算。
- "范围小"看设计复杂度,不是代码行数;改动行数少但需要重新论证模块职责边界的,仍激活 design/modules。
- 判据的作用时点是粗定 workflow——彼时无设计产物,只能按需求与代码库现状判,不能按设计期交互表判(实例见 tasks 8.9)。

## 改动代价(2026-10-16 取证)

**OpenSpec 源码**:引擎不支持逐 change 选阶段,必须改。`schema.artifacts` 在 src 有 27 处非测试引用(2026-10-16 复核):schema 自校验 6 处、纯展示/列举 5 处不随 change 状态变化,图构建/任务进度/旧 skip_specs 共 5 处是否接过滤属实施设计判断,行为相关 11 处:`src/core/pev/promotion.ts:71`(归档晋升)、`src/core/validation/validator.ts:192`(校验)、`src/commands/workflow/instructions.ts` 6 处(依赖解析与 apply 必需集)、`src/core/artifact-graph/instruction-loader.ts:523`(formatChangeStatus 的 apply 必需集回退,status 展示走此函数)、`src/utils/change-utils.ts:191`(建轮次目录)、`src/utils/nested-change.ts:93`。轮次名硬编码 `prd-<日期>` 并创建 `pm/` 子目录(`src/utils/change-utils.ts:192,201`),prd 剥离后改中性名并去掉 pm。总量:1 个新状态模块 + 粗定/升级 2 个 CLI 命令(挂现有 `src/commands/workflow/` 命令组)+ 11 处消费点接入 active 过滤 + 失败测试。

**PEV 技能**:skip 的阶段根本不被调用,多数技能零改动。要动三个:behavior-decompose 输入契约(上游改为外部澄清文档)、architecture-design(设计产出增加"workflow 对照与升级判定"节 + verifier 检查项)、requirement-clarify(产物落点改 change 目录)。另加 openspec-propose 的粗定环节指引。

**schema**:直接演进 pev,删 prd/spec,catalog 的 requires 置空;pev-lite 删除(2026-10-16 拍板)。老归档轮次不受影响:晋升只查 schema 当前声明的阶段(`promotion.ts:71` 遍历 schema,不是历史记录)。残留风险:其他仓库进行中的 pev 轮次,其 prd/spec 会从检查集消失。`skip_specs` 读取保留兼容,新 change 不再写。

schema 机制取证(2026-10-16 核实,原 design A6 记录迁移至此):schema 查找顺序为项目内 `openspec/schemas/` → 用户目录 → 内置(`src/core/artifact-graph/resolver.ts:134` 起 `getSchemaDir`);每个 artifact 的模板只能在该 schema 自己的 `templates/` 下解析(`src/core/artifact-graph/instruction-loader.ts:242` `assertPathWithin`);全仓库无对 schema 名字符串 `"pev"` 的比较(grep 零命中,按名分支不存在);doctor 以技能目录下 `scripts/validate.py` 存在性识别 PEV 技能,不看 schema 名(`src/core/pev/skill-registry.ts:21`)。改 schema 时仓库根 `schemas/pev/`(随包发布副本)与项目 `openspec/schemas/` 两处都要动。

## 交付与验收

不打包、不重打 zip、不发同事。原备份包仅用于回滚,不是交付物。

用户指定样本:`/Users/zhengshan/project/mech-unit/mechunit-collectors/.pev/prd-2026-10-08-2`。

已查该轮 `impl/output/implementation-report.md`:它是 **llm-client-infra**,不是评论采集;实现提交为 `2555b06`。旧报告中的测试结果仅是历史记录。

- 正确重放分支:`research/pev-llm-client-replay`。
- worktree:`/private/tmp/mechunit-pev-llm-client-replay`。
- 基线:`5db9cff`,即实现提交的父提交,不包含该实现。
- 原 main 有未提交 benchmark 改动,未动;原 `.pev` 被 Git 忽略,保留为对照。
- 误建的 `/private/tmp/mechunit-pev-workflow-replay` 位于实现提交上,不能作基线,尚未删除。

验收步骤:原始需求加基线代码,先 rc 澄清,再粗定 workflow,人确认流程,重新实施并验证验收、回归、依赖和生命周期一致性。旧实现仅作事后对照,避免照抄答案。分别记录基线失败和重做后失败,不把旧报告的既有失败自动当作本轮豁免。记录遗漏阶段、补跑、返工及实际成本。

另用五类样例回测粗定:根因明确的单模块修复;单模块行为变更;小代码量但有 API 变化;有迁移或跨服务影响;初看简单、design 时才暴露 API 风险的变更(最后一条专测升级检测点)。

目前仅定位样本并创建隔离基线,尚未重新实施或完成回测。新引擎未完成前,人工重放只能验证设计思路,不能证明引擎可用。
