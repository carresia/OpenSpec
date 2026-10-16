# Tasks

> 当前选型与验收以 [workflow-decision.md](workflow-decision.md) 为准(2026-10-16 定案):prd/rc 剥离出 workflow、动态 skip、design 唯一自动检测点 + 人工升级、直接演进 pev;不打包;指定 llm-client-infra 轮次重放。历史任务中涉及 pev-lite 的条目废止,证据保留。

## W0. 定案与最小契约

- [x] W0.1 形成阶段 0、`compact-plan`、条件 DAG、`SKIPPED` 和升级机制的调研结论，写入 `research.md`
- [x] W0.2 确认第一版采用动态阶段选择 + 单一 `.openspec-workflow.json`，不引入通用条件 DSL
- [x] W0.3 定案写入 `workflow-decision.md`(2026-10-16):prd/rc 剥离、未涉及阶段 skip 且零产出、粗定在澄清+初探后、design 唯一自动检测点 + 保留人工升级、直接演进 pev 删 pev-lite;skip 保留 evidence 字段
- [ ] W0.4 补 delta specs(动态 workflow 生命周期行为)并移除 skip_specs 标记;替代输入映射逐技能核对(对照 workflow-decision.md 映射表,核实各技能 SKILL.md 与 validate.py 的输入检查)
- [ ] W0.5 测试先行实现；status/instructions/apply/validate/archive 一起接通后验收。此前试写已撤回，不计完成

## W1. Workflow state 接入

- [ ] W1.1 新增 workflow state 模块:读校验 `.openspec-workflow.json`——active ∪ skipped 覆盖 schema 全集、SKIPPED 三字段(reason/evidence/decidedBy)、entry.requirement 存在性、未知 ID、依赖闭包;无状态文件走旧行为,损坏报错不静默回退
- [ ] W1.2 `status --json` 与文本输出展示 active 阶段、skip 理由与升级历史
- [ ] W1.3 `instructions` 区分 workflow skip 与旧 `skip_specs`;skip 阶段不生成模板指令、不计入依赖阻塞
- [ ] W1.4 `apply` 必需集只计算 active artifact;validate/archive 用同一 active state,SKIPPED 不得当 COMPLETE;promotion 只遍历 active,skip 不记 unverified
- [ ] W1.5 轮次命名去 `prd-` 前缀(`src/utils/change-utils.ts:192`)、去掉 `pm/` 目录创建(`:201`)
- [ ] W1.6 失败测试:malformed、缺证据、未知 artifact、覆盖不全、active 依赖断裂、旧 change 无状态文件兼容

## W2. 粗定 workflow(取代阶段 0)

- [ ] W2.1 起草指引落进 openspec-propose:风险触发表 + 不可跳过清单(来源 workflow-decision.md,出自 first-principles §2),模型起草、人逐条确认
- [ ] W2.2 `openspec workflow init` 命令:校验通过后写入 state;拒绝重复 ID、覆盖不全、无证据 skip
- [ ] W2.3 五类样例回测粗定:根因明确的单模块修复;单模块行为变更;小代码量但有 API 变化;有迁移或跨服务影响;初看简单、design 时才暴露 API 风险(专测升级检测点)。记录假阳性、假阴性与错误放行

## W3. 升级(design 唯一自动检测点 + 人工发起)

- [ ] W3.1 architecture-design 设计产出增加"workflow 对照与升级判定"节:对照 active/skip 判定 design 是否引入未激活阶段的风险;verifier 增加对应检查项
- [ ] W3.2 `openspec workflow upgrade` 命令:追加升级事件(date/reason/evidence/decidedBy/added/reopens/explore),added 纳入 active,reopens 重开下游(原 COMPLETE 作废);拒绝只减不增、拒绝无证据事件
- [ ] W3.3 design 后不再自动检测(用户拍板,接受不完善);保留人工发起升级;测试覆盖两条路径
- [ ] W3.4 升级后补充探索:explore 字段由新增阶段的技能自行消化(如 api 先探现状接口面);与 B3 explore 分派合并实施(任务 11.x)

## W4. schema 演进与技能落点

