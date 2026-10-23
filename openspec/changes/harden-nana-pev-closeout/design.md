# Nana 完成与交付规则（待批准）

## 范围与权威数据

本设计只修改已安装的 `product-manager` 技能。状态文件、当前有效的计划文件、工作成果文件和证据清单的 JSON 是原始数据；Markdown 文档由这些数据生成，不能手工修改。负责检查内容的 Verifier 仍独立判断 JSON 内容是否正确。本次不恢复 `_pev/`，不修改其他技能、OpenSpec 程序或 Claude 通知机制，也不增加其他技能使用的检查字段。仅靠文字要求生成文档，无法保证每次结果相同，也无法发现文档与原始数据不一致；Nana 自带的程序可以检查这两点。本设计只修改 Nana 从 PASS（通过）走向 COMPLETE（完成）的规则，以及同一轮文件能否覆盖的规则。

## 状态与写入顺序

1. INIT 和常规 PLANNING/EXECUTING/VERIFYING 沿用现有状态机。原子写入 Plan/Artifact JSON 后立即登记文件名，再运行结构校验。REVISE 轮不新建 Plan：使用编号不超过当前轮次的最新已登记 Plan；同轮没有 Plan 不算缺失。写新稿前先分配新轮次；不得覆盖历史轮次（编号小于当前 `iteration`）的 Plan、Artifact、verification 或 Ledger 快照——包括 REVISE/REPLAN 历史与被跨轮复用的旧 Plan，复用不等于可改写；当前轮的覆盖权限与阶段匹配规则见"流程脚本与写入权"。中断且尚未验证的草稿可在当前轮原位重试。
2. 写入 verification JSON 后，检查结构及 verdict 与轮次、输入的绑定。当前轮次的 PASS 只允许在被验证的原始输入上继续收口。渲染、比对和可选的只读校对期间保持 VERIFYING，尚未 COMPLETE。校对只报告问题和证据 ID，不修改 JSON 或 Markdown；仅凭校对 PASS 不能宣布整体 COMPLETE。缺失、非 PASS、轮次不符或过期的 PASS 均不能授权交付。
3. 先在输出目录写临时文件，核对必填数据和重新生成的结果完全一致，再一次性替换最终文件。检查、生成或写入失败时不得发布新文档；已有文档只有与当前数据逐字节一致才能交付。如果请子代理生成或校对文档，必须等它完成、读到详细结果并处理报告中的问题；仅收到“已完成”通知不够。随后运行最终检查程序，确认可以交付，再写入 `status=COMPLETE`，重新检查，最后回复用户。COMPLETE 只改变工作状态，不改变已检查的内容。写 COMPLETE 前中断，就从 VERIFYING 接着核对并生成文档；写完后中断，再交付前仍要核对数据和文档，不把旧文件直接当成成功结果。
4. 如果只是生成文档时出错（映射、模板或生成程序有误），修好程序后用同一份 JSON 重新生成并核对，不改原始内容。如果发现已经通过检查的内容或证据需要修改，先记录发现的问题、修改原因和影响，再新建 REVISE 轮；若 Plan 或证据策略失效则走 REPLAN。原有 PASS 证明的是修改前的文件，不能证明修改后的内容仍正确，所以新轮必须独立、完整检查有效 Plan、Artifact 和 Ledger，之后才能再生成文档；校对结论不能替代这次检查。保留旧验证及来源证据。交付后的用户修订或上游 `prd_gaps` 打回也须新建轮次，不能改写已交付历史。
5. 第 5/5 轮 PASS 可以正常完成。若修正或用户修订需要第 6 轮，保持 `iteration=5`，写入 STOPPED，报告当前最佳结论、关键问题和证据缺口；不得静默重置、复用第 5 轮或宣称 COMPLETE。只有用户明确授权提高 `max_iterations` 并记录授权后，才能由 STOPPED 新建轮次进入 PLANNING。交付后不得自动改写实质内容。

检查程序须接受正常的进行中状态：还没有文件的 INIT、已登记但尚未检查的草稿、已提交但尚未绑定 provenance 的当轮 verification、沿用旧计划的 REVISE、REPLAN、BLOCKED/WAITING_FOR_INPUT，以及正在生成最终文档的 VERIFYING。“文件格式正确”与“现在可以交付”是两回事：只有后者才要求当前轮次确实通过检查，且最终文档与原始数据完全一致。STOPPED 不要求新文档。旧记录的 COMPLETE/PASS 若没有记录当时检查的文件版本，可以通过格式检查，但须明确指出无法证明旧结果仍有效；不得据此直接交付。保留原证据，用户授权新轮次后重新独立检查；已到上限则报告 STOPPED。不能拿现在的文件假装它就是当时检查过的版本。

## 输入绑定与来源证明

派发 Verifier 前，Nana 本地来源记录脚本对三份输入计算 SHA-256：完整当前 Artifact JSON（含 `artifact` 正文、`problem`、`solutions`、`recommendation`、`roi`、`risks` 等全部字段，不用字段白名单）、完整有效 Plan JSON 的内容（不是文件名）、以及验证/渲染实际读取的 state 投影。state 投影按 `state.schema.json` 的顶层路径显式定义。进入摘要：`objective`、`business_context`、`known`、`assumptions`、`evidence`（Ledger）、`metrics`、`hypotheses`、`opportunities`，各自全量参与。排除：`status`、`iteration`、`max_iterations`、`resume_to`、`plans`、`artifacts`（两个登记册）与 `transitions`（追加式转移日志，由脚本维护，见"流程脚本与写入权"），共七个生命周期路径。此后 schema 新增顶层字段默认进入摘要；要把它归入排除集必须修订本设计并重跑正反测试——`transitions` 即按此规则显式归入排除集：若它进入摘要，任何状态转移都会改变 state 投影摘要，使刚绑定的 PASS 在 `complete` 收口时复算失效。

