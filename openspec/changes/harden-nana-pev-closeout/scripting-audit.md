# 脚本化事实清单（2026-10-23 08:35 +0800 只读采集）

为"固定流程脚本化 + 质量评审前完整性检查"设计提供的证据基线。采集对象：`/Users/zhengshan/skills/product-manager/`（未修改）与本 change 既有四件。行号以当日文件为准。分工原则：模型负责规划、分析、起草和独立质量判断；代码负责确定性校验、文件管理、状态转移和重复操作；用户负责产品取舍与最终接受。

## 1. 现行指令逐条审计

列语义：第 2–3 列记录**现行**行为（以当日安装目录实测为准，第 1 列为序号）；第 4–7 列为**拟议**脚本化的 sketch 与审计判定（"适合脚本化"列为审计结论），正本是 `design.md`（渲染器契约、流程脚本与写入权、模型—脚本交接协议），两者冲突以 design 为准。

| # | 现行指令（路径:行） | 当前执行者 | 适合脚本化 | 脚本输入 → 输出 | 必须保留的模型判断 | 失败与恢复 |
|---|---|---|---|---|---|---|
| 1 | `SKILL.md:93` 恢复时扫描 `.pev/` 取最新含 `pm/state.json` 的轮次 | 模型 | 适合 | `.pev/` 根 → 轮次目录名 + state 摘要（status/iteration/最新 verdict） | 用户点名轮次、要求重新开始的意图 | 无任何轮次含 `pm/state.json` → 报告后走 INIT |
| 2 | `SKILL.md:103-104,107` INIT：建轮次目录、`pm/`、写 state.json 初始值；缺 goal/target_metric/baseline 时置 WAITING（**现行旧行为，设计拟修改**：现行指令为缺三要素且无法推断即 WAITING；design 的 `init.py` 规则收紧为仅 `goal` 缺失才阻断，`target_metric` 缺失与 `baseline` 为 null 是 schema 合法状态、仅提示——任务 2.4 同步 SKILL.md 时改为此规则） | 模型手写文件 | 适合 | objective JSON → 目录 + state.json；仅 `goal` 缺失（不存在/null/空白）时写 `WAITING_FOR_INPUT`+`resume_to="PLANNING"` | 目标解析；缺失项能否从上下文推断（推断结果记入 `assumptions`）；"值存在但不足以开工"由 Planner 判断并走 `need-input` | 目录已存在 → 报错；同日重名 → 追加 `-2`/`-3` |
| 3 | `SKILL.md:50-66` 状态机全部转移：status 置位、`iteration+1`、`resume_to` 清除、越上限写 STOPPED | 模型手改 state.json | **适合（核心缺口）**。现场事故即手改无守卫：01:44:40Z EXECUTING→COMPLETE（见 proposal 背景） | 事件名（`plan-validated` / `artifact-validated` / `verdict` / `resume` 等）+ 工作目录 → 原子写新 state.json + 写后校验 | 无（纯机械；何时触发事件由执行协议决定） | 请求的边不在转移表 → 拒绝并列出当前状态与合法事件；`iteration+1` 越上限 → 写 STOPPED 不执行该转移 |
| 4 | `SKILL.md:116,124` 产物写入 `iterations/<N>-*.json` 并登记进 `state.plans`/`state.artifacts` | 模型手写文件名 + 手改登记册 | 适合 | 草稿 JSON 路径 + 类型（plan/artifact/verification）→ 分配编号、落盘、更新登记册、写后即校验 | 产物内容本身（Plan/Artifact/报告的起草） | 编号已存在或目标属已验证轮次/阶段守卫失败 → 拒绝，不覆盖任何已有文件；草稿 schema 校验失败 → 不落盘；落盘或登记后的写后校验失败 → 允许可恢复中间态，恢复动作是重跑同一 commit 命令（分层语义与 design"提交协议与中断恢复"一致，不是"不落盘"） |
| 5 | `SKILL.md:123,157` Evidence Ledger 与 `known`/`assumptions` 的内容更新 | 模型直接编辑 state.json | 部分适合：写入入口经脚本，内容判断留模型 | 语义字段补丁 JSON → 合并进 state.json（仅 8 个语义路径，见 design 路径规则） | 每条 claim 的 type 归类（FACT/INFERENCE/HYPOTHESIS/UNKNOWN）、证据指向、答复属于事实还是推断 | 补丁含生命周期字段（status/iteration/resume_to/登记册）→ 拒绝 |
| 6 | `SKILL.md:79-85` 每步产物写盘后立即运行 validate.py | 脚本已有，调用靠模型自觉 | 检查本身已脚本化；缺 B/C 类（见 §3 实测：空 artifact 通过）；**调用策略拟变**：写入脚本内部校验并随结果返回，模型仅边界显式调用（见 design"模型—脚本交接协议"） | 扩展后：目录 → A/B/C 类错误清单（文件 + JSON 路径 + 原因） | — | A/B/C 有错 → 提交与派发被阻塞 |
| 7 | `SKILL.md:130-135` Verifier 派发：只给 `agents/verifier.md` 与相关文件路径 | 模型（spawn 子代理或切角色） | 输入固定与来源摘要已在上轮 design（provenance）；派发动作本身留模型 | 派发时的文件路径清单 + 待验证快照 | 有无子代理能力的实现方式选择；不转述推理的纪律 | 子代理失败/报告缺失 → 不判 COMPLETE（上轮设计已定） |
| 8 | `SKILL.md:139-146` 分支：PASS 渲染置 COMPLETE；REVISE/REPLAN `iteration+1` 回退；BLOCKED 置 WAITING（**现行旧行为，设计拟修改**：PASS 改为留在 VERIFYING，COMPLETE 由 `complete` 事件在绑定+渲染比对通过后收口） | 模型 | 转移与上限的机械部分适合（并入 #3 的事件）；按 `required_changes` 修订内容留模型 | verdict 事件 + 最新 verification 文件 → 新 state.json | 修订内容的起草；BLOCKED 时向用户列缺失项的表述 | 报告未绑定（无 provenance 或复算不符）→ verdict 不可用于转移 |
| 9 | `SKILL.md:148-150` PASS 后按模板渲染 `output/`，再置 COMPLETE（**现行旧行为，设计拟修改**：渲染改经 `render.py` 字节比对发布，COMPLETE 改由 `complete` 事件写入） | 模型（现场为子代理渲染 + 主会话手工改 prd.md） | render.py + 字节比对已在上轮 design；COMPLETE 写入并入 #3 | PASS 轮 artifact + state + 有效 Plan → `output/` 交付物（临时→比对→替换） | 无 | 渲染失败 → 不发布、不 COMPLETE（上轮设计已定） |
| 10 | `SKILL.md:152-161` WAITING 恢复：无条件清 `resume_to`、合并答复、判断 Plan 是否失效 | 模型 | 清除与置位适合（`resume` 事件，含"答复使 Plan 失效"走 REPLAN 边）；合并去向分类留模型 | resume 事件 +（可选）语义字段补丁 → 新 state.json | 答复是否使当前 Plan 失效；答复归类为 known/assumptions/evidence | 越上限的 REPLAN 恢复 → STOPPED |
| 11 | `SKILL.md:163-167` 迭代上限检查与 STOPPED 报告三项内容 | 模型心算 | 检查适合（并入 #3 每次转移）；报告内容留模型 | 同 #3 | 报告"当前最佳结论/未解决问题/证据缺口"的撰写 | STOPPED 后仅用户授权提额才可恢复（`authorized-resume` 事件，记录授权） |
| 12 | `executor.md:49`"其余块按当前 Playbook 的要求填写"，不适用的块省略 | 模型自觉 | B 类检查适合脚本化：按有效 Plan 的 `final_deliverable` 映射模板必填集（映射表即 design 渲染器契约那张表，单一事实源）；"某块语义上是否适用"的边缘判断留 Verifier | artifact 提交时自动执行 → 错误清单 | 模板字段语义合理性、内容质量（Verifier 8 维） | 必填缺失/为空 → 拒绝提交；用户豁免走显式 `waived_fields`（见 design） |