- [ ] W4.1 pev schema 删 `prd`、`spec`,catalog `requires` 置空;同步改仓库根 `schemas/pev/`(随包发布副本)与项目 `openspec/schemas/` 两处
- [ ] W4.2 删除 `openspec/schemas/pev-lite/`(原 8.2-8.4 成果);删除前确认无 change 的 `.openspec.yaml` 引用 `schema: pev-lite`
- [ ] W4.3 behavior-decompose 输入契约:上游改为 change 目录澄清文档(SKILL.md 与 validate.py 输入检查)
- [ ] W4.4 requirement-clarify 产物落点改 change 目录;自身状态机与台账保留;rc 退出 OpenSpec 生命周期管理(无阶段完成判定,由 workflow state 的 entry 字段引用)
- [ ] W4.5 planning-and-task-breakdown 与 incremental-implementation 的替代输入核对:design 被 skip 时 tasks 的 arch_source 取 spec 实施决策段(B2);实施时核对,不得预先假设成立

## 历史任务

以下保留原编号和完成记录；新工作流任务使用 W 前缀。原规模分级任务仅证明 pev-lite 过渡方案，不代表新 workflow 完成。

> 授权记录:`proposal.md` 的 A/B 组方案与 `design.md` 的实现设计**已批准**(2026-10-13,含"先改文档事实错误,再做规模分级"的执行顺序)。未标注 [需拍板] 的条目按设计执行,不需再次确认。

## 1. 基线与备份

- [x] 1.1 基线口径:2026-10-13 决定**不重测**。原"624K"在会话日志中无来源,已从 proposal 删除;改后不做降幅对比,减耗只按机制是否落地验收。
- [x] 1.2 test-driven-development 备份已补(2026-10-13):`~/skills/test-driven-development-backup-20261013.tar.gz`。核实依据:该技能有 4 个文件(`SKILL.md` 与 `references/` 下 3 个)比 20261007 旧包新;9 个链上技能则无文件比 20261011 包新

## 2. 统一脚本与公共文件(2026-10-13 拍板;**先做**,后续多项依赖目录布局)

- [ ] 2.1 归一化 9 份 `validate.py`:抽公共核心(Errors/check_type/validate/load_json/find_project_root 等)到 `~/skills/_pev/`,各技能脚本从那里导入;实测重叠度不一(module 526/732、decompose 182/432),逐技能比对后再抽
- [x] 2.2 ~~写打包脚本~~ 取消(2026-10-13):不打包、不发同事,不需要技能目录自包含
- [ ] 2.3 归一化 SKILL.md 公共段(`执行协议`/`状态机`/`Evidence Ledger`):9 份 md5 全不同,先统一术语再抽公共文件
- [ ] 2.4 **实验**(不预先改):挑 api 与 module 两个技能,抽出 `agents/*.md` 的公共部分,量前后单次分派读取字节数;净省不到 15%(暂定阈值)就放弃。现状 27 个文件合计 127060 字节,单次分派只读本技能三个文件。**技能目录本身不挪**——挪进 `~/.claude/agents/` 会导致技能不被加载
- [ ] 2.5 公共文件落位后,重跑 `openspec doctor` 确认 PEV Skills 检测仍通过

## 3. md 渲染器 + 门禁布尔脚本写入(2026-10-13 拍板)

- [ ] 3.1 新增 `render` 命令:从 `iterations/NN-artifact.json` 机械生成 `output/*.md`;9 份模板各不相同(api 模板 41 处 `{{}}`),逐技能实现
- [ ] 3.2 渲染器落地后,md 降为只读派生件——SKILL.md 写明"要改内容必须改 JSON 再重新生成"
- [ ] 3.3 门禁布尔改为脚本直接落盘,取代模型填写 + R7 交叉核对(`incremental-implementation/scripts/validate.py:540-546`)

## 4. 减耗:verifier 读 md(依赖 3.1)