`known` 不做元素级排除，因为它的元素同时承载业务事实与用户裁定，无法按前缀可靠区分。改为禁止流程记录进入：历轮验证结论不写入 state，其权威载体是 `iterations/NN-verification.json`；收口动作（写 COMPLETE、登记文件名、写 `provenance`、状态转移时追加 `transitions`）因此不修改任何进入摘要的字段。这次审计的现场里，主会话曾把"验证史（2026-10-21/22）：…"字符串作为元素追加进 `known`（`state.json` 的 `known` 共 15 个元素，其余 14 条为业务事实），该做法在本设计下被禁止；若再发生，摘要改变，当轮 PASS 失效。

两条不变量据此可测：收口与转移动作本身——追加 `transitions` 条目、写 COMPLETE——不得改变三个摘要（含 state 投影摘要）；任何被验证内容的改动——包括仅改 Ledger、改 `known` 的任何元素、改 `objective` 或任何未逐一列举的字段——必须改变摘要。JSON 采用键排序、UTF-8、紧凑分隔符的规范化序列化。待验证快照的持久化位置是 `iterations/<N>-verification-input.json`（N=当前轮次），由 `record_provenance.py` 在派发 Verifier 前以临时文件+改名原子写入，重跑幂等；字段为 `algorithm`、`iteration`、`plan_path`、`artifact_sha256`、`plan_sha256`、`state_projection_sha256`，受新增的 `schemas/verification-input.schema.json` 约束（`algorithm` 与三个摘要字段与 `provenance` 共用同一定义）。该文件连同被验证产物与有效 Plan 构成交给 Verifier 的有限路径；Verifier 从该文件读取快照标识（`algorithm` 与三个摘要），并在报告中原文复述。收到报告后，`commit.py verification`（A+R5）校验报告复述与快照文件逐字段一致；`record_provenance.py --bind` 再按当前文件重新计算、比对，全部一致才把快照写入当轮 verification JSON 的 `provenance` 字段，否则该 verdict 不可用于交付，必须重新验证。快照文件的同编号原位重写仅限当前轮尚无绑定 PASS 的 verification 时（覆盖 BLOCKED 重评、中断重试）；绑定 PASS 后与历史轮同样只读；该文件不删除，随 `iterations/` 留档。快照已写而 verification 未提交或未绑定时中断：state 仍为 VERIFYING，恢复即重跑 `record_provenance.py`——重算摘要与现有快照一致则幂等续走派发；不一致则输入在派发后变更、原派发作废，当前轮尚无绑定 PASS 时原位重写快照并重新派发，已有绑定 PASS 的轮次按"修订须新建轮次"处理，快照随新轮次编号另写、不改写原文件。摘要由代码计算，`provenance` 与快照文件均由脚本写入，Verifier 与模型不填写或修改；验证报告未复述快照标识的，PASS 不算已绑定。

`provenance` 是 `schemas/verification.schema.json` 新增的**可选**对象字段：`algorithm`（固定算法标识，初版 `sha256-v1`）、`plan_path`（有效 Plan 的相对路径）、`artifact_sha256`、`plan_sha256`、`state_projection_sha256`。`validate.py` 运行时按同一路径规则复算三个摘要并与 `provenance` 及当前文件比对，不一致时报冲突路径、轮次、verdict 与恢复动作。

**未绑定中间态矩阵。** `commit.py verification` 刚写入、`record_provenance.py --bind` 尚未执行的当轮 verification 没有 `provenance`，这是合法中间态：schema 与 R5 不因缺 `provenance` 报错，`validate.py` 结构检查通过（退出 0）并把提示写入返回 JSON 的 `warnings`（"当轮报告未绑定，不可消费 verdict、不可交付"），`next` 不含交付类动作。任意 verdict（REVISE/BLOCKED/PASS）都可处于未绑定中间态；**未绑定 PASS 只能作为中间态存在**，不得触发 `verdict` 转移、不得渲染交付——`transition.py verdict` 与 `complete` 的守卫均要求绑定成功。提交与绑定之间中断的恢复：state 仍为 VERIFYING、快照文件与无 `provenance` 的报告俱在，恢复命令就是重跑 `record_provenance.py --bind`——复算与快照一致即写入 `provenance`（已绑定且一致则退出 0，幂等）；复算不一致则报冲突路径并作废该报告，重新验证。`commit.py verification` 的重跑按覆盖规则处理（当前轮无绑定 PASS 时原位重写）。历史轮（编号小于当前 `iteration`）的 verification 缺 `provenance` 不适用本矩阵，按"旧轮次缺绑定"报错。

最终输出通过确定性重渲染和字节比对绑定，比较时包含选用的模板版本/内容。`status`、`iteration`、`max_iterations`、`resume_to`、`plans`、`artifacts`、`transitions` 七个生命周期路径不进入 state 投影（完整路径规则见上节）。`validate.py` 保持只读：运行时重新计算绑定，失败时以非零退出码报告冲突路径、当前轮次、检查结论和恢复动作。已验证 JSON 即使改动后 Markdown 看似相同，也会失去交付资格。历史验证文件是证据，不是可覆盖的草稿。脚本不能自己发现代理有没有调用过它，也不能阻止代理绕过检查直接回复；本次仅要求流程在回复前调用检查脚本，不声称已实现运行时强制拦截。

## 本地渲染器契约

