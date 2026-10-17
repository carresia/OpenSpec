# pev-dynamic-workflow 变更

## ADDED Requirements

### Requirement: 逐 change 声明激活与跳过的阶段

change 通过 change 目录下的 `.openspec-workflow.json` 逐 change 声明本轮激活(active)与跳过(skipped)的阶段;该文件是激活阶段、跳过依据与升级历史的唯一事实源。`active` 与 `skipped` SHALL 覆盖当前 schema 声明的全部 artifact:遗漏一个、出现未知 ID、跳过第一版不可跳过的 `tasks`、active 工件的某个 `requires` 既不在 active 也不在 skipped、或 `entry.requirement` 指向的文件不存在,SHALL 一律报错,不得自动视为跳过或静默补齐。每个 skipped 条目 SHALL 同时携带 `reason`、`evidence`、`decidedBy` 三个字段。阶段集合只增不减:后续调整只能通过升级事件新增阶段,不得移除。

#### Scenario: 覆盖完整且字段齐全时接受

- **WHEN** 写入的 state 中 active 与 skipped 覆盖 schema 全部 artifact,每个 skipped 条目含 reason、evidence、decidedBy,且 entry.requirement 指向的文件存在
- **THEN** state 被接受,后续生命周期命令按 active 集合推进

#### Scenario: 覆盖不全或未知 ID 报错

- **WHEN** state 遗漏 schema 声明的某个 artifact,或出现 schema 中不存在的 artifact ID
- **THEN** 生命周期入口报错并指明缺失或未知的 ID,不自动视为跳过

#### Scenario: 无证据的 skip 被拒绝

- **WHEN** 某 skipped 条目缺少 reason、evidence、decidedBy 中任一字段
- **THEN** 写入被拒绝,并指明缺失的字段

#### Scenario: 第一版跳过 tasks 被拒绝

- **WHEN** state 将 `tasks` 标记为 skipped
- **THEN** 校验报错,因为 implement 的输入契约依赖任务清单,第一版 tasks 不可跳过

#### Scenario: active 阶段依赖断裂报错

- **WHEN** 某 active 工件的 requires 含既非 active 也非 skipped 的工件
- **THEN** 生命周期入口报错,并指明断裂的依赖边

### Requirement: 粗定 workflow 由人逐条确认后写入

粗定发生在需求澄清与初步项目探索之后:模型按风险触发表起草阶段组合与逐条跳过依据,人逐条确认后,经 CLI 校验写入 workflow state。粗定取代阶段 0 自动分诊:SHALL NOT 在无人确认的情况下自动写入阶段组合,模型草稿不落盘为 state。被跳过的阶段零产出:不生成 state.json、不生成 output、不生成模板指令;跳过依据只记录在 workflow state 中。

#### Scenario: 人逐条确认后写入 state

- **WHEN** 用户逐条确认模型起草的阶段组合与每条跳过依据,且 CLI 校验通过
- **THEN** `.openspec-workflow.json` 按确认结果写入,内容与确认结论一致

#### Scenario: 校验不通过时不落盘

- **WHEN** 起草的阶段组合未通过 CLI 校验(覆盖不全、无证据 skip 等)
- **THEN** 不写入 state,错误指明不满足的条目,待人修订后重新确认

#### Scenario: skip 阶段零产出

- **WHEN** 某 change 带着含 skipped 阶段的 state 推进
- **THEN** 被跳过阶段不产生 state.json、output 与模板指令,跳过依据只存在于 workflow state

### Requirement: design 是唯一自动升级检测点,升级仅由人发起

升级检测只发生在 design 阶段产出之后:对照 active/skip 判定设计是否引入了未激活阶段的风险。design 检测点之后 SHALL NOT 再进行自动检测;模型可以提示疑点,但只有人确认才修改 workflow。升级以事件形式追加(`date`、`reason`、`evidence`、`decidedBy`、`added`、`reopens`、`explore`):`added` 纳入 active;`reopens` 为新增阶段的所有下游 active 阶段,其原 COMPLETE 作废、依赖图重新阻塞、须重跑;`explore` 记录补充探索内容,由新增阶段的技能在其自身流程中消化。缺 `evidence` 或只减不增的升级 SHALL 被拒绝。

