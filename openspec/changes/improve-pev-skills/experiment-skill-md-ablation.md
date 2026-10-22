# SKILL.md 提示词归一化消融实验设计(v2.2)

版本记录:v2.1(2026-10-20,二轮评审后修订)→ v2.2(2026-10-21)。v2.2 改两类:
**(甲)** 措辞修订——消除自造缩语与未复述内容的编号引用,实验设计零改动;
**(乙)** §2 排除清单补 `.venv` 与 `.remember` 两项(原清单下「892M→<10M」不成立,
见 §2 注)。臂设计、判定规则、补丁与 MANIFEST 均未动。

状态:设计定稿 + **实验文件已预注册生成**(清单见 §4a;openspec change 目录下
experiment-artifacts/ 内含全部实验文件、补丁与 MANIFEST.sha256,生成后即冻结,
执行前只核验不修改),未执行。
约束原则(正本见 workflow-decision.md):**agent 提示词归一化先做实验、不预先改;
目的是减少进入上下文的 token,不是为归一而归一。**

**实验定位:Pilot(先导实验)。** 结果只用于决定「是否进入确认实验」,**禁止据此
直接把改动同步到任何生产环境的正式技能文件(下称「正本」,指 ~/skills/ 下的
SKILL.md 与 protocol)**。推广到其他 PEV 技能的前置条件见 §10。

术语:本实验比较同一份 SKILL.md 的三个版本,每个版本叫一个**试验组**(arm,
临床实验用语,目录名沿用 arm<X>,X=0/1/2;下文简称「组」)。沙箱 = 正本项目
目录的一份一次性副本,实验只在副本里跑,正本不动。

## 1. 待检验的问题

2026-10-20 的审计测量到 9 份 SKILL.md 之间有 520 行相似度 ≥0.70 的重叠。但语料
重复不等于上下文 token 浪费:SKILL.md 按技能调起才加载,被引用的公共文档要靠
模型主动 Read(可能多次),本项目有「二次读取放大」前科(2026-10-05 的
624K-token 分析)。收益符号未定,须实测。本实验隔离的**唯一自变量是
module-design SKILL.md 的内容形态:同一内容是内联写在 SKILL.md 里,还是压缩成
几行引用、指向公共文件**;protocol、模型、工具、工作负载、应答剧本全部冻结。

生成实验文件时的一项修正(逐字核对后发现):本设计 v2 版对 A1 组的改动范围
预估过大。v2 原以为 module-design SKILL.md 里「核心不变量」一节 5 条中的前
3 条、以及「Evidence Ledger 规则」一节与公共协议重复的通用部分,都是纯重复、
可删一份留引用。逐字对比证明不是:两边各自都有大量对方没有的细化内容,且
Evidence Ledger 那部分本来就已带指向 protocol 的引用行,删任何一边都会丢信息。
实际能纯去重的只有状态机一节里与 protocol 逐字重复的主链描述块。**因此 A1
收缩为最小改动组(净减 35 字节),预期 token 变化约等于 0,主要作为 A0(不改)
与 A2(大改)之间的中间对照点;实质检验在 A2**(净删 8 行、外移 15 行,
SKILL.md 从 240 行减到 232 行)。这本身是一条审计修正:module SKILL.md 经过
任务 2.3(pev-protocol.md 公共段抽取)归一后,残留的重复比总量数字暗示的少。

## 2. 工作负载与沙箱(依赖闭包快照)

依赖闭包 = 该技能运行时会读到的全部文件。

- Workload(用户指定):`/Users/zhengshan/project/mech-unit/mechunit-collectors/
  .pev/prd-2026-10-08-2` 这一轮的 **module 阶段重跑**(该轮已 COMPLETE;只在
  沙箱重跑,正本不动)。
- 三组各配一份独立沙箱 `/tmp/pev-ablation/arm<X>/mechunit-collectors/`:module
  阶段重跑会写入 `module/iterations/`、`module/state.json` 等文件,三组共用一份
  副本会互相污染,所以从正本目录用 rsync 复制三份。排除
  `.venv engine-bin state data lab __pycache__ .git .remember`(v2.2 修正:原
  清单漏了体积最大的 `.venv`(2026-10-21 实测 476M)与 `.remember`(会话历史,
  1.3M)——不排 `.venv` 则每份副本约 486M,「892M→<10M」不可能成立;不排
  `.remember` 则与下条「避免历史信息污染上下文」的意图矛盾)。按 2026-10-21
  实测:正本共 892M,其中 .venv 476M、engine-bin 184M、state 91M、.git 62M、
  data 52M、lab 17M;排除后每份 <10M。被排除的是虚拟环境、引擎二进制、运行
  状态、采集数据、实验数据、Python 缓存、git 历史与会话历史——module 阶段只做
  文档流程,不运行采集程序,读不到它们。保留 `.pev` 与源码目录:module 阶段
  产出设计要读源码;且校验规则 R11(`module-design/scripts/validate.py:45`)
  要求 Evidence Ledger 证据自带的相对路径(如有)能解析到真实文件并回读核对
  摘录,源码目录缺了,validate 就过不了。