由有效 Plan 的 `final_deliverable` 选取模板，匹配规则唯一（先去首尾空白，再按顺序判定）：(1) 字符串中出现 `templates/<name>.md` 字面引用，`name` 限 `prd`、`decision`、`product-opportunity`、`plan` 四个——集合外名字与路径穿越直接拒绝；出现的 `name` 恰为一个时选该模板（同一 name 出现多次不影响），出现多个不同 `name` 即歧义拒绝；(2) 无 `templates/` 引用时，整串与别名表精确匹配（大小写敏感、不做子串匹配）：`PRD`→`prd`、`决策文档`→`decision`、`产品机会文档`→`product-opportunity`、`计划文档`→`plan`；(3) 其余一律拒绝，错误信息打印上述合法集合。现有描述性引用（如 `templates/prd.md 渲染的 PRD（渲染到 …/output/）`）经规则 (1) 恰好命中一个 name 而通过。固定输出名为 `prd.md`、`decision.md`、`product-opportunity.md`、`plan.md`。正文取自 `artifact.artifact`，证据行取自 `state.evidence`，计划文档取自有效 Plan。不得从未经验证的说明文字、Artifact 顶层分析块或猜测值补齐。

标量占位符只接受字符串或数字；列表按原始顺序处理，正文列表以换行连接，行内或表格列表以 `; ` 连接。对象须符合下表的显式字段映射。表格单元格转义 `|`、换行和反斜杠；行内字面值转义 Markdown 控制字符；正文保留 JSON 中作者写入的 Markdown。输出统一 UTF-8、LF 和一个末尾换行。可选字段为空时输出空文本或零行，不能编造填充内容；必填字段须存在、类型正确且非空（字符串去除首尾空白后判断，必填数组不能空）。渲染器须拒绝未替换的占位符。检查模式逐字节比较预期输出与已发布文件，识别缺失、过期或手工修改的 Markdown。缺数据或写入失败不能发布部分结果；不得为使渲染成功而修改来源 JSON 或验证记录。

下表未注明前缀的字段均来自 `artifact.artifact`：

| 模板及输出名 | 必填字段 | 可选字段 |
|---|---|---|
| `prd.md` | `title`、`background`、`goal`、`primary_metric`、`solution`、`solution_rationale`、`in_scope`、`out_of_scope`、`launch_plan`、`acceptance`；`user_stories[]` 各项含 `user`、`action`、`value`；`validation_metrics[]` 各项含 `name`、`definition`、`purpose`、`source` | `secondary_metrics`、`guardrail_metrics`、`risks` |
| `decision.md` | `title`、`conclusion`、`confidence`、`recommendation`；`state.evidence[]` 各项含 `claim`、`type`，FACT/INFERENCE 还需 `evidence`；`solutions[]` 各项含 `name`、`benefit`、`benefit_confidence`、`cost`、`risks` | `roi`；证据/方案零行须由 Verifier 判断在语义上是否合理 |
| `product-opportunity.md` | `title`、`goal`、`metric`、`baseline`、`target`、`problem`、`root_cause`、`recommendation`；`opportunities[]` 各项含 `name`、`priority`、`impact`、`evidence_ref`、`confidence`；`state.evidence[]` 各项含 `claim`、`type`、`evidence`、`confidence` | 无；零行须由 Verifier 判断在语义上是否合理 |
| `plan.md` | 有效 Plan 的 `goal`、`understanding`、`known`、`unknown`、`assumptions`、`plan[]`（各项含 `id`、`objective`、`action`、`inputs`、`expected_output`、`success_criteria`）、`final_deliverable`、`stop_conditions` | `known`、`unknown`、`assumptions`、`stop_conditions` 可以为空 |

`decision.md` 的 `roi` 是正文标量，不是顶层 `artifact.roi` 对象；机会文档中的 `baseline`、`target` 也是正文标量，不得暗中改用 `state.objective` 补齐。`state.evidence` 的空证据显示为空单元格，不显示 `null`。现有模板语法为 `{{field}}` 和 `{{#each collection}}...{{/each}}`，不支持嵌套循环。PRD 模板中的括号说明属于模板原文，是否妥当由语义审查判断。证据解释、完整性和一致性由 Verifier/校对者判断；字节可复现性和输入输出一致性由代码检查。最终渲染前先校验 JSON。

**输出发布协议。** 每次渲染只发布一个输出文件（由 `final_deliverable` 选定），不存在多文件部分发布：写临时文件 → 校验临时文件 → 改名替换，改名是唯一落盘动作且原子，此前任何失败都使旧文件原状保留、临时文件清理。发布前检查 `output/` 全目录：存在与当前目标输出不对应的 `.md` 文件（如 REPLAN 更换交付类型后的残留）即拒绝发布并指名文件；清理动作固定为 `render.py --prune`——仅删除 `output/` 内与当前目标不对应的 `.md`，删除前打印清单。`complete` 的字节比对覆盖 `output/` 全部文件，不止目标文件。

## 子代理结果与审批

请子代理帮忙时，只提供它需要读取的文件路径和要检查的问题。要求它返回检查结论、发现的问题、相关证据编号和输出文件路径，不让它把全文重复发回来。记录需要等待哪些子代理；逐个等到详细报告，读取并处理后才能标记 COMPLETE。只有“任务完成”通知却没有详细报告，就继续等待；子代理失败或报告缺失时不能宣布完成。重复通知若没有新问题，不重新开始工作。处理报告后还要检查磁盘文件并重新运行 `validate.py`。这里不承诺能阻止 Claude 再次发送通知。

## 流程脚本与写入权（范围扩展，超出原"PASS 后收口"）

本节把"固定流程脚本化"和"评审前完整性检查"纳入设计。分工：模型负责规划、分析、起草、证据归类和独立质量判断；脚本负责确定性校验、文件管理、状态转移和重复操作；用户负责产品取舍与最终接受。不把质量判断改成规则打分，不新增通用工作流平台——脚本只认识本 skill 的状态机与产物。

