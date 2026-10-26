# 任务清单

范围仅限 Nana 生命周期（`design.md`）。requirement-clarify 由 `../harden-rc-pev-closeout/` 承担，本清单不含其任务；对它的唯一动作是任务 4.5 的重估通知。不抽共享 runtime、不修改 OpenSpec 运行时与正式 specs、不修改 Claude 通知机制。

标记约定：【TDD】先写测试后实现；【文档】只改文档不改代码；【旧数据】涉及存量轮次兼容口径（=新代码读旧数据时的行为定义与核验；存量轮次的处置本身已明确排除，design §4.3）；【装技】触碰已安装技能正本（2026-10-26 起为 `/Users/zhengshan/project/ai/pev-skills/product-manager/`，`~/skills` 与 `~/.claude/skills` 经符号链接链式指向该树；pev-skills 在 OpenSpec 工作区之外，写入须授权）。实施改动全部在 pev-skills 仓库以 git 提交追踪——建议每任务一提交、提交信息引用任务号；回滚即 `git revert`，提交哈希记入 `verification.md`。按章节顺序执行；同一章节内遵守依赖列，不并行写同一文件。全部验证记录进本 change 的 `verification.md`（命令、预期、实际、未解决缺口）。

2026-10-26 简化（Occam 裁撤）：随 design 删去问题生命周期、通知夹具、sweep、metrics、登记哈希与 `--successor`，任务 2.3/2.7/3.1/3.4/3.5 裁撤，编号保留不复用（理由见 design §12）；新增任务 2.9 事件面合并与 2.10 收口折叠。

## 1. 契约与基线

- [x] 1.1 只读采集与重锚定【装技·只读】：采集 `/Users/zhengshan/project/ai/pev-skills/product-manager/` 全树（SKILL.md、scripts/×7、schemas/×5、templates/×4、tests/×5、agents/）的 SHA-256 清单与 mtime，写入 `verification.md`，并与 pev-skills 导入提交 `d1d1a6d` 之后的 `git log`/`git status` 核对（当前干净、单提交，2026-10-26 迁移记录见 verification.md 增补节）；transition.py 相对 rc 旧锚定的差异已由注释性修改（触发场景文档，会话日志 `7ec63d1b…jsonl` L1074→L1100）造成、rc 侧已重锚定为 `b9a4188cc8d3f600`（其 design.md:19）。重跑全量测试记录基线。复检符号链接链（`~/.claude/skills/product-manager` → `~/skills/product-manager` → pev-skills，`readlink -f`）解析正确。绝不修改 mechunit 仓库真实轮次数据。
- [x] 1.2 设计批准：取得 `design.md` 批准（§1.1 事件面合并与收口折叠、§1.2 四条判据、§2 P1 拆分；原决策项已全部定案并入正文，无待拍板项），单列批准 `templates/prd.md` 修改（design §8，含标题 `# {{title}}`），取得实施期写入 `/Users/zhengshan/project/ai/pev-skills/product-manager/` 授权（git 提交追踪按标记约定执行）。未获批不实施。
- [x] 1.3 夹具策略说明【文档】：在 `verification.md` 声明全部夹具为合成最小 JSON，禁止复制 mechunit 真实轮次产物（真实数据仅任务 4.2 只读核验用，路径引用不复制内容进 git）。

（1.1–1.3 完成记录见 verification.md「实施基线与批准记录」节，2026-10-26 14:47–14:55。）

## 2. P0 主体实施（契约获批后；全部 TDD）

