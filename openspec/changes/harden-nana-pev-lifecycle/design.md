# Nana PEV 生命周期规则（待批准）

## 0. 范围、依赖与对 v1 的显式修订

本设计只修改已安装的 `product-manager`（Nana）技能，是 `../harden-nana-pev-closeout/design.md`（下称 v1）的演进，不是重写。v1 的模型—脚本交接协议、事件身份与重跑判据、A/B/C/D 检查分类、产物覆盖规则，除下列显式修订外一律不变。

**先裁决 v1 的一处内部冲突。** v1 design.md:12 写"交付后的用户修订或上游 `prd_gaps` 打回也须新建轮次"，而 v1 design.md:78 的 `reopen` 事件与 SKILL.md:173 定义打回为**同轮**回到 PLANNING（`iteration+1`，"不新开轮次"）。重放证明同轮 reopen 在需要补证据时是死路（proposal P0-1）。本设计定案如下，消除两义：

- **打回（目标不变，内容或证据需要修订）= 同轮 `reopen`。** 本文修复使其真正可行（§1、§2）。
- **目标、范围、优先级或交付目标变更 = 废弃现轮、新建轮次**，经新增的 `supersede` 事件显式执行（§4）。v1:12 的"新建轮次"按此解读。

**本文对 v1 的显式修订清单**（其余不变）：

1. **事件面合并与收口折叠（§1.1）**：`start-planning` 并入 `init`；`plan-validated`/`artifact-validated`/`executor-replan`/`executor-blocked` 并入 `commit plan`/`commit artifact`；`authorized-resume` 并入 `resume --raise-limit`；`record_provenance --bind`、`verdict`、`render`（发布）与 `complete` 折叠进 `commit verification`——程序直接读报告的 `verdict` 字段执行绑定、状态转移与 PASS 分支的渲染收口，不经模型转述。模型可调用的生命周期动词压缩为 §1.1 表中的命令面；状态机的边与守卫全部保留。
2. **P1 权威分级（§2）**：历史报告不再按当前投影复算。
3. **`supersede` 事件与 `SUPERSEDED` 终态（§1、§4）**。
4. **`reopen` 预算守卫（§1.2 规则 2）**：预算尽时在写任何状态前拒绝（新错误码 `E_BUDGET_EXHAUSTED`），不再写 STOPPED。
5. **errors/warnings 条目新增可选 `code` 字段（§8）**。
6. **正常链固定调用从 12 次减为 5 次（§8）**，随事件面合并与收口折叠而来。

**与 `../harden-rc-pev-closeout/` 的协调。** 该 change 的 design 首节规定：Nana 脚本的结构性变更须回到其设计重估后方可开工。本文触发重估的变更为四项：P1 语义拆分（§2）、`supersede` 与 `SUPERSEDED` 终态（§1）、命令面合并与收口折叠（§1.1，commit/init 承担转移与收口写入）、errors/warnings 条目 `code` 字段（§8）。建议顺序：本 change 先实施，rc 按其规则重估后开工（transition.py 的 10-24 注释性漂移已由 rc 侧重锚定为 `b9a4188cc8d3f600`，见其 design.md:19；rc 的 evidence 为整字段替换，P0-1 同型死路会被它原样移植，故本 change 的 P1 拆分应先于 rc 实施落地）。两侧技能正本自 2026-10-26 起同在 `/Users/zhengshan/project/ai/pev-skills/` git 仓库（导入提交 `d1d1a6d`），diff 与提交均可直接在该仓库内进行。

**共享 runtime 的取舍（proposal 目标之外的范围判断，记录结论）。** 维持 v1"不恢复 `_pev/`、不抽取共享脚本"的定案（v1 tasks.md:3）。抽共享的触发条件记为：rc 适配完成且两技能各自稳定一个重放周期后，另开 change 评估。本轮不抽。

## 1. 生命周期状态机

### 1.1 状态与命令总表

正式状态八个，不再增加：

| 状态 | 含义 |
|---|---|
| INIT | 建轮瞬态。本 change 后 `init` 直接写入 PLANNING 或 WAITING_FOR_INPUT，新建轮次不再停留于 INIT；枚举保留以兼容存量轮次（§5.1） |
| PLANNING | 规划中 |
| EXECUTING | 执行中 |
| VERIFYING | 验证中（可含已绑定 PASS，见 §2.3） |
| WAITING_FOR_INPUT | 只表示等待用户输入或外部输入 |
| COMPLETE | 已交付收口 |
| STOPPED | 只表示预算耗尽或明确停止 |
| SUPERSEDED | 只表示旧轮已被新目标替代并冻结 |

命令面与状态机边（`iteration` 列为该命令对轮次编号的作用；"并入"指原 v1 独立事件的边由此命令承担，`transitions` 日志仍按 v1 事件名记录，存量日志可读、重跑判据不变）：

