# 提案：加固 Nana PEV 生命周期（reopen、轮次退出与命令面压缩）

## 背景

`../harden-nana-pev-closeout/`（下称 v1）给 product-manager（Nana）落地了七个脚本（init/commit/transition/record_provenance/render/validate/_common，2026-10-23 14:05–15:47 落地，OpenSpec 提交 `e8e5f25`）与 106 个单元测试。2026-10-23 晚间的 9 轮真人消息重放实验对它做了端到端检验，报告在 `mechunit-collectors` 仓库 `.pev/prd-replay-2026-10-23/replay-report/comparison.md`（下称重放报告）。重放证明 PM 链的核心收口保证成立：provenance 三摘要绑定、PASS 失效即拒付、收口全程脚本化、交付后产物零改动（重放报告 §三 #1/2/5/6/7 及 #3/4/8/10/11 的 PM 部分，§五）。

但同一次重放也暴露了 v1 设计自身的缺口，都发生在**合法流程**上，不是绕过攻击：同轮补充证据后整轮永远无法再 COMPLETE（P0-1）；轮次没有废弃出口，留下悬挂 EXECUTING 轮（P0-2）；模型要在 13 个 transition 子命令里选择阶段推进事件，存在忘跑与错跑窗口（commit.py:212 的错误提示即在兜底此情况）。本提案处理 P0-1/P0-2/P0-3 与 P1-7/P1-8，并借此把命令面压缩到最小集合（2026-10-26 Occam 简化定案：问题追踪、通知夹具、工作区卫生、度量工具、登记哈希全部移出范围，见"非目标"与 design §12）。requirement-clarify 的同型改造由 `../harden-rc-pev-closeout/` 承担，不在本提案范围。

证据分三类，全文遵守：一类是重放报告或会话日志直接证明的事实；二类是从代码与产物推断的设计问题（标注"推断"并给出代码定位）；三类是重放方式造成的、不能归因于 Nana 的实验限制（见"非问题与实验限制"）。

## 已证实问题

以下每条给当前行为、证据定位、后果。时刻未注明者以重放报告所记 UTC 为准。

**P0-1（核心）语义演进使全部历史绑定验证永久失效，同轮再也无法收口。** 重放轮 2：用户打回范围界定后，会话按 SKILL.md:173 运行 `transition.py reopen`（12:09:01，COMPLETE→PLANNING iter4），再经 `commit.py state-update` 追加 E16–E20（12:11:13）；此后 validate 的 P1 在 01/02/03 三份历史绑定验证报告上全部触发，原地路径无法回绿（重放报告 §二 轮 2，证据在 `validation-output.json`）。机制在代码里：`validate.py` 的 `recompute_provenance`（scripts/validate.py:179-213）对**每份**带 provenance 的报告，按**当前** state 投影复算 `state_projection_sha256`（scripts/validate.py:211）——历史报告存的摘要对应旧投影，而投影没有历史快照，所以轮内任何一次合法的证据追加（state-update 的既定用途）都会把此前所有绑定报告染红，且没有解绑或降级机制。`complete` 守卫要求 validate 通过（scripts/transition.py:363-376），所以该轮即使走完新一轮完整验证也永远到不了 COMPLETE。会话当时的推理已判定这是"skill 机制与打回重规划流程的真实冲突"（重放报告 §二 轮 2 引 12:11:56–12:13:01 推理原文），唯一恢复路径是弃轮新建 `prd-2026-10-23-2`。注意此缺陷不限于 reopen：同一轮里 REVISE 循环中只要追加过证据，同样染红此前报告——重放轮 1 未触发只是因为三轮验证之间没有语义字段变更（推断，依据同一机制）。

