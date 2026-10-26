# 第一阶段验证记录

## 只读采集基线(2026-10-23)

安装目录绝对路径为 `/Users/zhengshan/skills/requirement-clarify`;`/Users/zhengshan/.claude/skills/requirement-clarify` 是指向同一目录的符号链接(`ls -la` 退出码 0,单树,无双树同步问题)。背景比对(proposal.md 六缺口)发生于 2026-10-23 13:19–13:30(+0800),方式为通读下列文件;哈希与 mtime 于当日 16:44 补采——全部文件 mtime 不晚于 2026-09-21,证明比对后文件未变,行号引用在两个时点均有效。SHA-256 由 `shasum -a 256` 取得(退出码 0):

| 相对安装目录的路径 | mtime | SHA-256 |
|---|---|---|
| `SKILL.md` | 2026-09-21 08:56 | `8b0172824c03f2f5a5c795d731effea5cd6963fb5cf7549d8e58224e2c46c170` |
| `scripts/validate.py` | 2026-09-21 08:57 | `f21f34b471a873f9e7612bd4e95a67a1065ba50e3f36a97aadd7bb51f4c6be3a` |
| `schemas/artifact.schema.json` | 2026-09-20 17:59 | `b90c3083328f1fb02c100b61633a40191e246fe8a66096b2587504d2297311b0` |
| `schemas/plan.schema.json` | 2026-09-16 15:58 | `b62be26460437defec2d1035dec185fe607e4c52f9e95fcc416fa5c8eab582e7` |
| `schemas/state.schema.json` | 2026-09-21 08:56 | `2e8cc24c375228f99a38a793d6ead5919fd15e9ddb20f81c34f6dea94670baf4` |
| `schemas/verification.schema.json` | 2026-09-15 23:57 | `b73c6f70ea6e710a1975fbdebadcc042f4bd31ed29cbeafd5dc921d70aa88921b` |
| `templates/spec.md` | 2026-09-20 21:56 | `06f60138daf643fd53fe3785815760058c93611fcd5334e1474d2f3b849b627c` |
| `agents/executor.md` | — | `d7824e0a4feb7b44085db254b6c49a3fbe40e8bbc9f14acb132e1b1ded850575` |
| `agents/planner.md` | — | `0b694a5f12abd7073fa43ed9e35181944fe4663ff53c191fceb1f908097734ca` |
| `agents/verifier.md` | — | `357591a9832123a20294f264ac24a9573636d8136e0d4d34265a0b814d64da46` |
| `playbooks/clarify.md` | — | `7fbf0a99cb002b80ee989e200a087855b12c7bd53c4f1ea22ee5980b8ec27c10` |

背景比对使用的命令(退出码均为 0,只读):`diff -rq ~/.claude/skills/requirement-clarify/ ~/skills/requirement-clarify/`(两树一致,后确认实为符号链接单树);`wc -l` 于各文件;比对结论与行号映射见 proposal.md 背景六条,此处不重复。

**存量 rc/ 轮次盘点**(2026-10-23 16:44,`find /Users/zhengshan/project -maxdepth 5 -type d -name rc -path '*.pev*'`):`mechunit-collectors/.pev/prd-2026-10-08-2/rc`、`mechunit-collectors/.pev/prd-2026-10-09/rc` 存在;另有 `_副本/.pev/prd-2026-09-22` 等无 rc/ 的轮次。这些是 design"旧数据策略"的实施对象;本次及后续任务只读对待,直至按修订规则新开轮次。

**上游依赖锚定**(2026-10-23 16:38 采集):`~/skills/product-manager/scripts/` 七个脚本已落地(2026-10-23 14:05–15:47 mtime),哈希记录于 `design.md` 首节;OpenSpec 仓库提交 `e8e5f25`("design approved, implemented and verified")含上游 change 四件;上游 `verification.md` 记录回归 101/101 绿。用户于 2026-10-23 16:38 前确认 Nana 修改完成。

## 与外部评审意见的对应(2026-10-23)

评审结论 Request changes(六条),本版文件的对应:

