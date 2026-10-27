# Proposal: audit-pev-skill-quality

## Why

2026-10-21 已按用户决定撤销 `~/skills/_pev/` 归一化,九个 PEV 技能恢复自包含。`improve-pev-skills/experiment-skill-md-ablation.md` §11 的一次 pilot 中,归一化没有达到预设 token 收益,盲评质量下降,引用文件在重跑时反而被读取 1-2 次。下一步应审查技能内容质量与实际读取路径,而不是再次以抽公共段为目标。pilot N=1,不据此断言所有引用都有害。

另一份关键基线是优化前实际运行的 `/Users/zhengshan/project/mech-unit/mechunit-collectors/.pev/prd-2026-10-08-2` (llm-client-infra)。`improve-pev-skills/proposal.md:17-25` 基于会话记录分析了时长和工具调用;本 change 以该分析为成本线索,以 `.pev` 工件核对产物事实,以现行技能文本核对可能的写作机制。流程阶段选择/引擎改造仍归旧 change;本 change 聚焦技能指令质量。

## What Changes

- 本 change **只记录审计、改进方案和后续验收任务**,不修改 `~/skills/`、`~/.claude/skills/`、OpenSpec 源码或旧 change。以下方案须另行批准后实施。
- 审计九技能的 SKILL.md 指令与交互、validate.py 的可维护性及报错、agents/playbooks/rubrics/references 的按场景读取成本,并比对三份本地 `references/pev-protocol.md` 的共同规则。
- 优先修复可造成误通过或隐式中断的问题;局部收紧措辞和读取路由。保留领域差异和每个技能的自包含部署;不重建 `_pev/`。

## Findings And Proposed Acceptance

严重度按误通过/状态错乱风险(HIGH)、执行歧义或明显维护成本(MEDIUM)、待量测的内容成本(LOW)分级。行号以 2026-10-21 恢复后的 `~/skills/` 正本为准;`~/.claude/skills/` 九项均为指向正本的符号链接。下表的“验收”属于**后续修复**标准,不是本轮已完成事项。

**成本证据口径:**旧 change `proposal.md:19-25` 记录该次工作流九阶段、API 172 分钟/impl 91 分钟/tasks 55 分钟、API 四次评审加一次中断(全量 19 分钟、窄范围 4 分钟),以及 62 次 validate.py、35 次 OpenSpec CLI、20 次 schema 读取、14 次手拼 md、33 次手改 state。该文还指出用量上限等待 181 分钟和入 PEV 前已累积的上下文,不能把全部耗时归因于技能写法。`proposal.md:15` 撤回无可追溯来源的“624K token”;目前**没有可核验的该轮总 token 数**。实际 `.pev/.../api/state.json:2-3` 为 COMPLETE/iteration=1,`api/iterations/01-verification.json:2-4` 为最终 PASS,盘上仅存 `01-*`;四次评审来自旧 change 的会话分析,不是四份留存的 JSON 报告。

**Nana 活跃会话现场(2026-10-22,只读观察):**主会话文件为 `~/.claude/projects/-Users-zhengshan-project-mech-unit-mechunit-collectors/892673c5-1cd6-417a-8cff-557412638027.jsonl`;最近一次可见请求在 `01:41:31Z` 仍未出现对应 assistant 输出。最近已完成的一次请求使用 `cache_read_input_tokens=306496`,仅输出 185 tokens;此前主会话已从约 280K 增至 303K+。活跃 subagent 记录的 cache-read 也从约 70K 增至 109,952 tokens。PM 轮次 `/Users/zhengshan/project/mech-unit/mechunit-collectors/.pev/prd-2026-10-21/pm/` 的 `state.json` 是 `EXECUTING`, `iteration=5`, `max_iterations=5`,仅有 `01-plan.json` 但有 `01..05-artifact.json`;`02-verification.json` 曾 REVISE,`03..05-verification.json` 为 PASS,而最新 05 PASS 后主会话仍继续派发渲染/校对代理。该现场说明上下文膨胀和 PASS 后收口缺口同时存在,但不能仅凭日志把全部等待时间归因于 Nana SKILL.md。

**尾段因果还原:**主会话在 `01:45:25Z` 输出“下一步”并在 `01:45:27Z` 进入 stop hook;之后 `01:50:35Z` 收到同一个 `a5d530fb7eb14469e` 渲染代理的迟到 handback/重复 task-notification,`01:50:55Z` 又生成一段“无新增问题”的补充汇报,至 `01:51:03Z` 才再次结束。因此用户看到的“已经交付却还在运行”主要是异步 handback 竞态,不是 Nana 又进入了 requirement-clarify 或重新审 PRD。该代理的 task-notification 还报告了 `subagent_tokens=119414`/`140316`、`tool_uses=14`/`15`、`duration_ms=725798`/`458083`;这些是 harness 的代理报告指标,不是已核实的主会话总 token。两次代理工作合计约 19.7 分钟墙钟(存在重叠/恢复,不可简单相加为端到端时长),足以解释尾段体感很慢。

