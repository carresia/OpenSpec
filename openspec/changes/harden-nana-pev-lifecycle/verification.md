# 验证记录

## 基线采集（2026-10-25 20:31–20:39 +0800，只读）

采集对象（2026-10-25 时点）：`/Users/zhengshan/skills/product-manager/`（`~/.claude/skills/product-manager` 指向同一目录，本节 ls 核对；2026-10-26 起正本迁至 `/Users/zhengshan/project/ai/pev-skills/product-manager/`，见下节迁移记录，SHA 经新址复核一致）。采集时点 skills 目录非 git 仓库，以 SHA-256 为准。与 `../harden-rc-pev-closeout/design.md` 首节锚定（2026-10-23 16:38 采集）对照：

| 脚本 | SHA-256 前 16 位 | mtime | 对照锚定 |
|---|---|---|---|
| `_common.py` | `7477d4cc6e66c008` | 10-23 14:05 | 一致 |
| `commit.py` | `1e38ec0e5a53b60c` | 10-23 14:32 | 一致 |
| `init.py` | `b4a8f09dc9c5fa2d` | 10-23 15:47 | 一致 |
| `record_provenance.py` | `c3305f140ab68089` | 10-23 14:06 | 一致 |
| `render.py` | `4a7a3432eaf9bf22` | 10-23 14:06 | 一致 |
| `transition.py` | `b9a4188cc8d3f600` | 10-24 19:05 | **不一致**（锚定 `b55a019a7d0863f4`） |
| `validate.py` | `837d68a8c157ea9e` | 10-23 14:46 | 一致 |

transition.py 差异溯源：非本会话所为；系重放主会话中用户要求"把每个命令对应的触发场景记录在 transition 脚本中"（会话日志 `7ec63d1b-529c-417c-acd9-8f68b8b40066.jsonl` L1074，2026-10-24），该会话当日执行（L1100）并复测 106/106 绿（L1141）。注释性修改、无行为变化的结论依据：该会话记录 + 本节下方复测；差异的逐行内容未比对（盘上无锚定版副本）。

测试基线：`python3 -m unittest discover -s tests`，2026-10-25 20:33 实测 `Ran 106 tests in 8.571s`，`OK`（test_closeout 35 + test_lifecycle 35 + test_render 36，`grep -c 'def test_'` 计数）。

## 设计取证记录（2026-10-25，只读）

按 proposal 证据规则分类的一级来源与核对方式：

