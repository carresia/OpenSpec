# Tasks

## 1. PEV 类型与注册表

- [x] 1.1 新增 `src/core/pev/state.ts`：读 `.pev/<轮次>/<runDir>/state.json`，实现 `isPevStageComplete`
- [x] 1.2 新增 `src/core/pev/skill-registry.ts`：扫描 `~/skills/` 与 `~/.claude/skills/` 发现 PEV skills
- [x] 1.3 新增 `src/core/pev/capability-inventory.ts`：读取 `openspec/specs/` 生成能力清单

## 2. Schema 与元数据扩展

- [x] 2.1 `artifact-graph/types.ts`：`ArtifactSchema` 增 `pev` 与 `promotes` 字段
- [x] 2.2 `change-metadata/schema.ts`：`CHANGE_METADATA_KNOWN_KEYS` 增 `pev_round`

## 3. 生命周期接入

- [x] 3.1 `state.ts`：`detectCompleted` 对 `pev` artifact 走 state.json 判定
- [x] 3.2 `instruction-loader.ts`：`loadChangeContext` 传 roundDir；`generateInstructions` 注入 pev 路由 + 能力清单
- [x] 3.3 `change-utils.ts`：`createChange` 为 pev schema 创建 `.pev/<轮次>/` 并写 `pev_round`

## 4. 晋升与归档

- [x] 4.1 新增 `src/core/pev/promotion.ts`：`promotePevArtifacts` 晋升 output 到 change + artifacts
- [x] 4.2 `archive.ts`：spec merge 后调用 `promotePevArtifacts` 并写 `pev-log.md`

## 5. 验证

- [x] 5.1 `openspec validate add-pev-skills-integration` 通过
- [x] 5.2 安装依赖并 `node build.js` 通过
- [x] 5.3 补 `vitest` 冒烟测试：pev schema 的 status → instructions → archive 全链路

## 6. 内置 pev 流水线

- [x] 6.1 新增内置 `schemas/pev/schema.yaml`：prd → spec → catalog → specs → design → modules → tasks 七阶段，PEV 阶段声明 `pev`/`promotes`，直写阶段 `specs`/`tasks`
- [x] 6.2 新增 `schemas/pev/templates/*`（prd/spec/catalog/specs/design/modules/tasks 7 个模板）
- [x] 6.3 补 `discoverPevSkills` 单测与 `full-chain` CLI 冒烟测试（覆盖单文件与目录输出晋升、pev-log、artifacts、delta spec 合并）