**P0-2 轮次没有废弃出口，悬挂轮与同目标重开无脚本化路径。** 重放轮 2 弃轮后，原轮停留在 EXECUTING iter4（有 04-plan 无 artifact）成为悬挂轮（重放报告 §二 轮 2、§三 #5）。状态机没有任何事件能把一个非终态轮标记为"已废弃"（scripts/transition.py:41-53 事件枚举无此事件；SKILL.md:72 只定义 COMPLETE/STOPPED 两个终态）。同目标再 init 时，`active_round_with_same_goal`（scripts/init.py:43-63）对活跃轮幂等返回既有轮——悬挂轮是活跃状态，于是"想弃旧轮开新轮"没有脚本入口，只能靠改目标串让去重失配（重放轮 2 即如此，12:13:09，重放报告 §二 轮 2）。悬挂轮还会干扰恢复定位：`--locate` 取排序最大的轮次（scripts/init.py:76-89），悬挂轮与正常轮并存时选哪个取决于目录名日期，不取决于状态（推断，依据排序代码；无测试覆盖）。

**P0-3（P0-1 的必然配套）P1 收窄后，历史防篡改与旧 PASS 防消费必须有替代载体。** 现状里"历史报告复算"同时承担三个职责：拦截交付（权威 PASS 漂移）、检测历史文件被直接改写、使旧 PASS 不可消费。把 P1 收窄到"当前交付权威"后，后两个职责必须有明确接棒者，否则等于放松保证。接棒设计见 design.md §2.2/§12：历史防篡改由历史档 artifact/plan 摘要复算（不符即 P1）与 commit 覆盖守卫承担，登记哈希经评估为重复防线、不引入；旧 PASS 消费防护改为"仅当轮绑定 PASS 可被 complete/verdict/覆盖守卫消费"（守卫已按当轮实现，scripts/transition.py:336-376、scripts/commit.py:253-262，需补 reopen 后的显式反例测试）。

**P1-4 承诺的通知夹具测试没有对应实现，且用户已明确要求单独测试。** v1 proposal.md:30 承诺"对迟到报告和重复通知只做夹具（test fixture，预置测试数据）回放；验收结论限于：模拟的迟到或重复通知不导致 Nana 重复业务收口"。重放报告 §三 #9 判定：tests/ 全目录 grep 迟到/重复/notification/handback 零命中——该零命中系 grep 关键词与测试命名不匹配（`../harden-rc-pev-closeout/` proposal C2 于 2026-10-25 作了同方向更正），守卫测试实际存在：v1 tasks.md 3.2 的完成注记把该验收映射到了 `test_overwrite_refused_after_bound_pass`（迟到报告）、`test_transition_rerun_after_success_no_double_increment`（重复通知）、`test_complete_refuses_when_pass_unbound`（报告缺失）（tests/test_lifecycle.py:349/386/452，verification.md:126）。但这些测试覆盖的是磁盘守卫行为，没有以通知场景建模的专用夹具，七类场景（COMPLETE 后迟到 handback、同一 handback 重复到达、不同通知携相同事件 ID、验证完成前到达、声称有新问题、无新问题、交付后新人工输入）绝大多数没有对应断言。重放主会话里用户于 2026-10-23 10:16 拍板"迟到 handback/重复通知**单独测试**"（会话日志 `7ec63d1b…jsonl` L96），该指令在本会话及重放中均未执行（同日志 L909 待办确认）。结论：承诺按其字面范围未兑现（缺场景建模的夹具套件），且属用户已下令未执行事项。2026-10-26 简化处置：通知夹具移出本 change 范围——迟到/重复输入由终态冻结、事件身份幂等与消费守卫覆盖，不另建状态机（design §1.2 末段、§12）；该拍板随之废止。

**P1-5 验证问题没有可审计的生命周期，重放已产生需要它的真实实例。** verification.schema.json 的字段只有 verdict/strengths/critical_issues/warnings/required_changes/evidence_gaps/confidence/provenance/verification_input（schemas/verification.schema.json:5-49），没有问题编号、首现轮次、修复轮次、复现标记、成因分类。真实实例：重放 pm 链 01-verification 有 4 条 critical，02-verification 出现第 5 条第一轮没有的 critical（"均为自动化线已验证通道"的表述与判定表、E15 矛盾）；会话内逐字比对证明该表述在 01/02 两版 artifact 中完全相同（会话日志 `7ec63d1b…jsonl` L1203 分析，2026-10-24T11:43:40Z），即问题不是新内容引入，而判读为第一轮漏检——结构性原因是每轮全新独立 Verifier、覆盖抽样、无盲区接力；会话同时明确"不可断言 verifier1 再看必能抓到"（反事实不可验证）。critical 计数 4→1→0 直到第三轮 PASS（`prd-2026-10-23/pm/iterations/01-verification.json`、`02-verification.json`，2026-10-25 盘上核对）。盘上现状无法回答"这条问题首现于哪轮、是否同一个问题、修没修好、该升级还是该接受"——这些判定现在只能靠会话内人肉逐字比对。会话已提出"盲区接力/收敛判据加严"改进建议待立项（同日志 L1203"供你决定是否立项"，无用户答复）。2026-10-26 简化处置：问题生命周期移出本 change 范围，未来凭真实实例另立项（design §12）。另有一处佐证：02-verification 对该 critical 的描述写"artifact 新增的"，与逐字比对事实不符——验证报告自身的陈述也需要可核对（同日志 L1203）。

