# 任务清单（精简版）

2026-10-26 设计按用户五条命令设计原则修订（命令只设在模型拿主意处、确定性后续并入同一命令、岔路写产物字段、流程规则进代码与测试、任意两步间断电可续跑），PASS 后自动发布并完成已拍板，实施随之启动。

## 1. 契约与文档

- [x] 1.1 保留现场事实、A/B/C/D/E 证据分类，并撤回“全部初稿机制均被现场证明必要”的结论。
- [x] 1.2 收缩 `proposal.md`、`design.md`、`tasks.md` 和 `test-matrix.md`，删除 SUPERSEDED、issue 对账、companions、洁净树和固定规模要求。
- [x] 1.3 明确当前 PASS 绑定、确定性渲染、修订失效和中断恢复的不变量。
- [x] 1.4 修正 assumptions 与 schema 的不一致；区分普通 warning 与交付错误；明确先检查再写 complete。
- [x] 1.5 获批设计并取得工作区外写入授权后，才开始技能代码实施。（2026-10-26 用户批准实施计划并下达脚本化指令，即两项授权。）

## 2. 最小实现（pev-skills/requirement-clarify/，TDD）

- [x] 2.1 新建 `scripts/_common.py` 与 `scripts/init.py`：单行 JSON 输出、临时文件原子写、规范化摘要；`--workspace/--locate/--restart`，同目标已有目录返回现状，不静默覆盖。
- [x] 2.2 `scripts/commit.py` 的 `plan` 与 `artifact` 入口：草稿 schema 校验、按当前轮编号原子落盘并登记、按草稿 `status` 字段分叉；completed 自动生成只读验证输入快照。
- [x] 2.3 `scripts/commit.py` 的 `verification` 入口：按报告 `verdict` 字段分叉；PASS 在同一命令内完成绑定复算→确定性渲染→逐字节校验→iteration 上限检查→原子写完成状态，失败不替换旧发布文件。
- [x] 2.4 `commit state-update` 与 `reopen`：补丁合并与恢复分叉（`invalidate_plan`/`prd_refreshed`/恢复点还原）、iteration 只递增一次、原子写入和幂等重试；不新增治理状态。
- [x] 2.5 `validate.py` 增交付资格门：当前 PASS 绑定、快照复算、`spec.md` 字节一致、上限检查；区分交付错误与普通提示。
- [x] 2.6 重写 `SKILL.md` 为命令表加 next 纪律（assumptions 指令改为 Evidence Ledger，写明模型与脚本写入边界）；agents/playbooks 仅改产物提交方式表述。

## 3. 验证

- [x] 3.1 unittest 合成夹具覆盖 `test-matrix.md` 核心场景：正常链、四类分叉、拒绝门、幂等重跑。
- [x] 3.2 断电演练：任意两条命令之间及 PASS 收口链各步骤之间模拟中断，重跑同一命令收敛，接手方仅凭磁盘文件与 `validate` 输出定位续跑点。
- [x] 3.3 记录命令、退出码、错误/提示和最终状态；未实测不填写通过结论。
- [x] 3.4 只核对本 change 目标文件（OpenSpec change 文档与 `pev-skills/requirement-clarify/`），不修改真实业务轮次、`product-manager/**` 或运行时符号链接。