现行顺序核实：`SKILL.md:116`（Plan 落盘+校验）→ `:124`（Artifact 落盘+校验）→ `:128-135`（Verifier 评审 → verification 落盘+校验）。即"Artifact 校验 → 质量评审 → 报告校验"为现状，本次不改顺序，补的是第 124 步校验的完整性（B/C 类）与全部状态推进的机械化（#3）。

第 1 节"脚本输入 → 输出"列为概念级审计。命令级**模型—脚本交接协议**——统一 JSON 输出（`ok`/`command`/`pm_root`/`skill_root`/`status`/`iteration`/`written`/`deleted`/`errors`/`warnings`/`next`）与退出码、`next` 为结构化对象数组（`command`/`draft`/`ask-user`/`dispatch-verifier`/`stop` 五种 kind）由事件表+守卫推导、校验调用分工（脚本内校验，模型仅边界调用）、Verifier 报告失败回路、state-update 失败回路、正常链路 12 次固定调用的预算——正文化于 `design.md`"流程脚本与写入权"的"模型—脚本交接协议"小节。交接所需的命令行格式、成功/失败输出、当前状态与合法下一步、失败修复动作、可安全重跑的命令、必须重新派发 Verifier 的情形，分别由该协议段及其引用的"提交协议与中断恢复""事件身份与重跑判据"两小节覆盖；实施以 design.md 为准，本表不重复契约文本。

