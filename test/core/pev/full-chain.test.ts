import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runCLI } from '../../helpers/run-cli.js';

describe('pev schema full chain (status → instructions → archive)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-pev-chain-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

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

  async function seedPevOutputs(): Promise<void> {
    const round = await roundDir();
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'demo');

    await seedFileStage(round, 'pm', 'pm/output/prd.md', '# PRD\n\nreal prd\n');
    await seedFileStage(round, 'rc', 'rc/output/spec.md', '# Spec\n\nreal spec\n');
    await seedFileStage(round, 'decompose', 'decompose/output/catalog.md', '# Catalog\n\nstories\n');
    await seedFileStage(round, 'arch', 'arch/output/architecture.md', '# Architecture\n\narch\n');
    await seedDirStage(round, 'module', 'module/output', {
      'M1/module-detail.md': '# M1\n\nmodule one\n',
    });
    await seedDirStage(round, 'api', 'api/output', {
      'A1/api-contract.md': '# API\n\ncontract\n',
    });
    await seedDirStage(round, 'db', 'db/output', {
      'D1/db-schema.md': '# DB\n\nschema\n',
    });
    await seedFileStage(round, 'tasks', 'tasks/output/task-plan.md', '# Task Plan\n\nplan\n');
    await seedFileStage(
      round,
      'impl',
      'impl/output/implementation-report.md',
      '# Implementation Report\n\nreport\n'
    );

    // direct-write delta spec
    await fs.mkdir(path.join(changeDir, 'specs', 'demo-capability'), { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'specs', 'demo-capability', 'spec.md'),
      [
        '# Spec Delta',
        '',
        '## Purpose',
        '验证 PEV 生命周期能产出并归档一个可复用的能力。',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: 端到端归档',
        '系统 SHALL 在归档时把 PEV 产物晋升并留痕。',
        '',
        '#### Scenario: 归档成功',
        '- **WHEN** 所有 PEV 阶段 PASS 且直写产物齐备',
        '- **THEN** archive 完成并生成 pev-log.md',
      ].join('\n')
    );
  }

  it('runs a pev change from creation through archive', async () => {
    const created = await runCLI(['new', 'change', 'demo', '--schema', 'pev'], { cwd: tempDir });
    expect(created.exitCode).toBe(0);
    expect(created.stdout).toContain('Schema: pev');

    // hand-written output alone must not complete a pev artifact
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes', 'demo'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'openspec', 'changes', 'demo', 'prd.md'), 'hand written');
    const before = await runCLI(['status', '--change', 'demo'], { cwd: tempDir });
    expect(before.exitCode).toBe(0);
    expect(before.stdout).toContain('0/10 artifacts complete');

    // instructions route the prd artifact to the product-manager skill
    const instr = await runCLI(['instructions', 'prd', '--change', 'demo'], { cwd: tempDir });
    expect(instr.exitCode).toBe(0);
    expect(instr.stdout).toContain('<pev>');
    expect(instr.stdout).toContain('$product-manager');

    // seed real PEV outputs and direct-write artifacts, then archive
    await fs.rm(path.join(tempDir, 'openspec', 'changes', 'demo', 'prd.md'));
    await seedPevOutputs();

    const done = await runCLI(['status', '--change', 'demo'], { cwd: tempDir });
    expect(done.exitCode).toBe(0);
    expect(done.stdout).toContain('10/10 artifacts complete');

    const archived = await runCLI(['archive', 'demo', '--yes'], { cwd: tempDir });
    expect(archived.exitCode).toBe(0);

    // provenance log survived into the archived change dir
    const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
    const archivedEntries = await fs.readdir(archiveDir, { withFileTypes: true });
    const archivedChange = archivedEntries.find((e) => e.isDirectory());
    expect(archivedChange).toBeTruthy();
    const archivedRoot = path.join(archiveDir, archivedChange!.name);
    const log = await fs.readFile(path.join(archivedRoot, 'pev-log.md'), 'utf8');
    expect(log).toContain('product-manager');
    expect(log).toContain('module-design');
    expect(log).toContain('api-and-interface-design');
    expect(log).toContain('database-schema-design');
    expect(log).toContain('planning-and-task-breakdown');
    expect(log).toContain('incremental-implementation');
    expect(log).toContain('promoted');

    // single-file and directory outputs were promoted into openspec/artifacts/
    const artifacts = path.join(tempDir, 'openspec', 'artifacts');
    expect((await fs.readFile(path.join(artifacts, 'prd.md'), 'utf8')).trim()).toBe('# PRD\n\nreal prd');
    expect(
      (await fs.readFile(path.join(artifacts, 'design', 'modules', 'M1', 'module-detail.md'), 'utf8')).trim()
    ).toBe('# M1\n\nmodule one');
    expect(
      (await fs.readFile(path.join(artifacts, 'design', 'api', 'A1', 'api-contract.md'), 'utf8')).trim()
    ).toBe('# API\n\ncontract');
    expect(
      (await fs.readFile(path.join(artifacts, 'design', 'db', 'D1', 'db-schema.md'), 'utf8')).trim()
    ).toBe('# DB\n\nschema');
    expect((await fs.readFile(path.join(artifacts, 'task-plan.md'), 'utf8')).trim()).toBe('# Task Plan\n\nplan');
    expect(
      (await fs.readFile(path.join(artifacts, 'implementation-report.md'), 'utf8')).trim()
    ).toBe('# Implementation Report\n\nreport');

    // delta spec merged into the main specs tree
    const merged = await fs.readFile(
      path.join(tempDir, 'openspec', 'specs', 'demo-capability', 'spec.md'),
      'utf8'
    );
    expect(merged).toContain('端到端归档');
  });

  it('refuses to archive hand-written pev outputs without state.json (verification gate)', async () => {
    const created = await runCLI(['new', 'change', 'demo', '--schema', 'pev'], { cwd: tempDir });
    expect(created.exitCode).toBe(0);

    // The 2026-10-08 bypass shape: output files exist, no state.json anywhere.
    const round = await roundDir();
    await fs.mkdir(path.join(round, 'pm', 'output'), { recursive: true });
    await fs.writeFile(path.join(round, 'pm', 'output', 'prd.md'), 'hand-written prd');

    const archived = await runCLI(['archive', 'demo', '--yes'], { cwd: tempDir });

    expect(archived.exitCode).not.toBe(0);
    const output = `${archived.stdout}\n${archived.stderr}`;
    expect(output).toContain('unverified');
    // status table naming the refused artifact
    expect(output).toContain('prd');

    // the change stays in place; the archive dir only holds its scaffold .gitkeep
    const pathExists = async (p: string): Promise<boolean> =>
      fs.stat(p).then(
        () => true,
        () => false
      );
    expect(await pathExists(path.join(tempDir, 'openspec', 'changes', 'demo'))).toBe(true);
    const archiveEntries = await fs.readdir(path.join(tempDir, 'openspec', 'changes', 'archive'));
    expect(archiveEntries.filter((entry) => entry !== '.gitkeep')).toEqual([]);
  });

  it('strict validate fails on unverified pev artifacts; non-strict warns without failing', async () => {
    const created = await runCLI(['new', 'change', 'demo', '--schema', 'pev'], { cwd: tempDir });
    expect(created.exitCode).toBe(0);

    // Bypass shape: output without state.json, plus a hand-written change-dir file
    // that must not flip the verdict.
    const round = await roundDir();
    await fs.mkdir(path.join(round, 'pm', 'output'), { recursive: true });
    await fs.writeFile(path.join(round, 'pm', 'output', 'prd.md'), 'hand-written prd');
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'demo');
    await fs.writeFile(path.join(changeDir, 'prd.md'), 'hand-written prd');

    // a structurally valid delta spec so provenance is the only complaint
    await fs.mkdir(path.join(changeDir, 'specs', 'demo-capability'), { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'specs', 'demo-capability', 'spec.md'),
      [
        '# Spec Delta',
        '',
        '## Purpose',
        '验证 PEV 生命周期能产出并归档一个可复用的能力。',
        '',
        '## ADDED Requirements',
        '',
        '### Requirement: 端到端归档',
        '系统 SHALL 在归档时把 PEV 产物晋升并留痕。',
        '',
        '#### Scenario: 归档成功',
        '- **WHEN** 所有 PEV 阶段 PASS 且直写产物齐备',
        '- **THEN** archive 完成并生成 pev-log.md',
      ].join('\n')
    );

    const strict = await runCLI(['validate', 'demo', '--strict', '--json'], { cwd: tempDir });
    expect(strict.exitCode).toBe(1);
    expect(strict.stdout).toContain('"valid": false');
    // the error names the artifact and its runDir
    expect(strict.stdout).toContain('prd');
    expect(strict.stdout).toContain('pm');

    const lax = await runCLI(['validate', 'demo', '--json'], { cwd: tempDir });
    expect(lax.stdout).toContain('"level": "WARNING"');
    expect(lax.stdout).toContain('"valid": true');

    // completing every stage through the skill contract flips strict to green
    await fs.rm(path.join(changeDir, 'prd.md'));
    await seedPevOutputs();
    const strictAfter = await runCLI(['validate', 'demo', '--strict', '--json'], { cwd: tempDir });
    expect(strictAfter.stdout).toContain('"valid": true');
  });

  it('refuses instructions for blocked artifacts and apply until prerequisites complete', async () => {
    const created = await runCLI(['new', 'change', 'demo', '--schema', 'pev'], { cwd: tempDir });
    expect(created.exitCode).toBe(0);

    // first artifact has no prerequisites: instructions flow as before
    const first = await runCLI(['instructions', 'prd', '--change', 'demo'], { cwd: tempDir });
    expect(first.exitCode).toBe(0);
    expect(first.stdout).toContain('$product-manager');

    // blocked artifact: refusal names the incomplete prerequisite and its
    // completion signal; no artifact instructions are delivered
    const blocked = await runCLI(['instructions', 'spec', '--change', 'demo'], { cwd: tempDir });
    expect(blocked.exitCode).not.toBe(0);
    const blockedOut = `${blocked.stdout}\n${blocked.stderr}`;
    expect(blockedOut).toContain('prd');
    expect(blockedOut).toMatch(/\.pev[\\/ ]/);
    expect(blockedOut).toContain('state.json');
    expect(blockedOut).not.toContain('$requirement-clarify');

    // hand-written files in the change dir do not unblock apply: completion is
    // the graph's verdict, not file presence, so apply stays blocked
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'demo');
    await fs.writeFile(path.join(changeDir, 'prd.md'), 'hand-written prd');
    const applyBlocked = await runCLI(
      ['instructions', 'apply', '--change', 'demo', '--json'],
      { cwd: tempDir }
    );
    expect(applyBlocked.exitCode).toBe(0);
    const applyJson = JSON.parse(applyBlocked.stdout);
    expect(applyJson.state).toBe('blocked');
    expect(applyJson.missingArtifacts).toContain('prd');

    // once every stage completed through the skill contract, both flow again
    await fs.rm(path.join(changeDir, 'prd.md'));
    await seedPevOutputs();
    const unblocked = await runCLI(['instructions', 'specs', '--change', 'demo'], { cwd: tempDir });
    expect(unblocked.exitCode).toBe(0);
    const applyReady = await runCLI(['instructions', 'apply', '--change', 'demo'], { cwd: tempDir });
    expect(applyReady.exitCode).toBe(0);
    expect(applyReady.stdout).not.toContain('Cannot apply');
  });

  it('warns when the pev skill for an artifact is not installed on this machine', async () => {
    await runCLI(['new', 'change', 'demo', '--schema', 'pev'], { cwd: tempDir });

    // an isolated HOME with no skills directory: discovery finds nothing
    const emptyHome = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-no-skills-'));
    try {
      const result = await runCLI(
        ['instructions', 'prd', '--change', 'demo'],
        { cwd: tempDir, env: { HOME: emptyHome } }
      );
      expect(result.exitCode).toBe(0);
      const out = `${result.stdout}\n${result.stderr}`;
      expect(out).toContain('product-manager');
      expect(out).toMatch(/skills/);
    } finally {
      await fs.rm(emptyHome, { recursive: true, force: true });
    }
  });

  it('warns at creation when the schema declares pev skills missing from this machine', async () => {
    const emptyHome = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-no-skills-'));
    try {
      const created = await runCLI(
        ['new', 'change', 'demo', '--schema', 'pev'],
        { cwd: tempDir, env: { HOME: emptyHome } }
      );
      // the change is still created; the warning is advisory
      expect(created.exitCode).toBe(0);
      const out = `${created.stdout}\n${created.stderr}`;
      expect(out).toContain('product-manager');
      expect(out).toContain('not installed');
    } finally {
      await fs.rm(emptyHome, { recursive: true, force: true });
    }
  });
});