- **重放对比报告**：`/Users/zhengshan/project/mech-unit/mechunit-collectors/.pev/prd-replay-2026-10-23/replay-report/comparison.md`，全文通读（2026-10-25 20:23）。引用处均以该文件章节/行（§二 轮 2、§三 #1–#12、§四、§五）为定位。
- **重放主会话日志**：`~/.claude/projects/-Users-zhengshan-project-ai-OpenSpec/7ec63d1b-529c-417c-acd9-8f68b8b40066.jsonl`（用户原指令所写 `7ec63d1b-…417a…` 路径不存在，`417c` 为实际文件，已核实）。经只读取证子代理按行号提取（L15/L96/L227/L388/L587/L1041/L1068/L1074/L1100/L1141/L1203/L1215），关键结论本会话按行号引用。快照性质：文件 mtime 2026-10-25 20:22，最后消息时间戳 2026-10-25T11:52:59Z；写入该文件的会话进程是否已退出未获运行时确认，引用内容以其落盘文本为准。
- **被测重放会话日志**：`~/.claude/projects/-private-tmp-nana-replay2-mechunit-collectors/7de6cec5-b96f-4af7-a1b8-72930f2f8d59.jsonl` 存在性核实；内容经 comparison.md 转引，未直接通读。
- **代码亲验**（本会话直接读源，非转引）：`scripts/validate.py:179-213`（P1 复算用当前 state 投影，L211）；`scripts/init.py:43-63`（active_round_with_same_goal 活跃集）、`66-71`（round_sort_key 正则与 `("", -1)`）、`74-89`（locate 取最大排序键）；`scripts/transition.py` reopen 分支 grep（L10/L18/L182/L208，--note 必填）；`templates/prd.md:1/5/10/21/33/37`（填写注释）。
- **渲染泄漏现场复核**：`/tmp/nana-replay2/mechunit-collectors/.pev/prd-2026-10-23-2/pm/output/prd.md`，2026-10-25 20:38 grep 命中 L5「（含证据引用）」、L10「（baseline → target）」、L26「（为什么对应根因：…」、L56–L61「（现有 / 需新增）」×6。
- **工作区散件复核**：`/tmp/nana-replay2/mechunit-collectors/.pev/` 目录清单，2026-10-25 20:38：16 个草稿/补丁文件 + `round-2026-10-23/` 空目录 + 六个轮次目录，与 comparison.md §三 #12 所引 `file-manifest.json` 口径一致。
- **verifier issue 实例**：`/tmp/nana-replay2/mechunit-collectors/.pev/prd-2026-10-23/pm/iterations/01-verification.json`（critical_issues 4 条）、`02-verification.json`（1 条），由取证子代理 2026-10-25 盘上核对；逐字比对与"漏检"判读出处为主会话日志 L1203（2026-10-24T11:43:40Z 分析），本 change 照引其原文结论（含"不可断言 verifier1 再看必能抓到"）。
- **既有 change 正本**：`../harden-nana-pev-closeout/` 四件+scripting-audit、`../harden-rc-pev-closeout/` 三件，全文通读（2026-10-25 20:24–20:31）。
- **v1 完成注记与重放判读的矛盾核实**：tests/ grep `late|duplicate|notif|handback` 仅命中无关用例名（`test_locate_reports_latest_round` 等 5 条，2026-10-25 20:32）；v1 verification.md:126 的九类场景映射与 comparison.md §三 #9 的"无对应实现"判定并存——定案为：磁盘守卫测试存在、通知场景建模的专用夹具不存在，proposal P1-4 按此表述。
- **记忆佐证**：`nana-replay-experiment-20261023.md`、`nana-new-version-e2e-test-20261023.md`（后者 originSession `1efebbd5-…`，其"改名轮排序"瑕疵与现行代码 `("", -1)` 行为互相印证；`-N` 序号数值排序部分已随 `e8e5f25` 修复，见主会话日志 L4）。

## 待后续任务填写的记录区

任务 1.1 重锚定、任务 4.1–4.5 的命令/退出码/终态记录，实施时按节追加于此。本 change 处于设计阶段，未改动任何技能文件内容（上表 SHA 采集为只读）；下节迁移为部署动作，内容零改动。

## 迁移与部署记录（2026-10-26 08:58–09:12 +0800）

**pev-skills 仓库（既有事实，非本 change 所建）**：`/Users/zhengshan/project/ai/pev-skills/` 由用户于 2026-10-26 08:06 前建成，含 9 个 PEV 技能（product-manager、requirement-clarify、behavior-decompose、architecture-design、module-design、api-and-interface-design、database-schema-design、planning-and-task-breakdown、incremental-implementation——成员与 `~/skills/pev-skills-backup-20261011.tar.gz` 所录家族一致）、README.md 与 .gitignore（排除 `.remember/`、`.claude/`、`__pycache__/`、`*.pyc`、`.DS_Store`）。单提交 `d1d1a6d`（"chore: import 9 PEV workflow skills from ~/skills"），origin `git@github.com:carresia/pev-skills.git`，`git status --short` 为空。

**逐字节复核**：`diff -r -x .DS_Store -x __pycache__ -x .remember` 对 9 技能逐一比对 ~/skills 旧树与 pev-skills，除 behavior-decompose 的 `.claude` 本地目录（66 字节 settings.local.json，见下）外全部一致；PM 七脚本 SHA-256 与上表 2026-10-25 基线逐一相同（含 transition.py `b9a4188cc8d3f600`）。