- [x] 2.1 交付权威分级与 P1 拆分【TDD】【装技】：先写测试——`report_tier` 纯函数分级（authority/history 两档判定矩阵）；权威报告复算不符→P1 错误带 `P1_PROVENANCE_MISMATCH`；历史报告 artifact/plan 不符→P1、state 投影不复算（无错误无提示）。改 `scripts/validate.py`（tier 判定；历史档跳过投影复算）。依赖：无。验收：R2/R3/R10 行为不变（既有测试全绿）+ 新增分级测试绿；`prd-2026-10-21/pm` 场景（收口 PASS 漂移）在合成夹具上仍 P1。
- [x] 2.2 投影排除集修订【TDD】【装技】：state.schema.json 新增可选 `carried_from` 顶层并归入排除集；`_common.py` 投影函数同步；正反测试（新增字段的写入不得改变 `state_projection_sha256`；改 `objective`/`evidence` 仍必须改变——沿用 v1 投影测试模式）。依赖：无（与 2.1 可并行，但同文件 `_common.py`/schema 需串行合并）。验收：投影正反测试绿；既有投影测试不变绿。
- [x] 2.4 supersede 事件与 SUPERSEDED 终态【TDD】【装技】：先写测试——各源状态（含 COMPLETE/STOPPED 挂起轮与活轮）supersede → SUPERSEDED、iteration 不变、param 对象（note）；--note 缺失→`E_NOTE_REQUIRED`；SUPERSEDED 上一切写入→`E_FROZEN_STATE`（含 state-update 扩冻）；幂等重跑三分支；`init` 同目标在 SUPERSEDED 后放行新轮。改 `scripts/transition.py`、`scripts/commit.py`（冻结清单）、`schemas/state.schema.json`（枚举+param 对象说明）、`scripts/init.py`（活跃集不含 SUPERSEDED 的确认测试）。依赖：无（与 2.1 并行，transition.py 与 validate.py 不同文件）。验收：R7/R17 绿。
- [x] 2.5 carry-from 与 locate 汇报【TDD】【装技】：先写测试——`init --carry-from` 携八字段语义投影（evidence id 保留）、写 `carried_from`、活轮源→`E_CARRY_SOURCE_ACTIVE`；locate 输出全轮清单+悬挂警告+改名轮警告（改名轮不参与自动选择、全部不匹配时明确报告）。改 `scripts/init.py`。依赖：2.4（SUPERSEDED 作为合法 carry 源）。验收：R17/R18/R19 绿。
- [x] 2.6 reopen 死路解除回归【TDD】【装技】：先写测试——design §1.3 剧本完整回放（COMPLETE→reopen→补证据 E+→新迭代 plan/artifact/snapshot/verification/bind PASS→render→complete 全绿，历史报告不报错）；R6 旧 PASS 不可消费三守卫反例；REVISE 中途追加证据（R9）。实现主体在 2.1/2.4 完成，本任务是回归固化、`transition.py` reopen 的 param 对象化（旧字符串条目兼容读）与预算守卫（`iteration+1` 越上限→`E_BUDGET_EXHAUSTED`，状态保持 COMPLETE，R15 反例）。依赖：2.1+2.4+2.10（收口折叠）。验收：R6/R8/R9/R15 绿——**本 change 的核心验收行**。
- [x] 2.8 SKILL.md 同步【文档】【装技】：状态机表 +supersede 行与 SUPERSEDED；命令面按 design §1.1 表更新（transition 独立事件仅剩 need-input/resume/reopen/supersede；阶段推进与收口并入 init/commit 的说明与示例；verdict 不是模型命令、由程序读报告字段的澄清）；第 0 节 locate 汇报与点名规则；第 5 节末尾四条判据决策树（design §1.2）；"revise 不是用户动作"的措辞澄清；reopen/supersede param 对象示例；换轮前必须 supersede 指令。依赖：2.1–2.6、2.9、2.10（文档反映最终行为）。验收：grep 无新旧规则残留冲突；命令示例与脚本 `--help`/解析一致。
- [x] 2.9 事件面合并【TDD】【装技】：先写测试——init 建轮即 PLANNING/WAITING_FOR_INPUT（iteration=1，含 goal 缺失分支，R29）；`commit plan` 成功即转 EXECUTING、`commit artifact` 按 status 三分支转移（completed→VERIFYING / replan_required→PLANNING+1·上限 / blocked→WAITING，R29）；`authorized-resume` 并入 `resume --raise-limit`（param 记新上限，R13/R16）；合并后重跑按三分支幂等；EXECUTING 下重提不同 plan 草稿按阶段不匹配拒绝。改 `scripts/init.py`、`scripts/commit.py`、`scripts/transition.py`（命令面裁撤与并入）。依赖：2.4（SUPERSEDED 冻结清单）。验收：R13/R16/R29 绿。
- [x] 2.10 收口折叠【TDD】【装技】：先写测试——`commit verification` 一步完成落盘/绑定/按 verdict 字段转移/PASS 分支 render+validate+COMPLETE（R30）；verdict 值从报告字段读取、不经命令参数；REVISE/REPLAN/BLOCKED 自动转移且越上限写 STOPPED（报告与登记留证）；三个内部边界（已落盘未绑定 / 已绑定未转移 / 已渲染未 COMPLETE）中断后重跑同一命令收敛（R30）；PASS 后内容变化（中断窗口）重跑被 P1 拒绝（R2）；`P3_UNBOUND_CURRENT` 收窄为存量口径。改 `scripts/commit.py`（收口折叠）、`scripts/record_provenance.py`（绑定并入）、`scripts/transition.py`（verdict/complete 不再暴露为模型命令）、`scripts/render.py`（内部调用入口）。依赖：2.4。验收：R1/R5/R8/R14/R30 绿。