- [ ] 4.1 各技能 `agents/verifier.md` 与 SKILL.md:verifier 的读取路径从 `iterations/NN-artifact.json` 改为 `output/` 下的 md;`validate.py` 与渲染器仍读 JSON,JSON 不删(R1~R16 依赖它)
- [ ] 4.2 逐技能核对 md 是否含 verifier 需要的全部字段(如 self_challenge、红线处置、残留与未决);缺的在模板补
- [ ] 4.3 对照实验:用 2026-10-09 那轮 api 阶段的 JSON 与渲染出的 md,用同一份 verifier 提示词各评一次,比较 findings;结果记入本 change。注意旧 md 是手拼的,实验须用渲染器输出

## 5. 减耗:只读直接上游

- [ ] 5.1 各技能 SKILL.md:直接上游清单读全文,更上游按 ledger 条目 ID 核对,抽查需注明理由
- [ ] 5.2 **约束对象是验证子代理**,不是主会话(2026-10-13 核实:重复读主要发生在验证方)

## 6. 减耗:复验收口(2026-10-13 重定,取代原"收紧 REVISE")

- [ ] 6.1 第 1 轮全量评;第 2 轮起只核对上轮 findings 是否修好 + 有无回归,不再全量重跑
- [ ] 6.2 验证报告按轮次另存,不覆盖同号文件
- [ ] 6.3 区分增量 PASS 与 FULL PASS 语义,写入各技能 `agents/verifier.md`
- [ ] 6.4 定 FULL PASS 判据:三条**都满足**才置 `status="COMPLETE"`(候选:上轮 critical_issues 逐条有处置记录、本轮无新增 BLOCKING、五个门禁脚本全绿)
- [ ] 6.5 `max_iterations` 保留 5(9 份 schema 硬编码 `default: 5`),不降为 3;仅改复验协议

## 7. 减耗:subagent 分派

- [ ] 7.1 各技能 SKILL.md 增加分派条款:技能级 subagent + 结构化返回契约
- [ ] 7.2 逐技能标注必须留在主会话的用户交互阶段
- [ ] 7.3 verifier 独立分派;REVISE 重跑用 fresh subagent
- [x] 7.4 ~~写降级路径~~ 取消(2026-10-13):Claude Code 与 Codex 都有派子代理的能力,不设降级分支;删除各 SKILL.md 中"无子代理就切换角色重新推导"那句
- [ ] 7.5 新会话启动 PEV 链 + 阶段间压缩 + 主会话只留状态(A1 解决不了的 253K 起点问题)

## 8. 规模分级:新增小规模 schema(2026-10-13 重定;动本仓库 `openspec/schemas/`)【历史,已废止:被动态 skip 取代,见 W 系列;判据与回测证据保留】

`pev`(9 阶段)保持不变;新增一条小规模 schema。判据与依据原在 design A6(2026-10-16 删除,取证并入 workflow-decision.md 的"改动代价"与起草指引)。