**P1-6 `.pev/` 工作区无卫生机制。** 重放后 `.pev/` 根散落 16 个草稿/补丁文件（artifact-draft-×4、objective-×2、objective-plan-draft-×2、state-patch-×6、verification-draft-×2）无登记无清理，另有空目录 `round-2026-10-23/` 为弃用初始化残留（重放报告 §三 #12，清单在 `file-manifest.json`；2026-10-25 在 `/tmp/nana-replay2/mechunit-collectors/.pev/` 盘上复核，目录清单与之一致）。轮次命名对 locate 的约束不完整：`-N` 序号的数值排序已由 `round_sort_key` 修复并随 `e8e5f25` 提交（会话日志 `7ec63d1b…jsonl` L4 记录），但该函数对不匹配 `prd-YYYY-MM-DD[-N]` 的名字仍返回 `("", -1)`（scripts/init.py:66-71），按字典序恒小于任何合法日期——有合法轮次时改名轮（如 `-test` 后缀）永不入选 locate，仅存改名轮时按 glob 任意序取首个（后半句为代码语义推演，无测试覆盖；`-test` 后缀实测见记忆 nana-new-version-e2e-test-20261023）。PM 链内登记完整无此问题（重放报告 §三 #12）。2026-10-26 简化处置：工作区卫生移出本 change 范围，散件与空目录由用户手工处置（design §12）；locate 对改名轮的约束修正（P1-6 后半）仍在范围内。

**P1-7 伴随文档交付后漂移无检测。** `open-decisions.md` 被声明"与 PRD 正文冲突处以该节为准"（权威伴随文档），但在 rc 交付后仍被轮 8/9 编辑（13:22:27、13:23:58），无再验证（重放报告 §三 #10 观察项）。Nana 的 state 没有伴随文档登记册，validate 不覆盖 pm/ 与 output/ 之外的任何文件（scripts/validate.py 全文无此检查）。处置定案（2026-10-26）：实测"漂移"是裁定的合法累积，真正的缺陷是交付物把权威让渡给轮外可变文件——不设登记机制，改为验证期拦权威让渡（见目标 7 与 design §7）。

**P1-8 交付模板的填写注释泄漏进渲染稿。** templates/prd.md 有 5 处静态指导文字——L5「（含证据引用）」、L10「（baseline → target）」、L21「（为什么对应根因：…）」、L33 整段填写说明、L37「（现有 / 需新增）」——渲染器只替换 `{{…}}` 占位符、不剥离静态文本（scripts/render.py:150-172、333-334），这些注释逐字进入最终交付稿。2026-10-25 盘上复核：重放实际交付的 `prd-2026-10-23-2/pm/output/prd.md` L5、L10、L26、L56–L61 仍逐字携带上述注释（"（含证据引用）""（baseline → target）""（为什么对应根因：…""（现有 / 需新增）"×6 行）。同源瑕疵：模板头 `# PRD: {{title}}`（templates/prd.md:1）与含"PRD"的标题拼用会重复。v1 design.md:46 已注意到该现象并留给语义审查，未修。