### HIGH

| ID | 证据 | 风险与方案 | 后续验收 |
|---|---|---|---|
| H1 | `~/skills/module-design/scripts/validate.py:765-783` 缺失/无法解析红线库时返回 `None`,且无 `redlines` 时直接返回;对照 `~/skills/api-and-interface-design/scripts/validate.py:881-899` 要求逐条处置。 | 红线库不可用或评审缺红线块时可能通过该项检查。改为失败可定位到库路径/JSON 错误,并核对完整红线集合;先确认 module review 与 design 两种模式的预期,不机械移植 API 规则。 | 缺库、坏 JSON、缺红线块、漏一条及正常完整集合各有正反例;前四种不能静默通过,错误显示路径与修复动作。 |
| H2 | `~/skills/behavior-decompose/SKILL.md:81-85,105`, `~/skills/architecture-design/SKILL.md:114-118,133`, `~/skills/module-design/SKILL.md:131-135,154`; `~/skills/database-schema-design/references/pev-protocol.md:70,97-102`。 | PASS 后要求“用户确认”才 COMPLETE,但图中直接 PASS→COMPLETE,WAITING_FOR_INPUT 只解释缺口三选一;这是未声明的确认/暂停点。明确预览后等待、拒绝或修订、恢复以及持久状态;逐技能对照 schema/validator,不能只改文案。 | 每种交互(确认/要求改/无回应)都有确定状态、落盘时机及恢复路径;未确认时不得标 COMPLETE;相关 validator 与场景测试一致。 |
| H3 | `openspec/changes/improve-pev-skills/proposal.md:21,25,44-45`, `design.md:75-94`; `~/skills/api-and-interface-design/SKILL.md:117,151-174`, `agents/verifier.md:74-79,99-101`。 | 真实运行中 API 反复全量评审出现新 critical finding;现行指令只说 REVISE 修受影响契约面,未界定复验范围、旧 finding 处置记录、停止条件与“局部通过”能否支撑整体 PASS。此为有数据支持的**写作质量风险假说**,并非已证明的单一根因;旧 change 的 A4/A5 是候选方案,需和技能文本、会话轨迹对照,防止局部复验漏掉跨契约回归。 | 用该轮会话轨迹重建每次评审的新/旧 finding、实际读入与耗时;先全量再定向复验,对全部旧 finding、回归、Cross 和最终全量判据有可审计记录;同一输入回放不再因已处置 finding 无限全量重评,不以窄范围 PASS 冒充整体 PASS。 |
| H4 | Nana 现场 `pm/state.json` (`status=EXECUTING`, `iteration=5`, `max_iterations=5`, `artifacts=01..05`);`01..05-verification.json` 中 02=REVISE、03-05=PASS`;`~/skills/product-manager/SKILL.md:137-150,163-167`;主会话最新工具序列仍在 05 PASS 后派发“渲染并校对 PRD”代理。 | SKILL.md 把 PASS→渲染→COMPLETE 写成单一路径,但没有定义渲染后的校对是否属于本轮、校对发现问题如何回到 REVISE、校对代理是否能重写已 PASS 的 artifact/output。现场因此在达到 `max_iterations` 后继续工作,状态停在 EXECUTING,用户既看不到明确的 STOPPED/COMPLETE 边界,会话也持续消耗上下文。 | 明确 `PASS` 后唯一允许的收口步骤、校对的输入/输出和发现问题的合法回路;校对不改变已验证 artifact,需要修改时必须新建显式修订轮;`iteration=max_iterations` 时没有合法转移就停止并报告,不得由隐式代理继续。用 Nana 现场回放验证最终状态与产物一致。 |
| H5 | `~/skills/product-manager/scripts/validate.py:149-156` 只约束 PASS/REVISE 的 `required_changes`;没有检查最新 verification 的 verdict 与 `state.status`/`state.iteration` 的转移一致性。`~/skills/product-manager/SKILL.md:56-66,137-146` 要求状态机转移,但运行现场仍为 EXECUTING。 | 校验脚本能对每个 verification 说“格式正确”,却不能阻止 `05-verification=PASS` 与 `state.status=EXECUTING`、`iteration=5` 并存,也不能阻止 PASS 后继续写出未纳入验证链的 output。补充状态-产物闭环检查,错误要指出最新 iteration、verdict、期望状态及需要执行的收口动作。 | 正向夹具覆盖 PASS→COMPLETE、REVISE→EXECUTING/新 iteration、REPLAN、BLOCKED、超过 max_iterations→STOPPED;非法状态组合退出非零并指明冲突;合法中间态不被误拒。 |
| H6 | 主会话 `892673c5...jsonl:01:41:27-01:45:27` 先收到代理 handback/notification,派发恢复修复并最终输出交付;同一 task 在 `01:50:35-01:51:03` 再次 handback/notification,而代理日志 `agent-a5d...jsonl:01:50:01` 才执行第二次 `SubagentHandback`。notification 文本明确写“report was delivered”,但协调者实际在后续 turn 才收到详细报告。 | 异步任务的“完成通知”和“详细 handback”不是一个原子事件。协调者在没有确认 handback 已消费前就宣布 COMPLETE;迟到报告又触发新 turn,造成重复汇报、额外上下文读取和用户误以为流程仍在运行。应把后台任务收口建成一次性 join:先等待并消费最终报告,再跑最终校验、写 COMPLETE、发送最终回复;完成后的迟到通知必须被幂等丢弃或只记日志,不能再次唤醒业务流程。 | 用延迟 handback、重复 notification、代理已完成但报告晚到三种夹具回放;最终回复只能发送一次,之后不再产生业务 API turn/工具调用;任务状态、报告消费标记和主状态机一致,并保留可诊断日志。 |

### MEDIUM

| ID | 证据 | 风险与方案 | 后续验收 |
|---|---|---|---|
| M1 | `~/skills/product-manager/SKILL.md:107,118,144`, `~/skills/requirement-clarify/SKILL.md:113,152`, `~/skills/architecture-design/SKILL.md:129,184`, `~/skills/module-design/SKILL.md:113-116`, `~/skills/api-and-interface-design/SKILL.md:125-139`; `~/skills/requirement-clarify/agents/executor.md:25-33`。 | 多处要求一次问齐或逐问列出,但没明确哪些问题相互依赖、何时停止等待、用户直接回答怎样记录;可能把后置问题提前问。按各技能实际交互定义问题依赖、一次提问边界及用户选择后的恢复,而非强推统一采访模式。 | 对目标/规模/范围缺失及上游缺口各给多问题场景;能复述本轮只问哪些、何时挂起、DECISION 落点与恢复阶段。 |
| M2 | `~/skills/product-manager/scripts/validate.py:51-109`, `~/skills/requirement-clarify/scripts/validate.py:77-135`, `~/skills/behavior-decompose/scripts/validate.py:86-144`, `~/skills/architecture-design/scripts/validate.py:119-177`, `~/skills/module-design/scripts/validate.py:121-179`, `~/skills/api-and-interface-design/scripts/validate.py:133-191`, `~/skills/database-schema-design/scripts/validate.py:140-198`, `~/skills/planning-and-task-breakdown/scripts/validate.py:82-140`, `~/skills/incremental-implementation/scripts/validate.py:85-143`。 | `Errors/check_type/validate/load_json` 九份同构但有差异(例如 UnicodeDecodeError 处理),会独立漂移。先列差异及语义契约,只合并真正同构的代码;若需要复用,优先保持各目录可独立运行,不得重新依赖 `_pev/`。旧审计的 1959 行仅为历史估数,不当成当前精确重复行数。 | 九技能缺文件/坏 JSON/错类型与有效夹具前后 stdout、退出码或经批准的更清晰错误保持等价;独立拷贝技能目录仍可校验。 |
| M3 | `~/skills/module-design/scripts/validate.py:771-772`, `~/skills/architecture-design/scripts/validate.py:793`, `~/skills/api-and-interface-design/scripts/validate.py:876`, `~/skills/database-schema-design/scripts/validate.py:940`; `~/skills/product-manager/scripts/validate.py:66`。 | 缺/坏红线库错误被吞;未知 schema 类型在基础校验中被跳过,报错不能区分输入损坏和规则配置错误。梳理哪些是可选资源,把必需资源与未知类型显式报错,保留 JSON 路径及规则 ID。 | 负例明确指向配置文件和字段,无 traceback 或“OK”;已有合法夹具不被误拒。 |
| M4 | `~/skills/database-schema-design/SKILL.md:58,73,90,106,117`, `~/skills/planning-and-task-breakdown/SKILL.md:57,77,86,102,158`, `~/skills/incremental-implementation/SKILL.md:58,75,84,99,152`; 三份 `references/pev-protocol.md:58-108`(各技能目录内)。 | 关键 Input Gate/状态机/逐阶段表放在约 9.8-10.2 KB 的引用文件,主文件多次指向同一副本;可能增加读取和遗漏成本。将必要决策入口置于 SKILL.md,其余按场景标注何时读,同时保留自包含与领域特有细则;先测再决定是否移动段落。 | 给出九技能按 design/review/audit 场景的文件读取清单与总字节/token/调用次数;关键步骤不读可选背景也可执行,回放质量不低于基线。 |
| M5 | `~/skills/database-schema-design/references/pev-protocol.md:58-70,87-103`, `~/skills/planning-and-task-breakdown/references/pev-protocol.md:58-75,87-106`, `~/skills/incremental-implementation/references/pev-protocol.md:59-77,86-109`。 | 三份共有编号/登记、VERIFIER、PASS/REVISE/REPLAN 骨架,但 R9/R10 是**不同校验语义**(db 的 R9 登记;impl 的 R10 登记),“共同规则”不能按编号同步。建立语义级共同条款对照,标明适用范围与领域例外,审查是否有实际冲突后再决定修订;不要求逐字一致。 | 对照矩阵逐条注明相同/领域差异/冲突、对应 validator 与测试;三份对共同动作不存在相反指令,本地差异不被抹平。 |

### LOW / MEASURE FIRST

| ID | 证据 | 风险与方案 | 后续验收 |
|---|---|---|---|
| L1 | `~/skills/api-and-interface-design/SKILL.md:273-274` 的参考入口、`~/skills/api-and-interface-design/agents/verifier.md:27,109`; `~/skills/behavior-decompose/agents/executor.md:31-35`, `~/skills/planning-and-task-breakdown/agents/executor.md:36-40`, `~/skills/incremental-implementation/playbooks/implement.md:29-30`。 | 角色文件继续引用 rubrics/guides/references;“在索引里”不等于一定读取,但跟读可能叠加。逐边建立必读/条件读/仅查阅标记,对相同场景重复出现的解释只保留有决策作用的版本。 | 逐技能记录引用边与是否实际读取,并在回放中比较调用、token 和质量;无数据不承诺节省百分比。 |
| L2 | `~/skills/product-manager/SKILL.md:186-193`, `~/skills/architecture-design/SKILL.md:204-210`, `~/skills/module-design/SKILL.md:223-227`, `~/skills/api-and-interface-design/SKILL.md:248-253`, `~/skills/database-schema-design/SKILL.md:151-156`, `~/skills/planning-and-task-breakdown/SKILL.md:136-141`, `~/skills/incremental-implementation/SKILL.md:131-136`。 | 路由表与已有 description/playbook 存在重复解释的可能,但多模式技能确实需要路由;只在真实回放显示重复读取/误路由时删减,不要为缩短而删判断规则。 | 单模式与 review/audit 模式各能选对 playbook/template;删减前后质量和读取数据齐备。 |

### Per-Skill Coverage

| Skill | 本轮重点证据与后续检查 |
|---|---|
| product-manager | `SKILL.md:103-118,186-193`;问齐时机、路由读取及 `validate.py:51-109` 基础报错。 |
| requirement-clarify | `SKILL.md:113-125,145-169`;待答/回 PM 的交互恢复与 `agents/executor.md:25-33` 的问法。 |
| behavior-decompose | `SKILL.md:81-105,156-161`;确认点、audit 路由与 `agents/executor.md:31-35` 的 rubrics/guides 跟读。 |
| architecture-design | `SKILL.md:129-146,204-210`;确认点、设计/选型/评审路由及 `scripts/validate.py:787-798` 红线库错误。 |
| module-design | `SKILL.md:113-154`;确认点、目标深度问法及 `scripts/validate.py:765-786` 红线完整性。 |
| api-and-interface-design | `SKILL.md:117,125-139,169-189,273-274`, `agents/verifier.md:74-79`;优先核实历史轮次的复验不收敛(H3),再查规模/深度交互和参考入口,`scripts/validate.py:870-899` 红线库报错。 |
| database-schema-design | `SKILL.md:58-106,168-175`, `references/pev-protocol.md:58-103`;关键步骤引用与确认,`scripts/validate.py:934-945`。 |
| planning-and-task-breakdown | `SKILL.md:57-102,153-158`, `references/pev-protocol.md:58-106`;条件读取与确认,`scripts/validate.py:82-140`。 |
| incremental-implementation | `SKILL.md:58-99,147-152`, `references/pev-protocol.md:59-109`;audit 路由/恢复与确认,`scripts/validate.py:85-143`。 |

## Capabilities

### New Capabilities

None. This change records an audit and a proposed remediation plan; it does not change OpenSpec or skill behavior.

### Modified Capabilities

None. `skip_specs: true` reflects this documentation-only scope; any approved behavior changes require a separate implementation change and applicable contracts.

## Impact

Only `openspec/changes/audit-pev-skill-quality/` gains proposal/task metadata. `~/skills/` is the read-only baseline for this review; `~/.claude/skills/` resolves to that tree. Existing edits in `improve-pev-skills/` and its experiment artifacts remain untouched. The ablation result is directional (single pilot), not proof of a universal token effect.
