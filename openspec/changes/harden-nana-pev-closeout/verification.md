# 第一阶段验证记录（2026-10-22 11:32 +0800）

本次只读采集基线，未修改已安装的 Nana 技能或这次 PM 工作的文件。安装目录的绝对路径为 `/Users/zhengshan/skills/product-manager`；`/Users/zhengshan/.claude/skills/product-manager` 是指向同一目录的符号链接（`ls -la`，退出码 0）。采集范围不含附带的 `.DS_Store`、`.remember/` 和生成的 `__pycache__/`；下表列出程序文件与说明文件。SHA-256 文件哈希由 `shasum -a 256` 取得（退出码 0）：

| 相对安装目录的路径 | SHA-256 |
|---|---|
| `SKILL.md` | `b1b0a48679a011a503fbf130af0ea05a83ccd4269e2ef4d94760338433f58fa2` |
| `agents/executor.md` | `b402ee279fe958481e2bd48dbf628be65f477f7c5fc49610c94c620ebba58d0a` |
| `agents/planner.md` | `80139498a94507b6cfdabc25cba9197bf93b76719d6ed1f4250b56c4fe808b18` |
| `agents/verifier.md` | `ba821aeda554653749011197ed8c95b7db6dbb135cf415ea1e724e347e59f742` |
| `templates/decision.md` | `69a2b8c1a9b5eea6594b580fbd774c6292f364cd502ab4b44347aef4fde99db9` |
| `templates/plan.md` | `1f5377caa47a2a0aa7dd627f835e7e1eb5302432ed9155f3e5eac5470e4e5044` |
| `templates/prd.md` | `bc32c7132fe1fa247e3fff7df0a4c01e45b667ac8f9d4f0e3692a9` |
| `templates/product-opportunity.md` | `93df06f6d5b3e02b19cc41b0e0ec48fa3c8b8f5cd7afafe237dfa3f0ee89ec71` |
| `schemas/artifact.schema.json` | `6b9b84b06d9d5bc036a0825e9ef622e5aa17d301b2290d182d112a44caf766f8` |
| `schemas/plan.schema.json` | `ce40e433c5c8062cd1d1811bb2df27a5d1dfa3584c3ce961b0795819deaf2362` |
| `schemas/state.schema.json` | `1b104fd5f34d231bd73989525b2c51a7a5e26cfe1fb17ebe4f69e0489a17279e` |
| `schemas/verification.schema.json` | `b73c6f70ea6e710a1975fbdebadcc042f4bd31ed29cbeafd5dc921d70aa88921` |
| `scripts/validate.py` | `c30b0b536e43ef054d4e56a18d267856129c5bfcf482bbb86818f3015eaf8b1b` |

这次 PM 工作目录：`/Users/zhengshan/project/mech-unit/mechunit-collectors/.pev/prd-2026-10-21/pm/`。`2026-10-21` 是工作开始日期；用户确认 2026-10-22 会话仍开着。下表只记录采集时的磁盘状态，不是先前处于 EXECUTING 时的快照：