**P1-9 token 与脚本调用没有口径化度量工具。** 重放报告 §四明确"本实验不支持新版节省 token 的结论"（会话形态、缓存结构、交付范围不可比）。要回答"脚本化后到底多了还是少了、多了什么"，需要按阶段/按 Verifier 的 usage 统计与脚本调用计数工具，当前技能与测试都没有（tests/ 无此内容；runner 侧数据在会话 JSONL 的 usage 字段）。2026-10-26 简化处置：度量工具移出本 change 范围，需要时另开 change（design §12）。

**基线漂移（事实记录，已溯源，rc 侧已重锚定）。** 2026-10-25 20:31（+0800）采集：七个脚本中六个与 `../harden-rc-pev-closeout/design.md` 首节的锚定 SHA-256 一致，唯独 transition.py 当前 SHA-256 前 16 位为 `b9a4188cc8d3f600`，锚定值为 `b55a019a7d0863f4`，文件 mtime 2026-10-24 19:05。溯源：重放主会话中用户于 10-24 要求"把每个命令对应的触发场景记录在 transition 脚本中"（会话日志 `7ec63d1b…jsonl` L1074），会话当日执行该文档化修改（L1100）并复跑测试 106/106 绿（L1141）；2026-10-25 20:33 本会话再实测 106 例全绿。即漂移内容为注释性文档、无行为变化。后续更新：`../harden-rc-pev-closeout/design.md:19` 已于 2026-10-25/26 将 transition.py 锚定重估并更新为 `b9a4188cc8d3f600`，锚定基准地址改为 pev-skills 仓库——锚定过期问题已由 rc 侧按其规则解决，本 change 不再重复处理；本 change 的结构性变更（design §0 所列）仍触发 rc 的重估条款。

## 非问题与实验限制

以下事项已核实为**不能归因于 Nana 技能**，本提案不修、也不据此设计：

- 第一次重放的目录隔离失败：报告目录放进被测仓库、项目记忆泄漏，属外层运行器（实验目录布局）问题（重放报告 §一 第一次尝试）。
- 异步通知时序（迟到、重复通知是否真的到达、何时到达）在逐轮串行重放下不可复现（重放报告偏差 D1）；重放中 8 个子代理全部同步完成，通知场景现场未触达（§三 #9）。因此通知问题只能以夹具回放验收，结论限于磁盘收口逻辑——与 v1 proposal.md:30 的口径一致。
- token 差异的会话形态不可比性（重放报告 §四）：input -50.8% 与 cache read +65.0% 并存，等效口径 +12.4% 且多交付一个 Spec。本提案不引用这些数字作为任何方向的性能结论。
- "第一轮 Verifier 漏检"不是本提案的前提：第二轮新 critical issue 的成因（新证据/复现/漏检）恰恰是 P1-5 指出无法从盘上判定的，设计目标就是让这个判定可审计，而不是假设漏检发生。
- Claude 外层通知机制（何时发送完成通知、重复通知是否再次唤醒会话）不在 Nana 控制边界内，与 v1 proposal.md:23 范围声明一致。

## 目标

1. **同轮语义演进可恢复**：reopen 或 REVISE 后合法追加证据，历史绑定报告按规则降级为"历史"，当前轮完成重新验证即可收口；交付权威（当前轮绑定 PASS）的漂移仍然硬拦。
2. **轮次有明确退出语义**：新增"废弃"终态与 `supersede` 事件，目标/范围/交付目标变更走显式换轮，账本可携续、继任可追溯（`carried_from`）；reopen（同轮打回）与 supersede（换轮）的判据成文。
3. **判据四条定案，命令面压缩到最小集合**：用户输入到事件的映射只有四条判据；阶段推进事件并入 init/commit、authorized-resume 并入 resume，收口四步（--bind/verdict/render/complete）折叠进 `commit verification`（verdict 由程序从报告字段读取，不经模型转述），正常链固定调用 12→5 次；旧验证失效时点、旧 PASS 防消费、5/5 完成后再修改的唯一路径随之定案。
4. **轮外文件权威让渡在验证期拦截**（2026-10-26 裁决，替代原"伴随文档登记"方案）：不引入登记机制（state 字段、`companion` 子命令、P7 全部裁撤），改为 Verifier D 类检查项与 SKILL 指令——交付物不得声明轮外可变文件为权威，用户裁定一律写入已验证源数据后随交付物渲染，或标注为非权威的过程记录。
5. **模板纯渲染缺陷修复**（需单独批准）：填写注释不再进入交付稿，标题不再重复。