- **技能侧只复制依赖闭包,不复制全技能树**:`arm<X>/skills/` 仅含
  `module-design/` 整目录(SKILL.md 换成该组版本,其余 scripts/schemas/
  rubrics/agents/playbooks/templates 原样;A2 组额外装 `references/
  stage-table.md`)与 `_pev/`(core.py/ledger.py/`__init__.py` + pev-protocol.md
  换成 protocol-v2)。不带其他技能——避免其他技能提示词污染上下文。三组同一
  缩减环境,可比性不受损;与生产环境(可见全部技能)的差异记为局限。会话以
  该组的 skills 目录根启动;若发现 Claude Code 不支持目录级覆盖(即无法让会话
  用自定义 skills 目录),退回正本文件替换方案:flock 独占锁 + `trap EXIT
  INT TERM` 恢复 + 恢复后 sha256 校验(崩溃也恢复);实际采用哪种机制写入
  arm manifest,**三组必须同机制**。
- **Preflight(每组开跑前三步全过)**:
  1. 引用解析:提取该组 SKILL.md 与 protocol 的全部引用路径,逐一存在(A2 含
     references/stage-table.md);
  2. 重置前对沙箱里的完整轮逐阶段跑 validate.py,全过;
  3. 重置 module 阶段(删 `module/iterations/` 与 `module/state.json`)后跑
     module 的 validate.py,应报「缺 state.json」类预期错误。
  另:`shasum -c MANIFEST.sha256` 通过后才允许搭建该组环境。

## 3. 公共协议基线(已冻结)

protocol-v2 = 现行 `_pev/pev-protocol.md` + 新增「运行目录(公共规则)」一段
(从 architecture-design / module-design / api-and-interface-design 三份
SKILL.md 的重复 boilerplate 合并而来;补丁见 patch-protocol-v2.diff,恰 1 个
插入段)。**三组(含 A0)统一使用 protocol-v2**,把唯一自变量收窄为 SKILL.md。
protocol-v2 只存在于实验目录,不落正本(除非 §8 判定与 §10 前置条件全部通过)。

## 4. 组设计(唯一自变量 = module-design/SKILL.md)

| 组 | 改动(以补丁为准确证据) | 行数 |
|---|---|---|
| A0 | 现行 SKILL.md 原样(已用 cmp 命令证明与正本逐字节相同)+ protocol-v2 | 240 |
| A1 | 状态机一节:删与 protocol「状态机」段重复的主链行(INIT→…→VERIFYING、PASS、REPLAN、BLOCKED 四行)与竖线装饰线,新增 3 行指向 protocol 的引用句,并标注哪些状态机分支是本技能独有的;本技能独有的分支(Cross 评审、REVISE 细化、回架构两条)保留。patch-A1.diff 恰 1 个改动块(diff hunk) | 240(净减 35 字节) |
| A2 | 在 A1 基础上再改三处(patch-A2.diff 恰 3 个改动块):(一)运行目录 boilerplate(引用不复制、轮次跟随、同日多轮 -2/-3 后缀、迭代号、零填充)压缩为 3 行引用,保留 upstream_kind 的本技能专属取值与「单文件承载全部模块」一句;(二)执行协议逐阶段表的阶段 1-5 外移到本技能 `references/stage-table.md`(照 planning-and-task-breakdown / incremental-implementation 两技能已有的做法),阶段 0 恢复及其「不重新 INIT/不覆盖」守则留在 SKILL.md 内联;(三)validate 命令的 bash 块与登记细则压缩为 3 行引用(照 database-schema-design SKILL.md 已有的做法,标注本技能 stage=module/) | 232 |

三组都不动:Before Starting、Communication、Input Gate 的三选一、核心不变量
(全部 5 条,经核对非纯重复)、Proactive Triggers、Playbook 路由、Verifier
独立性传文件清单、Evidence Ledger 规则里本技能独有的部分。