| 相对 PM 目录的路径 | SHA-256 |
|---|---|
| `state.json` | `01361ccbdef0b5b28f157d490e8724041939f8b3fe2cef836ab7ad536d80c27c` |
| `iterations/01-plan.json` | `8687a2a4b8d313e2a402f31144433759544146ac56313f7d19843ed3ad72adfa` |
| `iterations/01-artifact.json` | `397569e2292355a73a3ef475dc4099f1934ec54516f9a21eba84bfc950aa61b4` |
| `iterations/01-verification.json` | `85a6229ccd02fb6987472fbf89d481b1d9a5523315c2ec6f708182ab000dce96` |
| `iterations/02-artifact.json` | `a6962464c52b7711be17b313e0dd7c1436ac493ea31a942b2ff79f9c753b7412` |
| `iterations/02-verification.json` | `78059ca7d4a21329e62d1c7211105c68030aecb8dd446e46b7c213f5fd139e06` |
| `iterations/03-artifact.json` | `44af63177a6cb2d538a0b07673786fcd05941e7863275745aac36ebc27ef6f4c` |
| `iterations/03-verification.json` | `9f5054c2297ce6b684cb0dfe46d173a561fc1b38e977f539d82281311282ff49` |
| `iterations/04-artifact.json` | `08582440d09c228cfc9780e8b198be75078d09ad68c8644b50f9a71efa622371` |
| `iterations/04-proofread.md` | `37bd5f0fea69a78da550a698069f7ab67d81761cc37044a02680a61495636539` |
| `iterations/04-verification.json` | `af3854db1a4f45ff40028b6ccbc0ba9d69b7f7a7e686baa6090833235609c247` |
| `iterations/05-artifact.json` | `de40430c1617746af051f06756da75aa90a4138f3b83ce5416aafc46e41a6c05` |
| `iterations/05-proofread.md` | `7c5388410d70a9cb8d59ab107184d5d5f79ffb1b107dcdce0be8e4c5ad7864f7` |
| `iterations/05-verification.json` | `345b429243741c56384a2ef6ad6522569cc2b002d00a859f7db6e67a561323b2` |
| `output/prd.md` | `c6802e90cbd4d69b654b490346388647ccda033b5546d1b6d98d5207d98c5ab9` |

基线命令及结果：

- `jq '{status,iteration,max_iterations,resume_to,plans,artifacts,evidence_count:(.evidence|length)}' <PM root>/state.json`：预期取得状态快照；实际为 `COMPLETE`、`5/5`、无恢复阶段、一个 Plan、五个 Artifact、36 条 Ledger 记录（退出码 0）。审计提案记录的第 5/5 轮 `EXECUTING` 是更早的现场观察，不是本次采集结果。
- `jq '{verdict}' <PM root>/iterations/05-verification.json`：预期最新 verdict 为 PASS，实际为 PASS（退出码 0）。`jq '{deliverable:.final_deliverable}' .../01-plan.json` 指向 PRD；`jq '(.artifact|keys)' .../05-artifact.json` 列出 PRD 来源字段（退出码 0）。
- `python3 /Users/zhengshan/skills/product-manager/scripts/validate.py <PM root>/`：预期现有检查程序通过，实际返回 `OK: ... 全部产物通过 schema 与语义规则校验`，退出码 0。这不证明最终文档仍对应当时通过检查的内容；尚未运行新测试。
- `ls -l /Users/zhengshan/.claude/projects/-Users-zhengshan-project-mech-unit-mechunit-collectors/892673c5-*.jsonl`：提案原引用的 `892673c5-ed8b-42c6-b8a9-c3545e64ee61.jsonl` 不存在（针对该路径的 `ls` 退出码 1）；审计引用的 `892673c5-1cd6-417a-8cff-557412638027.jsonl` 存在。只读查询主日志时间戳显示：`2026-10-22T01:45:25Z` 最终回复，`01:50:35Z` 迟到的任务交接，`01:50:55Z` 补充回复，`01:51:03Z` 再次结束。这里只保留摘要，不复制私人完整会话。
- 修改前在 OpenSpec 执行 `git status --porcelain=v1 --untracked-files=all`：已有未跟踪的 `.superpowers/sdd/peppy-munching-marshmallow/progress.md`、审计 change 文件，以及本 change 的 `.openspec.yaml`、proposal 和 tasks。`mechunit-collectors` 中已有无关的 docs/selection/test 文件修改及未跟踪的 docs/change/tools/tests；这些不属于该 PM 目录，本次均未修改。

第一阶段检查点：设计草案与提案范围已对齐，但**尚未批准**；任务 1.6 仍等待设计批准与工作区外写入授权。尚未修改 Nana 程序、编写测试数据或重放问题。下一阶段须先批准设计与准确目标、另行取得安装目录写入授权，再重新核对哈希，按先测试后实现的顺序推进。已记录的 PASS 没有写明当时检查了哪个文件版本，不能事后宣称它证明了当前文档可以交付。回滚范围与方法见 `design.md`；不得撤销既有工作区改动。

## 评审修订核验记录（2026-10-22 21:55 +0800）

按外部评审意见把背景时间线写成一级证据。以下为本次只读核验（未修改任何日志或 PM 文件）；主日志指上文 `892673c5-1cd6-417a-8cff-557412638027.jsonl`，所有 jq 输出退出码 0：

