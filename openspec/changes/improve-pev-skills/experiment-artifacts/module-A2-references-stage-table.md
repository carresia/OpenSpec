# module-design 执行协议逐阶段表(A2 实验件)

本文件由 SKILL.md「执行协议」引用,承载阶段 1-5 的逐阶段表(阶段 0 恢复留在
SKILL.md 内联)。内容与现行 SKILL.md 原表一致,仅位置外移;表内原有"见上节/
见下"的指向改为"见 SKILL.md"。预注册于 2026-10-20,实验判定与是否落正本见
[experiment-skill-md-ablation.md](../experiment-skill-md-ablation.md)。
臂内安装路径:`module-design/references/stage-table.md`。

| 阶段 | 读什么 | 产出 | 完成条件 |
|---|---|---|---|
| 1 INIT | 架构产物路径 | `state.json`:`status="INIT"`、`iteration=0`、`max_iterations=5`、`upstream_source`、`upstream_kind`、`mode="design"`、`modules[]`(id+design_mode) | 目标模块与深度一次问齐(见 SKILL.md);每模块规模线索(内部复杂度/状态量/外部交互数)能从架构或代码推断则记入 `assumptions` |
| 2 PLANNING | `agents/planner.md`、`playbooks/design.md` | `iterations/<N>-plan.json` | 校验通过 → `state.plans` 登记,`status="EXECUTING"` |
| 3 EXECUTING | `agents/executor.md` | `iterations/<N>-artifact.json`(全部模块) | 逐模块完成:溯源三档 + self_challenge 7 维;跨模块自查(cross_check)完成;精修循环 `done` → `status="completed"`,全部模块 `design_status="done"` |
| 4 VERIFYING | `agents/verifier.md` | `iterations/<N>-verification.json` | 逐模块 module_reviews + 全部 PASS 后 cross_review;独立性机制见 SKILL.md |
| 5 分支 | verdict | 见状态机 | PASS → 逐模块按深度渲染到 `output/<module-id>/`,同时呈交 verification 的 `warnings` 与残留项;用户确认后 `status="COMPLETE"`,设计交给下游 skill |
