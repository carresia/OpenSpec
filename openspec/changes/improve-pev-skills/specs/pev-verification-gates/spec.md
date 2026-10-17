# pev-verification-gates 变更

## MODIFIED Requirements

### Requirement: instructions 拒绝下发 blocked 工件

当请求的 artifact 在 workflow graph 中存在未完成的前置(直接或传递),`openspec instructions <artifact>` SHALL 以非零退出拒绝下发,并在错误信息中列出每个未完成前置及其完成信号路径。对 PEV 绑定工件,完成信号路径为 `.pev/<轮次>/<runDir>/state.json`;对直写工件为 `generates` 声明的文件。当 change 目录存在合法的 `.openspec-workflow.json` 时,SKIPPED 的前置 SHALL NOT 计入阻塞(下游输入由替代输入满足),依赖状态中 SHALL 标为 skipped;state 文件损坏或校验失败时按错误拒绝,SHALL NOT 静默回退为无状态行为。

#### Scenario: 前置 PEV 工件未 COMPLETE 时拒绝

- **WHEN** artifact `spec` 声明 `requires: [prd]`,且 `prd` 绑定的 `.pev/<轮次>/pm/state.json` 不存在或 `status` 不是 `COMPLETE`
- **THEN** `openspec instructions spec` 以非零退出,错误信息指明 `prd` 未完成及其 state.json 路径
- **AND** 不输出任何针对 `spec` 的指令内容

#### Scenario: 全部前置完成后正常下发

- **WHEN** 请求的 artifact 的全部前置(含传递前置)均已完成
- **THEN** instructions 正常返回该 artifact 的指令内容,退出码为零

#### Scenario: 无前置的首个工件不受影响

- **WHEN** 请求的 artifact 不声明任何 `requires`
- **THEN** instructions 行为与现状一致,不引入额外检查

#### Scenario: SKIPPED 前置不阻塞下发

- **WHEN** change 存在合法的 `.openspec-workflow.json`,请求工件(如 tasks)的前置 design-api 与 design-db 为 SKIPPED,其余 active 前置已完成
- **THEN** instructions 正常下发该工件指令,退出码为零
- **AND** 依赖状态把这两个前置标为 skipped,而不列为缺失

#### Scenario: state 损坏时拒绝下发不回退

- **WHEN** change 的 `.openspec-workflow.json` 存在但损坏或校验失败
- **THEN** instructions 以非零退出并指明 state 校验失败,不按无状态行为下发

### Requirement: strict 校验将未验证 PEV 工件判为 invalid

对使用含 `pev` 绑定工件 schema 的 change,`openspec validate <change> --strict` SHALL 检查每个 `pev` 绑定工件达到 COMPLETE(state.json `status === "COMPLETE"` 且 output 交付物存在),任一未达标即判 invalid,并逐工件输出错误。当 change 目录存在合法的 `.openspec-workflow.json` 时,检查范围 SHALL 限于 active 工件:SKIPPED 工件不判 invalid、不参与检查,也 SHALL NOT 被视为 COMPLETE 计入通过;state 文件损坏或校验失败时判 invalid。不带 `--strict` 时,对未达标工件输出 warning,不改变判定结果。

#### Scenario: 手写产物无 state.json 时 strict 判 invalid

- **WHEN** 某 `pev` 绑定工件的 `.pev/<轮次>/<runDir>/state.json` 不存在,即使 change 目录下已存在其 `generates` 文件
- **THEN** `validate --strict` 判 invalid,错误信息命名该工件与其 runDir

#### Scenario: 非 strict 模式给 warning 不判 invalid

- **WHEN** 同样缺失 state.json 的 change 以不带 `--strict` 的 validate 检查
- **THEN** 输出对每个未 COMPLETE 工件的 warning 行,判定结果不受 provenance 影响

#### Scenario: 技能链产出正常通过

- **WHEN** 全部 `pev` 绑定工件的 state.json 均为 `COMPLETE` 且 output 存在
- **THEN** `validate --strict` 的 provenance 检查通过,结构检查结论不变

#### Scenario: 有 workflow state 时只检查 active 工件

- **WHEN** change 存在合法的 `.openspec-workflow.json`,`modules` 为 SKIPPED,全部 active 的 `pev` 绑定工件均 COMPLETE 且 output 存在
- **THEN** `validate --strict` 不因 `modules` 无 state.json 与 output 判 invalid,active 工件照旧逐个检查

#### Scenario: SKIPPED 不得计入完成

- **WHEN** change 存在合法的 `.openspec-workflow.json`,某 active 工件未 COMPLETE,即使另有 SKIPPED 工件
- **THEN** `validate --strict` 判 invalid;不得把 SKIPPED 工件当作 COMPLETE 凑数通过

### Requirement: 未验证产物不晋升

归档晋升时,对 state.json 缺失或 `status` 非 `COMPLETE` 的 PEV 工件,晋升 SHALL 返回 `unverified` 且不复制任何文件;`missing`(output 不存在)与 `conflict`(目标内容与 output 不一致)同样不复制。当 change 目录存在合法的 `.openspec-workflow.json` 时,晋升 SHALL 只遍历 active 工件:SKIPPED 工件不进入晋升结果——不记 `unverified`、不复制任何文件、不出现在留痕表格。

#### Scenario: 无 state.json 的产物被拒绝晋升

- **WHEN** 某工件的 `output/` 交付物存在但对应 state.json 不存在或非 `COMPLETE`
- **THEN** 该工件晋升结果为 `unverified`,change 目录与其 `promotes` 目标均不被写入

#### Scenario: 冲突产物不被覆盖

- **WHEN** 晋升目标已存在且内容与 output 不一致
- **THEN** 晋升结果为 `conflict`,目标内容保持不变

#### Scenario: SKIPPED 工件不记 unverified

- **WHEN** change 存在合法的 `.openspec-workflow.json` 且 `design-db` 为 SKIPPED
- **THEN** 晋升结果不含 `design-db` 条目,归档不因它拒绝