| 命令 | 状态机边 | iteration | 转移前守卫 |
|---|---|---|---|
| `init --objective --workspace`（goal 齐全） | 建轮即 PLANNING（原 `start-planning` 的 INIT→PLANNING 边并入） | 1 | goal 必填齐全（既有判定）；同目标活跃轮幂等返回既有轮（既有） |
| `init`（goal 缺失） | 建轮即 WAITING_FOR_INPUT，`resume_to=PLANNING`（既有边） | 1 | goal 缺失（既有判定） |
| `commit state-update` | 无转移 | 不变 | 八语义路径补丁（既有）；COMPLETE/STOPPED/SUPERSEDED 冻结 |
| `commit plan` | PLANNING→EXECUTING（原 `plan-validated` 并入） | 不变 | 草稿校验+登记+validate 通过即转移 |
| `commit artifact`（status=completed） | EXECUTING→VERIFYING（原 `artifact-validated` 并入） | 不变 | A/B/C 全检通过 |
| `commit artifact`（status=replan_required） | EXECUTING→PLANNING（原 `executor-replan` 并入） | +1·上限 | A+R2 通过 |
| `commit artifact`（status=blocked） | EXECUTING→WAITING_FOR_INPUT，`resume_to=EXECUTING`（原 `executor-blocked` 并入） | 不变 | A+R2 通过 |
| `commit verification` | VERIFYING 内一步完成：落盘 → 自动绑定（复算三摘要一致才写 `provenance`，原 `--bind` 并入）→ 按报告 `verdict` 字段自动转移（PASS 留 VERIFYING 并继续内部收口；REVISE→EXECUTING；REPLAN→PLANNING；BLOCKED→WAITING_FOR_INPUT，`resume_to=VERIFYING`）→ PASS 分支自动 render+validate+写 COMPLETE | REVISE/REPLAN 分支 +1·上限；其余不变 | A+R5+快照复述确认；绑定复算一致；PASS 收口前字节比对与 validate 全过（既有守卫全部内化） |
| `record_provenance` | 无转移（生成验证快照；派发 Verifier 前的"输入冻结"命令） | 不变 | 三摘要计算（既有）；输入变更后当轮无绑定 PASS 时原位重写快照 |
| `need-input` | PLANNING→WAITING_FOR_INPUT，`resume_to=PLANNING` | 不变 | 本轮无已登记 Plan（既有） |
| `resume` | WAITING_FOR_INPUT→`resume_to` 记录的阶段 | 不变 | `resume_to` 存在且合法；清除之（既有） |
| `resume --invalidate-plan` | WAITING_FOR_INPUT→PLANNING | +1·上限 | 答复使 Plan 失效的变体（既有） |
| `resume --raise-limit <N>` | STOPPED→PLANNING（原 `authorized-resume` 并入） | +1·按新上限 | 用户提额授权已记录；N 大于当前上限 |
| `reopen` | COMPLETE→PLANNING | +1 | `--note` 必填；`iteration+1 ≤ max_iterations`，预算尽即拒绝（`E_BUDGET_EXHAUSTED`），不写任何状态 |
| `supersede` | 任何状态→SUPERSEDED | 不变 | `--note` 必填（废弃原因） |
| `render --check` / `--prune`（诊断命令，不进正常链） | 无转移 | 不变 | 字节比对、清理残留输出（既有） |

表后规则：

- `SUPERSEDED` 是唯一不可逆终态：不设任何恢复边（COMPLETE 经 `reopen`、STOPPED 经 `resume --raise-limit` 均可逆；对废弃轮反悔=再开新轮并 `--carry-from` 回携）。`SUPERSEDED` 轮上一切写入命令冻结（`E_FROZEN_STATE`），`supersede` 本身的幂等重跑与只读命令除外。
- `state.schema.json` 的 status 枚举追加 `SUPERSEDED`；`state-update`、`commit`、`transition`（除 supersede 幂等分支）的冻结清单在 COMPLETE/STOPPED 之外加入 SUPERSEDED（state-update 现已冻结 COMPLETE/STOPPED，scripts/commit.py:223-239）。
- 含 `iteration+1` 的转移（`commit artifact` 的 replan_required 分支、`commit verification` 的 REVISE/REPLAN 分支、`resume --invalidate-plan`、`resume --raise-limit`）先做上限检查，越上限写 STOPPED 并拒绝该转移（既有）；此时产物、登记册与报告已按既有覆盖规则落盘留证。唯一例外是 `reopen`——预算尽在写任何状态前拒绝（§1.2 规则 2）。
- 回退边的终点只有 PLANNING 与 EXECUTING 两种，都伴随 `iteration+1`（旧迭代产物只读留档）。普通 `resume` 是从 WAITING_FOR_INPUT 回到被打断的同一阶段（`iteration` 不变），不是回退。PLANNING 没有回退边。
- `transitions` 条目字段不变（event/from/to/from_iteration/to_iteration/at/ref_sha256/param）。`param` 约定：`reopen`/`supersede` 记对象 `{"note": "<用户原话或来源摘录>"}`（reopen 现以 `--note` 字符串记 param，scripts/transition.py:205-210，改为对象格式；旧字符串条目按原样读，不迁移）；`resume` 两变体沿用既有 param 格式。**不设"操作者"字段**：脚本无法核验调用者身份，伪造归属比缺失更糟；归属由 SKILL 协议约定（模型经脚本执行、note 溯源用户原话）。
- 事件身份与三分支重跑判据不变（v1 design.md:85-91）。合并后的 `commit plan`/`commit artifact` 把产物落盘、登记册、状态转移放在同批写入，重跑同一命令按"已执行"分支退出 0；提交**不同内容**的新草稿仍按阶段匹配与覆盖守卫处理（既有规则）。`commit verification` 的重跑按报告与状态的组合分支收敛（§2.3）；`verdict`/`complete` 的转移条目由它写入，event 名与 ref_sha256 记法不变。