- `jq -r '.timestamp' <主日志> | sort | sed -n '1p;$p'`：首行 `2026-10-21T06:28:59.236Z`；`01:40Z` 之后共 82 行。
- 01:44:29.707Z 的 tool_result 为 `1\nOK: /Users/zhengshan/project/mech-unit/mechunit-collectors/.pev/prd-2026-10-21/pm 全部产物通过 schema 与语义规则校验`，对应 01:44:20.238Z 的 `grep -c … && python3 …/validate.py …` 调用；此刻 state.json 尚未改为 COMPLETE。
- 01:44:40.158Z 的 Edit tool_use 目标 `pm/state.json`，old_string 含 `"status": "EXECUTING"`、new_string 含 `"status": "COMPLETE"`；01:44:42Z tool_result 确认成功。
- 01:45:25.105Z 为主会话最后一段交付输出；01:45:27.037Z 起为 system（停止钩子）行。01:50:35.025Z 出现迟到 handback/queue-operation，01:50:55.217Z 为补充回复，01:51:03.885Z 起再次结束。
- 主会话 2026-10-22（UTC）全部 Edit/Write 目标：`pm/state.json` 8 次、`pm/output/prd.md` 1 次（01:44:10.929Z）、`pm/iterations/05-artifact.json` 1 次（01:22:07.977Z，Write，早于 05-verification 落盘）。此前 01:43:22 至 01:44:02 另有多次 grep 检查 `output/prd.md` 内容（检索词含"两个独立配置"、"是否共用"、"评论级时间过滤（选定方案）"、"方案 A："），其中"评论级时间过滤（选定方案）"计数为 0。
- 子代理 `subagents/agent-a5d530fb7eb14469e.jsonl`（meta.json 的 description 为"渲染并校对 PRD v1.5"）在 01:45:32.377Z、01:45:33.684Z、01:45:34.556Z 三次 Edit `pm/iterations/05-artifact.json`，把"商品重访频率沿用现鲜度机制…是否共用同一配置在规格阶段定（默认建议共用）"改写为"两个独立配置（E36）…"；与该文件 mtime 2026-10-22 09:45:36 +0800 吻合（`stat -f` 采集）。
- `pm/iterations/` mtime（`stat -f`）：`05-verification.json` = 2026-10-22 09:27:07 +0800，`05-artifact.json` = 09:45:36 +0800。两者先后关系表明：盘上 `05-artifact.json` 的最后写入晚于 `05-verification.json` 的 PASS 落盘约 18 分钟，且写入者不是主会话（主会话对该文件的唯一 Write 在 01:22:07.977Z）。
- 本记录把上表（11:32 采集）中 `05-artifact.json` 的哈希 `de40430c…` 对应为 01:45:32–34 改写后版本的哈希；11:32 采集时未意识到该文件晚于 PASS 落盘，此点由本次核验补充。

## 第二轮评审核验记录（2026-10-22 22:20 +0800）

评审指出排除集合与 schema 字段不符。以下只读核验确认（均退出码 0）：

- `jq -r 'keys[]' <PM root>/state.json`：顶层键为 `artifacts`、`assumptions`、`business_context`、`evidence`、`hypotheses`、`iteration`、`known`、`max_iterations`、`metrics`、`objective`、`opportunities`、`plans`、`status`（不含 `resume_to`，当前无恢复阶段）。`~/skills/product-manager/schemas/state.schema.json` 的 properties 同集外加 `resume_to`。不存在名为"验证史"或"备注"的字段。
- `jq -r '.known | type, length' <PM root>/state.json`：数组、15 个元素。逐元素查看：第 1–14 条为业务事实与用户裁定；第 15 条以"验证史（2026-10-21/22）：iteration 2 验证 REVISE 纠正…"开头，即流程记录写入了 `known`。01:44:48Z 主会话对 `state.json` 的第二次 Edit 的 old/new_string 即为该元素（与上文 21:55 核验记录中的 Edit 内容吻合）。
- `jq -r '.properties | keys[]' ~/skills/product-manager/schemas/verification.schema.json`：`confidence`、`critical_issues`、`evidence_gaps`、`required_changes`、`strengths`、`verdict`、`warnings`——无快照/来源字段，`provenance` 需按 `design.md` 新增。
- `grep -n "验证史\|验证历史\|known" ~/skills/product-manager/SKILL.md`：仅 157 行命中——"背景事实写入 `state.known`"。SKILL.md 无"验证史"字样的显式指令，该元素是主会话收口时自行把验证结论当作背景事实合并进 `known` 的产物；实施 2.4 同步 SKILL.md 时应显式写明禁止。