- [x] 8.1 阶段集合已定并核实(2026-10-13):`prd → spec → catalog → specs → design → tasks → implement`,砍 `modules`、`design-api`、`design-db`,保留 `design`。核实:`tasks.requires` 原为 `['design-api','design-db','modules']`(`schemas/pev/schema.yaml:106-108`),已改接 `['design']`;`design` 只依赖 `catalog`,`implement` 只依赖 `tasks`,无其他下游引用被砍三段。**改接只发生在 pev-lite,不得套用到演进后的 pev(2026-10-16 标注)**:pev 保留 `tasks.requires` 三依赖原样,被 skip 的依赖由 skip 闭包解锁,见 W4.1
- [x] 8.2 已 fork:`npx openspec schema fork pev pev-lite`(2026-10-13)
- [x] 8.3 已写 `openspec/schemas/pev-lite/schema.yaml`;模板 7 份与声明的 7 个 artifact 一致,已删 `modules.md`、`design-api.md`、`design-db.md`
- [x] 8.4 已核实(2026-10-13):`npx openspec schema validate pev-lite` 通过;`openspec new change smoke-pev-lite --schema pev-lite` 建出 change 且 `.openspec.yaml` 写入 `schema: pev-lite` 与 `pev_round: prd-2026-10-13`(轮次目录与 `pm/` 随之创建);`openspec status` 列出 7 个阶段、`tasks` 仅被 `design` 阻塞。测试产物已删除
- [ ] 8.5 ~~核对 arch_source 依赖~~ 已消解(2026-10-13):保留 `design` 阶段后,`tasks` 的上游仍是架构产物,`planning-and-task-breakdown` 的必填 `arch_source` 自然满足,无需改动技能
- [x] 8.6 已回测(2026-10-13):该轮是 `mechunit-collectors` 的 `ecom-reviews-source`(`.openspec.yaml`:`schema: pev`、`pev_round: prd-2026-10-09`)。按 cospowers 三条判据:判据1 模块数 = **eligible**(`design/architecture.md:51` 部署边界「单仓库单进程」、`:39` 当前模式「模块化单体」);判据2 跨模块交互 = **rejected**(`:73-78` 交互表:M2 写 run 数据、M3 读;M3 另改 `sources.py` 既有扩点);判据3 范围 = **有争议**(代码足迹确为 2 新文件 + 1 扩点 + 1 config,但 `:64-67` 设计了 M1~M4 四个模块)。按「任一条命中 rejected 即整体否决」,**该轮不满足 pev-lite**。**2026-10-15 补测(判据 2 边界说明补齐后重套,拍板见 8.9)**:判据2 = **eligible**——该轮所有跨模块数据流走既有契约,无任何"对方"需改:M2 按 run 目录既有契约写数据(四 import 先例同形态,architecture.md:86)、鲜度登记用既有 upsert_items 不改它(:76、:88)、M3 在 sources.py 为扩展设计的登记位新增条目(commit 37770ac 对该文件全为加行,既有分支/SourceSnapshot/签名零改动,六源回归测试在同 commit 守门);判据3 = **eligible**——设计自述「跟随现有星型分层,零新顶层结构」(:23)、「全部落在既有域的既有扩点」(:24)、边界沿用 importlinter 既有契约(:41)、boundary_erosion 自评「既有先例的沿用,非新越界」(:125),M1~M4 四行与改动足迹一一对应(:64-67),是足迹在既有域上的复述而非边界论证。判据1 维持 eligible。**三条全 eligible,该轮满足 pev-lite,作为 A6 成效依据;本条前半的"不满足"保留为截取判据下的事实记录**
- [x] 8.9 **已定(2026-10-15 拍板):判据未过严,系截取失真;动机样本保留,不换**。成因:design/proposal 借用边界说明时只借了两条,漏了判据 2 那条("跨模块交互看契约是否变化",scale-boundary.md:18),8.6 遂以"交互表有跨模块行"直接判 rejected;该套法既比原文严,也不可用——判据的真实作用时点是创建 change 选 schema(8.8),彼时无设计产物,交互表尚不存在。读法 A(换样本)不采:pev-lite 的阶段集合(砍 modules/design-api/design-db)正对该轮痛点(8.10),换样本则判据与阶段集合脱节,且唯一实测过的痛点类型下一轮仍走 9 阶段;读法 B(放宽为只看足迹与部署单元)不采:原文明文"不得因为『看起来改动不多』就放行"(scale-boundary.md:29),且判据 3 边界说明("看设计复杂度,不是代码行数")本身就是反足迹判据。裁定点:在为扩展而设计的登记位新增条目**不算**改契约(用户采认;依据 commit 37770ac 全为加行、六源回归零变化)。补齐后的重套结论见 8.6 补测
- [ ] 8.10 附带事实:该轮 db 阶段是**以「零库」skip-record 收口**(`design/db/skip-record.md`),不是未走;api 阶段被用户当场质疑多余。即用户当时的不适感集中在 api 与 db 两段,而 pev-lite 砍的是 modules、design-api、design-db 三段
- [x] 8.7 ~~与 B3 explore 启用条件共用同一判定~~ 已废止(2026-10-16):动态 skip 后 B3 启用条件改挂粗定 workflow,见 design 顶部定案节
- [x] 8.8 ~~写明选哪条 schema 的判据~~ 已废止(2026-10-16):只剩一条 pev 菜单,无 schema 选择问题;粗定指引见 W2.1。原判据表述(「契约是否变化」口径)保留在 8.9/8.6 的记录里,起草指引可引用