## 非目标

- 不修改 requirement-clarify、behavior-decompose 或任何其他技能（rc 侧由 `../harden-rc-pev-closeout/` 承担；本 change 只在"影响"节声明协调规则）。
- 不抽取两技能共享的 PEV runtime：v1 定案"不恢复 `_pev/`、不抽取共享脚本"（v1 tasks.md:3），rc 延续单树适配。两树并存的漂移风险以"锚定+重估"规则管理，共享化留待两侧都稳定后另开 change 评估。
- 不修改 Claude 通知机制，不承诺阻止代理绕过脚本直接回复（v1 proposal.md:28 既有边界不变：脚本检测的是磁盘上的可观察不一致，不是物理阻止）。
- 不为存量轮次补造 provenance 或登记哈希（v1 design.md:93 禁止补造的既定原则）。
- 不迁移、不改写 mechunit 仓库的任何真实轮次数据；只读副本仅用于口径核验。
- 不做多会话并发写锁（v1 scripting-audit.md:40 延期项，维持）。
- 不做通知状态机与通知场景夹具：迟到/重复输入由终态冻结、事件身份幂等与消费守卫覆盖（2026-10-26 简化；2026-10-23"单独测试"拍板随之废止，design §12）。
- 不做 verifier 问题生命周期（issues/digest/收敛升级）：改善审计展示，不直接影响交付正确性，未来凭实例另立项（design §12）。
- 不做工作区卫生（sweep/attic）：散件、空目录与 drafts 由用户手工处置（design §12）。
- 不做度量工具（metrics）：统计口径问题，非正确性（design §12）。
- 不做登记哈希（state.hashes/P6）：历史改写已由历史档摘要复算与覆盖守卫拦截，属重复防线（design §12）。

## 影响范围

- 获批后的实施目标（2026-10-26 起）为 `/Users/zhengshan/project/ai/pev-skills/product-manager/`：PEV 九技能已迁入独立 git 仓库 `pev-skills`（导入提交 `d1d1a6d`，origin `github.com:carresia/pev-skills.git`），`~/skills/product-manager` 与 `~/.claude/skills/product-manager` 经符号链接链式指向该树（2026-10-26 迁移，九技能逐字节复核一致，迁移记录见 verification.md）。实施改动全部以 git 提交追踪。拟触碰：`SKILL.md`（状态机表、四条判据决策树、命令面同步）、`scripts/validate.py`（P1 拆分）、`scripts/transition.py`（命令面裁撤与并入、supersede 事件、SUPERSEDED 终态、reopen 预算守卫、错误码）、`scripts/commit.py`（阶段推进转移与收口折叠并入、SUPERSEDED 冻结）、`scripts/init.py`（建轮即 PLANNING、locate 汇报与警告、carry-from）、`scripts/record_provenance.py`（绑定并入 commit verification）、`scripts/render.py`（注释剥离；作为 commit verification 的内部渲染步骤）、`schemas/state.schema.json`（+SUPERSEDED、+carried_from）、`agents/verifier.md`（仅权威让渡 D 类规则，最小改动）、`templates/prd.md`（**需单独批准**，见目标 5）、`tests/`（test_closeout/test_lifecycle/test_render 扩展 + fixtures/ 最小合成夹具）。
- 对 `../harden-rc-pev-closeout/` 的协调影响：本 change 触发其 design.md 首节"结构性变更须重估"条款的有四项——P1 语义拆分、supersede 与 SUPERSEDED 终态、事件面合并（commit/init 承担转移写入）、errors/warnings 条目新增 code 字段。建议实施顺序：本 change 先行，rc 按其规则重锚定后再开工，避免 rc 移植当前的 P1 死路语义（rc 的 evidence 为整字段替换，同轮打回后投影漂移同样永久染红，机制同 P0-1）。
- 仓库 `openspec/specs/` 需求不变（`skip_specs: true`）。

## 兼容性