## 脚本化审计实测记录（2026-10-23 08:35 +0800）

为 `scripting-audit.md` §3 提供可复核记录（合成夹具，与真实 PM 数据无关）：

- 夹具构造：`/tmp/nana-scripting-t1/pm/`——`state.json`（`VERIFYING`、`iteration=1`、`max_iterations=5`、登记册与文件对齐）、`iterations/01-plan.json`（最小合法 Plan，`final_deliverable="PRD 文档"`、`plan` 一项 `action="draft"`）、`iterations/01-artifact.json` 内容为 `{"status":"completed","artifact":{}}`。无 verification 文件（R5 未触发，与测试目的无关）。
- 命令：`python3 /Users/zhengshan/skills/product-manager/scripts/validate.py /tmp/nana-scripting-t1/pm/`
- 结果：`OK: /tmp/nana-scripting-t1/pm 全部产物通过 schema 与语义规则校验`，退出码 0。
- 含义：A 类通过、R1–R5 不触及 artifact 正文，B/C 类检查在现有脚本中不存在；空正文"完成"产物可携 `status="completed"` 通过 Artifact 校验直达 Verifier 派发。测试未覆盖渲染路径；夹具留在 /tmp 不入 git。

## 设计批准与授权记录（2026-10-23 13:17 +0800）

- 用户在本会话明确：批准 `design.md`（2026-10-23 12:55 版）全部范围——原收口 + 脚本化扩展，按 tasks.md 1.7 的合并批准口径；授权实施期间写入 `~/skills/product-manager/`（`~/.claude/skills/product-manager` 经 readlink 实测指向同一目录）。
- 用户确认最后评审 5 项问题已全部解决，以 design.md 2026-10-23 12:55 版为评审终稿；此前本记录无法核验的其余三项以此为准。
- "夹具"术语按首现加注处理：proposal.md 第 30 行已加"（test fixture，预置测试数据）"。
- tasks.md 1.6 就此勾选；实施自第 2 节起，先测试后实现。

## 任务 2.1 测试基座记录（2026-10-23 13:35 +0800）

- 新增 `~/skills/product-manager/tests/`：`__init__.py`、`helpers.py`（合成夹具构造器、规范化 SHA-256、脚本运行器）、`test_closeout.py`。全部为合成数据，未触碰任何真实 PM 目录。
- 运行命令（skill 根目录）：`python3 -m unittest discover -s tests -t .`，Python 3.12.13。
- 结果：20 例。基线组 14/14 通过（更正：本节初稿曾记"14/14"，当时实际为 13/14——`test_r4_registered_but_missing_file_rejected` 因夹具登记册被 flush 覆盖而失败，2026-10-23 13:52 修复 helpers 的 state 赋值播种逻辑并逐例复验后才为 14/14）——固定现行 validator 保留行为（R1–R5 反例、截断 JSON 报错、未知名拒收、INIT 无产物/VERIFYING 未交报告/REVISE 复用旧 Plan 等合法中间态放行）。缺口组 6 例全部失败且失败原因均为预期：5 例断言新契约被现行 validator 以退出 0 放行（空 `completed` 正文、无任何 PASS 即 COMPLETE、PASS 后改 Artifact、PASS 后改 state 语义字段各复现一类原始事故；旧式无绑定 PASS 的"不可交付"警告尚不存在），1 例失败于 stdout 尚为人类可读文本、非新 JSON 协议。
- 缺口组即任务 2.3/2.7 的实现契约（先红后绿）；渲染负例与生命周期场景分别在任务 2.2、2.6 先写测试后实现，委派未完成场景归 3.2 模拟通知。