### 1.2 用户输入到事件的四条判据

判据只有四条。任何用户输入（打回、补充信息、新目标、迟到通知、重复通知、子代理报告）都先归入其一，再执行对应命令；没有第五条路径。revise 不是用户侧事件：它只是 Verifier 报告的 REVISE 判定，经 `verdict` 命令消费，用户侧没有同名命令。

1. **目标不变，轮次未 COMPLETE：继续当前轮。**
   - PLANNING / EXECUTING：`state-update` 写入补充信息后继续，无需任何事件。
   - VERIFYING 且当轮**尚无绑定 PASS**：`state-update` 写入后，重跑 `record_provenance` 原位重写快照并重新派发 Verifier（绑定复算会拦截建立在旧快照上的报告）。
   - VERIFYING 且当轮**已绑定 PASS**（只出现在 `commit verification` 中断的窗口）：任何语义修改都使旧 PASS 不可收口（复算不符即 P1，§2.2）。合法出口只有两条：内容系误改，恢复原内容使复算一致，重跑 `commit verification` 收口；变更确需保留，同轮报告与快照因绑定只读、无法原地重验，按第 3 条换轮重新验证（`supersede --note` 记录变更原因，继任轮重新走快照与验证）。
   - STOPPED：`resume --raise-limit <N>` 提额续轮（用户授权新上限）；用户明确不再继续该轮时，走第 3 条的换轮机制（`supersede --note` 记录原因）。
   - 重新验证经 `verdict` REVISE/REPLAN 使 iteration 前移时，旧报告自动降为历史（§2.2），新迭代重新生成快照与报告。
2. **目标不变，轮次已 COMPLETE：`reopen`。** `reopen --note` 回 PLANNING，iteration +1，旧 verification 全部降为历史，新迭代重新验证后才能再交付。预算已尽（`iteration+1` 越上限）时 reopen 被拒（`E_BUDGET_EXHAUSTED`），改走第 3 条换轮——这是 5/5 COMPLETE 后再次修改的唯一路径。
3. **目标、范围、优先级或交付物形态改变：换轮。** 先 `supersede` 当前轮（`--note` 记用户原话），再 `init --carry-from` 创建继任轮；禁止继续写旧轮。判据：`objective.goal` 文本变化，或用户明示范围/优先级/交付物形态变更（模型判断）。重放轮 2 的"京东+淘宝且淘宝优先"按此判据属换轮；会话当时先试 reopen，是因为 SKILL.md:173 未给判据。
4. **WAITING_FOR_INPUT：`resume`。** 回到 `resume_to` 记录的阶段，`iteration` 不因普通恢复增加；答复使 Plan 失效时用 `resume --invalidate-plan`（+1）。

**迟到与重复输入不设专门机制。** 是否唤醒会话、通知去重、投递顺序归外层 runner（v1 proposal.md:30 口径不变）；任何输入到达后，Nana 只按当前磁盘状态与上述四条判据处理：终态轮（COMPLETE/STOPPED/SUPERSEDED）上一切写入被冻结守卫拒绝（`E_FROZEN_STATE`，R7）；轮内重复事件由事件身份幂等吸收（三分支，既有）；重提同内容报告判"已执行"退出 0。守卫行为由 R2/R6/R7 与既有幂等测试锚定，不另建通知状态机。

### 1.3 同轮 reopen 的完整剧本（死路解除后的目标行为）

以重放轮 2 为剧本（合成夹具复现，不用真实数据）：COMPLETE(iter3) → 用户打回（目标不变版本）→ `reopen --note`（→PLANNING iter4，旧 01/02/03 报告降级历史）→ `commit plan`（04，提交成功即转入 EXECUTING）→ 执行中 `state-update` 追加 E16–E20 → `record_provenance`（快照含新投影）→ Verifier → `commit verification`（iter4 PASS 绑定**当前**内容；verdict=PASS → 命令内自动 render+validate+写 COMPLETE；validate 口径：iter4 报告为当轮权威、全绿；01/02/03 为历史档，投影不复算、不报错）。全程无一步手工改文件，账本连续（E1–E20 同一轮），收口只敲一条命令。

## 2. 交付权威与 provenance 拆分

### 2.1 现状与缺陷

`validate.py` 对**每份**带 provenance 的报告，用**当前** state 投影复算 `state_projection_sha256`（scripts/validate.py:179-213，投影定义在 scripts/_common.py:16-19）。历史报告存的摘要对应验证当时的投影，而投影没有历史快照，于是轮内任何一次合法语义追加都把此前全部绑定报告染成 P1 错误，且 `complete` 依赖 validate 通过，整轮永久不可收口（proposal P0-1，重放报告 §二 轮 2）。

### 2.2 权威分级（P1 拆分）

validate 内新增纯函数 `report_tier(state, ver)`，对每份绑定报告分两档：