**部署切换（本会话按用户 2026-10-26 指令执行）**：①按既有惯例打备份 `~/skills/pev-skills-backup-20261026-0910-pre-symlink.tar.gz`（694,164 字节，含全部运行时目录）；②旧树各技能 `.remember/`（8 个，planning-and-task-breakdown 无）与 behavior-decompose 的 `.claude/` 移入 pev-skills 对应目录（gitignore 范围内，git 状态仍干净）；③旧树 9 个技能目录删除并替换为符号链接 `~/skills/<name> → /Users/zhengshan/project/ai/pev-skills/<name>`，`~/.claude/skills/<name>` 原有绝对链接不变、经链式解析到位——`readlink -f ~/.claude/skills/product-manager` 等抽查全部解析至 pev-skills；④新树跑 PM 全量测试 `Ran 106 tests in 8.449s`，OK。旧树内容不再存在独立副本（回收途径：git 提交、上述 tarball、`pev-skills-backup-20261021-1529-pre-restore.tar.gz` 等 5 份历史备份）。

**与 `../harden-rc-pev-closeout/` 的联动**：该 change verification.md 增补节原留"符号链接重指待拍板"门槛——用户 2026-10-26 指令（"pev 涉及到的所有 skills 的优化地址都改为 pev-skills，使用 git 追踪"）即该拍板，已按上段执行；其 tasks 第 2 节的该门槛视为解除，执行记录由本节与该 change 自身的增补记录共同承载。

## 实施基线与批准记录（2026-10-26 14:47 起，任务 1.1–1.3）

**批准（任务 1.2）**：用户于 2026-10-26 14:47 下达「`openspec/changes/harden-nana-pev-lifecycle/tasks.md` 开始执行」。按 design §13 批准清单记为三项批准同时放行：① design 全文（含 §1.1 事件面合并与收口折叠、§1.2 四条判据、§2 P1 拆分）；② `templates/prd.md` 修改（design §7，单列批准，含标题 `# {{title}}` 定案）；③ 实施期写入 `/Users/zhengshan/project/ai/pev-skills/product-manager/` 的授权（每任务一提交、提交信息引用任务号）。

**实施分支**：pev-skills 仓库自 main（单提交 `d1d1a6d`、`git status` 干净，2026-10-26 14:49 核对）切出分支 `harden-nana-pev-lifecycle` 实施；回滚 = 对单提交 `git revert` 或整分支弃置（main 自 `d1d1a6d` 起未被触碰）。

**基线清单（任务 1.1，2026-10-26 14:49 采集；`.remember/` 运行时数据在 pev-skills .gitignore 内，不入清单）**：

| 文件 | SHA-256 前 16 位 | mtime |
|---|---|---|
| SKILL.md | `793f4debeabe85a8` | 10-23 15:55 |
| scripts/_common.py | `7477d4cc6e66c008` | 10-23 14:05 |
| scripts/commit.py | `1e38ec0e5a53b60c` | 10-23 14:32 |
| scripts/init.py | `b4a8f09dc9c5fa2d` | 10-23 15:47 |
| scripts/record_provenance.py | `c3305f140ab68089` | 10-23 14:06 |
| scripts/render.py | `4a7a3432eaf9bf22` | 10-23 14:06 |
| scripts/transition.py | `b9a4188cc8d3f600` | 10-24 19:05 |
| scripts/validate.py | `837d68a8c157ea9e` | 10-23 14:46 |
| schemas/artifact.schema.json | `fda886c3927237e0` | 10-23 14:52 |
| schemas/plan.schema.json | `ce40e433c5c8062c` | 09-19 20:31 |
| schemas/state.schema.json | `dcda64a754fdfacb` | 10-23 14:04 |
| schemas/verification-input.schema.json | `50d065e73108f81d` | 10-23 14:03 |
| schemas/verification.schema.json | `056b55e51e5c94a3` | 10-23 14:03 |
| templates/prd.md | `bc32c7132fe1fa24` | 09-20 11:50 |
| templates/decision.md | `69a2b8c1a9b5eea6` | 09-20 11:50 |
| templates/plan.md | `1f5377caa47a2a0a` | 09-20 11:50 |
| templates/product-opportunity.md | `93df06f6d5b3e02b` | 09-20 11:50 |
| agents/verifier.md | `61b095f1cfb8cd5c` | 10-23 14:19 |
| agents/planner.md | `80139498a94507b6` | 09-20 11:49 |
| agents/executor.md | `b402ee279fe95848` | 09-20 11:49 |
| playbooks/requirement.md | `78a43521c6a9a313` | 09-20 11:50 |
| playbooks/discovery.md | `d28d851cc24ba46a` | 09-20 11:49 |
| playbooks/data-analysis.md | `bf4da5e7ebada52d` | 09-20 11:50 |
| tests/__init__.py | `e3b0c44298fc1c14`（空） | 10-23 13:23 |
| tests/helpers.py | `7071c277ed707aee` | 10-23 13:41 |
| tests/test_closeout.py | `405f76b9570fafa7` | 10-23 14:47 |
| tests/test_lifecycle.py | `2462235b69bbc0b9` | 10-23 15:54 |
| tests/test_render.py | `94ebbf777aabdeb9` | 10-23 13:57 |