## 任务 2.2 渲染器记录（2026-10-23 14:15 +0800）

- 新增 `scripts/render.py`（渲染/`--check` 字节比对/`--prune` 清残留三模式）与 `scripts/_common.py`（六脚本共享的 JSON 协议、规范化 SHA-256、state 投影工具）；新增 `tests/test_render.py` 36 例，先全部变红后实现转绿。
- 契约钉死点：`final_deliverable` 三级判定（`templates/<name>.md` 恰一引用 → 别名精确匹配 → 拒绝并附合法集合）；转义三分（表格行 `\` `|` 转义且换行变空格、独占一行占位符正文逐字、其余行内转义 `\ * _ \` [ ] < >`）；列表连接（正文换行、行内/表格 `"; "`）；可选字段与豁免字段缺席渲染为空；未替换占位符拒绝发布；发布前残留 `.md` 拒绝并指名文件；`--prune` 只删非当前目标且返回 `deleted` 数组；写失败旧文件原状保留且临时文件清理；`--check` 覆盖 `output/` 全部文件。
- 运行命令同 2.1；结果：`test_render` 36/36 绿，全量 56 例中除 5 个预期红外全绿。`design.md` 未逐字指定的两处按台账裁定实施：`--check` 旗标名、报告复述字段名 `verification_input`（2.6 commit 按此对账）。

## 任务 2.3 校验器与来源绑定记录（2026-10-23 14:45 +0800）

- `scripts/validate.py` 重写为统一 JSON 协议输出（保持只读、退出码 0/1、兼容旧位置参数调用），R1–R5 语义保持；新增 P1（对每个带 `provenance` 的报告按当前文件复算三摘要，不一致报冲突路径与恢复动作）、P2（COMPLETE 收口门：当前轮无 verification、或 verdict 非 PASS 即报错）、P3（VERIFYING 当轮未绑定 → 警告"不可消费 verdict、不可交付"）、P4（旧轮次/COMPLETE 旧数据缺绑定 → 警告"旧轮次缺绑定，格式或仍有效但不可交付"——design:27"报错"按 design:15"格式可通过但须明确指出"落为警告，台账有记）；schema 子集新增 `pattern` 支持；`iterations/<N>-verification-input.json` 按 `verification-input.schema.json` 路由且不入登记册对账。
- 新增 `scripts/record_provenance.py`：默认模式计算三摘要原子写快照（幂等重跑不重写；输入已变且尚无绑定 PASS 时原位重写并重新派发；已有绑定 PASS 拒绝重写）；`--bind` 要求报告 `verification_input` 与快照逐字段一致、复算一致才把 `provenance` 写进当轮报告（幂等；成功返回 `transition.py verdict` 作为下一步）。
- schemas：新增 `verification-input.schema.json`；`verification.schema.json` 增可选 `verification_input`（报告复述）与 `provenance`（绑定）；`state.schema.json` 增追加式 `transitions`、evidence 条目 `required` 增 `id` 并限 `^E[1-9][0-9]*$`（存量 E1–E36 已符合，真实 PM 数据 2026-10-22 采集时已核有 id）。
- 测试：`tests/test_closeout.py` 扩至 35 例（快照契约 5、绑定 6、validate 协议 4）。全量 71 例中 70 绿，唯一红为 `test_empty_completed_artifact_rejected`（B 类缺口，任务 2.7 的实现契约，保持预期红）。

## 任务 2.5–2.7 完成与检查点记录（2026-10-23 15:30 +0800）

