# Proposal: improve-pev-skills

> 当前选型与验收以 [workflow-decision.md](workflow-decision.md) 为准(2026-10-16 定案):prd/rc 剥离出 workflow、动态 skip、design 唯一自动检测点 + 人工升级、直接演进 pev;不打包;指定 llm-client-infra 轮次重放。A/B 组技能优化仍然有效;涉及 pev-lite 的内容废止。

## 2026-10-16 更新

用户确认四项决策,形成动态 workflow 定案(详见 `workflow-decision.md`):prd 与 rc 剥离出 workflow、未涉及阶段设为 skip 且零产出、粗定 workflow 在需求澄清与初步探索之后由人和模型共同确认、升级检测只发生在 design 之后并保留人工发起升级。三项研究结论(`research.md`)转入实施:动态阶段选择、单一 `.openspec-workflow.json`、显式升级。

新方向改 OpenSpec 源码(状态模块 + 粗定/升级命令 + 11 处消费点接入 active 过滤)并直接演进 pev schema(删 prd/spec,删 pev-lite),下文”源码不动 / 无 Modified Capabilities”仅属于原方案。实现前需补 delta specs,不能以本 change 现有 skip_specs 标记绕过行为契约。技能优化范围(A/B 组)保留。

## Why

两个目的,同一批修改对象(`~/skills/` 下 9 个链上技能 + test-driven-development;`~/.claude/skills/` 对应项均为符号链接,改一处即全局生效)。

**目的 1:token 减耗。** 基线数字待重测:原记的"624K token"在会话日志里找不到来源(`grep 624` 在 `mechunit-collectors` 全部会话日志中只命中 hash 片段 `62457f3`、`624a40c4`,无 token 计数)。按规则 13 不保留无来源数字,见 tasks 1.1。

以下归因来自 2026-10-12 实测,来源 `~/.claude/projects/-Users-zhengshan-project-ai-OpenSpec/b5b9208a-….jsonl` 第 131 行起(6 小时 40 分时间去向),按影响排序:

1. **流程成本不随改动规模缩放**(根源):实际只 2 个新文件 + 一处扩展 + 一个 config 条目,却走完 9 阶段且每阶段配独立验证;链路里没有按规模分级的入口。
2. **进 PEV 前上下文已 253K,后涨到 474K**:上午的链路梳理把上下文从 97K 推到 237K;超 400K 后单次调用延迟中位数从 8 秒升到 13 秒。
3. **验证不收敛**:api 阶段每轮都发现全新问题(全量重跑 19 分钟 vs 窄范围 4 分钟),共 4 轮 + 1 次被打断。阶段耗时:api 172 分钟、impl 91 分钟、tasks 55 分钟。
4. **用量上限是最大单项时间损失**:两次 5 小时上限共 181 分钟(12:54 那次停滞约 100 分钟,17:39 那次直接中断)。
5. **确定性工作由模型手工完成**:validate.py 62 次、openspec CLI 35 次、读 schema 20 次、手拼 md 14 次、cp 镜像 11 次、手改 state.json 33 次。主会话生成 102 分钟,干等验证子代理 76 分钟,工具执行 41 分钟。

> **原稿归因修正(2026-10-13 核实)**:原文把"主会话线性执行,不用 subagent"列为结构性根因,与事实不符——那 15 次验证本来就是子代理。原记"catalog/architecture 各 20K 被 4 个下游重复读"在主会话里不明显,重复读主要发生在验证子代理内。原记"REVISE 循环翻倍(pm/impl 各 2 轮)"统计不准,只看到 impl 第 1 轮,最严重的是 api 阶段。

**目的 2:能力优化。** 2026-10-11 用户提出三项缺陷:

- **requirement-clarify 对话模型反向**:`~/skills/requirement-clarify/SKILL.md:113` 明文"向用户一次性问齐,不要逐条追问"。批量问卷让用户负担重、有依赖关系的决策乱序、单点无法深挖。
- **requirement-clarify 产出语言不对口**:产出停留在产品语言,缺少向工程 spec 语言的翻译,下游 behavior-decompose 拿到的不是可直接拆解的工程表述。
- **incremental-implementation 开工前无现状探索**:全文没有任何开工前代码取证环节,executor 边写边读,现状不明时靠猜。

## What Changes

### A. 减耗(A1-A5 活跃;原 A6 已废止,条目保留作废止记录)