## 4a. 预注册实验文件清单(已生成,hash 见 MANIFEST.sha256)

| 文件 | 说明 | 组沙箱内安装路径 |
|---|---|---|
| module-SKILL-A0.md | =正本(字节级相同) | skills/module-design/SKILL.md |
| module-SKILL-A1.md + patch-A1.diff | A1 组版本(相对 A0 恰 1 个改动块) | 同上 |
| module-SKILL-A2.md + patch-A2.diff | A2 组版本(相对 A1 恰 3 个改动块) | 同上 |
| module-A2-references-stage-table.md | A2 从 SKILL.md 外移出的阶段表(15 行) | skills/module-design/references/stage-table.md(仅 A2 装) |
| protocol-v2.md + patch-protocol-v2.diff | 三组统一 protocol(129 行) | skills/_pev/pev-protocol.md |
| MANIFEST.sha256 | 上表全部文件 + 两份正本源文件(~/skills/module-design/SKILL.md、~/skills/_pev/pev-protocol.md)的 sha256;`shasum -c` 全过(2026-10-20) | — |

执行规则:搭建组环境时先以 MANIFEST 核验,再按上表安装;**不得现场再改实验
文件**——要改就得修订本设计与 MANIFEST 并重新冻结,旧结果作废。

## 5. 运行控制(运行清单 + 随机化)

- 每组新开一个 headless 会话:`claude -p --output-format stream-json --verbose`,
  JSONL 落盘;三组同一份入口 prompt(文件化):对 `<沙箱>` 执行 module-design
  阶段,上游为 `arch/output/architecture.md`,执行至 COMPLETE。
- 交互控制:遇到 WAITING_FOR_INPUT 或三选一,按**文件化应答剧本**应答(三组
  同一剧本);**剧本未覆盖的提问 → 中止该组并记录,不即兴应答**。
- **运行清单(arm manifest,每组运行前生成,含 sha256)**:claude --version 与
  model 串(取自 JSONL 的 model 字段)、温度(不可配置则记 default)、该组
  skills 依赖闭包的 tar hash、沙箱初始目录树的 tar hash、入口 prompt 与应答
  剧本的 hash、本文件 §4a 表中各实验文件的 hash(直接引用 MANIFEST)、实际
  采用的 skills 机制(目录覆盖或文件替换)、运行顺序、起止墙钟时间。
- **顺序随机化**:三组运行顺序随机抽取(随机种子与抽取结果记入运行清单);
  确认实验阶段 A0 与胜出组交错运行,不连跑。

## 6. 测量定义(字段级)

从各组 session JSONL 的 assistant `message.usage` 提取;**汇总脚本断言四个字段
全部存在,缺失即中止**:`input_tokens`、`cache_creation_input_tokens`、
`cache_read_input_tokens`、`output_tokens`。
- 每轮上下文占用 **C_t = input_tokens + cache_creation_input_tokens +
  cache_read_input_tokens**。
- 主指标:**峰值 = max_t C_t**;**Σ上下文 = Σ_t C_t**。
- 分项(诊断用,不进判定):Σ uncached、Σ cache_read、Σ cache_creation;
  工具读取 token(近似)= Σ Read 类 tool_result 字符数 ÷ 3,标注为估计值。
- 行为侧:validate.py 退出码与五个验证门禁(add-pev-verification-gates 引入
  的五个校验关卡);Read(`pev-protocol.md`/`references/stage-table.md`)的
  次数与时机;工具调用数、轮数、墙钟时间。

## 7. 质量评价(预注册不变量 + 双盲评;字段级比对为辅助)

必要非充分前提:validate.py 全过 + 五个门禁全绿。

**(a) 行为不变量 10 项(逐项 PASS/FAIL;任一 FAIL → 该组判负)**:
1. 目标模块覆盖:快照 target_modules 每个都有设计且组件/流程/DFX 齐全;
2. 边界守恒:depends_on / owned_data / exposes ⊆ 架构声明;
3. 交互承接:interaction_commitments 引用合法且本模块是参与方;
4. Ledger 类型合法且证据强制(FACT/DECISION/INFERENCE 非空),且
   **hypothesis_ratio(该组) ≤ hypothesis_ratio(A0) + 5 个百分点**,
   ratio = (HYPOTHESIS+UNKNOWN 条数)/Ledger 总条数,由汇总脚本按 JSON 计算;