- **当轮权威（tier=authority）**：报告轮次 N == `state.iteration`，不附加 status 条件——VERIFYING 下的当轮报告、COMPLETE 下的收口 PASS、WAITING_FOR_INPUT 下 verdict=BLOCKED 留下的当轮已绑定报告，都属此档（最后一类在用户答复经 state-update 落盘后复算不符属**预期信号**：内容已合法落盘，既有语义"补丁写入不回滚但 P1 拦交付资格"（v1 verification.md:126 同口径），恢复=重走快照与验证）。三个摘要任一复算不符 = **P1 错误**（`P1_PROVENANCE_MISMATCH`），失去交付资格，恢复提示为"恢复原内容使复算一致；否则按 §1.2 判据换轮重新验证"。COMPLETE 状态下的当轮权威即收口 PASS，覆盖 a5d530fb 场景（COMPLETE 后改写 artifact，行为与现状一致，任务 4.2 核验）。
- **历史报告（tier=history）**：N < `state.iteration`。只复算 artifact/plan 摘要，不符 = **P1 错误**（历史文件应不可变——commit 已拒绝覆盖，不符即绕过脚本直接改写）。state 投影**不复算**：投影没有历史快照，按当前投影复算历史报告必然把合法演进误报为错误（即 §2.1 的机理），该检查整体删除，不产生错误也不产生提示。
- N > `state.iteration` 的报告文件：登记册对账（R4）既有口径处理。

**绑定与生命周期状态的关系。** 绑定发生在 `commit verification` 内部、状态为 VERIFYING 时（收口步骤见 §2.3）；当前迭代已绑定 PASS 只说明"该内容已通过验证"，不代表轮次已 COMPLETE。因此"当轮权威"档覆盖 VERIFYING（已绑定、待收口）与 COMPLETE（已收口）两个阶段，同一套复算规则连续生效；本文任何位置不得把"绑定 PASS"写成"已 COMPLETE"，也不得把 VERIFYING 写成"不可能存在绑定 PASS"。

**两个不变量维持**（v1 design.md:19 的测试继续通过）：收口与转移动作本身不改变三个摘要；被验证内容的任何改动必须改变摘要。拆分改变的是**摘要变化之后的处置级别**，不是摘要的计算。

### 2.3 旧 PASS 消费防护与收口折叠

消费路径全量清单（逐条有反例测试）：`commit verification` 内部的 complete 收口分支（仅当轮绑定 PASS）、同命令的 verdict 转移分支（仅当轮最新绑定报告）、`commit.py` 同号覆盖（仅当轮无绑定 PASS，scripts/commit.py:253-262）、`render` 发布（沿内部收口链，前两者守卫已足够）、`validate.py` 交付资格判定（§2.2 分级；complete/verdict 守卫现位于 scripts/transition.py:336-376，实施时随折叠迁入 commit.py）。reopen/supersede 后 iteration 已 +1 或轮已终态，旧 PASS 自动出局。新增反例测试：R6（reopen 后旧 PASS 不可消费）、R7（supersede 后写入冻结）。

**收口链唯一，全部内化在 `commit verification` 一条命令里**：

```text
落盘 → 绑定（复算三摘要）→ 读 verdict 字段 → PASS 分支：render + validate + 写 COMPLETE
```

- 绑定执行时生命周期状态为 VERIFYING——VERIFYING 状态下可以已存在绑定 PASS（仅出现于命令中断的窗口）；
- **绑定 PASS 不等于 COMPLETE**：二者之间隔着 render 字节比对与 validate 两道内部守卫；
- COMPLETE 只由**当前 iteration、当前内容**对应的 PASS 触发；
- PASS 报告落盘后、内部收口完成前内容发生变化（任一摘要改变），重跑时复算不符，收口拒绝（P1）；
- 重新验证必须产生新的有效报告（新快照、新绑定），不能覆盖或继续消费失效 PASS（同号覆盖守卫仅允许"当轮无绑定 PASS"）。

**中断恢复**：命令内部任一步骤后中断，重跑同一命令 `commit verification` 按报告与状态的组合分支收敛——报告未绑定→续走绑定；已绑定未转移→按 verdict 转移；已渲染未 COMPLETE→重比对后收口；已 COMPLETE→"已执行"退出 0。v1 的"未绑定报告中间态矩阵"随之取消（`P3_UNBOUND_CURRENT` 仅适用于存量轮次）。REVISE/REPLAN/BLOCKED 报告不进收口分支，按对应边转移后返回下一步。

**verdict 不再是模型命令**：判定值由 Verifier 写进报告的 `verdict` 字段，程序直接读取执行，不经模型转述——消除了"模型把 verdict 抄进命令"的重复表达。v1 在 render 与 complete 之间允许的可选校对，移到提交前（对 artifact JSON）或 COMPLETE 后（发现问题按 §1.2 规则 2 reopen）。

## 3. 文件所有权与源/派生关系

`pm/` 内文件分类（源/派生、唯一写入者、是否入投影）：