## 9. 能力:requirement-clarify 的提问阶段调用 grilling 技能

rc 不再自己实现提问规则,改为调用 `~/project/ai/skills-dir/mattpocock-skills/skills/skills/productivity/grilling`。节奏与前置条件见 proposal B1、design B1。

- [ ] 9.1 **先装 grilling**:`~/.claude/skills/` 与 `~/.agents/skills/` 下都没有它的软链接,不装则调用失败
- [ ] 9.2 删除 SKILL.md:113"一次性问齐,不要逐条追问"
- [ ] 9.3 rc 的提问阶段改为调用 grilling 技能;写明调用点与传入的初始 frontier
- [ ] 9.4 rc 预生成的两份清单(价值性提问 + 逐章模糊扫描)作为 grilling 的决策树初始节点传入,否则它会从零开始问
- [ ] 9.5 **状态机与台账仍由 rc 负责**:grilling 没有 `state.json`、`WAITING_FOR_INPUT` 和 evidence ledger。写明每轮问完置 `WAITING_FOR_INPUT`,答完把决策写入台账(user-decision 类型)
- [ ] 9.6 逐字段核对"一轮 = 一次 `WAITING_FOR_INPUT`"是否成立;state.json 状态机字段语义不变
- [ ] 9.7 结束条件:frontier 为空且用户确认达成共识,输出"锁定决策清单"进台账

## 10. 能力:requirement-clarify spec 工程化(参考 to-spec)

- [ ] 10.1 spec.md 模板叠加:实施决策(模块/接口/契约级,不含文件路径)、测试决策(只测外部行为)、显式 Out of Scope;各段设行数上限
- [ ] 10.2 **不引入 User Stories**(2026-10-13 拍板):to-spec 的 User Stories 没有异常/边界场景、溯源、覆盖检查,无法替代 behavior-decompose 的 catalog;两阶段各维护同层清单与减耗相反
- [ ] 10.3 `.pev` 契约必填字段保留,`openspec` 消费链不受影响

## 11. 能力:实施前 explore agent(参考 cospowers explore.md)

- [ ] 11.1 定义 explore agent 契约:输入白名单四项(sourceRoot/scope/questions+Q-ID/stopCondition)、只读不写、有界轮次、四段返回。**已有可复用实现**:`~/.claude/agents/pev-explore.md`(白名单 `Read, Grep, Glob, Bash`,已实测派发成功)
- [ ] 11.2 incremental-implementation 增加开工前探索分派,产出写入 `.pev/<轮次>/impl/explore/`,Evidence 并入台账
- [ ] 11.3 executor 改为读现状取证图 + 按需按行范围抽查,不重复全量探索
- [ ] 11.4 unresolved 缺口对应任务标记阻塞,不得瞎猜开工
- [ ] 11.5 验收口径为**取证质量**(能力指标),不宣称缓解"慢"——日志里无此证据(2026-10-13 修正)

## 12. 契约不回归

- [ ] 12.1 `scripts/validate.py` 保留,`openspec doctor` 的 PEV Skills 检测通过
- [ ] 12.2 `openspec status` / `validate --strict` / promotion / archive 对已归档与已完成的既有 .pev 轮次行为不变;其他仓库进行中轮次的 prd/spec 从检查集消失是定案接受的残留风险(workflow-decision.md 改动代价),不算回归(2026-10-16 标注)
- [ ] 12.3 归档镜像保留(拍板);不动 `promotion.ts:104-110` 的两目标写入机制与 `validator.ts:194` 的 `.pev` 读取机制;`promotion.ts:71` 遍历集合接 active 过滤归 W1.4,不在此限(2026-10-16 标注)

## 13. 验收

- [x] 13.1 ~~重打 zip 发同事~~ 取消(2026-10-13):不打包、不发同事
- [ ] 13.2 requirement-clarify 实测一轮 grilling 节奏交互,确认按轮提问与推荐答案生效
- [ ] 13.3 下一轮实施中 explore agent 实际分派,产出四段取证结构