- Critical(design 不存在):`design.md` 已落盘,含事件表、写入权、模板映射、快照绑定、旧数据策略、验收场景。
- Required(缺 tasks/verification):本文件与 `tasks.md` 已落盘;实施顺序、夹具、验收场景、回滚、外部写入边界在 `tasks.md` 与 `design.md` 末节。
- Important(依赖声明矛盾):依赖锚定改为"提交 `e8e5f25` + 七脚本 SHA-256 + 适配期间变更重估规则"(`design.md` 首节);proposal.md:31 已同步改写;阻塞规则——依赖已满足(上游已实施并提交),若上游脚本在 rc 实施前再变更,按 design 首节规则重估后才开工。
- Important(RC 特有规则无契约):状态-事件矩阵、prd_gaps 写入/清空的精确条件(`to-pm`/`prd-updated` 与 status 同一次原子写;R4 一致)、resume_to 合法值与恢复原子性(事件表 `resume` 行+上游同构的三分支判据)、11 节模板字段必填类型/来源/转义(渲染器契约映射表)、prd_source 纳入投影摘要而 PRD 文件内容不参与(专项决定)、旧轮次缺 provenance 行为(旧数据策略),均在 design 对应章节。
- Medium(背景证据不可复核):上表哈希与命令即为此补齐;补采时点已注明,行号有效性由 mtime 佐证。
- Medium(验收无可执行测试):`design.md` 验收场景表 15 行 + `tasks.md` 2.1/3.5 夹具与断言要求;幂等判据(事件身份三分支)、终态与退出码断言在 tasks 2.6。

## 检查点

第一阶段(提案与设计)完成;`openspec validate harden-rc-pev-closeout --strict` 通过(以实际运行为准,见下)。**尚未批准设计、尚未取得工作区外写入授权、未修改安装目录任何文件**;`tasks.md` 第 2、3 节全部未实施。存量 rc/ 轮次未触碰。回滚基线即上表哈希。

## 重放证据增补(2026-10-25)

**证据采集**(本会话只读,未写任何被取证对象):重放报告与产物 `/Users/zhengshan/project/mech-unit/mechunit-collectors/.pev/prd-replay-2026-10-23/replay-report/`(comparison.md、lifecycle.json、validation-output.json、file-manifest.json、attempt2-artifacts/ 48 文件,mtime 均为 2026-10-23,与 file-manifest 的 SHA-256 清单对账);编排/验收会话日志 `~/.claude/projects/-Users-zhengshan-project-ai-OpenSpec/7ec63d1b-529c-417c-acd9-8f68b8b40066.jsonl`(1322 行;注意:任务书所给 ID 第四段 `417a` 为笔误,实际 `417c`);被测执行嵌套会话 `7de6cec5-….jsonl`(域 `-private-tmp-nana-replay2-mechunit-collectors`,1675 行)及其 subagents/ 日志;真实仓库 `.pev/prd-2026-10-21/rc/`(attempt-1 残留,3 文件)。四路取证经独立只读代理交叉,行号/时间戳/JSON 路径已逐条落入 proposal 证据分类表。

**上游锚定复核**(2026-10-25,`shasum -a 256`,退出码 0):七脚本中六脚本与 design 首节锚定表一致;`transition.py` 由 `b55a019a7d0863f4` 变更为 `b9a4188cc8d3f600`。diff 核验:模块 docstring 新增"再进入类事件的触发场景"说明(resume/reopen/authorized-resume 区分+init 幂等注记,2026-10-24 由重放编排会话补写),行为与 EVENT_SOURCE 表无变化——按 design 首节规则重估无冲突,**锚定更新为 `b9a4188cc8d3f600`**。

**对 RR comparison.md 的两处更正**(引用其结论时以下述为准,详见 proposal C2/D 类注记):(1) #9"夹具测试缺失"系关键词 grep 误判——PM 三测试实际存在(`tests/test_lifecycle.py:349/386/452`),现场层面仍为 INCONCLUSIVE;(2) #8"rc 无任何脚本调用"应精确为"validate.py 调用 11 次,其余生命周期脚本零调用";#3"第 4 轮 PASS 仅存于子代理日志"补记:嵌套主会话 hand-back(7de6cec5 L1532)亦有记录,缺失的是盘上 04-verification.json,且交付文本自称"审计链 01–04 完整"与实物不符(L1571)。

**本版文档改动**(2026-10-25,仅 change 目录四个文件+新增一个):proposal.md 重写(现场背景+证据分类表 A1–A6/B1–B7/C/D/E+方案比较 A/B/C+不做的后果);design.md 修订(锚定表更新;新增"P1 分代""轮次治理""verifier issue 对账""伴随文档与草稿治理"四节;事件表 17 边含 reopen param.voids/pass-revise/supersede;R8 扩为五条件;差异汇总增 10–15 修正条目);tasks.md 重排(标记 [S]/[P]/[K]/[A]/[L]/[W]/[T],新增 1.6/2.7 治理与 issue 测试任务);test-matrix.md 新增(G1–G12,74 行断言,现场反例合成复刻 R-1…R-7)。安装目录仍未触碰,基线哈希表继续有效。

