# 替代输入映射逐技能核对(W0.4,2026-10-16)

对照 [workflow-decision.md](workflow-decision.md) 替代输入映射表,只读核对 `~/skills/` 下 5 个技能的 `SKILL.md` 与 `scripts/validate.py`。只读未改;行号为 2026-10-16 快照,`~/skills/` 正被另一会话归一化(tasks 2.1 抽 validate.py 公共核心、2.3 归一化 SKILL.md 公共段),行号与公共段措辞在归一化完成后复核(校验行为按约定不变)。

> **2026-10-16 归一化后状态注**:2.1/2.3 当日已完成(改动只在 `~/skills/`),本文行号均为归一化前快照,已漂移。抽查(2026-10-16 21 时):rc `scripts/validate.py#255`→`:192`,R8 `output/spec.md` 门槛在位,事实仍成立;architecture-design Input Gate 未被 2.3 改写,仅行号漂移(#68-70→约 #66-70)。复核并入 W4.3/W4.4/W4.5 动手时;映射表缺口第 3 行(api/db)并入 W4.5。

## 逐技能结论

| 技能 | 对应映射 | 结论 | 关键证据(文件#行号) |
| --- | --- | --- | --- |
| requirement-clarify | 澄清产物的生产方(决策 1:产物落 change 目录) | 输入侧符合;产物落点不符(W4.4 改造点) | 见下 1 |
| behavior-decompose | 上游改 change 目录澄清文档(W4.3) | 部分符合:机器校验不拦,溯源指引未覆盖 | 见下 2 |
| architecture-design | catalog skip → 接受"已批准 Spec" | 符合 | 见下 3 |
| planning-and-task-breakdown | design-api/db skip → arch_source 取 design 产物;design skip → 取 spec 实施决策段 | 前者符合;后者不符(W4.5 改造点) | 见下 4 |
| incremental-implementation | tasks 第一版必选,implement 输入恒来自 tasks | 符合 | 见下 5 |

## 逐条证据

### 1. requirement-clarify

- 输入侧**符合**:`SKILL.md#109`"定位上游 PRD:优先 `.pev/` 下最新一个含 `pm/output/prd.md` 的轮次,用户直接给路径亦可"——change 目录的 PRD 经"用户直接给路径"可进入;`SKILL.md#57-58` `prd_source` 引用不复制。
- 产物落点**不符**(定案要求落 change 目录,W4.4):`SKILL.md#149` PASS 后渲染到 `.pev/<轮次>/rc/output/spec.md`;`scripts/validate.py#29`(R8 规则声明)、`#255`(`spec = pev_dir / "output" / "spec.md"`)、`#262`(COMPLETE 前提为 output/spec.md 存在且非空)把落点固定在 `.pev` 轮次内。

### 2. behavior-decompose

- 机器校验**不拦**:`schemas/state.schema.json#16-19` `spec_source` 为自由字符串,描述为"优先 .pev/<轮次>/rc/output/spec.md,或用户直接提供的已批准 PRD";`scripts/validate.py` 仅 2 处引用 `spec_source`(`#16` R1 头注、`#380` R1 证据格式提示),无路径校验;`#398-403` R4 只锁 `spec_gaps`。
- 溯源指引**未覆盖 change 目录上游**:`SKILL.md#54` 合法溯源源只列 `.pev/<轮次>/rc/`;`scripts/validate.py#16`、`#380` 的 FACT 证据措辞绑定".pev/<轮次>/rc/ 产物"。属 W4.3 改造点(改 SKILL.md 溯源源清单与 R1 措辞,或 schema 描述)。
- 判定:**部分符合**——挂 change 目录上游不会被脚本拒绝,但按 W4.3 目标,指引与证据措辞需改。归一化完成后复核(2.3 归一化会改公共段措辞)。

### 3. architecture-design(catalog skip 的下游)

- **符合**:`SKILL.md#27` 上游三型"行为目录 / 工程 Spec / PRD";`SKILL.md#68-70` Input Gate——`decompose/output/catalog.md` 为标准上游,"只有 rc/output/spec.md"与"用户直接给已批准 PRD/Spec"均放行(建议先 decompose,用户坚持→记 DECISION 继续,风险写明);`SKILL.md#99-100` `upstream_source` 记路径、`upstream_kind` 标 catalog/spec/prd/design_doc;`schemas/state.schema.json#25-27` `upstream_kind` enum 含 `"spec"`。
- `scripts/validate.py` 对上游只做 R7 `upstream_items` 对账(`#311-339`)与 R4(`#632-639`),无来源路径限制。
- 注意:catalog 被 skip 时走 `SKILL.md#69-70` 分支会先"建议先 decompose",属流程内提示噪声,不阻塞;不需要为映射表改校验。归一化完成后复核(Input Gate 措辞是否被归一化改写)。

### 4. planning-and-task-breakdown

- design-api/design-db skip → `arch_source` 取 design 产物:**符合**。`SKILL.md#59` `.pev/<轮次>/arch/output/` 为标准上游(门槛),module/api/db/decompose 为补充上游(`SKILL.md#59-63` 自动登记,不设门槛);`schemas/state.schema.json#21-24` `arch_source` 必填但为自由字符串("架构产物路径…或用户提供的架构文档");`scripts/validate.py` 对 `arch_source` 零引用,上游相关仅 R4(`#409-416`)与覆盖率 R7/R8(`#28`、`#35`、`#511-520`),均不校验 `arch_source` 值域。
- design skip → `arch_source` 取澄清 spec 实施决策段:**不符**。`SKILL.md#65-67` 明文"只有 Spec/PRD、无任何技术设计 → 本 skill 不启动…然后都经 `architecture-design` 出架构";`SKILL.md#64`"用户直接给架构文档"分支不覆盖 spec 文档。B2(rc 的 spec.md 增实施决策段)未实施,W4.5"实施时核对,不得预先假设成立"的结论为:**现状不成立,需改 Input Gate 或待 B2 落地后重核**。归一化完成后复核。

### 5. incremental-implementation

- **符合**:`SKILL.md#5-6` 接受"planning-and-task-breakdown 产出…或用户直接提供的任务清单";`SKILL.md#55` 同轮 arch/module/api/db/decompose 产物按需读,非门槛;`schemas/state.schema.json#23` `plan_source` 必填自由字符串;`scripts/validate.py#399-425` `load_upstream_ids` 在无 `tasks/iterations` 结构化产物时返回 None(不启动对账),`#285-290` R6 仅在有结构化上游时比对任务集;`#410-411`、`#422-424` 结构化上游不可读/提取不到 id 时报错,不静默。
- 与映射表无冲突:tasks 第一版不可 skip,implement 的输入恒有 tasks 产物。归一化完成后复核(R6/load_upstream_ids 属公共核心抽取范围)。

## 映射表覆盖缺口

- 映射表第 3 行(modules skip → api/db 的输入取 design 产物,依据"api/db 技能接受'架构设计直接承接'")涉及的 `api-and-interface-design`、`database-schema-design` 不在本任务核对清单(任务只列 5 技能),**未核对**。建议并入 W4.5 或单列核对。
- 映射表第 2 行(specs skip → 无下游)为终端 artifact,无技能输入可核。

## 汇总:需要改的落点(供 W4.x 引用,本任务未改)

1. requirement-clarify 产物落点:`SKILL.md#149`、`scripts/validate.py#255-262`(W4.4)。
2. behavior-decompose 溯源源清单与 R1 证据措辞:`SKILL.md#54`、`scripts/validate.py#16`、`#380`(W4.3)。
3. planning-and-task-breakdown"只有 Spec 不启动"条款:`SKILL.md#64-67`(W4.5,或 B2 落地后重核)。