- `scripts/init.py`（`--objective` 建轮次与 state；仅 `goal` 缺失置 WAITING；同日同目标幂等报告现状、新目标追加 `-2/-N`；重建沿用原名；`--locate` 恢复定位）、`scripts/commit.py`（plan/artifact/verification/state-update；编号=当前轮；守卫序=绑定 PASS→阶段匹配→编号；state-update 仅八语义路径，evidence 同 id 整条替换；artifact 内联 A/B/C 门；写后校验随返回）、`scripts/transition.py`（11 事件含 `resume --invalidate-plan` 变体；重跑三分支为纯函数；越上限写 STOPPED；`reopen` 须 `--note`、`authorized-resume` 须 `--max-iterations`）。
- `tests/test_lifecycle.py` 28 例先红后绿，覆盖 design 验收场景表全部行、提交四写入边界重跑收敛、事件身份幂等（不二次 +1、resume 已恢复）、历史轮保护、5/5 完成、越上限 STOPPED 与授权恢复、调用预算（≤13 次且无显式 validate.py）。
- `validate.py` 增 `check_b_c`（B 类豁免生效；C 类 final_deliverable 可解析、Ledger id 唯一、evidence_ref 可解析）；`schemas/artifact.schema.json` 新增 `waived_fields`（初版漏做，本轮补齐）。
- 全量回归 101/101 绿（含 3.2 增补两例）。旧 validator 重建件 SHA-256 与采集基线逐字节一致（`c30b0b53…`），采集版 schemas 取自 `~/skills/pev-skills-backup-20261021-1529-pre-restore.tar.gz`（4 件哈希与基线一致）。
- Nana 本地 diff 审查：相对采集基线，CHANGED=SKILL.md、agents/verifier.md、schemas/state.schema.json、schemas/verification.schema.json、schemas/artifact.schema.json、scripts/validate.py（全部在 design.md:152 批准清单）；templates/ 4 件未动；playbooks/ 3 件为采集范围外既有文件；新增件=_common/init/commit/transition/render/record_provenance + tests/ 5 件 + verification-input.schema.json。
- 新 validator 对 `/tmp/nana-scripting-t1/pm`（审计夹具）由放行转拒绝（退出 1，先因 C 类 `final_deliverable="PRD 文档"` 不合新契约；空正文 B 类由 `test_empty_completed_artifact_rejected` 钉死）。

## 第 3 节验证记录（2026-10-23 16:00 +0800）

**3.1 旧版/修订版对比（同一份未改动历史副本）**。副本：`…/sdd/harden-nana-pev-closeout/v31-old/pm-copy`（15 个文件，复制自 mechunit PM 目录，只读）。Python 3.12.13。

- 旧 validator（重建件，哈希=基线）+ 采集版 schemas（4 件哈希=基线）：`python3 …/v31-old/old-schemas-dir/old_validate.py …/pm-copy` → 退出 0，`OK: … 全部产物通过 schema 与语义规则校验`——与 2026-10-22 采集时记录一致。
- 修订版 validator：`python3 ~/skills/product-manager/scripts/validate.py --pm-root …/pm-copy` → 退出 1：1 个 B 类错误（`iterations/05-artifact.json $.artifact.in_scope 必填数组不能为空`——真实交付 PRD 的 in_scope 为空数组）+ 5 条 P4 警告（历轮 PASS 无 provenance，"旧轮次缺绑定，格式或仍有效但不可交付"）。预期差异成立：旧版放行的事故副本，修订版明确不可交付；旧数据缺来源证明未被静默认证、未补造。
- 完整回归套件：`python3 -m unittest discover -s tests -t .` → 101/101 绿，约 7.5 秒，无跳过的检查。

**3.2 PASS 后收口回放（合成夹具）**。已在测试中固化：PASS 后改 Artifact（`test_artifact_modified_after_bound_pass_rejected`、`test_complete_refuses_after_pass_content_change`）、仅改 Ledger（`test_ledger_only_change_after_bound_pass_blocks_complete`：补丁写入不回滚但 P1 拦交付资格，complete 拒绝）、纯渲染修复（`test_hand_edited_output_replaced_by_rerender`：手工改动被重渲染覆盖、--check 恢复绿）、渲染失败不发布（`test_missing_required_field_no_publish_and_old_preserved`）、四写入边界中断重跑收敛（`test_commit_rerun_converges_from_partial_states`）、迟到报告（绑定 PASS 后覆盖提交被拒，`test_overwrite_refused_after_bound_pass`）、重复通知（重跑 verdict 判已执行不重复收口，`test_transition_rerun_after_success_no_double_increment`）、报告缺失（`test_complete_refuses_when_pass_unbound`）、5/5 边界（`test_complete_55_passes`）。核对输出与来源一致由 `render.py --check` 字节比对承担。以下为模拟证据，与真实运行时证据分开：模拟的迟到/重复通知是夹具中的磁盘事件回放，只覆盖 Nana 的磁盘收口逻辑；Claude 实际何时发送通知、重复通知是否再次唤醒会话是外部限制，未验证、不在本 change 范围。