- **A1 subagent 分派**:按技能级分派 subagent 执行——自行读盘/写盘,只回传结构化摘要(verdict、critical issues、evidence 条目 ID、产出物路径);需用户拍板的阶段留主会话。Claude Code 与 Codex 都有派子代理的能力(codex-cli 0.162.1 二进制含 `spawn_agent` 73 处),不设降级分支。
  **补充(2026-10-13 核实)**:A1 解决不了起点的 253K,需配套"PEV 链在新会话启动 + 阶段间压缩 + 主会话只留状态"。
- **A2 verifier 读 md,不读 JSON**:`iterations/NN-artifact.json` 保留,作为 `validate.py` 与渲染器的输入;`output/*.md` 由渲染器从 JSON 生成,verifier 读 md。
  **JSON 不能删(2026-10-13 核实)**:`validate.py` 有 R1~R16 共 16 条规则对 JSON 字段做计算(契约守恒、覆盖对账、门禁布尔等),九份脚本各有 15~66 行直接引用 artifact 结构。删 JSON 等于重写这些脚本去解析 md,不采用。
  **未验证**:verifier 改读 md 后评审准确率是否下降,没有数据;md 是否包含 verifier 需要的全部字段(如 self_challenge、红线处置),实施时逐技能核对(tasks 4.2)。
- **A3 只读直接上游**:直接上游读全文,更上游仅按 evidence ledger 条目 ID 引用核对,不默认重读原文。不另行规定"先 grep 再 read"。
  **约束对象修正(2026-10-13 核实)**:重复读主要发生在验证子代理内,不在主会话;A3 应主要约束验证方。
- **A4 复验收口(取代原"收紧 REVISE")**:第 1 轮全量评;第 2 轮起只核对上轮 findings 是否修好 + 有无回归,不再全量重跑。原方案"仅 critical_issues 非空或总分低于阈值才打回"挡不住"每轮冒新问题",因为新问题常被计为 critical。
- **A5 增量/全量 PASS 区分**:窄范围收口返回的是增量 PASS,不构成整体 PASS,不得代替最终全量 PASS;COMPLETE 只认全量判据(见 design)。
- **A6 规模分级入口**【已废止(2026-10-16),被 C 组动态 skip 取代】:原为新增小规模 schema(pev-lite),该路线已删除;判据边界说明并入 workflow-decision.md 起草指引,引擎取证并入其"改动代价",回测证据见 tasks 8.6/8.9。

### B. 能力(三项)

- **B1 requirement-clarify 的提问阶段改为调用 grilling 技能**(借鉴 `~/project/ai/skills-dir/mattpocock-skills/skills/skills/productivity/grilling/SKILL.md`;`grill-me` 只是调用它的 7 行包装):rc 不再自己实现提问规则,在提问阶段直接调用该技能。删除"一次性问齐,不要逐条追问"这条反向指令。
  **grilling 的节奏**:把待决问题看成决策树,每轮把"前置决策都已确定"的所有问题(frontier)一次问完,编号、每题带推荐答案、措辞让"是"等于接受推荐;等用户答完再重算下一轮;依赖本轮未决问题的放后面的轮次;需要环境事实的派子代理去查,不问用户;frontier 为空且用户确认达成共识才结束。不是逐题一问一答,也不是"最多 4 题"。
  **三个前置条件(2026-10-13 核实)**:
  1. **grilling 尚未安装**——`~/.claude/skills/` 与 `~/.agents/skills/` 下都没有它的软链接,直接调用会失败,安装是前置任务(tasks 9.1)。
  2. **状态机与台账仍由 rc 负责**——grilling 本身没有 `state.json`、`WAITING_FOR_INPUT` 和 evidence ledger。rc 的 SKILL.md 要写明:每轮问完置 `WAITING_FOR_INPUT`,答完把决策写入台账(user-decision 类型)。
  3. **预生成清单作为决策树初始节点**——rc 现有的"价值性提问"与"逐章模糊扫描"两条通道保留,交给 grilling 作为初始 frontier,否则它会从零开始问。
  **收益与代价**:rc 不再复制提问规则,grilling 更新自动生效;代价是 rc 依赖一个仓库外的技能。
  **不采用的替代(2026-10-13)**:不引入 mattpocock 的完整技能链与 issue tracker。理由:`to-tickets` 等技能要求先跑 `setup-matt-pocock-skills`,产物落点是 `.scratch/<feature-slug>/issues/` 或 GitHub/Linear issue(该仓库当前 `docs/agents/` 与 `.scratch/` 均不存在);产物不是 PEV 工件,阶段完成判定认的是 `state.json` 的 `status === "COMPLETE"` + `output/` 存在,换过去会让所有阶段停在未完成状态。那套技能适用于完全不进 OpenSpec 的纯 issue 驱动工作。
