# Design: improve-pev-skills

> 当前选型与验收以 [workflow-decision.md](workflow-decision.md) 为准(2026-10-16 定案):prd/rc 剥离出 workflow、动态 skip、design 唯一自动检测点 + 人工升级、直接演进 pev;不打包;指定 llm-client-infra 轮次重放。A/B 组技能优化与布局决策仍然有效;原 A6 规模分级行(新增 schema 论证)已删除,取证并入 workflow-decision.md,回测证据见 tasks 8.6/8.9。

## 动态 workflow 定案(2026-10-16,取代本节旧版与 A6 的最终方案定位)

选型、状态文件契约、升级契约、改动代价见 [workflow-decision.md](workflow-decision.md),此处只列与下文 A/B 组的衔接:

- **prd 与 rc 剥离出 workflow**:pev schema 删 `prd`、`spec` 两个阶段,catalog 的 `requires` 置空;澄清产物落在 change 目录,作外部输入。rc 的 B1/B2 改造(grilling 提问、工程 spec 化)照旧,产物落点从 `.pev/<轮次>/rc/output/spec.md` 改为 change 目录。
- **动态 skip 取代 pev-lite**:阶段菜单 = 演进后的 pev(8 artifact),逐 change 以 `.openspec-workflow.json` 声明 active/skip;skip 阶段零产出。A6 的 pev-lite fork(原 8.2-8.4)删除,其回测证据(原 8.6/8.9)保留在任务记录。原 A6 一节(新增 schema 论证与规模判据)已删除:取证并入 workflow-decision.md 的"改动代价"与起草指引。
- **粗定 workflow 取代阶段 0**:模型按 workflow-decision.md 的起草指引(原 first-principles §2 风险触发表)起草,人逐条确认,CLI 校验写入。first-principles 的三 profile、compact-plan、7 维风险块、unknown 路由护栏全部不实施。
- **升级**:唯一自动检测点在 design——architecture-design 的设计产出增加”workflow 对照与升级判定”节,verifier 增加对应检查项;发现需要 api/modules 等未激活阶段时暂停并提请人确认,CLI 执行升级(added/reopens/explore),被重开阶段原 COMPLETE 作废。design 之后不再自动检测(用户拍板,接受不完善);保留人工发起升级。
- **A 组衔接**:A1-A5 不受影响。B3 explore 的启用条件原挂 A6 规模分级,改挂粗定——粗定时一并确认是否启用实施前取证,记入 workflow state 的 entry 或由模型在 impl 分派时判断。
- **B 组衔接**:B1/B2 照旧,rc 退出生命周期管理(无 state.json 完成判定),其自身状态机与台账保留。B2 的 spec.md 实施决策段兼任 design 被 skip 时 tasks 的替代输入(见 workflow-decision.md 替代输入映射,实施时核对)。

新增运行时行为需要 delta specs,不能沿用 `skip_specs: true` 进入实现验收(W0.3)。实施前必须明确:替代输入映射逐技能核对、升级 reopens 语义、旧 change 无状态文件的兼容路径。不能仅把 skipped ID 放入 completed 集合来解决输入缺失。

## 目标与基线

- 目标 A(减耗):主会话上下文从"随技能数二次方累积"变为"每技能一次有界分派 × 线性次数"。
- 目标 B(能力):requirement-clarify 的对话与产出对口工程侧;incremental-implementation 开工前有取证环节。
- 基线:**不重测**(2026-10-13 决定)。原 624K 在 `mechunit-collectors` 会话日志里查无来源(`grep 624` 只命中 hash 片段 `62457f3`、`624a40c4`),已从 proposal 删除。改后不做降幅对比,减耗按机制是否落地验收,不宣称百分比。

---

# 目标 A:token 减耗

## A1 subagent 分派(结构性根因)

### 现状

9 技能全部在主会话执行。主会话上下文 = 已加载技能文本 + 各阶段读入的全部上游产物 + 台账 + iteration 记录 + 会话本身,单调递增;后续每次模型调用整段重发,长上下文同时导致质量衰减。

实测链路:进 PEV 前已 253K,峰值 474K;超 400K 后单次调用延迟中位数从 8 秒升到 13 秒(`b5b9208a-….jsonl` 第 131 行起)。