## 技能树迁移与基线复核(2026-10-26)

**迁移事实**:PEV 九技能(product-manager、requirement-clarify、behavior-decompose、architecture-design、module-design、api-and-interface-design、database-schema-design、planning-and-task-breakdown、incremental-implementation)迁入独立 git 仓库 `/Users/zhengshan/project/ai/pev-skills/`(含 README)。仓库仅一个提交 `d1d1a6d`("chore: import 9 PEV workflow skills from ~/skills"),工作树干净(`git status --short` 空,2026-10-26 08:59+ 快照)。本 change 实施目标随之改为 `pev-skills/requirement-clarify/`,PM 锚定基准地址改为 `pev-skills/product-manager/scripts/`。

**基线复核**(2026-10-26,`shasum -a 256`,退出码 0):新址 rc 全部 11 个文件(SKILL.md、scripts/validate.py、四 schemas、templates/spec.md、三 agents、playbooks/clarify.md)与本文件第一节 2026-10-23 基线哈希**逐一相同**;新址 PM 七脚本与 `design.md` 锚定表**逐一相同**(含重锚后的 transition.py `b9a4188cc8d3f600`)。旧树 `/Users/zhengshan/skills/requirement-clarify` 仍在,抽查 SKILL.md/validate.py 与基线一致——**两树同基线**,第一节基线表对两树同时有效(以本快照时点为限)。

**待拍板的部署决策**(不属本 change 实施步骤):`~/.claude/skills/requirement-clarify` 与 `~/.claude/skills/product-manager` 符号链接此刻仍指向旧树 `/Users/zhengshan/skills/…`(2026-10-26 快照)。实施写入 pev-skills 后,若链接不重指、旧树不退役,运行时实际加载的仍是旧树,形成双树失联。实施开始前须拍板:重指符号链接到 pev-skills,或以其他部署方式切换;拍板结果记录于本文件后再进 tasks 第 2 节。

**拍板与执行记录**(2026-10-26 09:04–09:12 +0800,由 `../harden-nana-pev-lifecycle/` 会话依用户指令执行并记录):用户当日指令"pev 涉及到的所有 skills 的优化地址都改为 /Users/zhengshan/project/ai/pev-skills,使用 git 追踪"即上述拍板的裁决——采用**重指符号链接**方案,形态为链式:旧树 9 个技能目录删除并替换为 `~/skills/<name> → /Users/zhengshan/project/ai/pev-skills/<name>`,`~/.claude/skills/<name>` 原绝对链接不变、经 `~/skills/<name>` 解析到位(`readlink -f ~/.claude/skills/product-manager` 抽查全部解析至 pev-skills)。执行顺序:先打备份 `~/skills/pev-skills-backup-20261026-0910-pre-symlink.tar.gz`(694,164 字节),移各技能 `.remember/`(8 个)与 behavior-decompose 的 `.claude/` 入 pev-skills(gitignore 范围,git 状态仍净),再替换链接;PM 全量测试于新树复跑 `Ran 106 tests in 8.449s` OK。九技能与新仓逐字节复核一致(`diff -r`,排除运行时目录),PM 七脚本 SHA 与本文件锚定一致。**上一节"旧树仍在…两树同基线"的快照由此作废**:旧树位置现为符号链接,不再存在独立副本(回收途径=git 提交 d1d1a6d、上述 tarball、5 份历史备份)。上段门槛视为解除,tasks 第 2 节可进;执行细节与验证命令见 `../harden-nana-pev-lifecycle/verification.md` 迁移记录节。

## 精简方案审查说明（2026-10-26）

本节只记录文档审查，不是技能代码验证，也不改写前述历史记录。审查依据为用户给出的收缩要求和本 change 现有文档。结论是删除 SUPERSEDED/悬挂轮全局门禁、issue 对账、companions/轮根漂移、草稿洁净门禁和固定测试规模；保留当前 PASS 绑定、确定性渲染、修订失效和中断恢复。未运行技能测试，未访问或复验现场重放对象，因此没有新版方案通过、节省 token 或提高 ROI 的证据。

## 命令面修订拍板与实施启动（2026-10-26）

用户下达五条命令设计原则（命令只设在模型必须拿主意处；下一步已确定的并入同一命令；岔路写进产物文件字段由脚本读；流程规则写进代码与测试、模型文档一句话一条命令；任意两步之间断电后接手方仅凭磁盘续跑），并拍板：PASS 后自动发布并完成，不保留独立 complete 命令；本次为 harden-rc-pev-closeout 的实施阶段。