七脚本 SHA-256 与本文件首节 2026-10-25 基线逐一一致（含 transition.py `b9a4188cc8d3f600`，与 rc 侧重锚定值相同）。全量测试 `python3 -m unittest discover -s tests`（2026-10-26 14:50 实测）：`Ran 106 tests in 8.687s`，`OK`。符号链接链复核（2026-10-26 14:48）：`~/.claude/skills/product-manager` → `~/skills/product-manager` → `/Users/zhengshan/project/ai/pev-skills/product-manager`，`readlink -f` 解析到位。mechunit 仓库真实轮次数据零触碰。

**夹具策略（任务 1.3）**：本 change 全部测试夹具为合成最小 JSON，由测试代码在临时目录现场生成；禁止复制 mechunit-collectors 真实轮次产物。真实数据仅任务 4.2 只读核验用：以路径引用并记录运行结果，内容不复制进 git。

## 实施与验证记录（2026-10-26 14:47–16:30，任务 2.x/3.x/4.x）

实施自 pev-skills 主提交 `d1d1a6d` 切出分支，每任务一提交、信息引用任务号：`143b7ab`(2.1) `8bed59b`(2.2) `b5e5f3b`(2.4) `651414b`(2.5) `3cfc797`(2.9) `07f0791`(2.10) `4c43549`(2.6) `d00a176`(3.3) `4ef0475`(3.6) `2e0e9c5`(2.8) `6097760`(3.2)。

**分支拓扑事实（2026-10-26 17:30 核对）**：并行会话在 `harden-rc-pev-closeout/` change 的实施期间切换了 pev-skills 共享工作树的分支，本 change 2.6 之后的五个提交（`4c43549`→`6097760`）实际落在 `harden-rc-pev-closeout` 分支上，与该 change 的三个提交（`09adb89`/`6edfe06`/`69b77b8`，均只触碰 `product-manager` 之外的 requirement-clarify 子树）交织；`harden-nana-pev-lifecycle` 分支名停在 `651414b`（前六个提交）。11 个任务提交全部完好、链完整（`d1d1a6d → … → 651414b → rc×3 → 4c43549 → … → 6097760`）；因交织，无法把两 change 的提交拆进互不包含的分支，合并顺序由用户决定（建议整链合入 main，两 change 验证记录各自覆盖自身范围；rc 侧 50/50 测试与 PM 侧 151/151 测试均在包含双方的树上通过）。

### 任务 4.1 全矩阵回放（隔离夹具，模拟证据）

命令：`python3 -m unittest discover -s tests -v`（每用例独立临时目录合成 JSON）。结果：`Ran 151 tests in 11.039s`，`OK`，退出 0。R1–R19、R26、R29、R30 均由单元/集成测试覆盖；R28 为 4.2 的真实只读副本核验。矩阵行 → 测试映射：

