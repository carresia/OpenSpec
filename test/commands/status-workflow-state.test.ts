import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadChangeContext,
  formatChangeStatus,
} from '../../src/core/artifact-graph/instruction-loader.js';
import { printStatusText } from '../../src/commands/workflow/status.js';

/**
 * Library-level status surface for workflow state (.openspec-workflow.json):
 * the Workflow block, the artifact-line suffix that distinguishes workflow
 * skips from legacy skip_specs, the progress denominator, and the JSON-facing
 * shape (workflow summary + ArtifactStatus.skippedBy).
 */
describe('status surface for workflow state', () => {
  let tempDir: string;
  let changeDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-test-'));
    changeDir = path.join(tempDir, 'openspec', 'changes', 'my-change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'requirement.md'), '# Requirement');
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Proposal');
    fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\n');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  /** spec-driven state with `design` skipped; upgrades configurable. */
  function writeWorkflowState(overrides: Record<string, unknown> = {}): void {
    fs.writeFileSync(
      path.join(changeDir, '.openspec-workflow.json'),
      JSON.stringify({
        version: 1,
        entry: { requirement: 'requirement.md' },
        active: ['proposal', 'specs', 'tasks'],
        skipped: {
          design: {
            reason: 'pure refactor, no design delta',
            evidence: ['chat 2026-10-16'],
            decidedBy: 'zhengshan',
          },
        },
        upgrades: [],
        ...overrides,
      })
    );
  }

  function renderStatus(): string {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.join(' '));
    });
    const context = loadChangeContext(tempDir, 'my-change');
    printStatusText(formatChangeStatus(context));
    vi.restoreAllMocks();
    return lines.join('\n');
  }

  it('renders the Workflow block after the Schema line', () => {
    writeWorkflowState({
      upgrades: [
        {
          date: '2026-10-17',
          reason: 'api risk detected in design',
          evidence: ['design review'],
          decidedBy: 'zhengshan',
          added: ['design-api'],
          reopens: ['tasks'],
        },
      ],
    });
    const output = renderStatus();

    const schemaLine = output.indexOf('Schema: spec-driven');
    const workflowLine = output.indexOf('Workflow:');
    expect(schemaLine).toBeGreaterThanOrEqual(0);
    expect(workflowLine).toBeGreaterThan(schemaLine);

    expect(output).toContain('Active: proposal, specs, tasks');
    expect(output).toContain('design: pure refactor, no design delta');
    expect(output).toContain('zhengshan');
    expect(output).toContain('evidence: 1');
    expect(output).toContain('2026-10-17');
    expect(output).toContain('api risk detected in design');
  });

  it('marks the workflow-skipped artifact with a reason suffix, distinct from skip_specs', () => {
    writeWorkflowState();
    const output = renderStatus();

    expect(output).toContain('[~] design (skipped by workflow state: pure refactor, no design delta)');
    // The legacy mechanism's suffix stays its own wording.
    expect(output).not.toContain('skipped: change declares skip_specs');
  });

  it('keeps the two skip mechanisms distinguishable when both are present', () => {
    fs.writeFileSync(
      path.join(changeDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );
    writeWorkflowState();
    const output = renderStatus();

    expect(output).toContain('(skipped by workflow state: pure refactor, no design delta)');
    expect(output).toContain('(skipped: change declares skip_specs)');
  });

  it('excludes workflow-skipped artifacts from the progress denominator', () => {
    writeWorkflowState();
    const output = renderStatus();

    // 4 artifacts declared; design skipped via workflow state; proposal done.
    expect(output).toContain('Progress: 1/3 artifacts complete (1 skipped)');
  });

  it('carries the workflow summary and skippedBy in the JSON-facing shape', () => {
    writeWorkflowState();
    const context = loadChangeContext(tempDir, 'my-change');
    const status = formatChangeStatus(context);

    expect(status.workflow).toBeDefined();
    expect(status.workflow?.active).toEqual(['proposal', 'specs', 'tasks']);
    expect(status.workflow?.skipped).toEqual([
      {
        id: 'design',
        reason: 'pure refactor, no design delta',
        decidedBy: 'zhengshan',
        evidence: ['chat 2026-10-16'],
      },
    ]);
    expect(status.workflow?.upgrades).toEqual([]);

    const design = status.artifacts.find((a) => a.id === 'design');
    expect(design?.status).toBe('skipped');
    expect(design?.skippedBy).toBe('workflow');

    const proposal = status.artifacts.find((a) => a.id === 'proposal');
    expect(proposal?.status).toBe('done');
    expect(proposal?.skippedBy).toBeUndefined();

    // tasks requires specs + design; design is skipped, so only specs blocks.
    expect(status.artifacts.find((a) => a.id === 'tasks')?.missingDeps).toEqual(['specs']);
  });

  it('keeps the status shape unchanged without a state file', () => {
    const context = loadChangeContext(tempDir, 'my-change');
    const status = formatChangeStatus(context);

    expect(status.workflow).toBeUndefined();
    expect(status.artifacts.every((a) => a.skippedBy === undefined)).toBe(true);
  });

  it('sanitizes author-written skip fields in the text output', () => {
    writeWorkflowState();
    fs.writeFileSync(
      path.join(changeDir, '.openspec-workflow.json'),
      JSON.stringify({
        version: 1,
        entry: { requirement: 'requirement.md' },
        active: ['proposal', 'specs', 'tasks'],
        skipped: {
          design: {
            reason: 'no design needed\r\nSecond line forging output',
            evidence: ['e'],
            decidedBy: 'attacker',
          },
        },
        upgrades: [],
      })
    );
    const output = renderStatus();

    // CR/LF from the author-written reason must never forge new lines.
    expect(output).not.toMatch(/skipped by workflow state: no design needed\r?\nSecond line/);
  });
});