**写入权分层。** `pm/` 目录内：`state.json` 的 `status`、`iteration`、`max_iterations`、`resume_to` 与追加式 `transitions` 数组只能由 `init.py` / `transition.py` 写入；`plans` / `artifacts` 两个登记册只能由 `commit.py` 写入（产物与登记同源，避免跨命令的半提交窗口）；八个语义字段（`objective`、`business_context`、`known`、`assumptions`、`evidence`、`metrics`、`hypotheses`、`opportunities`）只能经 `commit.py state-update` 合并写入；`iterations/` 产物经 `commit.py` 落盘（`<N>-verification-input.json` 快照除外，由 `record_provenance.py` 按"输入绑定与来源证明"的规则写入与重写）；`output/` 只能经 `render.py` 发布；`provenance` 只能经 `record_provenance.py` 绑定。模型不再直接编辑上述目标（SKILL.md 执行协议同步此禁令，任务 2.4）。草稿文件路径模型自选，脚本只读。

三个生命周期命令（均为只读输入 + 原子写 + 写后运行 `validate.py`，失败非零退出并给文件/JSON 路径/原因）：

- `init.py --objective <draft.json> --workspace <.pev 所在目录>`（统一命令形式见"模型—脚本交接协议"）：解析目标，创建 `.pev/prd-<日期>[-N]/pm/` 与 `state.json`（`INIT`、`iteration=0`、`max_iterations=5`）；objective 的结构判定与 schema 对齐：仅 `goal` 缺失（字段不存在、为 null 或去首尾空白后为空串，三者等同）时置 `WAITING_FOR_INPUT`+`resume_to="PLANNING"`（对应 SKILL.md 状态机 INIT→WAITING 边）；`target_metric` 缺失与 `baseline` 为 null 是 schema 合法状态（schema 注明"未知为 null"），不阻断 init，仅在输出中提示缺失项。"值存在但不足以开工"的语义判断归 Planner，可走 `need-input` 问用户，init 不做该判断。`--locate` 子命令执行恢复定位（扫描最新含 `pm/state.json` 的轮次，输出目录与状态摘要）。
- `commit.py plan|artifact|verification|state-update <draft.json>`：`plan`/`artifact`/`verification` 按当前 `iteration` 分配编号（编号在进入对应阶段的转移事件中已定，首轮为 `01`）。提交顺序固定：校验草稿 → 写 `iterations/<N>-<type>.json`（临时文件+改名）→ 更新登记册（临时文件+改名）→ 运行 `validate.py`。覆盖权限限定到当前轮：目标编号必须等于当前 `iteration`、该轮不存在绑定 PASS 的 verification、且与当前阶段匹配（plan↔PLANNING、artifact↔EXECUTING、verification↔VERIFYING）；满足时允许同名原位覆盖，仅对应 blocked Artifact 修订、BLOCKED 报告重评、提交中断重试三类场景，与 SKILL.md"同一迭代重写覆盖同名产物、跨迭代文件才构成版本历史"一致，不留副本。目标编号小于当前 `iteration` 的一律拒绝——历史轮只读，包括 REVISE/REPLAN 历史产物和被跨轮复用的旧 Plan，**复用不等于可改写**；大于当前 `iteration` 的编号没有合法产生路径，同样拒绝。`artifact` 为 `status="completed"` 时运行 A+B+C 全检，`replan_required`/`blocked` 只运行 A+R2，不强迫填写交付正文；`verification` 运行 A+R5 并校验报告对快照标识的确认；`state-update` 只接受八个语义路径的补丁，含生命周期字段或登记册即拒绝。
- `transition.py <event>`：执行状态机边。事件总表（对齐 SKILL.md 状态机表的全部边；含 `iteration+1` 的事件先做上限检查，越上限写 STOPPED 并拒绝该转移；非法事件列出当前状态与全部合法事件；每次转移原子写 state.json 并写后校验）：

| 事件 | 状态机边 | iteration | 转移前守卫 |
|---|---|---|---|
| `start-planning` | INIT→PLANNING | +1（0→1，定下首轮编号） | objective 必填齐全；仅 INIT 来源——REPLAN/打回/STOPPED 恢复进入 PLANNING 由各自边的 +1 完成，不调用本事件 |
| `need-input` | PLANNING→WAITING_FOR_INPUT | 不变 | 本轮无已登记 Plan（不写占位 Plan） |
| `plan-validated` | PLANNING→EXECUTING | 不变 | 本轮 Plan 已登记且 validate 通过 |
| `executor-replan` | EXECUTING→PLANNING | +1·上限 | 最新 Artifact `replan_required` 且 R2 通过 |
| `executor-blocked` | EXECUTING→WAITING_FOR_INPUT | 不变 | 最新 Artifact `blocked` 且 R2 通过；写 `resume_to="EXECUTING"` |
| `artifact-validated` | EXECUTING→VERIFYING | 不变 | 最新 Artifact `completed` 且 A/B/C 通过 |
| `verdict` | VERIFYING+REVISE→EXECUTING（+1·上限）/ VERIFYING+REPLAN→PLANNING（+1·上限）/ VERIFYING+BLOCKED→WAITING_FOR_INPUT（`resume_to="VERIFYING"`）/ VERIFYING+PASS→保持 VERIFYING（**不转移**） | 按 | 最新 verification 已提交且 provenance 绑定成功；R5 |
| `complete` | VERIFYING→COMPLETE | 不变 | 本轮 PASS 已绑定；`render.py` 字节比对通过；validate 通过 |
| `resume` | WAITING_FOR_INPUT→`resume_to` 记录的阶段 | 不变 | `resume_to` 存在且合法；无条件清除 `resume_to` |
| `resume --invalidate-plan` | WAITING_FOR_INPUT→PLANNING | +1·上限 | 同上（答复使 Plan 失效的 REPLAN 变体） |
| `reopen` | COMPLETE→PLANNING | +1·上限 | `prd_gaps` 清单在案（requirement-clarify 或用户打回） |
| `authorized-resume` | STOPPED→PLANNING | +1·按新上限 | 用户提额授权已记录 |