| 矩阵行 | 覆盖测试（test_lifecycle / test_closeout / test_render） |
|---|---|
| R1 正常链 5 次固定调用 | `full_chain_to_complete`、`call_budget_normal_chain`（断言 =5） |
| R2 PASS 后改 artifact/中断窗口 | `rerun_after_pass_content_change_rejected_by_p1`、`pass_content_change_in_window_rejected`、`artifact_modified_after_bound_pass_rejected` |
| R3 PASS 后改 state 语义字段 | `ledger_change_on_disk_blocks_closeout_rerun`、`state_semantic_field_changed_after_bound_pass_rejected` |
| R4 手改最终文档 | `hand_edited_output_replaced_by_rerender`、render `check_detects_hand_edit` 组 |
| R5 缺 verification/非 PASS | `verification_refuses_without_snapshot`、REVISE/BLOCKED 分支组 |
| R6 reopen 后旧 PASS 不可消费 | `old_pass_not_consumable_after_reopen` |
| R7 supersede 后写入冻结 | `all_writes_frozen_after_superseded`、`supersede_idempotent_rerun` |
| R8 reopen 死路解除（核心） | `reopen_full_script_replay` |
| R9 REVISE 中途追加证据 | `revise_midway_evidence_append` |
| R10 P1 复算不符 + code | `authority_projection_mismatch_carries_code` 等 P1 组 |
| R11 截断 JSON/空 artifact | `truncated_json_reported`、`empty_completed_artifact_rejected` |
| R12 合法中间态 | `init_state_without_any_artifact_passes` 等基线组 |
| R13 5/5 与提额恢复 | `complete_55_passes`、`resume_raise_limit_records_new_max`、`upper_limit_writes_stopped_and_authorized_resume` |
| R14 REVISE 复用 Plan | `revise_reuses_plan_no_new_plan_file` |
| R15 reopen 预算守卫 | `reopen_budget_exhausted_rejected_before_write` |
| R16 resume 三变体 | `resume_rerun_after_resume_to_cleared`、`invalidating_resume_goes_replan`、raise-limit 组 |
| R17 换轮/携账本 | `carry_from_terminal_source_carries_projection`、`init_same_goal_terminal_round_starts_new_seq`、`init_same_goal_after_superseded_starts_new_round` |
| R18 悬挂轮只读发现 | `locate_full_inventory_and_hanging_warning` + 4.2 实测 |
| R19 改名轮 locate | `locate_renamed_round_reported_not_selected`、`locate_all_unmatched_reports_none_locatable` |
| R26 模板注释剥离/标题 | `TestTemplateComments` 5 例 |
| R28 真实旧轮副本口径 | 4.2 节（真实运行时证据） |
| R29 事件面合并 | `TestEventSurfaceMerge` 8 例 |
| R30 收口折叠 | `TestCloseoutFold` 7 例 |

R1–R16 既有行无回归：存量 106 例全部保留（2 例 `--bind` 专属用例随命令裁撤并入 commit verification 等价用例、其余随命令面改造更新断言），新增 47 例，合计 151。本节全部为模拟证据；真实运行时证据见 4.2。

### 任务 4.2 旧轮只读副本口径（真实数据，快照 2026-10-26 16:05–16:12）

副本位置 `/tmp/nana-verify-42a/`（cp 自真实目录，运行后原目录零触碰；内容不复制进 git）。**A 轮** `mechunit-collectors/.pev/prd-2026-10-21/pm/`（源：`/Users/zhengshan/project/mech-unit/mechunit-collectors/.pev/`）：

- 盘上事实：status=COMPLETE、iteration=5；`05-verification.json` verdict=PASS 但**无 provenance 字段**；`05-artifact.json` 的 `in_scope` 为空数组。
- **事实修正（design §11 前提）**：该轮盘上并无"已绑定的收口 PASS"，design §11 所述"收口 PASS 的 artifact 已被改写"与盘不符；该场景（a5d530fb 型）由合成夹具 `complete_closeout_pass_drift_still_p1` 覆盖并验证 P1 硬拦不变。
- 新 validate：exit 1——B 错误（`05-artifact.json $.artifact.in_scope` 必填数组空）+ 5 条 `P4_LEGACY_UNBOUND`（01–05 报告均无绑定）。
- 旧 validate（`d1d1a6d` 版，同副本对照）：exit 1——同 B 错误 + 同五条 P4（无 code 字段）。
- 结论：**行为不变成立**（新旧错误集一致，仅 code/条目形态差异）；"P1 不变"一项对盘上现状不适用（新旧均无 P1 可触发）。

