# Tasks

## 1. Promotion 门禁（先写测试）

- [x] 1.1 测试：`promotePevArtifacts` 对"output 存在但 state.json 缺失/非 COMPLETE"的工件返回 `unverified` 且不复制（复现 10-08 绕过形态）
- [x] 1.2 测试：state COMPLETE 但 output 缺失 → `missing` 不复制；目标冲突 → `conflict` 不复制；全部达标 → `promoted`（既有行为回归）
- [x] 1.3 实现：`promotion.ts` 先查 state 后查文件，`PromotionResult.status` 增加 `'unverified'`

## 2. Archive 拒绝

- [x] 2.1 测试：任一晋升结果非 `promoted` 时 archive 非零退出、输出状态表格、change 目录原地不动
- [x] 2.2 测试：全部 `promoted` 时归档照常（既有 full-chain 回归）
- [x] 2.3 实现：`archive.ts` 晋升后门禁检查，放在 spec 合并之前

## 3. Validate provenance

- [x] 3.1 测试：`--strict` 下 pev 工件未 COMPLETE 判 invalid，错误含工件名与 runDir；手写 change 目录文件不能翻案
- [x] 3.2 测试：非 strict 对未 COMPLETE 工件输出 warning、判定不变；全部 COMPLETE 时 strict 通过
- [x] 3.3 实现：validate 流程接入 `isPevStageComplete`，strict=错误、非 strict=警告

## 4. Instructions 硬拒 + 技能警告

- [x] 4.1 测试：请求 blocked 工件（直接或传递前置未完成）→ 非零退出、不渲染指令、错误列出前置及其完成信号路径（pev 给 state.json 路径、直写给 generates 路径）
- [x] 4.2 测试：前置全部完成 → 正常下发；无 `requires` 的首个工件不受影响
- [x] 4.3 实现：`instructions` 命令出口门禁
- [x] 4.4 测试+实现：下发 `pev` 工件指令时技能不在本机 → 指令附带缺失警告

## 5. 技能可检测

- [x] 5.1 `doctor` 输出 PEV 技能发现段（`discoverPevSkills` 结果）
- [x] 5.2 `new change` 用 pev schema 时对声明技能做显式列表比对，缺失即警告不阻断

## 6. apply 技能硬前置

- [x] 6.1 `skills/openspec-apply-change/SKILL.md` 增加前置工件未 COMPLETE 即停止实施的条款

## 7. 验证

- [x] 7.1 `openspec validate add-pev-verification-gates --strict` 通过
- [x] 7.2 全量测试通过（含 Windows 相关路径规则检查）
- [x] 7.3 `node build.js` 构建通过
