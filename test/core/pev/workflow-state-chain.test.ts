import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runCLI } from '../../helpers/run-cli.js';
import { formatLocalDate } from '../../../src/utils/date.js';

/**
 * End-to-end chain for workflow state (.openspec-workflow.json) across the
 * five lifecycle faces: corrupt state fails every entry; no state file keeps
 * today's behavior; the two skip mechanisms stay distinguishable; skipped
 * stages neither block, complete, validate, nor promote.
 */
describe('pev workflow state chain', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-wfchain-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  function changeDir(name = 'demo'): string {
    return path.join(tempDir, 'openspec', 'changes', name);
  }

  async function roundDir(): Promise<string> {
    const pevDir = path.join(tempDir, '.pev');
    const entries = await fs.readdir(pevDir, { withFileTypes: true });
    const dir = entries.find((e) => e.isDirectory());
    if (!dir) throw new Error('no .pev round dir created');
    return path.join(pevDir, dir.name);
  }

  async function seedFileStage(
    round: string,
    runDir: string,
    output: string,
    content: string
  ): Promise<void> {
    await fs.mkdir(path.join(round, path.dirname(output)), { recursive: true });
    await fs.writeFile(
      path.join(round, runDir, 'state.json'),
      JSON.stringify({ status: 'COMPLETE', iteration: 1 })
    );
    await fs.writeFile(path.join(round, output), content);
  }

  async function seedDirStage(
    round: string,
    runDir: string,
    output: string,
    entries: Record<string, string>
  ): Promise<void> {
    for (const [rel, content] of Object.entries(entries)) {
      const target = path.join(round, output, rel);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content);
    }
    await fs.writeFile(
      path.join(round, runDir, 'state.json'),
      JSON.stringify({ status: 'COMPLETE', iteration: 1 })
    );
  }

  const DELTA_SPEC = [
    '# Spec Delta',
    '',
    '## Purpose',
    '验证带 workflow state 的 change 能走完生命周期并归档。',
    '',
    '## ADDED Requirements',
    '',
    '### Requirement: 端到端归档',
    '系统 SHALL 在 workflow state 合法且 active 阶段全 COMPLETE 时完成归档。',
    '',
    '#### Scenario: 归档成功',
    '- **WHEN** active 阶段全部 COMPLETE 且跳过阶段有据',
    '- **THEN** archive 完成且留痕不含跳过阶段',
  ].join('\n');

  /** State skipping the design pair; active list overridable. */
  async function writeWorkflowState(
    options: {
      active?: string[];
      skipIds?: string[];
      change?: string;
      raw?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    const skipIds = options.skipIds ?? ['design-api', 'design-db'];
    const allIds = [
      'prd', 'spec', 'catalog', 'specs', 'design',
      'modules', 'design-api', 'design-db', 'tasks', 'implement',
    ];
    const active = options.active ?? allIds.filter((id) => !skipIds.includes(id));
    const dir = changeDir(options.change);
    await fs.writeFile(path.join(dir, 'requirement.md'), '# Requirement');
    const skipEntry = (id: string) => ({
      reason: `no ${id} needed`,
      evidence: [`decision chat for ${id}`],
      decidedBy: 'zhengshan',
    });
    await fs.writeFile(
      path.join(dir, '.openspec-workflow.json'),
      JSON.stringify({
        version: 1,
        entry: { requirement: 'requirement.md' },
        active,
        skipped: Object.fromEntries(skipIds.map((id) => [id, skipEntry(id)])),
        upgrades: [],
        ...(options.raw ?? {}),
      })
    );
  }

  /** Seeds every ACTIVE stage COMPLETE for the design-pair-skip state. */
  async function seedActiveStages(): Promise<void> {
    const round = await roundDir();
    await seedFileStage(round, 'pm', 'pm/output/prd.md', '# PRD\n\nreal prd\n');
    await seedFileStage(round, 'rc', 'rc/output/spec.md', '# Spec\n\nreal spec\n');
    await seedFileStage(round, 'decompose', 'decompose/output/catalog.md', '# Catalog\n');
    await seedFileStage(round, 'arch', 'arch/output/architecture.md', '# Architecture\n');
    await seedDirStage(round, 'module', 'module/output', {
      'M1/module-detail.md': '# M1\n',
    });
    await seedFileStage(round, 'tasks', 'tasks/output/task-plan.md', '# Task Plan\n');
    await seedFileStage(
      round,
      'impl',
      'impl/output/implementation-report.md',
      '# Implementation Report\n'
    );
    const dir = changeDir();
    await fs.mkdir(path.join(dir, 'specs', 'demo-capability'), { recursive: true });
    await fs.writeFile(path.join(dir, 'specs', 'demo-capability', 'spec.md'), DELTA_SPEC);
  }

  async function createPevChange(): Promise<void> {
    const created = await runCLI(['new', 'change', 'demo', '--schema', 'pev'], { cwd: tempDir });
    expect(created.exitCode).toBe(0);
  }

  describe('corrupt state fails every lifecycle entry', () => {
    // Coverage broken: most artifacts neither active nor skipped.
    async function writeCorruptState(): Promise<void> {
      await writeWorkflowState({ active: ['prd'], skipIds: ['design-api'] });
    }

    it.each([
      ['status', ['status', '--change', 'demo']],
      ['instructions design', ['instructions', 'design', '--change', 'demo']],
      ['instructions apply', ['instructions', 'apply', '--change', 'demo']],
      ['validate --strict', ['validate', 'demo', '--strict']],
      ['archive --yes', ['archive', 'demo', '--yes']],
    ])('%s exits non-zero naming the state file', async (_label, args) => {
      await createPevChange();
      await writeCorruptState();

      const result = await runCLI(args, { cwd: tempDir });
      expect(result.exitCode, `${_label}: ${result.stdout}\n${result.stderr}`).not.toBe(0);
      const output = `${result.stdout}\n${result.stderr}`;
      expect(output).toContain('.openspec-workflow.json');
    });
  });

  it('keeps today behavior on all five faces when no state file exists', async () => {
    await createPevChange();

    // face 1: status counts files-not-state as incomplete (full-chain anchor)
    const before = await runCLI(['status', '--change', 'demo'], { cwd: tempDir });
    expect(before.exitCode).toBe(0);
    expect(before.stdout).toContain('0/10 artifacts complete');

    // face 2: instructions route prd to the product-manager skill
    const instr = await runCLI(['instructions', 'prd', '--change', 'demo'], { cwd: tempDir });
    expect(instr.exitCode).toBe(0);
    expect(instr.stdout).toContain('$product-manager');

    // face 3: apply stays blocked on unverified artifacts
    const applyBlocked = await runCLI(
      ['instructions', 'apply', '--change', 'demo', '--json'],
      { cwd: tempDir }
    );
    const applyJson = JSON.parse(applyBlocked.stdout);
    expect(applyJson.state).toBe('blocked');
    expect(applyJson.missingArtifacts).toContain('prd');

    // faces 4+5: full seed → validate strict green → archive succeeds
    const round = await roundDir();
    await seedFileStage(round, 'pm', 'pm/output/prd.md', '# PRD\n\nreal prd\n');
    await seedFileStage(round, 'rc', 'rc/output/spec.md', '# Spec\n');
    await seedFileStage(round, 'decompose', 'decompose/output/catalog.md', '# Catalog\n');
    await seedFileStage(round, 'arch', 'arch/output/architecture.md', '# Arch\n');
    await seedDirStage(round, 'module', 'module/output', { 'M1/m.md': '# M1\n' });
    await seedDirStage(round, 'api', 'api/output', { 'A1/a.md': '# A1\n' });
    await seedDirStage(round, 'db', 'db/output', { 'D1/d.md': '# D1\n' });
    await seedFileStage(round, 'tasks', 'tasks/output/task-plan.md', '# Task Plan\n');
    await seedFileStage(round, 'impl', 'impl/output/implementation-report.md', '# Report\n');
    const dir = changeDir();
    await fs.mkdir(path.join(dir, 'specs', 'demo-capability'), { recursive: true });
    await fs.writeFile(path.join(dir, 'specs', 'demo-capability', 'spec.md'), DELTA_SPEC);

    const done = await runCLI(['status', '--change', 'demo'], { cwd: tempDir });
    expect(done.stdout).toContain('10/10 artifacts complete');

    const strict = await runCLI(['validate', 'demo', '--strict', '--json'], { cwd: tempDir });
    expect(strict.stdout).toContain('"valid": true');

    const archived = await runCLI(['archive', 'demo', '--yes'], { cwd: tempDir });
    expect(archived.exitCode).toBe(0);
  });

  it('renders legacy skip_specs alone distinguishably from workflow state', async () => {
    const created = await runCLI(['new', 'change', 'demo', '--schema', 'spec-driven'], {
      cwd: tempDir,
    });
    expect(created.exitCode).toBe(0);
    const dir = changeDir();
    await fs.writeFile(path.join(dir, 'proposal.md'), '# Proposal');
    await fs.writeFile(path.join(dir, '.openspec.yaml'), 'schema: spec-driven\nskip_specs: true\n');

    const status = await runCLI(['status', '--change', 'demo'], { cwd: tempDir });
    expect(status.exitCode).toBe(0);
    expect(status.stdout).toContain('(skipped: change declares skip_specs)');
    expect(status.stdout).not.toContain('skipped by workflow state');
  });

  it('renders both mechanisms side by side when both are declared', async () => {
    const created = await runCLI(['new', 'change', 'demo', '--schema', 'spec-driven'], {
      cwd: tempDir,
    });
    expect(created.exitCode).toBe(0);
    const dir = changeDir();
    await fs.writeFile(path.join(dir, 'requirement.md'), '# Requirement');
    await fs.writeFile(path.join(dir, 'proposal.md'), '# Proposal');
    await fs.writeFile(path.join(dir, '.openspec.yaml'), 'schema: spec-driven\nskip_specs: true\n');
    await fs.writeFile(
      path.join(dir, '.openspec-workflow.json'),
      JSON.stringify({
        version: 1,
        entry: { requirement: 'requirement.md' },
        active: ['proposal', 'specs', 'tasks'],
        skipped: {
          design: { reason: 'pure refactor', evidence: ['chat'], decidedBy: 'zhengshan' },
        },
        upgrades: [],
      })
    );

    const status = await runCLI(['status', '--change', 'demo'], { cwd: tempDir });
    expect(status.exitCode).toBe(0);
    expect(status.stdout).toContain('(skipped: change declares skip_specs)');
    expect(status.stdout).toContain('(skipped by workflow state: pure refactor)');
  });

  it('serves instructions for tasks with the design pair skipped (exit 0, deps marked skipped)', async () => {
    await createPevChange();
    await writeWorkflowState();
    // upstream of tasks: prd → spec → catalog → design → modules all COMPLETE
    const round = await roundDir();
    await seedFileStage(round, 'pm', 'pm/output/prd.md', '# PRD\n');
    await seedFileStage(round, 'rc', 'rc/output/spec.md', '# Spec\n');
    await seedFileStage(round, 'decompose', 'decompose/output/catalog.md', '# Catalog\n');
    await seedFileStage(round, 'arch', 'arch/output/architecture.md', '# Arch\n');
    await seedDirStage(round, 'module', 'module/output', { 'M1/m.md': '# M1\n' });

    const result = await runCLI(['instructions', 'tasks', '--change', 'demo'], { cwd: tempDir });
    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('<dependency id="design-api" status="skipped">');
    expect(result.stdout).toContain('<dependency id="design-db" status="skipped">');
    expect(result.stdout).toContain('Skipped by workflow state');
  });

  it('validates only active stages (modules skipped and unseeded stays valid)', async () => {
    await createPevChange();
    await writeWorkflowState({ skipIds: ['modules'] });
    await seedActiveStagesExcept(['module']);

    const strict = await runCLI(['validate', 'demo', '--strict', '--json'], { cwd: tempDir });
    expect(strict.exitCode, `${strict.stdout}\n${strict.stderr}`).toBe(0);
    expect(strict.stdout).toContain('"valid": true');
  });

  it('does not let skips rescue an incomplete active stage (impl unseeded → invalid naming impl)', async () => {
    await createPevChange();
    await writeWorkflowState();
    await seedActiveStagesExcept(['impl']);

    const strict = await runCLI(['validate', 'demo', '--strict', '--json'], { cwd: tempDir });
    expect(strict.exitCode).toBe(1);
    expect(strict.stdout).toContain('"valid": false');
    expect(strict.stdout).toContain('impl');
  });

  it('promotes only active stages on archive (no design-db row, no artifacts/design/db)', async () => {
    await createPevChange();
    await writeWorkflowState();
    await seedActiveStages();

    const archived = await runCLI(['archive', 'demo', '--yes'], { cwd: tempDir });
    expect(archived.exitCode, `${archived.stdout}\n${archived.stderr}`).toBe(0);

    const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
    const entries = await fs.readdir(archiveDir, { withFileTypes: true });
    const archivedChange = entries.find((e) => e.isDirectory());
    expect(archivedChange).toBeTruthy();
    const log = await fs.readFile(
      path.join(archiveDir, archivedChange!.name, 'pev-log.md'),
      'utf8'
    );
    expect(log).not.toContain('design-api');
    expect(log).not.toContain('design-db');
    expect(log).toContain('module-design');

    const artifacts = path.join(tempDir, 'openspec', 'artifacts');
    const pathExists = async (p: string): Promise<boolean> =>
      fs.stat(p).then(
        () => true,
        () => false
      );
    expect(await pathExists(path.join(artifacts, 'design', 'db'))).toBe(false);
    expect(await pathExists(path.join(artifacts, 'design', 'api'))).toBe(false);
    expect(await pathExists(path.join(artifacts, 'design', 'modules', 'M1', 'module-detail.md'))).toBe(
      true
    );
  });

  it('refuses instructions for a skipped artifact with the decision record', async () => {
    await createPevChange();
    await writeWorkflowState();

    const result = await runCLI(['instructions', 'design-api', '--change', 'demo'], {
      cwd: tempDir,
    });
    expect(result.exitCode).not.toBe(0);
    const output = `${result.stdout}\n${result.stderr}`;
    expect(output).toContain('no design-api needed');
    expect(output).toContain('zhengshan');
    expect(output).not.toContain('<task>');
  });

  it('names the round round-<today> with no pm/ scaffolding (W1.5)', async () => {
    // formatLocalDate is the same source the CLI uses; sampling before and
    // after the call keeps the assertion correct across a midnight rollover.
    const before = formatLocalDate();
    await createPevChange();
    const after = formatLocalDate();

    const pevDir = path.join(tempDir, '.pev');
    const entries = await fs.readdir(pevDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    expect(dirs).toHaveLength(1);
    expect(dirs[0]).toMatch(/^round-\d{4}-\d{2}-\d{2}$/);
    expect([`round-${before}`, `round-${after}`]).toContain(dirs[0]);

    // no pm/ subdir: the round dir is scaffolding-free until a skill runs.
    const inside = await fs.readdir(path.join(pevDir, dirs[0]));
    expect(inside).toEqual([]);

    // metadata records the round name for completion/promotion lookup.
    const metadata = await fs.readFile(path.join(changeDir(), '.openspec.yaml'), 'utf8');
    expect(metadata).toContain(`pev_round: ${dirs[0]}`);
  });

  /** seedActiveStages minus the given runDirs (left unseeded = incomplete). */
  async function seedActiveStagesExcept(runDirs: string[]): Promise<void> {
    const round = await roundDir();
    const seeders: Record<string, () => Promise<void>> = {
      pm: () => seedFileStage(round, 'pm', 'pm/output/prd.md', '# PRD\n'),
      rc: () => seedFileStage(round, 'rc', 'rc/output/spec.md', '# Spec\n'),
      decompose: () => seedFileStage(round, 'decompose', 'decompose/output/catalog.md', '# Catalog\n'),
      arch: () => seedFileStage(round, 'arch', 'arch/output/architecture.md', '# Arch\n'),
      module: () => seedDirStage(round, 'module', 'module/output', { 'M1/m.md': '# M1\n' }),
      api: () => seedDirStage(round, 'api', 'api/output', { 'A1/a.md': '# A1\n' }),
      db: () => seedDirStage(round, 'db', 'db/output', { 'D1/d.md': '# D1\n' }),
      tasks: () => seedFileStage(round, 'tasks', 'tasks/output/task-plan.md', '# Task Plan\n'),
      impl: () =>
        seedFileStage(round, 'impl', 'impl/output/implementation-report.md', '# Report\n'),
    };
    for (const [runDir, seed] of Object.entries(seeders)) {
      if (!runDirs.includes(runDir)) await seed();
    }
    if (!runDirs.includes('specs')) {
      const dir = changeDir();
      await fs.mkdir(path.join(dir, 'specs', 'demo-capability'), { recursive: true });
      await fs.writeFile(path.join(dir, 'specs', 'demo-capability', 'spec.md'), DELTA_SPEC);
    }
  }
});
