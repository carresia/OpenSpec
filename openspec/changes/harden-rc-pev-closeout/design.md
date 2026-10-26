# requirement-clarify 收口设计（精简版）

## 设计边界

交付物只有 `rc/output/spec.md`。交付资格由当前轮的验证绑定和确定性渲染决定。轮根伴随文件、草稿和其他目标目录不属于交付物，也不参与 COMPLETE 门禁。本 change 不建设共享 runtime、不修改 OpenSpec 运行时、不修改 PM 或其他技能。

## 最小数据契约

保留现有状态机和状态名称。新增或明确的持久化数据只有：

- `iterations/<N>-verification.json`：当前轮实际落盘的验证报告，必须带当前 iteration、verdict 和验证输入标识。
- `iterations/<N>-verification-input.json`：由脚本生成的 Artifact、有效 Plan 和语义输入摘要。快照生成后只读。
- `provenance`：绑定报告与快照、Artifact、Plan 的摘要和算法版本。
- `transitions`：仅用于记录实际发生的完成、reopen、resume 等状态事件。它是审计记录，不单独证明交付正确。

不新增 `SUPERSEDED`、`issue_id`、`companions`、`supersedes`、`waived_fields` 或全局轮次字段。`SKILL.md` 中要求写入 assumptions 的地方改为写入现有 Evidence Ledger。

## 来源绑定

来源快照与绑定复算是 `commit artifact` 与 `commit verification` 的内部步骤，不设独立命令：前者在产物落盘后自动生成只读验证输入快照，后者在验证报告落盘后自动复算绑定。必要语义输入至少包括 `objective`、`prd_source` 和 `evidence`；生命周期字段如 status、iteration、登记册和 transitions 不进入摘要。验证报告必须复述快照标识，提交脚本逐字段核对并复算盘上文件。

以下规则决定交付资格：

- 当前轮没有验证报告、报告 verdict 不是 PASS、报告编号与当前 iteration 不匹配，拒绝交付。
- PASS 绑定后，Artifact、有效 Plan 或必要语义输入被修改，当前 PASS 失效，必须重新验证。
- 历史轮投影随合法 reopen 演进只作提示；不拿当前 state 与全部历史投影逐一比较来阻塞当前交付。已验证文件本体的摘要失配仍拒绝。
- 旧轮可以读取和做结构校验，但缺少有效 provenance 不可交付；不补造绑定、不迁移、不清理。

## 渲染与完成顺序

发布与完成不是模型命令。`commit verification` 收到 `verdict=PASS` 的报告后，在同一命令内按固定顺序自动完成收口：

1. 核对报告编号与当前 iteration 匹配、报告复述的快照标识正确。
2. 复算来源绑定：Artifact、有效 Plan、必要语义输入与快照一致。
3. 从当前有效 Plan、Artifact 和 `prd_source` 确定性渲染，生成临时文件，执行必填字段和占位符检查，原子替换 `output/spec.md`。渲染是 `spec.md` 的唯一发布路径。
4. 重新生成并逐字节比较，发现手改、缺失或来源漂移即整体失败。
5. 检查 iteration 上限。
6. 原子写入 `complete` 事件和状态。

任一步失败，命令整体失败，旧发布文件保持原状。步骤 6 中断后，重跑同一 `commit verification` 命令：已完成的相同事件返回成功且不重复写入，重试只接受同一事件身份，不重复递增 iteration。检查不能要求 transitions 末条预先是 `complete`。transitions 只记录已经写入的事件；其完整性不能替代真实来源和生成结果。

普通 warning 只提示，不移除 `next` 中的交付动作。这里的“普通 warning”只指不改变当前交付资格的情况：例如历史轮投影随合法 reopen 演进、rc 外的无关草稿或伴随文件变化、旧数据可读但当前操作没有尝试交付它们。

以下情况不是普通 warning，而是交付错误：当前轮缺验证报告、verdict 不是 PASS、PASS 编号错轮、绑定的 Artifact/Plan/语义输入发生摘要失配、`spec.md` 缺失或与来源字节不一致。它们必须取消交付动作。这样区分是因为提示信息描述的是可继续处理的背景，交付错误描述的是“当前 Spec 是否由当前有效 PASS 生成”的不变量；把所有 warning 都当作阻塞条件，会让合法 reopen 和无关目录存在时无法继续交付。

## 状态操作与脚本职责