`design.md`/`proposal.md`/`tasks.md`/`test-matrix.md` 据此修订：模型可见入口收敛为 `init`、`commit`（plan/artifact/verification/state-update）、`reopen`、`validate`；`record-provenance`、`render`、`transition`、`complete` 降为命令内部零决定步骤。上一节 58 行的部署门槛已于同日解除（见上方拍板与执行记录；另 `~/.claude/skills/requirement-clarify` 15:13 重指为直连 pev-skills，解析终点不变）。实施目标 `pev-skills/requirement-clarify/`，不触碰 `product-manager/**`（该处有 harden-nana-pev-lifecycle 进行中改动）。实施结果与测试证据待实施完成后补记于本节，未实测前不填通过结论。

## 实施证据（2026-10-26）

**代码提交**（pev-skills 仓库,分支 `harden-rc-pev-closeout`,基线 b5e5f3b）:`09adb89`(scripts 七文件+schemas 两文件,任务 2.1–2.5)、`6edfe06`(tests 五文件,任务 3.1–3.2)、`69b77b8`(SKILL.md+agents 四文件,任务 2.6)。仅触及 `requirement-clarify/**`;`product-manager/**`、真实业务轮次、`~/.claude/skills` 符号链接未触碰(任务 3.4)。

**测试**(任务 3.1,`cd pev-skills/requirement-clarify && python3 -m unittest discover -s tests -t .`):`Ran 50 tests ... OK`。测试先于实现编写,首次运行 50 个全部因脚本缺失失败(RED),实现后全绿;重构(死代码/参数清理)后复跑仍 `50/50 OK`。覆盖:N01 正常链、N02–N06 拒绝门、N07 reopen、N08–N10 中断重放、N13 旧数据、N16/N17 字段分叉、N18 逐边界定位、协议形状与渲染确定性。

**断电演练**(任务 3.2,/tmp 合成夹具,真实命令序列):正常链 `init→commit plan→commit artifact→commit verification(PASS)` 一条命令内发布 `output/spec.md`(2006 字节)并 COMPLETE;把状态回拨到"发布后未完成"重跑同一命令,收敛且 `transitions` 中 complete 事件恰 1 条;`reopen→blocked→state-update 恢复→重验证 PASS→COMPLETE` 全程 `validate` 无错误。演练覆盖断点:init 后、落盘未登记、artifact 落盘未推进、报告已绑定未渲染、发布后未写完成、渲染临时文件残留(validate 以警告报告)。

**文档校验**:`openspec validate harden-rc-pev-closeout --strict` 通过(2026-10-26,实施后复跑)。

**未声称事项**:本节证据只覆盖脚本行为;未运行真实模型澄清轮,因此对"节省 token、提高澄清质量"不作任何结论(proposal.md 验收边界同款口径)。命令面改造后 rc 技能经 `~/.claude/skills/requirement-clarify → pev-skills` 符号链接即时生效,首次真实使用建议按 SKILL.md 命令面走一轮小规模 PRD 澄清作验收。

## 增补:PM 侧生命周期 change 落地通知(2026-10-26,harden-nana-pev-lifecycle 任务 4.5)

并行实施的 `../harden-nana-pev-lifecycle/` 已在 product-manager 子树落地并验证(151/151)。对本 change 的两点影响:

1. **design 首节重锚定**:`harden-nana-pev-lifecycle/design.md` §0 所列四个结构性变更点——P1 语义拆分(validate.py 权威/历史分级)、supersede 与 SUPERSEDED 终态、事件面合并与收口折叠(阶段推进并入 init/commit、--bind/verdict/render/complete 折叠进 commit verification)、errors/warnings 可选 code——均已生效。本 change 的实施基线(b5e5f3b)早于其最终态(评审修复后 `500d850`);若本 change design 首节锚定过 PM 七脚本哈希,合入前须按其 verification.md 任务 4.4 改后 SHA 列+最终评审节补列(commit/record_provenance/render 三件)重锚定复核。本 change 未消费 PM 侧任何接口(仅跨技能只读 `pm/output/prd.md`,协议未变),重估预期为纯锚定更新。
2. **分支拓扑**:两 change 的提交在 pev-skills 同一支链上交织(本 change 三提交在中间,`b5e5f3b → 09adb89 → 6edfe06 → 69b77b8 → 4c43549 → … → 6097760`),无法拆分为互不包含的分支;两侧测试(50/50 与 151/151)均在包含双方的树上通过。