`verdict` 的 PASS 分支只做绑定校验并解锁收口，状态留在 VERIFYING——渲染、比对、校对期间保持 VERIFYING 是既有收口规则；COMPLETE 仅由 `complete` 在全部最终检查通过后写入。REVISE 轮 `iteration+1` 后复用既有 Plan（不新建 plan 文件），登记册沿用。

**state-update 补丁格式。** 补丁是单层 JSON 对象，键限于八个语义字段，空补丁拒绝；不是完整 state，不支持嵌套路径或 JSON Pointer，含其他任何键（生命周期字段、登记册）即拒绝。字段语义按 schema 类型固定：`objective`、`business_context`（对象字段）的值为完整对象，整体替换，替换后须过 schema 且 `objective.goal` 非空；`known`、`assumptions`、`metrics`、`hypotheses`、`opportunities`（数组字段）的值为数组，逐条按原顺序**追加**到现有数组末尾，不支持删除或按索引改写；`evidence` 的值为数组，逐条按 Ledger 契约校验后处理——补丁内两条同 `id` 即拒绝；条目 `id` 不在当前 Ledger 中则追加，`id` 已存在则**整条替换**（同 `id` 覆盖，`evidence_ref` 引用保持可解析），不做静默去重；任何情况下不允许删除 Ledger 条目，写错的条目以整条替换更正。提交顺序同其他子命令：校验补丁 → 与 state.json 现值合并 → 原子写（临时文件+改名）→ `validate.py`。

**事件身份与重跑判据。** `transition` 每次成功转移在 `state.transitions` 追加一条记录，与状态变更在**同一次** state.json 原子写中落盘（单文件，无跨文件窗口）：`event`、`from`、`to`、`from_iteration`、`to_iteration`（转移前/转移后轮次各记一字段，+1 事件两者差 1，其余事件两者相等，消除单一 `iteration` 的语义歧义）、`at`、关联产物的内容摘要 `ref_sha256`（`verdict` 记所消费报告的 SHA-256，`plan-validated`/`artifact-validated`/`complete` 记对应产物摘要；无关联产物的事件省略），以及可选 `param`（`resume` 记清除前的 `resume_to` 目标；`resume --invalidate-plan` 记 `"invalidate"`；`authorized-resume` 记新 `max_iterations`；其余事件省略）。**事件身份** = `event` + `from` + `from_iteration`，加 `ref_sha256`、`param`（如有）；无 `ref_sha256` 的事件（`start-planning`、`need-input`、`resume`、`authorized-resume`、`reopen`）以三元组加 `param` 判定，不同轮次的同名事件因 `from_iteration` 不同而是不同事件。重跑同一命令时按三分支判定（输入为当前 state 与命令参数，输出为 已执行/执行/非法；实现为纯函数，不依赖进程内存或任何临时文件）：

1. **已执行**：存在条目与请求的 `event`、`ref_sha256`/`param`（如有）一致，条目 `to_iteration` = 当前 `iteration`（转移已生效，当前轮次即条目的转移后轮次；+1 与非 +1 事件统一适用），且当前 `status` = 该条目的 `to`，且该条目是 `transitions` 的最后一条（其后无任何转移，排除"已执行过又合法重来"的混淆）→ 退出 0，报告当前状态与下一步；不重复转移、不重复 `iteration+1`。`resume` 特例（参数匹配限定）：重跑 `resume` 或 `resume --invalidate-plan` 时，若当前 `status` 已非 `WAITING_FOR_INPUT`，仅当 `transitions` 中存在 `event="resume"` 且 `param` 与本次请求完全一致的历史条目，才判"已恢复"退出 0——`resume_to` 已被清除不是失败；param 不一致（如已执行的是普通 `resume`，又重跑 `resume --invalidate-plan`，两者是不同事件）或无任何 resume 条目时，落入分支 3 按非法处理。
2. **执行**（新事件或首次调用）：不满足已执行，且当前 `status` = 事件表中该事件的源状态。含两种情形：同轮同源旧条目存在但 `ref_sha256` 或 `param` 与请求不同（如 BLOCKED 重评后的新报告、不同目标的 `resume`），是新的执行；同轮无身份匹配（如 `resume` 回 PLANNING 后再次 `need-input`：旧条目因当前 `status` ≠ 其 `to` 且非末条而不判已执行），是首次执行。两种都按守卫正常执行。
3. **非法**：其余情况——当前 `status` 非该事件的源状态，且无已执行命中——非零退出，列出 `transitions` 最近条目，辅助定位中断点。

守卫不依赖临时标记文件：`commit` 成功后盘上文件与登记册一致且 `validate.py` 通过，`transition` 的守卫即"重跑校验 + 查登记 + 查特定条件"。

**提交协议与中断恢复。** `commit` 的多文件写入不是单事务，中断恢复依赖固定顺序与幂等重试：草稿校验 → 产物落盘 → 登记册 → 校验，任一步后中断都收敛于"重跑同一 commit 命令"（落盘与登记册为幂等重写，首尾两步为重验）。`validate.py` R4 报"文件未登记/登记缺文件"时的恢复动作就是重跑对应提交，不得手工改登记册。`transition` 与 `init` 均为单文件原子写（临时文件+改名）；`transition` 的重跑语义见"事件身份与重跑判据"，`init` 在目录已存在且含 `state.json` 时退出 0 报告现状、不重建。旧流程创建的轮次在新校验下报 provenance/要素缺失属预期行为，报错须注明"旧轮次缺绑定，格式或仍有效但不可交付"，不得静默补造。