**3.3 性能口径**。记录实测：回归套件 101 例约 7.5 秒；单次 validator 调用秒级。不做历史性能对比、不从文件大小或 cache-read 总量推断节省（tasks 3.3 明确不强求）。验收标准是正确收口与忠实可复现输出，已由上两项满足。

**3.4 影响面核对（2026-10-23 16:00 +0800）**。mechunit PM 数据 15 个文件 SHA-256 与 2026-10-22 11:32 基线全部一致（本次工作未触碰）；`~/.claude/skills/product-manager` 经 readlink 指向 `/Users/zhengshan/skills/product-manager`（同一目录）；近 200 分钟内 product-manager 之外无任何技能文件改动；单独复制 Nana 到 `/tmp/nana-standalone-check` 后，不依赖 `_pev/` 完整跑通 101 例测试、`render.py` 与 `validate.py`（对不合法夹具按预期退出 1）。其他技能、OpenSpec 运行时、`~/skills/_pev/` 均未修改。

**3.5 脚本化链路验收**。design 验收场景表 13 行由 `tests/test_lifecycle.py`（28 例）+ `test_closeout.py` 缺口组回放覆盖，逐场景断言命令退出码与 state/transitions/登记册终态；"旧轮次缺绑定"报错口径见 3.1 修订版输出；模拟证据与真实运行时证据已分开标注；Claude 通知传输保持为外部限制。遗留限制汇总：脚本不能识别写入者身份、不能阻止代理绕过工具直接回复（design"边界与不承诺"）；模板未修改；`f696d3cd…`（备份中 2026-10-21 版 validate.py）与采集版差异未单独考证（采集版已按哈希重建，行为比对使用采集版）。

## 评审修复轮记录（2026-10-23 15:55 +0800）

用户评审 4 项（均已对照代码核实成立），先写 5 个回归测试（全红）再修，全量 106/106 绿：

1. **HIGH 定位选错轮次**：`init.py` 的 `--locate` 原按目录名字符串排序，`prd-…-10` 判早于 `prd-…-9`（用户已复现）。修复：新增 `round_sort_key`（日期 + 数值序号），`do_locate` 按键比较。回归：`test_locate_sorts_numeric_suffix`。
2. **HIGH 文档命令缺 `--pm-root`**：SKILL.md §2/§3/§4 的完整命令示例与多处行内命令缺首参（用户实测退出 1）。修复：全部完整示例补 `--pm-root <pm 目录绝对路径>`；行内事件引用改为"`transition.py` 的 `xxx` 事件"句式；交接协议新增首条规则"除 init.py 外首参固定 `--pm-root`，一律原样执行 `next[].argv`"。回归：`test_skill_md_command_examples_carry_pm_root`（正则扫描全文命令形行内码，须含 `--pm-root`）。
3. **MEDIUM 活跃轮次不查状态**：`init.py` 同目标幂等复用未排除 COMPLETE/STOPPED，且幂等分支 `next` 固定为重新起草 objective。修复：活跃白名单 {INIT, PLANNING, EXECUTING, VERIFYING, WAITING_FOR_INPUT}，终局轮次同目标重开自动新建 `-N` 轮次；幂等分支按状态给 `next`（INIT→start-planning、WAITING→ask-user、其余只读汇报）。回归：`test_init_same_goal_terminal_round_starts_new_seq`、`test_init_active_round_idempotent_next_follows_status`。
4. **LOW authorized-resume 未校验提额**：`transition.py` 原只查 `--max-iterations` 为正整数。修复：新上限必须严格大于当前 `max_iterations`，否则拒绝。回归：`test_authorized_resume_rejects_non_increase`（构造 5/5 STOPPED 后以 5 提额 → 退出 1）。