## 2. 候选动作纳入/延期

| 候选 | 决定 | 载体 |
|---|---|---|
| 1 初始化、目录编号、恢复定位 | 纳入 | `scripts/init.py` |
| 2 Plan/Artifact/verification 提交、登记、历史版本保护 | 纳入 | `scripts/commit.py` |
| 3 评审前格式/必填要素/确定性一致性检查 | 纳入 | `validate.py` 扩展（A/B/C） |
| 4 固定评审输入、来源摘要、报告绑定 | 纳入（上轮 design 已定） | `scripts/record_provenance.py` + verification `provenance` 字段 |
| 5 verdict 后合法转移与上限检查 | 纳入 | `scripts/transition.py` |
| 6 WAITING 恢复、REVISE 复用 Plan、REPLAN 新计划 | 转移部分纳入（`resume` 事件、REVISE 不新建 Plan、REPLAN 走新 commit）；答复内容归类留模型 | `transition.py` + `commit.py` |
| 7 最终渲染、来源比对、COMPLETE 写入 | 纳入（上轮 design 已定 render；COMPLETE 并入 `transition.py complete` 事件，守卫=渲染比对通过+PASS 已绑定） | `scripts/render.py` + `transition.py` |

延期项：多会话并发写锁（按单会话假设设计，OpenSpec 使用场景下单会话）；旧轮次数据迁移或 provenance 补造（design 已禁止补造）；`rc`/`decompose` 兄弟技能的同型改造；与 OpenSpec 运行时或 harness 的集成；草稿文件的管理（草稿路径模型自选，脚本只读，不纳入）。

## 3. 合成数据实测（2026-10-23 08:35 +0800）

- 夹具：`/tmp/nana-scripting-t1/pm/`（合成，与真实数据无关；真实 PM 现场未触碰）。`state.json` 为 `VERIFYING`、`iteration=1`、`max_iterations=5`、登记册与文件对齐；`iterations/01-plan.json` 为最小合法 Plan（`final_deliverable="PRD 文档"`，`plan` 一项 `action="draft"`）；`iterations/01-artifact.json` 即待测最小数据。
- 命令：`python3 /Users/zhengshan/skills/product-manager/scripts/validate.py /tmp/nana-scripting-t1/pm/`
- 结果：输出 `OK: /tmp/nana-scripting-t1/pm 全部产物通过 schema 与语义规则校验`，退出码 0。
- 结论：`{"status":"completed","artifact":{}}` 被**接受**。A 类通过（required 只有 status/artifact，`artifact` 为无约束 object），R1–R5 均不触及 artifact 正文完整性；B 类（所选模板必填字段）与 C 类（跨文件一致性）在现有脚本中不存在。空 PRD 可携 `status="completed"` 直达 Verifier 派发。
- 测试范围：未含 verification 文件（R5 未触发，与本测试目的无关）；未测渲染路径。此夹具保留在 /tmp 供复核，不进入 git。

## 4. 前置检查现状归类（A/B/C/D）

| 类别 | 定义 | 现状 |
|---|---|---|
| A | JSON 语法、类型、枚举、required（schema 子集） | 已有（validate.py `validate()` + R1–R5） |
| B | 所选交付模板的必填字段、非空要求、列表项结构 | **无**（§3 实测证实）；字段映射的事实源已在上轮 design 渲染器契约表 |
| C | 可确定检查的跨字段/跨文件关系 | 部分：R1–R5 之外，`final_deliverable`→模板可解析性、`evidence_ref` 可解析性、evidence.id 唯一性、PASS 绑定复算均无 |
| D | 证据真实性、因果推理、方案价值、ROI 合理性 | 属 Verifier 8 维（agents/verifier.md:19-28），全部保留模型，不得改为规则打分 |