| 文件 | 类别 | 唯一写入者 | 入 provenance 投影 | 生命周期 |
|---|---|---|---|---|
| `pm/state.json` 语义八字段 | 源 | `commit.py state-update` | 是 | 随轮永久 |
| `pm/state.json` 生命周期字段与登记册 | 源 | init / commit / transition | 否（排除集） | 随轮永久 |
| `pm/iterations/<N>-plan/artifact/verification.json` | 源 | `commit.py` | artifact/plan 全文入各自摘要 | 历史只读，永不删除 |
| `pm/iterations/<N>-verification-input.json` | 源（快照） | `record_provenance.py` | 标识入报告复述 | 随轮永久 |
| `pm/output/*.md` | 派生 | `render.py` | 否（字节比对绑定） | 已发布禁手改；`--prune` 清残留 |
| `pm/drafts/**` | 临时 | 模型自选路径，脚本只读 | 否 | 随轮留存；本 change 不设清理机制（§12） |
| 轮外项目文件（如 `open-decisions.md`） | 轮外，非本 change 管辖 | 项目侧 | — | 交付物不得声明其为权威（§6） |
| `rc/`、`decompose/` 子树 | 他技能所有 | 各自技能 | — | 本技能只读 |

跨阶段/跨轮复用规则：REVISE 复用既有 Plan（既有）；跨轮复用旧 Plan = 只读（"复用不等于可改写"）；rc 读 PM 的 `output/prd.md` 属跨技能只读引用（rc 的 `prd_source` 与 `prd-updated` 协议管其感知，本 change 不动）；PM 交付物演进一律经 reopen+re-render 产生新字节，不做原地改写。

## 4. supersede 与换轮

### 4.1 命令面

- `transition.py --pm-root <pm> supersede --note <原因>`：写 SUPERSEDED + transitions 条目（param 对象 `{"note": …}`）。幂等重跑按事件身份三分支（无 ref_sha256，以三元组+param 判定，既有）。**不设 `--successor`**：继任关系由 `init --carry-from` 在继任轮 state 写 `carried_from: "<旧轮名>"` 单向记录，旧轮不回记，查继任轮按 `carried_from` 反查。删除理由：双向记录是纯审计增强，消费与守卫都不读它，且其"补记例外"是幂等判据上的特例。
- `init.py --objective <草稿> --workspace <dir> [--carry-from <旧轮目录名>]`：常规 init 之外，校验旧轮 status ∈ {COMPLETE, STOPPED, SUPERSEDED}（活轮不给携账本——活轮该 resume/reopen），复制旧轮八字段语义投影到新轮初值（evidence 按 id 原样携入，后续更正走同 id 整条替换），新轮 state 写 `carried_from`。`state.schema.json` 新增可选顶层 `carried_from` 并归入投影排除集（生命周期数据；正反测试沿用 v1 投影测试模式）。目标串去重逻辑不变：SUPERSEDED 不在活跃集内（scripts/init.py:46-49），同目标新轮天然放行。

### 4.2 推荐顺序与中断恢复

先 `supersede` 旧轮（冻结、证据保全）→ `init --carry-from`（读终态旧轮）。两个单文件原子操作，各自幂等；中断窗口：supersede 后未 init → 恢复即跑 init（旧轮已终态，合法 carry 源）；init 后中断 → 新轮为普通新建轮，按常规划。SKILL.md 指令同步"换轮前必须 `supersede` 现轮"，换轮中断的清理路径就是 supersede 的幂等重跑。

### 4.3 存量现场边界

历史悬挂轮（如重放的 `prd-2026-10-23`，EXECUTING iter4）与误写进旧轮的 `prd-2026-10-21/rc/` 三个文件属**存量现场**：不由本 change 自动处置，不设清理、迁移或恢复路径，不代删、不代选、不设验收。本 change 只保证修复后的换轮流程先 `supersede` 再 `init --carry-from`（§4.2 顺序），因此不再产生新的未终态悬挂旧轮。对存量悬挂轮保留只读发现：`init --locate` 的悬挂警告（§5.2）。

## 5. 初始化与定位

### 5.1 init 建轮（start-planning 边并入）

`init` 创建轮次时一步完成建轮与进入规划：

- goal 齐全 → 建轮即 **PLANNING、iteration=1**（原 `start-planning` 的 0→1 编号规则由 init 承担）。INIT 不再作为新建轮次的停留状态——删除该停留不损害六个核心目标：全部目标都作用于有产物之后，建轮瞬态无任何守卫依赖；枚举保留以兼容存量轮次。
- goal 缺失 → 建轮即 **WAITING_FOR_INPUT、`resume_to=PLANNING`、iteration=1**（与 goal 齐全分支同编号；消除 v1 中 iter=0 的 WAITING 轮在 plain resume 后无法提交产品的死角——v1 里该路径只能借 `resume --invalidate-plan` 的 +1 脱困）。存量 iter=0 轮次不迁移，其 `resume --invalidate-plan` 路径保留。
- init 不追加 transitions 条目（建轮写入即初值）；同目标活跃轮幂等返回既有轮（既有）；目标轮名位置已有同名目录 → 既有 `-N` 递增。

### 5.2 locate 汇报

`init.py --locate` 在既有"最新轮+状态摘要"之外返回：全部轮次清单（目录名/status/iteration/是否终态）；悬挂轮警告（非终态且非最新活动轮，只读）；**不匹配命名规则的目录**（含 `pm/state.json` 但名字不合 `prd-<date>[-N]`；当前实现 `round_sort_key` 返回 `("", -1)` 使其永不入选 locate 也不被汇报，scripts/init.py:66-71）。规则：不匹配名**不参与**自动选择（保持现状语义，避免 glob 任意序误选——这直接保护"不写错轮"），但**必须出现在汇报清单**；全部不匹配时 locate 明确报"无可自动定位轮次"并列出这些目录，由用户点名。测试固化（R18/R19）。