## 3. 扩展实施（主体获批后；除标注外 TDD）

- [ ] 3.2 权威让渡规则同步【文档】【装技】（2026-10-26 裁决,替代原"伴随文档登记"任务）:SKILL.md 交付规则与 `agents/verifier.md` 的 D 类检查项加入 design §6 规则——交付物不得声明轮外可变文件为权威;用户裁定入已验证源数据后渲染,或标注为非权威过程记录。无 schema/脚本改动,不新增测试(原 R23 随机制裁撤移除)。依赖:无。验收:grep 两文件含规则原文;`agents/verifier.md` 改动在 1.2 授权范围内。
- [x] 3.3 渲染注释剥离与模板修复【TDD】【装技】（**需 1.2 单列批准**）：先写测试——整行 HTML 注释剥离、半行注释不剥离、剥离在占位符替换前、渲染稿无 5 处填写注释、`# {{title}}` 无重复、未完结轮重渲染字节变化为预期口径。改 `scripts/render.py`、`templates/prd.md`（L5/L10/L37 删并移指引、L21/L33 注释包裹、L1 标题）。依赖：无（与 2.x 并行安全，render.py 与 validate/transition 不同文件；模板独立）。验收：R26 绿；存量已交付稿不动（无重渲染断言）。
- [x] 3.6 既有 P2/P3/P4 补错误码【装技】：errors/warnings 条目加 `code`（`P2_NO_PASS_AT_COMPLETE`/`P3_UNBOUND_CURRENT`/`P4_LEGACY_UNBOUND`）与 reopen 预算守卫新码 `E_BUDGET_EXHAUSTED`，测试断言 code 存在；其余存量 reason 不回填。依赖：2.1（协议字段先行）、2.6（预算守卫）。验收：code 断言绿；reason 文案零变化（既有测试不动）。

## 4. 验证

- [x] 4.1 全矩阵回放：design §9 矩阵逐行（R1–R19、R26、R28–R30；R20–R25、R27 已随 2026-10-26 简化裁撤）在隔离夹具执行，记录命令/退出码/state 与登记册终态；R1–R16 既有行确认无回归。模拟证据与真实运行时证据分开标注。
- [x] 4.2 旧轮只读副本口径【旧数据】：对 `mechunit-collectors` 的 `prd-2026-10-21/pm`（收口 PASS 漂移）与 `prd-2026-10-23/pm`（悬挂+三份历史报告）只读副本运行新 validate，核对 design §11 预期口径（前者 P1 不变、后者历史档不报错+悬挂警告）；不补造、不迁移、不复制进 git。
- [x] 4.3 回归与预算：全量测试（存量 106+新增）绿；调用预算断言（正常链 5 次，supersede/carry 按需另计）更新进 test_lifecycle。
- [x] 4.4 哈希核对与回滚说明：触碰文件改前/改后 SHA-256 清单、回滚步骤、两条安装路径复核、独立副本可运行（不依赖外部目录）。
- [x] 4.5 rc 重估通知【文档】：在本 change verification.md 与 `../harden-rc-pev-closeout/` 各留一条记录——列明 design §0 触发重估的四个变更点（P1 拆分、supersede/SUPERSEDED、事件面合并、code 字段）与新的脚本 SHA 清单，提醒 rc 按其 design 首节规则重锚定后再开工。不改 rc 任何文件。