- 全部 schema 变更为可选字段或枚举追加，存量轮次结构不破。存量轮次在新校验下的行为变化只有一处：历史绑定报告的投影漂移从 P1 错误改为不复算（不报错）——对 `prd-2026-10-21/pm` 这类"收口 PASS 本身漂移"的轮次，其收口 PASS 仍按交付权威硬拦（行为不变，任务 4.2 用只读副本核验）。
- 事件身份与重跑判据不变；supersede 按同一三分支判定实现幂等；合并进 commit/init 的转移在 `transitions` 日志仍按 v1 事件名记录，存量日志可读。
- 新建轮次不再停留 INIT、建轮即 iteration=1；存量 iter=0 轮次不迁移，其 `resume --invalidate-plan` 路径保留。
- 调用预算：正常链路固定 5 次（事件面合并与收口折叠后，v1 为 12 次）；supersede/carry 均为按需事件，不占固定口径。`verdict`/`complete` 不再是模型命令，transitions 日志仍按原事件名记录；v1 的"未绑定报告中间态矩阵"取消（`P3_UNBOUND_CURRENT` 仅存量轮次）。

## 风险

- **P1 收窄是放松面最大的一处**：若"交付权威"判定写错（漏掉某条消费路径），旧 PASS 可能被沿用。缓解：消费路径全量清单化（complete/verdict/覆盖/渲染），逐条反例测试；历史文件直接改写由历史档 artifact/plan 摘要复算兜底（P1）。
- **reopen 从死路变通途后可能被滥用**（该走新轮的走了同轮）：判据成文（design §1.2 四条）+ supersede 的 note 记录，最终由模型与用户判断，脚本不代判目标变更；预算尽的 reopen 被守卫直接拒绝。
- **命令面合并与收口折叠把转移与收口写入并入 commit/init**：commit 的多文件写入窗口扩大（产物+登记册+状态+输出）。缓解：写入顺序固定、重跑同一命令按既有提交协议模式收敛（commit plan/artifact 三分支、commit verification 组合分支），R29/R30 固化。
- **supersede 误操作**：终态不可逆。缓解：--note 必填、next 预览、不删文件（证据保全）、测试覆盖幂等重跑。
- **模板修改影响存量比对**：COMPLETE 轮次不会重渲染，实际无影响；未完结轮次重渲染后字节变化属预期，须在测试口径中写明。
- **两树漂移**：本 change 与 rc change 并行推进会产生冲突。缓解：上文协调顺序；任务 1.1 重锚定并把 SHA 清单写进 verification.md。

## 回滚方式

与 v1 相同：实施前在 verification.md 记录全部触碰文件的 SHA-256；回滚时仅撤销本 change 的改动、删除新增测试与夹具，重跑 106 例存量测试并比对哈希确认其余未动。schema 可选字段留存在旧数据里不阻碍旧版脚本（旧版忽略未知字段）。

## 为什么每项必要、不改会怎样

| 项 | 不改会发生什么 |
|---|---|
| P0-1 P1 拆分 | 每次用户打回或 REVISE 中的证据追加都永久杀死整轮，唯一出路弃轮重建——重放轮 2 已实际发生；账本证据被人为分割到多轮，审计断裂 |
| P0-2 supersede | 悬挂轮持续累积；同目标换轮只能靠改目标串欺骗去重逻辑（重放轮 2 的做法），目标字符串从"业务事实"蜕变为"流程逃生口" |
| P0-3 接棒 | P1 收窄变成单纯的保证放松，a5d530fb 型历史改写失去检测 |
| 命令面压缩 | 模型持续在 13 个 transition 子命令中选择，忘跑/错跑阶段推进事件的窗口不关闭（v1 commit.py:212 的错误提示即在兜底此情况）；收口四步仍需模型逐条接力，verdict 值被模型抄写第二遍；5/5 后 reopen+提额回同轮的歧义路径继续可用 |
| P1-7 权威让渡规则 | 交付物把权威让渡给轮外可变文件，交付后该文件无声演进，PRD 的权威性名存实亡；规则在验证期拦住让渡声明，裁定一律进已验证源数据 |
| P1-8 模板 | 所有后续 PRD 交付稿都带填写注释，交付质量缺陷每次由人工发现 |