### 方案

- **分派粒度:技能级**,每技能一次分派。备选的阶段级(每阶段一次)不采用:分派开销与跨阶段状态传递复杂度高,收益边际小;技能级天然边界就是直接上游清单。
- **分派输入**:技能名、`.pev/<轮次>/` 路径、直接上游工件路径清单(只读清单内文件)。
- **返回契约**:结构化摘要——verdict、critical_issues、evidence 条目 ID 引用、产出物路径;不回传正文。
- **REVISE 重跑**:重新分派 fresh executor subagent(携带 verifier 批评),不在原上下文内续写。
- **主会话只保留**:轮次状态、各技能 verdict、与用户的全部交互。

### 约束

- **用户交互不可下沉**:subagent 无法向用户提问。requirement-clarify 的提问环(B1 改造后仍为主会话环节)、需用户拍板的决策点、最终审批留在主会话;subagent 遇到需拍板事项时返回问题清单,由主会话转发。
- **verifier 独立性收益**:fresh 上下文不受 executor 推理锚定,与 PEV 独立对抗评审的定位一致。
- **无降级分支(2026-10-13 拍板)**:Claude Code 与 Codex 都有派子代理的能力。Codex 的证据:codex-cli 0.162.1 二进制含 `spawn_agent`(73 处)与 `collab_tool`,10-12 的 rollout 里 `collaboration_mode` 出现 17–31 次(那些会话里 `spawn_agent` 出现 0 次,即能力在、未被调用)。SKILL.md 里"无子代理就切换角色重新推导"那句删除,不写替代条款。

### A1 解决不了的部分(2026-10-13 补充)

A1 管的是"每次分派上下文有界",不解决起点的 253K。配套三项(tasks 7.5):

1. PEV 链在新会话启动,不承接上午的链路梳理上下文;
2. 阶段间压缩:阶段边界做一次摘要,不携带全量历史;
3. 主会话只留状态:轮次状态 + verdict + 用户交互,产物全部走盘。

## A2 verifier 读 md,不读 JSON

- 现状:每个阶段有两份内容。`iterations/NN-artifact.json` 是结构化数据,实测 api 单份 31953 字节,其中 `artifact` 字段 16074 字符(`contracts` 单项 11700);`output/*.md` 是给人看的文档,现由模型手拼。verifier 现在读 JSON。
- 方案:JSON 保留,由渲染器生成 md,verifier 改读 md。
- **JSON 不能删(2026-10-13 核实)**:`validate.py` 有 R1~R16 共 16 条规则对 JSON 字段做计算(契约守恒、覆盖对账、门禁布尔、state 与产物对账等,以 api 为例),九份脚本各有 15~66 行直接引用 artifact 结构(来源:`grep -c artifact */scripts/validate.py`)。删 JSON 等于重写这些脚本去解析 md,交接件已评估过该代价(约 976 行)。
- **依赖**:先有渲染器(tasks 3.1)。现状 9 份模板全是 `{{}}` 占位符(api 模板 41 处),无渲染脚本。
- **未验证**:verifier 读 md 是否降低评审准确率,没有数据。参照 cospowers3.0(`plugins/cospowers-system-requirements/skills/cos-system-requirement/references/verify-protocol.md`):结构检查交脚本,评审员读候选文件做语义判断,与本方案分工相近;但我只读了这份协议,未读其检查脚本。md 是否含 verifier 需要的全部字段(self_challenge、红线处置等),逐技能核对(tasks 4.3)。
- 触及:渲染器、各技能 `agents/verifier.md` 的读取路径、SKILL.md 中的读取约定文字。

## A3 只读直接上游

- 现状:每技能读全部上游,同一份 catalog/architecture 被下游各读一遍。
- 方案:技能指令明确"直接上游 = 清单中的 N 份,读全文;更上游仅按 ledger 条目 ID 核对引用有效性,不默认重读原文;确需抽查的,在 evidence 注明理由"。
- **约束对象修正(2026-10-13 核实)**:原稿说"被 4 个下游重复读",在主会话里不明显;重复读主要发生在验证子代理内。A3 应主要约束验证方。