5. 七维自查:self_challenge 7 维全齐,非空发现均有处置;
6. 门禁语义:verification.gates 五布尔与脚本一致,PASS 判断真实;
7. 红线处置:redlines 逐条 applies/details,库内 id;
8. 状态机遵从:state 字段合法流转,迭代文件命名与登记一致;
9. 上游忠实:upstream_items 分母覆盖快照 exposes,无缩水;
10. 无占位残留:completed 产物无 TODO/待补充类措辞。

**(b) 双盲评流程(逐项可执行)**:
- **匿名池**:三组产出的 `module/`(state.json、iterations/、output/)各拷为
  `eval-<编号>/`,编号随机分配;编号与组的映射表只存实验记录,不给任何评审者。
- **评审者**:每份产物由 2 个互相独立的模型会话评审(新开会话、互不知晓),
  用同一 judge prompt;材料 = 匿名产物包 + 上游 arch 产物 + 不变量清单(§7a)+
  rubrics/module-review.md。**不给**:会话日志、任何版本 SKILL.md/protocol、
  组信息。
- **A0 对照的产生方式**:A0 不单独生成参考分——三组产物同池同批评审,A0 的
  维度均值即对照(评审者不知道哪份是 A0 的)。
- **呈现顺序**:三份匿名产物给同一评审者的顺序随机。
- **防推断**:承认产物文本风格可能泄露组身份(记为局限);缓解 = 三组材料
  同构、不携带组信息。评审输出中出现 A0/A1/A2/arm/组/基线等字样 → 该次评审
  作废,换新会话重评,事件计数入结果。
- **判定口径**:维度级——某组的任一维度双评均值不得低于 A0 对应维度均值;
  单一维度两评差 >0.5 且方向不一致 → 加第 3 个仲裁评审。评审间一致性(维度级
  差值分布)写入结果。

**(c) 字段级比对(辅助)**:与原轮 `01-*.json` 逐字段比对,只用于定位差异
来源;等价表述差异不判负;语义疑点交 (a)/(b) 裁定。

## 8. 判定规则(两阶段,规则预先固定)

**Pilot 阶段(每组 N=1,A0 也是 N=1)**,记 D = (peak(A0) − peak(该组))/peak(A0):
- **胜出**:D ≥ 10% 且 Σ上下文(该组) ≤ Σ上下文(A0) 且 §7 全部通过(10 项
  不变量 PASS + 盲评逐维不低于 A0)→ 满足且仅满足这些条件才进入确认实验;
- **判负**:任何行为退化(不变量 FAIL / 盲评逐维下滑 / 剧本未覆盖的交互 /
  中止)→ 立即终止该组,不追加样本;
- **不确定**:其余一切情形(含所有落在 ±10% 内的差异)→ 如实记录「pilot
  数据不足以下结论」,不判胜出;A1 预期落在此档或与 A0 无差异。
  Pilot 内不做复跑加样与均值±标准差比较(样本不对称;本设计 v2 有该规则,
  v2.1 已删)。

**确认实验阶段(仅胜出组触发)**:A0 与胜出组各跑 ≥3 次(交错),D3 =
(μ_peak(A0,3) − μ_peak(该组,3))/μ_peak(A0,3) ≥ 10% 且 μ_Σ(该组,3) ≤
μ_Σ(A0,3),且每次运行 §7 全过。通过才满足 §10 的推广前提之一。

## 9. 前置零成本取证(跑组之前先做,只读历史日志,不跑组)

扫 `.remember/` 与 claude-mem 历史会话:统计既往 PEV 轮次里 `pev-protocol.md`
被 Read 的次数与轮次覆盖。若「基本不读」→ 引用化方向大概率为正收益;若
「每轮多次读」→ A2 重点盯 Σ上下文。结果回填 §11。

## 10. 与家族推广的关系

把实验改动落进正本的前置条件(全部满足):
1. Pilot 胜出 + 确认实验(§8)通过;
2. **第二确认点**:换一个技能(建议 api-and-interface-design)× 换一个历史
   轮次,同一 protocol-v2 与判定规则,再次通过;
3. 落正本时逐技能做 preflight(§2 的三步)+ `openspec doctor` 的 PEV 检测通过。
未满足前,任何组版本的 SKILL.md/stage-table/protocol-v2 不离开 /tmp 实验目录。

## 11. 结果(2026-10-21 执行后回填)

运行环境:claude CLI 2.1.300,模型 glm-5.3-flash(用户环境 provider),温度
default;机制=文件替换(flock→mkdir 原子锁+备份+sha256 双向校验+trap 恢复);
随机化 seed=20261021 → 顺序 A0→A1→A2;测量源=本地会话记录逐 API 调用 usage
(stream-json stdout 的 assistant.usage 为 (0,0) 占位,真实逐调用值只在本地
记录,四字段齐全——执行适配记入 arm manifest)。