- **B2 requirement-clarify 产出工程 spec 化**(借鉴 `~/project/ai/skills-dir/mattpocock-skills/skills/skills/engineering/to-spec/SKILL.md` 的输出模板):spec.md 引入实施决策(模块/接口/契约级,不含文件路径)、测试决策、显式 Out of Scope;把产品功能翻译为工程语言。只借 to-spec 的输出语言,不借其"不采访只综合"的流程——requirement-clarify 本来就是采访技能。
  **不引入 User Stories(2026-10-13 拍板)**:to-spec 的 User Stories 只有一句话一条,没有异常/边界场景、溯源、覆盖检查;behavior-decompose 的 catalog 才有这些,且 `schemas/pev/schema.yaml:42` 的 `specs` 阶段要把 catalog 映射为 Requirement/Scenario,to-spec 无法替代。两个阶段各维护一份同层清单要同步编号并改校验,与减耗目标相反。
- **B3 实施前 explore agent 取证**(借鉴 `cospowers3.0/plugins/cospowers-decompose/agents/explore.md` 的 agent 契约):incremental-implementation 开工前分派只读探索 agent——参数白名单(sourceRoot/scope/questions/stopCondition)、问题带稳定 Q-ID、有界轮次、接口签名逐字保真;返回 Coverage/Evidence/Conflicts/Unresolved gaps 四段结构,缺口显式上报,缺口任务不得开工。
  **验收口径修正(2026-10-13)**:原稿把"缓解慢"当作它的收益,日志里找不到证据。改为能力指标(取证质量),且只在中大型改动启用(2026-10-16 起:启用条件在粗定 workflow 时确认,原 A6 判定已废止)。

### C. 动态 workflow(2026-10-16 定案)

- **C1 prd/rc 剥离**:pev schema 删 `prd`、`spec`;product-manager 与 requirement-clarify 在 workflow 外运行,澄清产物落 change 目录,作 workflow 外部输入;catalog 的 `requires` 置空,输入改为该文档。
- **C2 动态 skip**:未涉及阶段在 `.openspec-workflow.json` 设为 skip,skip 阶段零产出(无 state.json、无 output、无模板指令);粗定在需求澄清 + 初步探索之后,模型按风险触发表起草、人逐条确认、CLI 校验写入。
- **C3 design 检测点 + 手动升级**:design 是唯一自动升级检测点(架构设计产出增加 workflow 对照判定,verifier 增检查项);design 后不再自动检测,保留人工发起升级;升级事件含 added/reopens/explore,被重开阶段原 COMPLETE 作废。
- **C4 引擎接入**:新增 workflow state 模块与粗定/升级 CLI 命令;status/instructions/apply/validate/archive/promotion/nested-change 接入 active 过滤;轮次命名去 `prd-` 前缀、去掉 `pm/` 目录创建;无状态文件保持旧行为。
- **C5 schema 演进**:直接演进 pev(8 artifact 菜单),删 pev-lite;`skip_specs` 读取保留兼容,新 change 不再写。

详见 `workflow-decision.md`(契约、代价、验收)。

## Capabilities

### New Capabilities

动态 workflow 生命周期行为(逐 change active/skip、粗定、design 检测点升级)——实施前补 delta specs(W0.4),不沿用 skip_specs 绕过行为契约。

### Modified Capabilities

- `.pev` 对外契约保持:`state.json` `status === "COMPLETE"` + `output/` 存在仍是阶段完成唯一判定(pev-integration、pev-verification-gates 消费);`scripts/validate.py` 仍存在(doctor 技能检测标志);requirement-clarify 的 state.json 状态机字段语义不变(rc 自身机制保留,只是退出 OpenSpec 生命周期管理)。
- pev schema 的阶段集合(删 prd/spec)与生命周期命令行为(active 过滤)——归入上面的 delta specs。

## Impact