**B 轮** `prd-2026-10-23/pm`（悬挂 EXECUTING iter4，源：`/tmp/nana-replay2/mechunit-collectors/.pev/`）+ 同 workspace `prd-2026-10-23-2`（COMPLETE）：

- 新 validate（10-23/pm）：exit 0，**零 errors 零 warnings**——01/02/03 三份历史绑定报告投影不复算、不再染红（§11 预期口径达成）。
- 旧 validate 对照：exit 1，3 条 P1（`state.json` 投影复算不一致）——P0-1 死路现场实测复现，本 change 解除。
- 新 locate（workspace 级）：全轮清单 2 条；自动选中 `prd-2026-10-23-2`；悬挂警告 `prd-2026-10-23 status=EXECUTING iteration=4 终态=否`（只读发现，不自动处置）。

### 任务 4.3 回归与预算

全量测试 151/151 OK（`Ran 151 tests in 11.039s`，2026-10-26 16:12 实测）；调用预算断言已更新为 `assertEqual(len(counted), 5)`（`test_call_budget_normal_chain`，正常链 init→commit plan→commit artifact→record_provenance→commit verification）；supersede/carry 为按需事件不占固定口径（各专属用例独立计数）。

### 任务 4.4 哈希核对与回滚说明

触碰文件改前（任务 1.1 基线表）→ 改后（2026-10-26 16:12 采集）SHA-256 前 16 位：

| 文件 | 改前 | 改后 |
|---|---|---|
| SKILL.md | `793f4debeabe85a8` | `dd21a7f15438e9bd` |
| scripts/_common.py | `7477d4cc6e66c008` | `6a5dd909275c7e6a` |
| scripts/commit.py | `1e38ec0e5a53b60c` | `6d5475d5e8296069` |
| scripts/init.py | `b4a8f09dc9c5fa2d` | `8384ef188afe395b` |
| scripts/record_provenance.py | `c3305f140ab68089` | `05d729836147b497` |
| scripts/render.py | `4a7a3432eaf9bf22` | `ab2b8810b7cced5c` |
| scripts/transition.py | `b9a4188cc8d3f600` | `6c79be5c1585ad54` |
| scripts/validate.py | `837d68a8c157ea9e` | `b0eb2e1c005e8c02` |
| schemas/state.schema.json | `dcda64a754fdfacb` | `c0d64ea38f5ece16` |
| agents/verifier.md | `61b095f1cfb8cd5c` | `49681ae930cbbfe9` |
| templates/prd.md | `bc32c7132fe1fa24` | `bd97b02139963008` |
| tests/helpers.py | `7071c277ed707aee` | `55df7bfec29852e8` |
| tests/test_closeout.py | `405f76b9570fafa7` | `09f2f4499a454204` |
| tests/test_lifecycle.py | `2462235b69bbc0b9` | `3ac61d9638528f27` |
| tests/test_render.py | `94ebbf777aabdeb9` | `850494e5100e2df4` |

未触碰：schemas 其余四件、templates 其余三件、agents 另两件、playbooks 全部（与 1.1 基线一致，可复核）。回滚：pev-skills 分支 `harden-nana-pev-lifecycle` 整体弃置（main 自 `d1d1a6d` 未动）或按任务号 `git revert` 单提交（11 个提交各自独立成任务）；schema 新增为可选字段/枚举追加，旧版脚本忽略未知字段，回滚无兼容负担。安装路径两条复核（2026-10-26 16:12）：`~/.claude/skills/product-manager` →（绝对链接）`~/skills/product-manager` → `/Users/zhengshan/project/ai/pev-skills/product-manager`；`readlink -f` 解析到位，两条路径均命中实施树。独立副本可运行：全部脚本与测试经 `SKILL_ROOT` 相对路径读取 schemas/templates，无外部目录依赖（151/151 于该树实测）。

### 最终全分支评审与修复（2026-10-26 17:46–18:0x）