**模型—脚本交接协议。** 六个脚本（`init`/`commit`/`transition`/`render`/`record_provenance`/`validate`）的 stdout 永远是单行紧凑 JSON，字段：`ok`（bool）、`command`、`pm_root`（本轮 pm 目录绝对路径）、`skill_root`（Nana 安装目录绝对路径）、`status`、`iteration`、`written`（本次真实落盘文件名数组，含 `commit.py` 分配的编号）、`deleted`（本次删除文件名数组，如 `render.py --prune` 的清理结果）、`errors`（每条 `file`+`json_path`+`reason`）、`warnings`（非阻塞提示数组：中间态说明、旧轮次不可交付等）、`next`（结构化对象数组，定义见下段）。退出码 0=成功、1=失败。判定规则：`errors` 非空即 `ok=false` 且退出码 1；仅 `warnings` 时 `ok=true` 且退出码 0，但此类返回的 `next` 不得包含交付类动作（render/complete）——当轮未绑定 PASS、格式通过但不可交付等中间态经 `warnings` 提示、经 `next` 排除交付动作来阻止消费。模型不得自行推断状态和下一步：状态流转依据 `ok` 与 `next`，修复内容依据 `errors`（`file`/`json_path`/`reason`），非阻塞背景读 `warnings`，不依据人读文字判断成败。脚本把全部预期错误与运行时异常（参数解析失败、权限错误、JSON 解码异常、未捕获异常）转换为同一 JSON 结构：`file`/`json_path` 允许为 null，命令级错误固定 `file="$command"`、`json_path=null`；未捕获异常 `reason` 固定为 `internal error: <异常类型>`（不含 traceback、堆栈与安装目录外的绝对路径，调试信息只进 stderr），不向 stdout 输出裸 traceback；stderr 仅用于调试，模型不得据其判断流程。`errors`/`warnings` 的 `reason` 单条上限 500 字符，超出截断并附省略标记。尚不存在或无法解析的字段统一返回 null——`init.py` 创建目录前无 `pm_root`、`--locate` 找不到轮次、参数解析失败、`state.json` 损坏读不出 `status`/`iteration` 等情况——`skill_root` 仍必须返回，命令级错误经 `errors` 表达。

`next` 为结构化对象数组，按序执行——前一项以其返回 JSON 为完成依据，才执行下一项，数组不表示可并行：`{"kind":"command","cwd":"<skill_root>","argv":["scripts/<脚本名>.py","--pm-root","<pm_root 绝对路径>", …子命令与参数]}`——`cwd` 取返回 JSON 的 `skill_root`，`argv[0]` 相对它解析；除 `init.py` 外所有命令第一个参数固定为 `--pm-root` 加本轮 `pm_root` 绝对路径，目标轮次不作为参数，一律由该目录下 `state.json` 推导（`transition.py artifact-validated`、`record_provenance.py --bind` 均如此）；`init.py` 是唯一例外——它创建 pm 目录，形式为 `--objective <草稿绝对路径> --workspace <.pev 所在目录>`（`--locate` 同取 `--workspace`），成功后以返回的 `pm_root` 供后续命令使用；`--prune`、`--bind` 等变体是同形式下的子命令/旗标，无额外位置参数；路径含空格时整条路径作为单个 `argv` 元素传递，不经 shell 拼接、不做引号转义；`{"kind":"draft","target":"plan|artifact|verification|state-update","notes":"…"}`，模型起草后经对应脚本提交；`{"kind":"ask-user","items":["缺什么/为什么重要/怎么获取", …]}`；`{"kind":"dispatch-verifier","snapshot":"…","artifact":"…","plan":"…"}`，三个路径相对 `pm_root`、必填；`{"kind":"stop","reason":"…"}`。`next` 由脚本按事件表、当前 `status`、守卫与最新产物状态推导——例如 `commit.py artifact` 依草稿 `status` 返回 `artifact-validated`/`executor-replan`/`executor-blocked` 之一的转移命令，`record_provenance.py --bind` 成功后返回 `transition verdict`，WAITING 状态返回 `ask-user`，并把 `resume` 与 `resume --invalidate-plan` 两个变体作为候选 command 一并返回——用户答复是否使 Plan 失效是模型判断（设计分工既定），脚本不自动二选一，模型消费用户答复后自行选定。模型不重建状态机、不沿用调用前的旧上下文：编号、`iteration`、`status`、文件路径一律以最近一次返回 JSON 为准。幂等重跑判"已执行/已恢复"时同样返回 `ok=true` 与当前 `next`，不重复转移。

校验调用分工：写入类脚本内部完成写后校验并把结果并入返回 JSON，模型不重复调用 `validate.py`；模型仅在派发 Verifier 前、中断或换会话恢复定位（`init.py --locate` 或直接 `validate.py`）、以及用户要求复查时显式调用（任务 2.4 同步 SKILL.md 时替换现行"每步写盘后即调用"的指令）。脚本内部组合确定步骤（`commit.py` 一次完成落盘+登记+校验），输出保持短 JSON；模型只在语义决策点介入——起草、证据归类、verdict 语义判断、是否问用户。

调用预算：正常完成链路的固定脚本调用为 `init` → `start-planning` → `commit plan` → `plan-validated` → `commit artifact` → `artifact-validated` → `record_provenance` → `commit verification` → `--bind` → `verdict` → `render` → `complete` 共 12 次，另加 `state-update` 按执行需要 1 至数次、Verifier 派发 1 次；这是正常口径，超出即说明存在重复调用或失败重试，模型不得在脚本成功后再显式重跑 `validate.py` 制造重复。失败重试只重跑出错的那个命令，不重放全链；重试与续行以最近一次返回 JSON 为上下文，不重新读取全量文件；详细诊断（逐条错误、冲突路径、恢复动作）只在失败时随 `errors` 输出，成功输出保持短 JSON。统计口径：`--bind` 已单列计入上述 12 次；`render.py --prune` 是 `render` 的参数变体，仅在存在残留输出时追加，不占正常 12 次口径；Verifier 派发是模型对子代理的一次操作，不计入脚本调用预算；`state-update` 无固定上限，预算测试以夹具实际次数统计。