## 6. 轮外文件与权威让渡

`open-decisions.md` 曾被声明"与 PRD 正文冲突处以该节为准"，交付后仍被编辑且无再验证（重放报告 §三 #10）。2026-10-26 裁决：不引入登记机制——全部证据仅此一例，实测"漂移"是用户裁定的合法累积；真正的缺陷是交付物把权威让渡给了轮外可变文件。

**规则（Verifier D 类检查项 + SKILL.md 指令，无 schema/脚本改动）**：交付物不得声明轮外可变文件为权威。用户裁定若影响交付内容，一律写入已验证的源数据（artifact 正文或 state 语义字段）后随交付物渲染；确需保留独立的裁定过程记录时，在交付物中标注为非权威的过程参考。该规则在验证期即拦住权威让渡声明，早于交付后检测。若未来出现必须以轮外文件为权威的真实场景，凭实例证据另行设计。

## 7. 模板渲染修复（需单独批准）

- **注释剥离**：render 在占位符替换前剥离"整行 HTML 注释"（行首可选空白 + `<!--` 起 `-->` 止、整行仅含注释），半行注释不剥离（保守，避免误删正文）。`templates/prd.md` 5 处填写注释（L5/L10/L21/L33/L37）改写为整行注释包裹或删除（编辑判断：L5/L10/L37 是短提示，删除并移入 SKILL 起草指引；L33 整段说明与 L21 结构提示改为整行注释保留在模板里供起草参考）。字节影响：未 COMPLETE 轮重渲染字节变化属预期；COMPLETE 轮不重渲染，存量已交付稿不动（重放 `-2` 交付稿中的泄漏文本留档不改）。
- **标题重复**：`templates/prd.md:1` 的 `# PRD: {{title}}` 改为 `# {{title}}`（2026-10-26 定案，按设计建议采纳；被否决备选=保留前缀、渲染时去重——启发式改写标题文本违背"正文保留 JSON 原文"）。
- 模板修改按 v1 design.md:152 须单独获批，列入 §13 批准清单。

## 8. 脚本接口、错误码与幂等

- **返回 JSON**：`errors`/`warnings` 条目新增可选 `code`；`next` 推导规则不变。不新增顶层字段。
- **错误码初始集**（新规则必带 code；既有 P2/P3/P4 补码 `P2_NO_PASS_AT_COMPLETE`/`P3_UNBOUND_CURRENT`/`P4_LEGACY_UNBOUND`；其余存量 reason 不回填）：`P1_PROVENANCE_MISMATCH`、`P1_MISSING_INPUT`、`E_FROZEN_STATE`（COMPLETE/STOPPED/SUPERSEDED 上的一切写入）、`E_STAGE_MISMATCH`、`E_HISTORY_READONLY`、`E_NOTE_REQUIRED`（reopen/supersede）、`E_CARRY_SOURCE_ACTIVE`、`E_BUDGET_EXHAUSTED`（reopen 预算尽，新增）。
- **事件幂等**：三分支判据不变（§1.1）；supersede/carry 两步序列各自幂等（§4.2）。
- **调用预算**：正常链固定 **5 次**：`init` → `commit plan` → `commit artifact` → `record_provenance` → `commit verification`（绑定、转移与 PASS 收口在该命令内完成）；`state-update`/`need-input` 按执行需要另计，Verifier 派发不计。这是事件面合并与收口折叠的自然结果（v1 为 12 次）。
- **next 推导相应简化**：`commit plan` 成功后 next=起草 artifact（不再返回转移命令）；`commit artifact` 依草稿 status 直接完成转移并返回对应 next（completed→`record_provenance`；replan_required→重新规划；blocked→`ask-user`）；`commit verification` 依报告 verdict 返回对应 next（PASS→向用户交付；REVISE→重修 artifact；REPLAN→重新规划；BLOCKED→`ask-user`）。`next` 的命令条目携带完整 argv 与 `pm_root`，模型照抄执行——条目只含判断点命令，不再含纯状态转移命令。

## 9. 测试验收矩阵

行为既有覆盖的标 [既有]，新增标 [新]，改造既有测试的标 [既有·改造]。rc COMPLETE 正常路径属 `../harden-rc-pev-closeout/`，不在此矩阵。