- 修改对象:`~/skills/{product-manager, requirement-clarify, behavior-decompose, architecture-design, module-design, api-and-interface-design, database-schema-design, planning-and-task-breakdown, incremental-implementation, test-driven-development}` 的 SKILL.md 与 scripts/。
- 参考实现(只读借鉴,不引入文件):`~/project/ai/skills-dir/claude-skills/engineering/grill-me`、`~/project/ai/skills-dir/mattpocock-skills/skills/skills/engineering/to-spec`、`~/Documents/mechunit/cospowers3.0/plugins/cospowers-decompose/agents/explore.md`。
- 本仓库改动(2026-10-16 定案后):`src/`(workflow state 模块、粗定/升级 CLI 命令、11 处消费点 active 过滤、失败测试)、`schemas/pev/`(删 prd/spec,演进为 8 artifact 菜单;项目内落点是 `openspec/schemas/`,由 `getProjectSchemasDir` 决定,仓库根 `schemas/` 是随包发布的副本,两者都要改)、删除 `openspec/schemas/pev-lite/`;`openspec/specs/` 由 delta specs 更新(W0.4)。
- 回滚:`~/skills/pev-skills-backup-20261011.tar.gz`(564K,9 个链上技能,2026-10-11 11:11 打包);test-driven-development 动前需补备份。
- 交付:不打包、不发同事(2026-10-13 决定),只在本机 `~/skills/` 生效。
- 验收:①requirement-clarify 实测一轮 grilling 节奏交互;②下一轮实施中 explore agent 实际分派并产出取证结构;③agent 提示词归一化实验的字节数对比(tasks 2.4)。**基线不重测**(2026-10-13 决定):改后不做 token 降幅对比,减耗只按机制是否落地验收,不宣称降幅。

## 三副本与统一脚本(2026-10-13 拍板)

- **归档镜像保留**:`promotePevArtifacts` 在归档时把终稿复制到 change 目录(`src/core/archive.ts:1680`),该副本是归档件留存的正本,要进 git;`.pev/` 不进 git。
  **不做 move**:`promotion.ts:104-110` 写到两个目标(changeDir + `openspec/artifacts/`),move 只能满足前者;且 `src/core/validation/validator.ts:194` 与 `src/core/artifact-graph/state.ts:33` 在归档后仍按 `pev_round` 读 `.pev/<轮次>/` 判定阶段完成,移走源目录会让判定失效。
- **统一脚本放共享位置**:`~/skills/_pev/`,各技能脚本从那里导入(不打包,不需要自包含)。
  **事实修正(2026-10-13)**:9 份 `validate.py` 不是同一份拷贝——216~1248 行、9 个不同 md5;`module-design` 与 `api` 共享 526/732 行,`behavior-decompose` 只共享 182/432 行。去重前须先归一化,不是移动。
- **SKILL.md 公共段抽公共文件**:`执行协议`/`状态机`/`Evidence Ledger` 等段跨技能重复但**非逐字相同**(9 份 md5 全不同,差异多在"契约面/模块/store"这类术语)。同样先归一化再抽。
- **agent 提示词归一化(先做实验,不预先改)**:目的是看能否减少进入上下文的 token,不是为归一而归一。现状 27 个 `agents/*.md` 合计 127060 字节,单文件 2~9 KB;抽样 api 与 module 的 `verifier.md`,api 去重后 96 行里 40 行相同(约 42%)。同一次分派只读本技能三个文件(最多约 20 KB),归一化要多读一个公共文件,净收益未知。实验:挑 api 与 module 两个技能,抽出公共部分,量前后单次分派读取字节数;净省不到 15%(阈值为暂定值)就放弃。
  **技能目录不能挪进 `~/.claude/agents/`**——那会让技能不被加载;现状 Claude Code 只从 `~/.claude/agents/`、项目 `.claude/agents/`、插件 `agents/` 加载 agent 定义,`~/skills/...` 不在其中(见 `~/skills/api-and-interface-design/SKILL.md:189`)。
- **md 渲染器**:新增 `render`,从 JSON 机械生成 `output/*.md`(9 份模板全是 `{{}}` 占位符、现无渲染脚本)。落地后 md 降为只读派生件:要改内容必须改 JSON 再重新生成。
- **门禁布尔改为脚本直接写入**:现状是模型填写、脚本用 R7 交叉核对(`incremental-implementation/scripts/validate.py:540-546` 会在声称值 ≠ 计算值时报错)。改为脚本直接落盘。