## A4 复验收口(取代原"收紧 REVISE")

原方案:打回条件收敛为 critical_issues 非空或总分低于阈值,其余意见写入 next-iteration 建议。

**为什么不采用**:挡不住"每轮冒新问题"。实测 api 阶段每轮都发现全新问题,共 4 轮 + 1 次被打断(全量重跑 19 分钟 vs 窄范围 4 分钟),而新问题常被计为 critical,阈值过滤不掉。

**改为**:

- 第 1 轮全量评。
- 第 2 轮起只核对上轮 findings 是否修好 + 有无回归,不再全量重跑。
- 验证报告按轮次另存,不覆盖同号文件。
- `max_iterations` 保留 5(9 份 `state.schema.json` 硬编码 `default: 5`),不降为 3;收口靠协议而非降上限,避免实现类阶段提前触发 STOPPED。
- 现状只有 `requirement-clarify/scripts/validate.py:266` 用 R8 真正强制 `max_iterations`,其余技能仅在文本里写"不得宣称完成"——收口协议需补进各技能。

## A5 增量 PASS 与 FULL PASS

- 现状:各技能 `agents/verifier.md` 只有一种 PASS(如 api 的 `verifier.md:74`:全部契约面 PASS + cross_review pass + 7 维 ≥3 + 无 BLOCKING + 五个门禁全绿),无增量/全量语义。
- 方案:窄范围复验返回的是**增量 PASS**,不构成整体 PASS,不得代替最终全量 PASS。
- **FULL PASS 判据(候选,待 tasks 6.4 定稿)**:`status="COMPLETE"` 要求**三条都满足**,缺一不可——① 上一次 FULL 评审的所有 critical_issues 逐条有处置记录;② 本轮增量评审无新增 BLOCKING;③ 五个门禁脚本全绿。(原文写"三者合取",用词不直观,已改;语义未变,是"全部满足",不是"满足任意一条"。)
- 现状缺口(`api-and-interface-design/agents/verifier.md`,mtime 2026-10-05 22:53):全文 124 行无"重派/次数/上限"表述;两个"交用户"出口是 BLOCKED(L77,上游缺口)与 Cross 权威源冲突(L56-57),都不是重派停止条件;L75 只限修改范围、未规定复验范围;findings 是单份报告数组(L99-101、L115-119),无跨轮保留与逐项处置链。

## A 组各项的关系

A1 决定"在哪里读"(每次分派上下文有界),A2 让 verifier 读更小的 md,动态 skip(C 组)决定"跑哪些阶段",A3 决定"单次读多少",A4、A5 决定"读几遍"(分派次数)。叠加效果:二次方 → 有界 × 线性。

---

# 目标 B:能力优化

## B1 requirement-clarify 的提问阶段调用 grilling 技能

### 现状

`~/skills/requirement-clarify/SKILL.md:113`:"不能则向用户一次性问齐,不要逐条追问"——明文反向指令。问题以批量清单抛出(第 152 行 BLOCKED 态整表列出),用户一次面对全部问题,其中有依赖关系的决策也混在同一批。

### 方案:调用 grilling,不自己实现提问规则

来源:`~/project/ai/skills-dir/mattpocock-skills/skills/skills/productivity/grilling/SKILL.md`(30 行)。`grill-me` 只有 7 行,内容是"调用 grilling",不是另一套规则——技能内调用技能这种写法已有先例。

rc 的 SKILL.md 删除"一次性问齐,不要逐条追问",在提问阶段直接调用该技能。grilling 自带的节奏不在这里复述。

### 三个前置条件(2026-10-13 核实)

1. **grilling 尚未安装**。`~/.claude/skills/` 与 `~/.agents/skills/` 下都没有它的软链接,直接调用会失败。安装是前置任务(tasks 9.1)。
2. **状态机与台账仍由 rc 负责**。grilling 没有 `state.json`、没有 `WAITING_FOR_INPUT`、没有 evidence ledger。rc 的 SKILL.md 要写明:每轮问完置 `WAITING_FOR_INPUT`,答完把决策写入台账(user-decision 类型)。grilling 的 frontmatter 没有 `disable-model-invocation`,对模型可见,调用这条路通。
3. **预生成清单作为决策树初始节点**。rc 现有的"价值性提问"与"逐章模糊扫描"两条通道保留,作为 grilling 的初始 frontier 传入,否则它会从零开始问。