Verifier 回路：`commit.py verification` 失败时报告草稿未落盘，由模型修报告草稿后重跑同一命令，不需重新派发。报告复述的快照标识与快照文件不一致时，先查输入是否在派发后变更：未变则属复述错误，修草稿重提；已变则原派发作废，当前轮无绑定 PASS 时重跑 `record_provenance.py` 原位重写快照并重新派发 Verifier。PASS 提交成功但 `--bind` 复算失败：不得手改 verification 文件；按冲突报告区分——输入未变重跑 `--bind`（幂等）；输入已变时与"输入绑定与来源证明"的恢复规则统一：当前轮尚无绑定 PASS → 作废该报告，重跑 `record_provenance.py` 原位重写快照并重新派发 Verifier；当前轮已有绑定 PASS → 该 PASS 失效，按修订规则新建轮次后重走快照与派发。任何情况下不手改 `iterations/` 已落盘文件绕过提交命令（写入权分层既定）。

state-update 与 Artifact 的失败回路：`state-update` 写入的语义字段不因 Artifact 提交失败回滚——模型修 Artifact 草稿重提、复用已写入的 Ledger，不存在"重交完整 Ledger"（追加制）；Ledger 条目有错以同 `id` 整条替换更正。当前轮绑定 PASS 之前可继续 `state-update`；绑定 PASS 之后任何语义字段改动使该 PASS 失效，按修订规则走新轮。

**边界与不承诺。** 脚本不猜测目标、不编造内容、不判断证据真实性、不自行生成质量 PASS。协议要求全部写入经对应脚本；校验器每次运行检测的是**可观察的不一致**——登记对账（R4）、provenance 复算、渲染字节比对、守卫重验——不一致即拒绝继续并报文件/JSON 路径/原因。模型仍可直接编辑 JSON：脚本无法凭文件内容判断写入者，本设计不承诺阻止绕过。复制旧报告会因 provenance 复算不符而无法绑定，但这检测的是内容不匹配，不是写入者身份。本地脚本无法阻止代理绕过工具直接回复用户——与 proposal 既有外部限制声明一致。

## 评审前完整性检查（A/B/C/D 契约）

- **A 类**（JSON 语法、类型、枚举、required）：现有 `validate.py` 的 schema 子集与 R1–R5，保持不变。
- **B 类**（所选交付模板的必填字段、非空要求、列表项结构）：按有效 Plan 的 `final_deliverable` 解析到支持的模板，必填集以"本地渲染器契约"字段映射表为唯一事实源；非空判定为字符串去首尾空白非空、必填数组非空；列表项结构按表内各项要求（如 `user_stories[]` 各项含 `user`/`action`/`value`）。
- **C 类**（可确定检查的跨字段/跨文件关系）：`final_deliverable` 按"本地渲染器契约"的规范映射可解析；Ledger 契约——每条 `evidence` 必含非空 `id`，格式 `E<正整数>`（如 `E1`、`E36`），`claim` 非空，`type` ∈ {FACT, INFERENCE, HYPOTHESIS, UNKNOWN}，`confidence` ∈ {high, medium, low}，FACT/INFERENCE 须有非空 `evidence` 出处（HYPOTHESIS/UNKNOWN 的 `evidence` 允许缺省或 null）；`id` 全局唯一；`opportunities[].evidence_ref` 及模板证据行引用的 E 编号只能引用 Ledger 现存 `id`；`artifact.status="completed"` 才允许 `artifact-validated` 转移；PASS 的 provenance 复算一致。`schemas/state.schema.json` 的 evidence 条目相应收紧：`required` 增列 `id` 并限定格式 `^E[1-9][0-9]*$`（存量 E1–E36 已符合）。
- **D 类**（证据真实性、因果推理、方案价值、ROI 合理性及语义完整性）：全部保留 Verifier 8 维判断，不改为规则打分。

阻塞规则：A/B/C 任一未通过，`commit.py artifact` 拒绝落盘、`transition.py artifact-validated` 拒绝转移，Verifier 不得派发。校验错误沿用现有格式（文件 + JSON 路径 + 原因），逐条打印。`replan_required`/`blocked` 产物不适用 B 类。用户明确豁免的要素以 Artifact 顶层 `waived_fields` 显式记录：数组，每项三字段全部必填——`field`（模板字段名，即"本地渲染器契约"映射表中出现的字段名，不是 JSON Pointer 或点路径）、`reason`（非空）、`source`（用户确认日期，`YYYY-MM-DD`）；`additionalProperties: false`。豁免粒度为整字段（含整个数组），不支持数组元素级豁免；同一 `field` 出现两次即拒绝。B 类遇豁免跳过该字段的全部检查；渲染按该字段"可选字段为空"的既有规则处理（空文本或零行，不编造填充），不偷偷补写；豁免清单随文件进入 Verifier 输入，Verifier 可在 D 类中挑战豁免本身。`schemas/artifact.schema.json` 相应新增该属性。

## 交接链路与验收场景

标准链路（PRD 场景；每步输入 → 输出 / 允许写入 / 下一步条件）：

