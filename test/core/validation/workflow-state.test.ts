import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Validator } from '../../../src/core/validation/validator.js';

const DELTA_SPEC = [
  '# Spec Delta',
  '',
  '## Purpose',
  '验证带 workflow state 的 change 能被 validate 正确判定。',
  '',
  '## ADDED Requirements',
  '',
  '### Requirement: 端到端校验',
  '系统 SHALL 在 workflow state 合法时按 active 集合判定。',
  '',
  '#### Scenario: 校验通过',
  '- **WHEN** active 阶段全部 COMPLETE',
  '- **THEN** validate 判为 valid',
].join('\n');

/**
 * validateChangeDeltaSpecs × workflow state: a corrupt state is invalid in
 * both modes; a valid state exempts skipped stages from the PEV provenance
 * gate while active stages stay fully gated.
 */
describe('validateChangeDeltaSpecs with workflow state', () => {
  let tempDir: string;
  let changeDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-wfvalidate-'));
    changeDir = path.join(tempDir, 'openspec', 'changes', 'pev-change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'requirement.md'), '# Requirement');
    fs.writeFileSync(
      path.join(changeDir, '.openspec.yaml'),
      'schema: pev\npev_round: round-2026-10-17\n'
    );
    fs.writeFileSync(
      path.join(changeDir, '.openspec-workflow.json'),
      JSON.stringify({
        version: 1,
        entry: { requirement: 'requirement.md' },
        active: ['prd', 'spec', 'catalog', 'specs', 'design', 'modules', 'tasks', 'implement'],
        skipped: {
          'design-api': { reason: 'no contracts', evidence: ['e'], decidedBy: 'zhengshan' },
          'design-db': { reason: 'no persistence', evidence: ['e'], decidedBy: 'zhengshan' },
        },
        upgrades: [],
      })
    );

    // Every ACTIVE pev stage COMPLETE under the round dir.
    const round = path.join(tempDir, '.pev', 'round-2026-10-17');
    const fileStages: Array<[string, string]> = [
      ['pm', 'pm/output/prd.md'],
      ['rc', 'rc/output/spec.md'],
      ['decompose', 'decompose/output/catalog.md'],
      ['arch', 'arch/output/architecture.md'],
      ['tasks', 'tasks/output/task-plan.md'],
      ['impl', 'impl/output/implementation-report.md'],
    ];
    for (const [runDir, output] of fileStages) {
      fs.mkdirSync(path.join(round, path.dirname(output)), { recursive: true });
      fs.writeFileSync(
        path.join(round, runDir, 'state.json'),
        '{"status":"COMPLETE","iteration":1}'
      );
      fs.writeFileSync(path.join(round, output), '# content');
    }
    fs.mkdirSync(path.join(round, 'module', 'output', 'M1'), { recursive: true });
    fs.writeFileSync(path.join(round, 'module', 'output', 'M1', 'module-detail.md'), '# M1');
    fs.writeFileSync(
      path.join(round, 'module', 'state.json'),
      '{"status":"COMPLETE","iteration":1}'
    );

    fs.mkdirSync(path.join(changeDir, 'specs', 'cap'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'specs', 'cap', 'spec.md'), DELTA_SPEC);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const validate = (strict: boolean) =>
    new Validator(strict).validateChangeDeltaSpecs(changeDir, { projectRoot: tempDir });

  it('is valid in strict mode when every active stage is COMPLETE and the pair is skipped', async () => {
    const report = await validate(true);
    expect(report.valid).toBe(true);
  });

  it('stays invalid on an incomplete active stage - skips do not rescue it', async () => {
    fs.rmSync(
      path.join(tempDir, '.pev', 'round-2026-10-17', 'impl', 'state.json')
    );
    const report = await validate(true);
    expect(report.valid).toBe(false);
    expect(JSON.stringify(report.issues)).toContain('impl');
  });

  it('is invalid in both modes when the state itself is corrupt', async () => {
    // Drop design-db from skipped AND leave it out of active: coverage breaks.
    fs.writeFileSync(
      path.join(changeDir, '.openspec-workflow.json'),
      JSON.stringify({
        version: 1,
        entry: { requirement: 'requirement.md' },
        active: ['prd', 'spec', 'catalog', 'specs', 'design', 'modules', 'tasks', 'implement'],
        skipped: {
          'design-api': { reason: 'no contracts', evidence: ['e'], decidedBy: 'zhengshan' },
        },
        upgrades: [],
      })
    );

    const strict = await validate(true);
    expect(strict.valid).toBe(false);
    expect(JSON.stringify(strict.issues)).toContain('design-db');

    const lax = await validate(false);
    expect(lax.valid).toBe(false);
    expect(JSON.stringify(lax.issues)).toContain('design-db');
  });

  /** State that skips `specs` (the only specs-path artifact in pev): every other stage active. */
  function writeSpecsSkippedState(): void {
    fs.writeFileSync(
      path.join(changeDir, '.openspec-workflow.json'),
      JSON.stringify({
        version: 1,
        entry: { requirement: 'requirement.md' },
        active: [
          'prd', 'spec', 'catalog', 'design', 'modules',
          'design-api', 'design-db', 'tasks', 'implement',
        ],
        skipped: {
          specs: {
            reason: 'pure refactor, no specified behavior changes',
            evidence: ['chat 2026-10-16'],
            decidedBy: 'zhengshan',
          },
        },
        upgrades: [],
      })
    );
    // Seed the two stages the default fixture leaves out.
    const round = path.join(tempDir, '.pev', 'round-2026-10-17');
    for (const [runDir, output] of [
      ['api', 'api/output/A1/a.md'],
      ['db', 'db/output/D1/d.md'],
    ] as Array<[string, string]>) {
      fs.mkdirSync(path.join(round, path.dirname(output)), { recursive: true });
      fs.writeFileSync(
        path.join(round, runDir, 'state.json'),
        '{"status":"COMPLETE","iteration":1}'
      );
      fs.writeFileSync(path.join(round, output), '# content');
    }
  }

  it('accepts zero deltas when the specs stage is workflow-skipped (no legacy marker)', async () => {
    writeSpecsSkippedState();
    // A skipped specs stage produces nothing by contract: no delta files is
    // the expected shape, not an error demanding legacy skip_specs.
    fs.rmSync(path.join(changeDir, 'specs'), { recursive: true, force: true });

    const strict = await validate(true);
    expect(strict.valid, JSON.stringify(strict.issues)).toBe(true);

    const lax = await validate(false);
    expect(lax.valid).toBe(true);
  });

  it('errors when a workflow-skipped specs stage nevertheless has files under specs/', async () => {
    writeSpecsSkippedState();
    // The delta file from the fixture stays on disk - a skipped stage must
    // have zero output, so this contradiction is an error, not a pass.
    const report = await validate(true);
    expect(report.valid).toBe(false);
    expect(JSON.stringify(report.issues)).toContain('workflow');
  });
});
