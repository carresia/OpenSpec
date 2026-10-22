# PEV 公共流程(9 个 PEV 技能共用)

本文件是 PEV 家族 9 个技能(product-manager、requirement-clarify、behavior-decompose、
architecture-design、module-design、api-and-interface-design、database-schema-design、
planning-and-task-breakdown、incremental-implementation)共用的流程机械层:
执行架构、状态机公共主链、校验、Verifier 独立性、Evidence Ledger 通用规则。
各技能 SKILL.md 只保留本技能私有内容(上游分流、目标选择、领域门禁、分支特化、
示例)并引用本文件。本文件与各技能 SKILL.md 冲突时,以 SKILL.md 为准。

## 执行架构

PEV(Planner–Executor–Verifier)是各技能采用的**执行架构**,不是技能本身——换掉
这套架构,技能职责不变。它不是三个独立的 Agent,而是一个受状态机约束的执行循环:
Planner(规划)、Executor(执行)、Verifier(验证)是同一技能下的三种执行机制,
共享同一份结构化状态(state.json)。

## 核心不变量(通用三条)

1. **Planner 只产出 Plan(工作计划)**,不产出最终交付物。
2. **Executor 不验收自己的产出**,且只能执行 Planner 批准的工作范围。
3. **Verifier 不直接修改产出**,只输出 verdict(验证结论)与 required_changes
   (必改项清单;设计类技能另带 scores)。

各技能另有私有不变量(溯源铁律、硬门禁等),以各 SKILL.md「核心不变量」节为准。

## 状态机(公共主链)

主链 `INIT → PLANNING → EXECUTING → VERIFYING`,VERIFYING 后按 verdict 分支:

| Verdict | 动作 |
|---|---|
| `PASS` | 按模板渲染最终交付物到 `output/`,用户确认后 `status="COMPLETE"` |
| `REVISE` | Plan 不变。Executor 按 `required_changes` 修订 Artifact;`iteration+1`,回 EXECUTING |
| `REPLAN` | Planner 按 `critical_issues` / `evidence_gaps` 重新规划;`iteration+1`,回 PLANNING |
| `BLOCKED` | `status="WAITING_FOR_INPUT"`,把恢复后应进入的阶段写入 `resume_to`,向用户列缺失项 |

- `COMPLETE` 与 `STOPPED` 是**终点**,到达后状态机不再自动流转。
- Executor 输出 `artifact.status="replan_required"` / `"blocked"` 时走同样的分支:
  `replan_required` 回 PLANNING(`iteration+1`),`blocked` 进 WAITING_FOR_INPUT。
- **WAITING_FOR_INPUT 恢复**:用户答复后,先取 `resume_to` 当前值备用,再**无条件
  清除**——校验脚本 R3 强制:离开 WAITING_FOR_INPUT 时该字段必须不存在。答复不使
  当前 Plan 失效:`status` 置为记下的值,`iteration` 不变,从中断处继续;使 Plan
  失效:按 REPLAN 处理(`iteration+1`,回 PLANNING)。
- **回上游挂起**:用户选「回上游」时不硬续——缺口逐条写入 gaps 字段(字段名见各
  SKILL.md:`upstream_gaps` / `prd_gaps` / `spec_gaps`),`status` 置对应的
  WAITING 态(`WAITING_FOR_UPSTREAM` / `WAITING_FOR_PRD` / `WAITING_FOR_SPEC`),
  挂起等上游更新;上游已更新后回 PLANNING(`iteration+1`),只重做受影响批次。
- **迭代上限**:每次将要执行 `iteration+1` 时先检查,若将超过 `max_iterations`
  (9 个技能 schema 均默认 5)则不执行该转移,置 `STOPPED`,并向用户**明确报告**
  三项:当前最佳结论、未解决的 critical_issues、剩余的 evidence_gaps;不得宣称
  任务完成。STOPPED 不自动恢复:用户明确要求继续时,先提高 `max_iterations`,
  再视同 REPLAN 处理。

各技能的状态机全图(含 Cross 跨项评审、逐模块/逐库/逐契约面跟踪、`prd_gaps` 打回
等私有边)以各 SKILL.md 及其流程细则为准。

## 运行目录(公共规则)

`.pev/` 是 PEV 家族 9 个技能共享的根目录,按需求目标分轮次;每个技能在轮次目录
下的 `<stage>/`(pm / rc / decompose / arch / module / api / db / tasks / impl)
工作。目录树骨架(各 stage 的文件布局)是技能私有的,见各 SKILL.md「运行目录」节。