1. 模型解析目标，起草 objective → `init.py`：建目录 + `state.json` / 写 state.json / 缺必填则 WAITING，向用户问缺失项。
2. `transition.py start-planning`（INIT→PLANNING，iteration 0→1，首轮编号定为 01）→ 模型（Planner）起草 Plan → `commit.py plan`：落盘 `iterations/01-plan.json` + 登记 + A 类 / 写 iterations 文件与登记册 / 通过后 `transition.py plan-validated` 进入 EXECUTING。REPLAN 回到 PLANNING 时由 verdict/`authorized-resume`/`reopen` 边完成 +1，不再调用 `start-planning`。
3. 模型（Executor）执行，证据结论 → `commit.py state-update`：合并进语义字段 / 写 state.json 语义字段 / Ledger 保持 R1 合法。
4. 模型起草 Artifact → `commit.py artifact`：A+B+C / 写 `iterations/<N>-artifact.json` + 登记 / 通过后 `transition.py artifact-validated`；B/C 失败则模型修草稿重提，或提交 `replan_required`/`blocked` 产物（只查 A+R2）后走 `transition.py executor-replan`（回 PLANNING，+1）/ `executor-blocked`（置 WAITING 等用户补数）。
5. `record_provenance.py`：计算三摘要并原子写 `iterations/<N>-verification-input.json`（规则见"输入绑定与来源证明"）/ 写快照文件 / Verifier 派发前必须完成。
6. 模型 spawn 只读 Verifier（`agents/verifier.md` + 固定文件路径（含快照文件）+ 从中读取的快照标识），不转述推理；Verifier 产出报告草稿。
7. `commit.py verification`（A+R5+快照标识确认）→ `record_provenance.py --bind` 复算一致写 `provenance` / 写当轮 verification JSON / 绑定失败则 verdict 作废重新验证。
8. `transition.py verdict`：按四条边转移并检查上限 / 写 state.json / REVISE 回第 4 步、REPLAN 回第 2 步、BLOCKED 置 WAITING 列缺失项、PASS 进第 9 步。
9. `render.py` 渲染 → 字节比对 → `transition.py complete`（守卫：绑定 + 比对通过）/ 写 `output/` 与 state.json / 模型向用户交付，此后迟到通知不触发重复收口。

验收场景（回放夹具，任务 3.5 固化）：

| 场景 | 预期 |
|---|---|
| 正常完成 | 全链路 9 步只产生一条合法转移序列；交付时 state=COMPLETE、provenance 与文件一致 |
| Artifact 缺必填字段（B 类） | `commit.py artifact` 非零退出，错误含 JSON 路径；Verifier 未被派发；补齐或显式豁免后通过 |
| REVISE | `verdict` 转移 `iteration+1` 回 EXECUTING；同轮不新建 Plan 文件；required_changes 为空时报告本身被 R5 拒绝 |
| BLOCKED 后恢复 | 置 WAITING + `resume_to="VERIFYING"`；用户答复后 `resume` 清除 `resume_to` 回 VERIFYING，`iteration` 不变；答复使 Plan 失效走 REPLAN 边 |
| 5/5 轮 PASS | `complete` 正常执行，不因等于上限而误判 |
| 第 6 轮被要求 | `iteration+1` 越上限 → 写 STOPPED，不执行该转移；恢复仅经 `authorized-resume` 且记录授权 |
| PASS 后内容变更 | 改 Artifact/state 语义字段任一处 → provenance 复算不符 → `complete`/交付资格检查非零，报冲突路径 |
| blocked Artifact 修订 | `executor-blocked` 置 WAITING（`resume_to="EXECUTING"`）；用户补数后 `resume` 回 EXECUTING，iteration 不变；修订后的 completed Artifact 原位覆盖同名文件并重过 A/B/C |
| BLOCKED 报告重评 | `resume` 回 VERIFYING（iteration 不变）；新报告原位覆盖同名 verification 并重新走绑定；重跑 `verdict` 以 `ref_sha256` 区分新旧报告——同内容重复提交判已执行，新内容正常消费；同轮若已存在绑定 PASS 的 verification，一切覆盖提交被拒绝 |
| 提交写入边界中断 | 在草稿校验后、产物落盘后、登记册更新后、写后校验前四个边界分别中断：重跑同一 `commit` 命令收敛；R4 报不一致的恢复动作即重跑提交，不改登记册 |
| 转移成功但未返回 | 模拟 `verdict`(REVISE) 完成状态变更与 `transitions` 追加后、命令返回前中断：重跑按"事件身份与重跑判据"判**已执行**，退出 0，`iteration` 不二次 +1，报告下一步；`resume` 在 `resume_to` 已清除后重跑判已恢复 |
| 历史轮覆盖拒绝 | 对编号小于当前 `iteration` 的任何 plan/artifact/verification 覆盖提交（含被复用旧 Plan、REVISE/REPLAN 前轮记录）→ 拒绝并报只读原因 |
| 转移中断 | 单文件原子写无中间态；中断后按"事件身份与重跑判据"重入；`--locate` 恢复定位 |

不承诺：模拟回放只覆盖 Nana 的磁盘收口逻辑；Claude 通知传输与重复唤醒仍是外部限制（proposal 既有声明）。

实施前须批准本设计（含"流程脚本与写入权"起的范围扩展章节，与原收口范围一并批准；未批准扩展则只实施原收口范围），并单独批准写入工作区外目录。拟修改的 Nana 路径：`SKILL.md`、`agents/verifier.md`（仅在必须调整交接/完整性表述时）、`schemas/verification.schema.json`、`schemas/verification-input.schema.json`（新增，约束 `iterations/<N>-verification-input.json` 快照）、`schemas/artifact.schema.json`（仅新增 `waived_fields`，结构见"评审前完整性检查"）、`schemas/state.schema.json`（新增追加式 `transitions` 属性；evidence 条目 `required` 增列 `id` 并限定格式）、`scripts/validate.py`、`scripts/render.py`、`scripts/record_provenance.py`、`scripts/init.py`、`scripts/commit.py`、`scripts/transition.py`、`tests/test_closeout.py`、`tests/test_render.py`、`tests/test_lifecycle.py`、`tests/fixtures/`（仅最小合成 JSON）。模板默认不修改；如映射测试证明存在纯渲染问题，须就具体的 `templates/*.md` 另行获准。这次 PM 工作的文件不可写。回滚时依据 `verification.md` 的改前哈希，仅撤销已批准的 Nana 本地改动、删除本次新增文件，保留安装目录中的其他改动；重跑原有检查程序并对比哈希。未通过审批关口前不实施。