| 组 | 峰值 C_t | Σ上下文 | Σuncached / Σcache_read | 工具读取(近似) | protocol/stage-table 读取次数 | validate+门禁 | 不变量 10 项 | 盲评逐维 vs A0 | 判定 |
|---|---|---|---|---|---|---|---|---|---|
| A0 | 204,448 | 16,438,491 | 1,031,899 / 15,406,592 | — | 1 / 0 | 全过+五绿 | 10/10 PASS | 基准 | 基准 |
| A1 | 205,212(D=-0.4%) | 16,129,778(-1.9%) | 963,826 / 15,165,952 | — | 2 / 0 | 全过+五绿 | 10/10 PASS | 3 维下滑(架构一致/取舍诚实/简单性 各 -1.0) | **判负**(盲评逐维下滑) |
| A2 | 203,778(D=+0.3%) | 15,951,317(-3.0%) | 511,829 / 15,439,488 | — | 1 / 1 | 全过+五绿 | 10/10 PASS | 6 维下滑(最大 simplicity -2.0) | **判负**(盲评逐维下滑) |

盲评:6/6 有效+2 份仲裁(K12 两维、K13 一维,取三评中位数);评审间维度级
|双评差| max=1.0、median=0;A1 的 internal_clarity/information_hiding 经仲裁
追平 A0。匿名映射 A0=K11/A1=K12/A2=K13,双评审呈现顺序独立随机。

**Pilot 结论:无胜出组(A1/A2 峰值差异均在 ±10% 内,不满足胜出必要条件;
且两组盲评各有维度低于 A0,按 §8 预注册口径判负),不进入确认实验,§10 推广
前提不满足——任何组版本文件不离开 /tmp 实验目录。**质量侧信号:A0(现行
SKILL.md)盲评全维度最高;token 侧信号:A1 净收益≈0(符合设计预期,中间对照
成立),A2 峰值≈0、Σ -3.0%,未达 10% 阈值。§9 先验「基本不读」在重跑中不完全
成立:三组各读 protocol 1-2 次(历史会话为 0),A2 另读 stage-table 1 次。

前置取证结论(§9):历史 3 个 PEV 会话 pev-protocol.md 被 Read 0 次 →「基本
不读」;但本实验重跑中各组实际读取 1-2 次,引用并未消除读取,只缩小 SKILL.md
本体(240→232 行,占上下文比例小)。
剧本未覆盖的交互/中止事件:无中止。剧本修订 2 次(v2 补残留产物处置、v3 补
精修收口点),均在应答前修订、三组同版,变更记录在剧本头部与 manifest。
评审作废重评事件:2 起——r3-K13 首跑因主控 sed 错误评错对象(作废重跑);
r3-K12 禁词「对照」命中为主控禁词表过严误报(语境为「逐条对照不变量清单」,
不泄露组身份),修正判定表后恢复有效。设计中止类交互(三选一/BLOCKED)未触发。
行为差异记录:A1/A2 均按评审 LOW 意见在渲染前修正 artifact 并重过校验(A0
零修改);A1 自行归档残留产物、A0 询问处置、A2 询问(归档/中止二选一,应答
保持剧本「直接覆盖」语义);A0 映射了 arch 的 U1-U6 条目、A1/A2 未映射(诊断
项,不判负)。Pilot N=1,上述差异无法归因于 SKILL 版本还是模型随机性。

运行清单(arm manifest)位置:/tmp/pev-ablation/arm-manifest.json(含
preflight、hash、机制、随机化、局限);三组运行日志 /tmp/pev-ablation/arm*/
run.log;测量 /tmp/pev-ablation/arm*/measure.json;不变量 /tmp/pev-ablation/
arm*/invariants.json;盲评 /tmp/pev-ablation/eval/。正本技能文件全程 trap
恢复+sha256 校验,实验后 MANIFEST 复验全过、A2 的 stage-table 已从正本清除。

预算参考:3 组 ×1 次(估每组 1-3 小时墙钟时间);确认实验(条件触发)另计。
实际:三组各 4 轮会话合计约 52/47/50 分钟墙钟(A0 11:24-12:19、A1 12:21-13:11、
A2 13:12-14:09),API 成本约 $8.6/组;盲评 8 个会话(6+2 仲裁)另计约 40 分钟。