| # | 场景 | 预期 | 测试载体 |
|---|---|---|---|
| R1 | PM COMPLETE 正常路径（5 次固定链） | state=COMPLETE、provenance 一致、output 字节比对通过 | [既有·改造] `full_chain_to_complete`、`call_budget_normal_chain`（预算 12→5 断言更新） |
| R2 | PASS 后改 artifact（当轮权威） | P1 错误，complete 拒绝；status=VERIFYING 且 PASS 已绑定、尚未 complete 的窗口同样适用 | [既有] `artifact_modified_after_bound_pass_rejected`、`complete_refuses_after_pass_content_change` |
| R3 | PASS 后改 state 语义字段 | 同 R2 | [既有] `state_semantic_field_changed_after_bound_pass_rejected`、`ledger_only_change_after_bound_pass_blocks_complete` |
| R4 | PASS 后改最终文档 | render --check 报不一致；重渲染恢复 | [既有] `hand_edited_output_replaced_by_rerender` |
| R5 | 缺 verification / verification 非 PASS | 无报告不进收口分支；非 PASS 报告按 verdict 转移、不 render/complete | [既有·改造] `complete_without_any_pass_rejected`、P2 组 |
| R6 | reopen 后旧 PASS 不可消费 | iteration 前移后，旧轮号 PASS 不能触发 verdict/complete/覆盖 | [新] test_lifecycle 扩展 |
| R7 | supersede 后写入冻结 | 一切写入 `E_FROZEN_STATE`；幂等重跑退出 0 | [新] test_lifecycle 扩展 |
| R8 | reopen 死路解除（重放轮 2 剧本） | reopen+补证据+新迭代全链到 COMPLETE；历史报告投影不复算、不报错 | [新] test_lifecycle 扩展（本 change 核心验收） |
| R9 | REVISE 中途追加证据（非 reopen 场景） | 同 R8 语义：历史降级、当轮权威 | [新] test_closeout 扩展 |
| R10 | provenance 复算不符（权威） | P1 + code | [既有] P1 组 + code 断言 |
| R11 | 截断 JSON / 空 completed artifact | 拒绝 | [既有] `truncated_json_reported`、`empty_completed_artifact_rejected` |
| R12 | INIT/EXECUTING/REVISE/VERIFYING 合法中间态（含未绑定报告矩阵） | 通过 | [既有] `init_state_without_any_artifact_passes` 等 |
| R13 | 5/5 PASS 完成 / 超上限 | 正常 complete / STOPPED；恢复经 `resume --raise-limit` | [既有·改造] `complete_55_passes`、`upper_limit_writes_stopped_and_authorized_resume`（改造为 --raise-limit） |
| R14 | revise（报告 verdict=REVISE）复用 Plan、required_changes 语义 | `commit verification` 的 REVISE 分支自动 +1 回 EXECUTING；同轮不新建 Plan 文件 | [既有·改造] `revise_reuses_plan_no_new_plan_file`、R5 组 |
| R15 | reopen（COMPLETE→PLANNING+1） | param 对象化；历史报告降级；预算尽拒绝（`E_BUDGET_EXHAUSTED`，状态保持 COMPLETE） | [新]（R8 剧本内 + 预算反例） |
| R16 | resume（WAITING 恢复、invalidate 与 raise-limit 变体） | 既有语义；STOPPED 恢复经 --raise-limit 且 param 记新上限 | [既有·改造] `resume_rerun_after_resume_to_cleared`、`invalidating_resume_goes_replan` |
| R17 | 同目标新轮 | 终态轮后 init 放行；活轮幂等返回（既有）；SUPERSEDED 轮 carry-from 携账本、`carried_from` 记录、证据 id 保留 | [既有] `init_same_goal_terminal_round_starts_new_seq` + [新] carry 组 |
| R18 | 存量悬挂轮只读发现 | locate 对非终态非最新活动轮输出警告清单；不自动处置（§4.3 存量现场口径） | [新] |
| R19 | 改名轮 locate | 不参与自动选择；出现在汇报清单；全部不匹配时明确报告 | [新] |
| R26 | 模板注释剥离 / 标题 | 渲染稿无填写注释；标题不重复；未完结轮重渲染字节变化为预期 | [新] test_render 扩展 |
| R28 | 旧轮次副本口径 | `prd-2026-10-21/pm` 只读副本：收口 PASS 漂移仍 P1；`prd-2026-10-23/pm` 副本：历史报告不报错、悬挂警告 | [新]（任务 4.2，只读核验） |
| R29 | 事件面合并 | init 建轮即 PLANNING/WAITING（iteration=1，含 goal 缺失分支）；commit plan 成功即 EXECUTING；commit artifact 三分支转移齐备；合并后重跑按三分支幂等；EXECUTING 下重提不同 plan 草稿按阶段不匹配拒绝 | [新] test_lifecycle 扩展 |
| R30 | 收口折叠 | `commit verification` 一步完成绑定/转移/PASS 收口；verdict 从报告字段读取、不经命令参数；从"报告已落盘未绑定 / 已绑定未转移 / 已渲染未 COMPLETE"三个内部边界中断后重跑同一命令收敛；PASS 后内容变化（中断窗口）重跑被 P1 拒绝 | [新] test_lifecycle 扩展 |

（R20/R21 随问题生命周期裁撤、R22 随通知夹具裁撤、R23 已随伴随文档登记裁撤、R24/R25 随 sweep 与登记哈希裁撤、R27 随 metrics 裁撤；编号保留不复用，见 §12。）

## 10. 错误恢复与失败现场

| 操作 | 中断窗口 | 恢复 |
|---|---|---|
| supersede | 单文件原子写，写后未返回 | 事件身份三分支判已执行（既有机制） |
| init --carry-from | supersede 后未 init / init 半途 | 分别=跑 init / init 幂等报告现状（既有） |
| commit（合并转移后） | 产物落盘后、转移写入前中断 | 重跑同一 commit 命令，按事件身份三分支收敛 |
| commit verification（折叠后） | 内部任一步骤后中断 | 重跑同一命令，按报告与状态组合分支收敛（§2.3） |
| render（注释剥离后） | 无新窗口 | 既有发布协议不变 |