- 上游**引用不复制**:`state.upstream_source` 记录上游产物路径,
  `state.upstream_kind` 标记类型,溯源与打回都以它为准。
- 轮次跟随上游:上游在 `.pev/` 某轮,本技能就在该轮的 `<stage>/` 工作;上游是
  外部路径且 `.pev/` 无可复用轮次时,跟随其所属轮次或新开 `prd-<今日日期>/`
  (同日同名追加 `-2`、`-3`)。
- 迭代号 `<N>`:进入新一轮 PLANNING(REPLAN、上游已更新)时 `iteration+1`,
  产物用新号,旧迭代文件原样保留;REVISE 轮不改号,修订后的 artifact /
  verification 覆盖同号文件,复用原 Plan(REVISE 轮无 `<N>-plan.json` 是正常的)。
  文件号零填充两位(01、02…)。

## 校验(每步必做)

每步产物写入文件后,先把**文件名**登记进 `state.plans` / `state.artifacts`
(只记文件名,不存内容副本),再运行该技能自带的校验脚本——确定性检查交给脚本,
不要靠肉眼比对:

```bash
python3 <skill 目录>/scripts/validate.py <项目>/.pev/<轮次>/<stage>/
```

`<stage>` 是该技能的工作目录名(pm / rc / decompose / arch / module / api / db /
tasks / impl)。

- 校验失败立即修复,**不得带病流转**。
- 登记册与 `iterations/` 目录双向对账由脚本强制(规则编号各技能不同:pm=R4、
  decompose=R9、rc=R10,其余见各脚本文件头),**登记必须先于校验**,否则新落盘
  文件会被误报为未登记。
- 门禁布尔与 verification 的逐位比对仅当 `state.status` 为 VERIFYING 或 COMPLETE
  时执行(早期阶段尚无评审产物,不做比对)。
- 仅当运行环境无法执行 Python 时,才逐字段人工对照 `schemas/`,并在最终报告里
  注明「未经过脚本校验」。

## Verifier 的独立性

Verifier 的价值来自独立性。两种运行环境按各自能力选择实现方式:

- **有子代理能力(如 Claude Code)**:spawn 一个只读子代理,只给它
  `agents/verifier.md`、本技能的评审 rubric(设计类技能有)与
  `.pev/<轮次>/<stage>/` 相关文件路径(state + 当前迭代 plan/artifact),以及
  上游产物文件;**不要向它转述对话中的推理过程,只传文件**。
- **无子代理能力(如 Codex 单会话)**:切换到 Verifier 角色后,**只从文件重新
  推导**——重读 state.json、当前迭代产物与上游产物,以文件内容为唯一依据,刻意
  不引用 EXECUTING 阶段的推理。文件里没有的内容,视为不存在。

无论哪种方式:verification 产出写入
`.pev/<轮次>/<stage>/iterations/<N>-verification.json`,再运行校验脚本。

## Evidence Ledger(通用规则)

`state.evidence` 是**唯一**的证据账本,Artifact 不重复携带证据。每条记录含
`id` / `claim`(论断)/ `type` / `evidence` / `confidence`,每条 claim 必须标注类型:

- `FACT`:有可指认的证据(上游产物 §x、代码文件、用户确认)。`evidence`
  必须非空,校验脚本强制。
- `DECISION`:用户拍板的决策。`evidence` 填拍板锚点(如 `01-artifact
  decisions#d2`),必须非空,校验脚本强制。(product-manager 的 Ledger 无
  DECISION 类型,以它的 SKILL.md 为准。)
- `INFERENCE`:由 FACT 推出的结论。`evidence` 填推理依据(引用了哪些 FACT /
  数据),必须非空;不写推理依据等同 `HYPOTHESIS`,校验脚本拒绝通过。
- `HYPOTHESIS`:待验证的猜想,尚无证据支撑,`evidence` 为 null。
- `UNKNOWN`:关键且未知,需安排调查。

无证据支撑的结论只能标 `HYPOTHESIS` / `UNKNOWN`。Verifier 以 Ledger 为准做检查:
重要 claim 没有 evidence,就不允许当作事实,并记入 `evidence_gaps`。

各技能的示例(领域不同)与「什么必须浮出拍板(DECISION 候选)/ 什么可自决
(INFERENCE)」清单见各 SKILL.md「Evidence Ledger 规则」节。