命令面按两条原则收敛：命令只设在模型必须拿主意的地方（宣布成功、只改状态、纯机械产出都不设命令）；一步做完后下一步已确定的，并入同一命令自动做完。岔路一律由模型写进它本来就要提交的文件字段，脚本读字段走对应分支；同一决定不得既写字段又敲命令。

模型可见入口收敛为 `init`、`commit`、`reopen`、`validate` 四类：

| 命令 | 模型拿的主意 | 命令内自动完成 |
|---|---|---|
| `init` | 开新轮、续轮或重启；定位上游 `prd_source` | 建目录与 state.json；`--locate` 只读汇报各轮现状不阻塞；`--restart` 归档 rc.bak 后重建；同目标已有目录时返回现状，不静默覆盖 |
| `commit plan` | 计划内容 | 校验草稿、原子落盘、登记、状态推进到 EXECUTING |
| `commit artifact` | 产物内容；草稿 `status` 字段（completed/replan_required/blocked）即岔路选择 | 校验、落盘、登记；草稿 evidence/decisions 自动并入 Evidence Ledger（取代模型手工双写）；completed 自动生成只读验证输入快照并推进 VERIFYING；replan 推进 PLANNING 且 iteration+1；blocked 置 WAITING_FOR_INPUT 并记录恢复点 |
| `commit verification` | 判定结论；报告 `verdict` 字段（PASS/REVISE/REPLAN/BLOCKED）即岔路选择 | 校验、落盘；PASS 按上文固定顺序自动收口（绑定复算→渲染→校验→上限→完成）；REVISE 推进 EXECUTING 且 iteration+1；REPLAN 推进 PLANNING 且 iteration+1；BLOCKED 置 WAITING_FOR_INPUT 并记录恢复点 |
| `commit state-update` | 用户答复的归类：证据与 DECISION 条目、`invalidate_plan`、`prd_refreshed` 字段即恢复岔路 | 合并补丁并把 answers/decisions 并入当前 Artifact；按字段分叉：invalidate_plan 回 PLANNING 且 iteration+1；prd_refreshed 清 prd_gaps 回 PLANNING 且 iteration+1；否则按恢复点还原状态并清除（恢复到 VERIFYING 时自动重冻结快照） |
| `reopen` | 用户要求重开或修订 | iteration+1，旧 PASS 失去交付资格，事件入账；历史报告不删 |
| `validate` | 无（只读审计，非流程步骤） | 区分结构可读与可交付，输出错误、普通提示和下一步 |

被并入的 `record-provenance`、`render`、`transition`、`complete` 均为零决定步骤，作为脚本内部函数存在，不再暴露给模型。

脚本负责确定性操作。模型负责起草 Plan、Artifact、验证语义、证据归类和处理 Verifier 的问题。模型不得直接编辑 state、登记册、验证绑定或发布的 `spec.md`。

`init` 不检查工作区所有未完成目录，也不要求 PM 状态为 COMPLETE。直接提供的已批准 PRD 可以作为 `prd_source`；只有确实把同轮 PM 作为来源时，才检查该来源是否存在并已就绪。

## 中断恢复与修订

所有写入采用临时文件加原子改名。恢复纪律只有一条：重跑中断的同一命令。已完成的相同事件返回成功且不重复写入；落盘但未登记的提交完成登记；绑定或渲染复算失败则保留旧发布文件并返回错误。接手模型只读磁盘上的 state、登记册、iterations 文件和 `validate` 输出即可定位续跑点，无需推测中间态。

`reopen` 在原 rc 目录递增一次 iteration，并使旧 PASS 不再满足“当前轮 PASS”条件。它不删除历史报告，也不要求清除草稿或伴随文件。追加证据、重新提交验证后，原目录可以再次走 PASS 收口链。

## 兼容性与失败语义

缺报告、错轮报告、REVISE 报告、输入摘要失配、手改 `spec.md`、未绑定旧 COMPLETE 均不可交付。结构检查仍可返回可读和 warning，交付检查必须返回非零。`transitions` 缺失不能被当作真实交付证明，也不能通过伪造最后一条 complete 事件绕过检查。

## 与证据的关系

现场 A1–A4 直接支持报告落盘、来源绑定和确定性渲染；A5 只支持 Verifier 继续检查上一轮问题，不支持 issue 对账门禁；B 类关于悬挂轮、伴随文件和草稿的事实不改变本设计边界。历史证据保留在 `verification.md`，本设计未经过技能代码实测。