失败现场保留：supersede 不删文件（§4）；render 失败保旧文件（既有发布协议）；测试夹具全部合成生成，不复制 mechunit 真实产物。

## 11. 旧数据迁移策略

不迁移、不改写、不补造。行为变化两处：历史绑定报告的 state 投影从 P1 错误改为不复算；新建轮次不再停留 INIT、建轮即 iteration=1。两份真实只读副本的预期口径（任务 4.2 核验，不复制进 git）：`mechunit-collectors/.pev/prd-2026-10-21/pm/`（收口 PASS 的 artifact 已被改写、status=COMPLETE）——收口 PASS 仍是当轮权威，P1 错误不变；`.pev/prd-2026-10-23/pm/`（悬挂 EXECUTING iter4、三份历史报告被 E16–E20 染红）——三份转历史档后不报错，validate 结构通过，locate 报悬挂警告；该轮属存量现场（§4.3）。

## 12. 明确排除的替代方案与未来候选

- **5/5 交付后再修改经 `reopen` + 提额回同轮**：v1 机制上可行（reopen 的 +1 越上限先转 STOPPED，再经提额恢复回 PLANNING），但绕过换轮的账本携续与审计口径，且"提额"的既有语义属轮内越上限（未交付）的恢复。本设计以 reopen 预算守卫（`E_BUDGET_EXHAUSTED`）结构性关闭该路径：COMPLETE 且预算尽的再次修改，唯一路径为 `supersede` + `init --carry-from`（§1.2 规则 2/3）。2026-10-26 定案。
- **收口链拆为四条模型命令（v1 形态：`--bind`/`verdict`/`render`/`complete` 各自调用）**：四步之间没有任何模型判断，拆开只制造中断窗口与"未绑定报告"中间态，且 verdict 值要模型从报告抄进命令（同一决定表达两次）。2026-10-26 定案折叠进 `commit verification`，判定值由程序从报告字段直接读取。
- **工作区卫生（sweep/attic/manifest 清理链）**：只改善目录卫生，不保护六个核心目标中的任何一个；散件、空目录与 drafts 留存不动，需要时由用户手工处置。对应 sweep.py、test_sweep.py 与 R24 一并裁撤。
- **verifier 问题生命周期（issues 数组、digest 接力、收敛升级建议）**：改善审计展示与问题追溯，不直接影响交付正确性；Verifier 盲区接力未来凭真实实例另立项。对应 R20/R21。
- **度量工具（metrics.py）**：统计口径问题，非正确性；需要时另开 change。对应 R27。
- **登记哈希（state.hashes、P6）**：评估结论=不必要。历史文件的直接改写已由两道既有防线拦截：历史档 artifact/plan 摘要复算不符即 P1（§2.2）、commit 覆盖守卫拒绝历史编号（scripts/commit.py:253-262 既有）。登记哈希是重复防线，且引入投影排除集修订、旧轮回填口径两组新复杂度。对应 R25。
- **通知七场景夹具（test_notifications.py）**：迟到/重复输入不需要专用状态机——终态冻结（R7）、事件身份幂等、消费守卫已全覆盖（§1.2 末段）。2026-10-23"单独测试"拍板由本次简化废止；守卫行为由 R2/R6/R7 与既有幂等测试锚定。对应 R22。
- **渲染溯源头**（输出文档头部注记来源哈希）：会改变全部输出字节，推迟（重放会话提出后未追踪，同日志 L587）。
- **增量验证三段式**（delta manifest+未变更区抽样+全量 validate）：收益前提是大型 artifact 的复验成本成为实测瓶颈，现阶段无数据，推迟（同日志 L1215）。
- **多会话并发写锁**：v1 既定延期，维持。
- **decompose 同型改造**：rc 之后另行立项。
- **共享 runtime 抽取**：§0 已述触发条件。

## 13. 实施前置

批准清单（一次批准=proposal+本 design 主体；模板修改单列）：

1. 本 design 全文（含 §1.1 事件面合并与收口折叠、§1.2 四条判据、§2 P1 拆分）。
2. 【单列批准】`templates/prd.md` 的注释剥离改写与标题调整（§7；v1 design.md:152 既有要求）。
3. 实施期间写入 `/Users/zhengshan/project/ai/pev-skills/product-manager/` 的授权（pev-skills 仓库在 OpenSpec 工作区之外；全部实施改动以该仓库的 git 提交追踪，建议每任务一提交、提交信息引用任务号）。

拟触碰文件清单见 proposal"影响范围"。回滚：verification.md 记录改前 SHA-256，撤销本 change 改动、删除新增测试与夹具，重跑存量测试比对。schema 新增（`SUPERSEDED` 枚举、`carried_from` 字段）对旧版脚本无害（未知字段忽略）。

原决策项 D-1～D-5 已全部定案并嵌入正文（5/5 唯一路径 §1.2/§12、伴随文档裁撤 §6、标题模板 §7、存量现场 §4.3），决策表不再单列。无待拍板项；实施前仅剩上述三个批准关口。
