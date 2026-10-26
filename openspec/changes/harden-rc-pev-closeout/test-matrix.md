# 测试验收矩阵（精简版）

矩阵按核心交付不变量推导。命令面为 `init`、`commit`（plan/artifact/verification/state-update）、`reopen`、`validate`；渲染、绑定、完成均为 `commit verification` 的内部步骤。夹具应使用最小合成 JSON；现场报告只作形态对照，不作为新方案的验证结果。每行需要记录命令、退出码、错误或 warning、以及状态和登记册的最终内容。

| ID | 场景 | 触发 | 预期 |
|---|---|---|---|
| N01 | 当前有效 PASS 收口 | 提交 verdict=PASS 且绑定当前 Artifact、Plan 和语义输入的验证报告 | 单命令内完成绑定复算、渲染、校验与完成；生成一致的 `output/spec.md`，状态 COMPLETE |
| N02 | 缺报告 | 无当前轮验证报告，运行 `validate` 或尝试收口 | 交付错误，不写 COMPLETE |
| N03 | REVISE 报告 | 当前轮最后报告 verdict=REVISE，尝试收口 | 不触发渲染，推进 EXECUTING 且 iteration+1，提示修订 |
| N04 | 错轮 PASS | PASS 报告编号不是当前 iteration，提交 | 拒绝落盘为有效交付依据 |
| N05 | 输入被改动 | 快照生成后修改 Artifact、有效 Plan 或必要语义输入，提交 PASS | 绑定复算失败，整体失败，旧发布文件保持原状 |
| N06 | 手改输出 | 修改 `output/spec.md` 后重跑同一 PASS 提交或运行 `validate` | 逐字节比对失败，不完成且不覆盖 |
| N07 | PASS 后合法 reopen | `reopen` 一次，原目录追加产物并重新提交验证 | 旧 PASS 失效，新 PASS 可在原目录收口 |
| N08 | 提交中断恢复 | 模拟落盘后登记前中断，重跑同一 `commit` | 幂等收敛，不重复登记或递增 iteration |
| N09 | 发布中断恢复 | 渲染临时文件或替换步骤中断，重跑同一 PASS 提交 | 旧发布文件保持一致，成功后一次替换 |
| N10 | 完成中断恢复 | 完成写入前后中断，重跑同一 `commit verification` | 同事件身份幂等，不重复递增 iteration，状态与事件一致 |
| N11 | 普通提示 | 存在历史投影提示、无关草稿或伴随文件 | warning 不取消合法交付动作 |
| N12 | 其他目标未完成 | 另一个目标存在未完成目录，当前目标路径明确 | 当前目标照常收口 |
| N13 | 旧数据可读 | 旧 COMPLETE 缺 provenance/transitions | 可结构读取并提示，不可交付，不补造绑定 |
| N14 | 直接批准 PRD | `prd_source` 指向用户直接提供的批准 PRD | 不要求不存在的 PM 状态系统，照常进入 rc |
| N15 | assumptions 指令 | Verifier 写入 assumptions | 写入现有 Evidence Ledger，schema 校验通过 |
| N16 | 岔路字段分叉 | artifact 草稿 `status=replan_required/blocked`；验证报告 `verdict=REPLAN/BLOCKED` | 脚本读字段自动走对应分支，无需额外命令 |
| N17 | 恢复分叉 | state-update 补丁含 `invalidate_plan` 或 `prd_refreshed` | 分别回 PLANNING（iteration+1）或清 prd_gaps 回 PLANNING（iteration+1）；否则按恢复点还原 |
| N18 | 断电续跑 | 任意两条命令之间及收口链各步骤之间模拟中断 | 接手模型仅凭磁盘文件与 `validate` 输出定位续跑点，重跑当前命令收敛 |

## 操作链核对

正常路径应覆盖：`init` → `commit plan` → `commit artifact`（自动快照）→ `commit verification`（PASS 自动收口）。

修订路径应覆盖：`reopen` → 追加 Artifact/语义输入 → `commit artifact` → `commit verification`。

等待路径应覆盖：blocked/REPLAN/BLOCKED 分叉、state-update 恢复（含 invalidate_plan 与 prd_refreshed）。

任何链路都必须能从最后一个已落盘文件恢复。测试不要求固定测试文件数量、固定断言行数或为已删除机制保留错误码。