#### Scenario: design 检出未激活阶段的风险时暂停提请

- **WHEN** design 产出后的判定发现需要某个未激活阶段(如 API 契约变化需要 design-api)
- **THEN** 流程暂停并提请人确认,不自动修改 workflow state

#### Scenario: 人确认后升级生效并重开下游

- **WHEN** 人确认升级且升级事件字段齐全
- **THEN** added 纳入 active,reopens 列出的阶段原 COMPLETE 作废并重新阻塞,须重跑

#### Scenario: 无证据或只减不增的升级被拒绝

- **WHEN** 升级事件缺 evidence,或试图移除既有阶段而非新增
- **THEN** 升级命令拒绝执行,并指明原因

#### Scenario: design 之后不再自动检测

- **WHEN** design 检测完成且未触发升级,后续阶段出现疑点
- **THEN** 不自动升级;模型仅提示疑点,由人决定是否发起升级

#### Scenario: 升级后的补充探索由新增阶段消化

- **WHEN** 升级事件含 explore 内容
- **THEN** 该内容交给新增阶段的技能在其自身流程中消化,不产生独立探索阶段

### Requirement: SKIPPED 不计 COMPLETE,生命周期命令读同一份 active state

`status`、`instructions`、`apply`、`validate`、`archive` SHALL 读取同一份 workflow state。SKIPPED 工件 SHALL NOT 被任何命令视为 COMPLETE:它不生成模板指令、不计入依赖阻塞、不进入 apply 必需集、不被 validate 判为通过、不被 promotion 记为已验证;不得用"把 skipped ID 放入完成集合"的方式满足下游输入,下游输入由替代输入映射满足。`status` SHALL 展示 active 阶段、各 skipped 阶段的依据与升级历史。

#### Scenario: status 展示激活、跳过与升级历史

- **WHEN** 对带 workflow state 的 change 运行 `openspec status`
- **THEN** 输出包含 active 阶段、每个 skipped 阶段的依据与升级事件列表

#### Scenario: apply 必需集只计算 active 工件

- **WHEN** 计算 apply 必需集时某工件为 SKIPPED
- **THEN** 该工件不出现在必需集中,也不以"视为完成"的方式计入

#### Scenario: SKIPPED 不产生完成信号

- **WHEN** 任一生命周期命令处理 SKIPPED 工件
- **THEN** 它不产生与 COMPLETE 等价的放行效果,下游输入由替代输入映射满足

### Requirement: 无状态文件的 change 走现行为,损坏不回退

不存在 `.openspec-workflow.json` 的 change SHALL 保持现行为,不引入动态阶段语义。state 文件存在但损坏、含未知 ID、覆盖不全、含无证据 skip 或依赖断裂时,所有生命周期入口 SHALL 报错,SHALL NOT 静默回退为无状态行为。旧的 `skip_specs` 机制兼容保留:既有声明照旧生效,新 change 不再写入;workflow skip 与旧 `skip_specs` 在生命周期输出中 SHALL 可区分。

#### Scenario: 旧 change 无状态文件保持现行为

- **WHEN** 对不存在 `.openspec-workflow.json` 的 change 运行 status、instructions、apply、validate、archive
- **THEN** 行为与引入动态 workflow 之前一致

#### Scenario: state 损坏时报错不回退

- **WHEN** `.openspec-workflow.json` 存在但内容损坏或不满足上述任一校验
- **THEN** 每个生命周期入口报错并指明原因,不按无状态文件的旧行为继续

#### Scenario: 旧 skip_specs 机制不受影响

- **WHEN** change 的 `.openspec.yaml` 仍声明 `skip_specs` 且无 workflow state
- **THEN** 既有 `skip_specs` 行为保持不变,且生命周期输出能区分 workflow skip 与旧 `skip_specs`