### 收益与代价

rc 不再复制提问规则,grilling 更新后自动生效。代价是 rc 依赖一个仓库外的技能。

### 不引入 mattpocock 的完整技能链

`to-tickets` 等技能要求先跑 `setup-matt-pocock-skills`,产物落点是 `.scratch/<feature-slug>/issues/<NN>-<slug>.md` 或 GitHub/Linear issue(`to-tickets/SKILL.md:62-63`)。该仓库当前 `docs/agents/` 与 `.scratch/` 都不存在,而且这套产物不是 PEV 工件:阶段完成判定认的是 `state.json` 的 `status === "COMPLETE"` + `output/` 存在,换过去会让所有阶段停在未完成状态,`openspec status` 与归档都会拒绝。那套技能适用于完全不进 OpenSpec 的纯 issue 驱动工作,与本 change 的规模分级是两件事。

- **与 A1 的关系**:采访环节留主会话(用户交互不可下沉);事实类问题的取证派子代理,探索成本不占主会话上下文。
- **状态机**:`WAITING_FOR_INPUT` 等字段语义保留。一轮对应一次 `WAITING_FOR_INPUT` 是我的推断,未逐字段核对,实施时核对(tasks 9.6)。

## B2 requirement-clarify 产出工程 spec 化(to-spec 输出语言)

### 现状

spec.md 结构偏产品语言复述,工程侧需要的"模块/接口/契约怎么变"密度不足,behavior-decompose 拆解时要二次翻译。

### 方案(借鉴 to-spec 模板,只借输出语言,不借流程)

来源:`~/project/ai/skills-dir/mattpocock-skills/skills/skills/engineering/to-spec/SKILL.md`。

**不采用的部分一**:to-spec 是"不采访,只综合"的一次性成文技能;requirement-clarify 是采访技能,采访流程(B1)保留,只换产出语言。

**不采用的部分二(2026-10-13 拍板):User Stories**。对比:

| | to-spec 的 User Stories | behavior-decompose 的 catalog |
|---|---|---|
| 粒度 | 一句话:As an…, I want…, so that… | Epic → Feature → Story → 验收标准 → 场景 |
| 异常与边界 | 没有 | 按类别枚举,每条 Given/When/Then |
| 溯源 | 没有 | 每条溯源到上游 |
| 覆盖检查 | 没有 | 有 |

来源:`to-spec/SKILL.md` 模板;`~/skills/behavior-decompose/templates/catalog.md:27-60`。`schemas/pev/schema.yaml:42` 的 `specs` 阶段要把 catalog 映射为 Requirement/Scenario,to-spec 的 User Stories 无法替代。保留的做法(让 decompose 以 rc 的故事为锚点逐条展开)要改 decompose 的溯源规则和 `validate.py`,改动量我没评估;两个阶段各维护一份同层清单还要同步编号。与减耗目标相反,不采用。

spec.md 正文引入三段结构,叠加在 `.pev` 契约必填字段之上:

- **Implementation Decisions**:模块/接口/schema/API 契约级决策;**不含文件路径与代码段**(to-spec 纪律:路径很快过时);仅当原型产出的片段比文字更精确(状态机、schema、类型形状)时内联,并注明来自原型。
- **Testing Decisions**:只测外部行为不测内部实现;指明参照的既有同类测试。
- **Out of Scope**:显式列出,防止 scope 漂移。

- **下游兼容**:behavior-decompose 以 spec.md 为输入拆 Epic→Feature→Story;实施决策段给出的模块/接口/契约边界是 Story 拆解的参照。

## B3 实施前 explore agent 取证(cospowers 契约)

### 现状

`incremental-implementation/SKILL.md` 全文无开工前代码取证环节;executor 边写边读,现状不明时靠猜。

### 方案(借鉴 cospowers-decompose/agents/explore.md 的契约形状)

新增只读探索 agent,incremental-implementation 开工前分派:

- **输入白名单**(只认这四项,多即拒绝):`sourceRoot`、`scope`、`questions`(每项带稳定 Q-ID)、`stopCondition`。
- **行为约束**:只读不写、不继续委派;停留于 scope 内;每问获得来源支撑/确认冲突/确认无法定位即止;grep/glob 先于正文读取;读取去重单位 = 路径 + 行范围 + 问题;接口与验收合同逐字保真(标识符、签名、参数顺序、字段集合、数值边界);来源冲突时两侧并报,不发明折中。
- **有界轮次**:参考 maxTurns 上限,限制探索本身的读取量。
- **返回形状**(严格四段,每问必有):`Coverage`(answered/conflict/unresolved)、`Evidence`(事实 + Source: 路径#行)、`Conflicts`、`Unresolved gaps`。
- **落位**:产出写入 `.pev/<轮次>/impl/explore/`(或该轮实施目录)下的现状取证文档,Evidence 并入台账;executor 只读这份现状图 + 按需按行范围抽查,不重复全量探索。
- **缺口即停**:explore 返回 unresolved 的任务标记阻塞,不得在缺口上瞎猜开工。
- **与 A1 的关系**:explore 是 subagent 分派架构的第一个专职角色——A1 的实例化,不是并列的新机制。
- **验收口径(2026-10-13 修正)**:原稿把"缓解慢"当作它的收益,2026-10-12 的日志里找不到这个证据。验收改为**取证质量**这一能力指标(缺口是否被显式上报、签名是否逐字保真、冲突是否两侧并报),不宣称省时。
- **启用条件**(2026-10-16 改挂粗定):粗定 workflow 时一并确认是否启用实施前取证,不再挂 A6 规模分级——小改动上探索会变成新的读放大源。
- **已有可复用实现**:`~/.claude/agents/pev-explore.md`(frontmatter `tools: Read, Grep, Glob, Bash`,已实测派发成功、四段格式带行号来源)。注意白名单含 `Bash`,只读是工具级的(无 Edit/Write/NotebookEdit),shell 重定向仍能写文件;要绝对只读需删掉 Bash,代价是没法用 `jq` 抽 JSONL。此权衡留待实现时定。
- **后续可选**(本次不做):api-and-interface-design / database-schema-design 评审既有契约与 DDL 时复用同契约探索 agent。

---

# 目录与分发布局(2026-10-13 拍板)

## 归档镜像:保留,不做 move

`promotePevArtifacts` 在归档时把终稿复制到 change 目录(`src/core/archive.ts:1680` 调用),该副本是归档件留存的正本,要进 git;`.pev/` 不进 git。用户用的就是这个归档能力。

**不做 move,理由两条**:

1. `promotion.ts:104-110` 写到**两个**目标:`changeDir/<generates>` 与 `openspec/artifacts/<promotes>`(schema 里 9 个 artifact 的 `promotes` 均非空)。move 只能满足前者。
2. `src/core/validation/validator.ts:194` 与 `src/core/artifact-graph/state.ts:33` 在归档后仍按 `pev_round` 读 `.pev/<轮次>/` 判定阶段完成。移走源目录会让归档后的判定全部失效。

## 统一脚本:放 `~/skills/_pev/`

- 公共核心放 `~/skills/_pev/`,各技能脚本从那里导入。不打包、不发同事(2026-10-13 决定),所以不需要技能目录自包含。
- **事实修正**:9 份 `validate.py` 不是同一份拷贝——216~1248 行、9 个不同 md5。`module-design` 与 `api` 共享 526/732 行,`database-schema-design` 661/942,但 `behavior-decompose` 只共享 182/432。抽公共核心前须逐技能比对,不能当拷贝直接合并。

## SKILL.md 公共段

`执行协议`/`状态机`/`Evidence Ledger` 等段跨技能重复,但**非逐字相同**——9 份 `执行协议` md5 全不同(api 与 module 只差"契约面/模块"这类术语,但确实是 9 个版本)。所以是"先归一化术语,再抽公共文件",不是直接提取。

## agent 提示词归一化(先做实验,不预先改)

- 目的:看归一化后能否减少进入上下文的 token,不是为归一而归一(2026-10-13)。
- 现状:27 个 `agents/{planner,executor,verifier}.md`(9 技能 × 3)合计 127060 字节,单文件 2~9 KB,最大是 database-schema-design 的 executor 与 verifier(约 8.6 KB)。全是提示词,**无 frontmatter**;9 份 `planner.md` md5 全不同。抽样 api 与 module 的 `verifier.md`:api 去重后 96 行,其中 40 行与 module 相同(约 42%)。
- 同一次分派只读本技能的三个文件(最多约 20 KB),不读 27 个。归一化要多读一个公共文件,净收益未知,可能只有几 KB。
- **实验**:挑 api 与 module 两个技能,抽出公共部分,量前后单次分派读取的字节数。净省不到 15% 就放弃(15% 是暂定阈值,可改)。
- Claude Code 只从 `~/.claude/agents/`、项目 `.claude/agents/`、插件 `agents/` 加载 agent 定义,`~/skills/...` 不在其中——现行做法是把文件内容塞进 spawn 的 prompt(`~/skills/api-and-interface-design/SKILL.md:189`)。
- **约束**:技能目录(SKILL.md 所在)不能整体挪进 `~/.claude/agents/`——那会让技能不被加载(`~/.claude/skills/` 下的 12 个符号链接指向 `~/skills/`,是技能加载点;两者是不同机制)。

## md 渲染器与门禁布尔

- **render**:从 `iterations/NN-artifact.json` 机械生成 `output/*.md`。9 份模板全是 `{{}}` 占位符(api 模板 41 处),现无渲染脚本(`ls */scripts/` 只有 `validate.py`)。落地后 md 降为只读派生件:要改内容必须改 JSON 再重新生成。
- **门禁布尔改由脚本直接写入**:现状是模型填写 + R7 交叉核对(`incremental-implementation/scripts/validate.py:540-546` 在声称值 ≠ 计算值时报错)。改为脚本直接落盘。

## 三副本现状与处理

| 副本 | 现状 | 处理 |
|---|---|---|
| `iterations/NN-artifact.json` | 结构化数据,`validate.py` 的 R1~R16 靠它计算 | 保留;渲染器的输入 |
| `output/*.md` | 被 `isPevStageComplete` 检查存在性,不能删;靠模型手拼 | 保留;改由 render 生成,降为派生件 |
| change 目录镜像 | 归档时由 `promotion.ts` 复制,无代码要求 | **保留**(它就是要进 git 的归档正本) |

---

## 契约红线(不可破坏)

- `state.json` `status === "COMPLETE"` + `output/` 存在 = 阶段完成判定,openspec status/validate/promotion/archive 依赖。
- requirement-clarify 的 state.json 状态机字段(`WAITING_FOR_INPUT` 等)语义不变。
- `scripts/validate.py` 存在 = doctor 技能检测标志,不得移除。
- schema.yaml 声明式接入(模板 4 字段 + 3 行声明)不变。

## 风险

- **摘要丢细节**:摘要结构化 + 正文在盘,主会话需要时按路径抽查。
- **交互阶段误下沉**:SKILL.md 逐技能标注必须留在主会话的阶段。
- **verifier 读 md 的准确率**:没有数据。缓解:渲染器落地后,拿 2026-10-09 那轮 api 阶段的 JSON 与渲染出的 md 各评一次,比较 findings(tasks 4.3)。
- **无降幅对比**:基线不重测(2026-10-13 决定),减耗只按机制是否落地验收。风险是改完不知实际省了多少;缓解:下一轮实测 token 消耗记入本 change 作参考值,但不与旧数字对比。
- **B2 模板兼容**:三段结构叠加后 spec.md 变长,与 A3 的减耗方向相反——实施时控制各段行数上限。不引入 User Stories。
- **explore 过度探索**:有界轮次 + 每问即止双闸,并限定仅中大型改动启用。
- **归一化引入回归**:抽公共脚本/公共段是重写不是移动(9 份 md5 全不同),有改坏技能的风险。缓解:归一化前补备份(tasks 1.2),每步重跑 `openspec doctor`。**注意**:本 change 声明的回滚包 `pev-skills-backup-20261011.tar.gz` 只含 9 个链上技能,不含 test-driven-development,且打包时间早于本 change 的任何改动。
