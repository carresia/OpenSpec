# improve-pev-skills

> 当前选型与验收以 [workflow-decision.md](workflow-decision.md) 为准(2026-10-16 定案):prd/rc 剥离出 workflow、动态 skip、design 唯一自动检测点 + 人工升级、直接演进 pev 删 pev-lite;不打包;指定 llm-client-infra 轮次重放。

PEV 技能改造,两条实施主线:

- **动态 workflow(C 组,2026-10-16 定案)**:prd 与 requirement-clarify 剥离出 workflow,澄清产物落 change 目录作外部输入;粗定 workflow(模型起草 + 人逐条确认)写入 `.openspec-workflow.json`;未涉及阶段设为 skip,零产出;design 是唯一自动升级检测点,其后保留人工发起升级;pev schema 直接演进为 8 artifact 菜单,OpenSpec 源码接入 active 过滤。
- **技能优化(A/B 组)**:减耗——subagent 分派(A1)、verifier 读 md 不读 JSON(A2)、只读直接上游(A3)、复验收口(A4)、增量/全量 PASS 区分(A5);能力——requirement-clarify 按 grilling 节奏提问(B1)、产出工程 spec 化(B2)、实施前 explore agent 取证(B3);布局——统一脚本放 `~/skills/_pev/`、SKILL.md 公共段归一化、agent 提示词归一化(先做实验)、md 渲染器与门禁布尔脚本写入。

不打包、不发同事。基线不重测:原"624K"在会话日志中查无来源,已删除;减耗按机制是否落地验收,不宣称降幅。

原 A6 规模分级与 pev-lite 已废止(2026-10-16),判据与回测证据保留在任务记录;新 workflow 研究过程见 `research.md`。

方案见 `proposal.md`,实现设计见 `design.md`,任务清单见 `tasks.md`。上下文与核实记录见 `HANDOFF-2026-10-13.md`。