独立评审（fable 模型子代理，对 `d1d1a6d..6097760 -- product-manager` 全量 diff，六个焦点面逐项对抗验证并实跑夹具）报告 8 项发现。按效果重定级后：**Critical×1 + Important×2 进入修复通道**（提交 `500d850`，每项先写复现测试见 RED 再修，修后 156/156）；Minor×5 记账延迟。修复内容与结果：

1. **Critical（已修，RED→GREEN）**：replan 提交重跑的"登记册修复"误用转移后编号，登记 `(N+1)-artifact.json` 幻影条目 → validate R4 拒绝后续提交、轮次卡死；改为取转移条目 `from_iteration`（`find_transferred` 替代 `already_transferred`）。复现测试 `test_replan_rerun_does_not_corrupt_registry`（重跑后登记册恰 `["01-artifact.json"]` 且 validate 退出 0）。
2. **Important（已修，RED→GREEN）**：终态冻结补位——`record_provenance` 在 COMPLETE/STOPPED/SUPERSEDED 拒绝（`E_FROZEN_STATE`）；`render` 发布形态在 STOPPED/SUPERSEDED 冻结（COMPLETE 保留重渲染修复路径，`--check`/`--prune` 诊断模式不限）。评审确认 design §1.1 表对 record_provenance 行未列冻结守卫系规格内部张力，按表后规则与 §8 的明文执行。
3. **Important（已修，RED→GREEN）**：`commit` 透传 validate 带码 warning 时被字符串化（`rep.warn(dict)`）致 `{text, code}` 形态损坏；改为拆解透传。

**延迟的 Minor（不修，留档）**：① REVISE/REPLAN 转移后重跑 `commit verification` 报阶段不匹配而非"已执行"退出 0（非破坏性、错误信息明确，且 design §2.3 的组合分支清单未含转移后场景；实施者裁决文本已同步更正——原称覆盖 REVISE/REPLAN，实际仅 BLOCKED 因 iteration 不变而命中）；② `resume --raise-limit` 重跑因"N 大于当前上限"守卫先行而拒绝（与 design §1.1 守卫列及 v1 行为一致）；③ SKILL.md 第 63 行"render+validate"与实现次序（validate→render）措辞漂移；④ 三个 STOPPED 写入方的 transitions param 形态不一（无消费方）；⑤ `init --locate` 在被选中轮 state.json 不可解析时退出 1 而非降级汇报全清单。

修复触碰文件改后 SHA-256（接 4.4 表，2026-10-26 18:05 采集）：`scripts/commit.py` `2048a466257c8776`、`scripts/record_provenance.py` `5afc59105d8f2742`、`scripts/render.py` `f8a981cf3d0f8ed2`。评审焦点面结论：P1 收窄的全部消费路径（收口/转移/同号覆盖/快照守卫/validate 资格）逐一枚举无误，iteration 比对无差一；commit/transition 守卫次序干净；reopen 预算守卫写前拒绝经字节级断言。评审夹具在 `/tmp/pmreview`（评审代理无删除权限，可手工清理）。

### 任务 4.5 rc 重估通知

本 change 触发 `../harden-rc-pev-closeout/` design 首节"结构性变更须重估"条款的四个变更点：① P1 语义拆分（validate.py report_tier 权威/历史分级）；② supersede 事件与 SUPERSEDED 终态（transition/commit/init/ schema）；③ 事件面合并与收口折叠（阶段推进并入 init/commit、authorized-resume 并入 resume --raise-limit、--bind/verdict/render/complete 折叠进 commit verification）；④ errors/warnings 条目可选 code 字段。新脚本 SHA-256 前 16 位清单见任务 4.4 改后列。

**时点事实**：rc 侧已于同日并行实施完毕（其 verification.md 记 50/50 测试与断电演练），其实施基线含本 change 至 `4c43549`（2.6）为止的 PM 改动、未含其后四提交（3.3 模板/3.6 错误码/2.8 SKILL/3.2 权威让渡——均在 product-manager 子树，rc 技能不依赖其内容，但 rc design 首节若锚定过 PM 脚本哈希，须按本文件 4.4 改后列重锚定后再合入）。通知已同步留记录于 `../harden-rc-pev-closeout/verification.md` 增补节（2026-10-26）。
