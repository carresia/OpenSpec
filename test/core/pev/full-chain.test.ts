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

  async function seedPevOutputs(): Promise<void> {
    const round = await roundDir();
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'demo');

    const stages: Array<{ runDir: string; output: string; content: string }> = [
      { runDir: 'pm', output: 'pm/output/prd.md', content: '# PRD\n\nreal prd\n' },
      { runDir: 'rc', output: 'rc/output/spec.md', content: '# Spec\n\nreal spec\n' },
      { runDir: 'decompose', output: 'decompose/output/catalog.md', content: '# Catalog\n\nstories\n' },
      { runDir: 'arch', output: 'arch/output/architecture.md', content: '# Architecture\n\narch\n' },
    ];
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      await fs.mkdir(path.join(round, path.dirname(stage.output)), { recursive: true });
      await fs.writeFile(
        path.join(round, stage.runDir, 'state.json'),
        JSON.stringify({ status: 'COMPLETE', iteration: i + 1 })
      );
      await fs.writeFile(path.join(round, stage.output), stage.content);
    }

    // module-design renders a directory output
    await fs.mkdir(path.join(round, 'module', 'output', 'M1'), { recursive: true });
    await fs.writeFile(
      path.join(round, 'module', 'state.json'),
      JSON.stringify({ status: 'COMPLETE', iteration: 2 })
    );
    await fs.writeFile(path.join(round, 'module', 'output', 'M1', 'module-detail.md'), '# M1\n\nmodule one\n');

    // direct-write delta spec + tasks
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
    await fs.writeFile(
      path.join(changeDir, 'tasks.md'),
      '# Tasks\n\n## 1. 实施\n\n- [x] 1.1 完成实现并验证测试通过\n'
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
    expect(before.stdout).toContain('0/7 artifacts complete');

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
    expect(done.stdout).toContain('7/7 artifacts complete');

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
    expect(log).toContain('promoted');

    // single-file and directory outputs were promoted into openspec/artifacts/
    const artifacts = path.join(tempDir, 'openspec', 'artifacts');
    expect((await fs.readFile(path.join(artifacts, 'prd.md'), 'utf8')).trim()).toBe('# PRD\n\nreal prd');
    expect(
      (await fs.readFile(path.join(artifacts, 'design', 'modules', 'M1', 'module-detail.md'), 'utf8')).trim()
    ).toBe('# M1\n\nmodule one');

    // delta spec merged into the main specs tree
    const merged = await fs.readFile(
      path.join(tempDir, 'openspec', 'specs', 'demo-capability', 'spec.md'),
      'utf8'
    );
    expect(merged).toContain('端到端归档');
  });
});
