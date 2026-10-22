import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  readWorkflowState,
  loadWorkflowState,
  WorkflowStateError,
  WORKFLOW_STATE_FILENAME,
} from '../../../src/core/workflow-state/index.js';
import type { SchemaYaml } from '../../../src/core/artifact-graph/types.js';

const createSchema = (artifacts: SchemaYaml['artifacts']): SchemaYaml => ({
  name: 'test',
  version: 1,
  artifacts,
});

// Tail of the pev schema: prd → (design-api, design-db) → tasks. The two
// optional stages are the skip candidates; tasks is the v1-unskippable one.
const schema = createSchema([
  { id: 'prd', generates: 'prd.md', description: 'PRD', template: 'prd.md', requires: [] },
  { id: 'design-api', generates: 'design/api', description: 'API', template: 'api.md', requires: ['prd'] },
  { id: 'design-db', generates: 'design/db', description: 'DB', template: 'db.md', requires: ['prd'] },
  {
    id: 'tasks',
    generates: 'task-plan.md',
    description: 'Tasks',
    template: 'tasks.md',
    requires: ['design-api', 'design-db'],
  },
]);

/** Full-coverage state: design pair skipped with evidence, everything else active. */
function baseState(): Record<string, unknown> {
  return {
    version: 1,
    entry: { requirement: 'requirement.md' },
    active: ['prd', 'tasks'],
    skipped: {
      'design-api': {
        reason: 'no external contracts',
        evidence: ['chat 2026-10-16'],
        decidedBy: 'zhengshan',
      },
      'design-db': { reason: 'no persistence', evidence: ['prd section 2'], decidedBy: 'zhengshan' },
    },
    upgrades: [],
  };
}

function writeState(changeDir: string, state: unknown): void {
  fs.writeFileSync(
    path.join(changeDir, WORKFLOW_STATE_FILENAME),
    typeof state === 'string' ? state : JSON.stringify(state)
  );
}

describe('workflow-state/readWorkflowState', () => {
  let tempDir: string;
  let changeDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-wfstate-'));
    changeDir = path.join(tempDir, 'change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'requirement.md'), '# Requirement');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns none when the state file is absent', () => {
    expect(readWorkflowState(changeDir, schema)).toEqual({ status: 'none' });
  });

  it('accepts full coverage with complete skip entries and an existing requirement file', () => {
    writeState(changeDir, baseState());
    const result = readWorkflowState(changeDir, schema);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.active).toEqual(new Set(['prd', 'tasks']));
    expect(result.skipped.get('design-api')?.reason).toBe('no external contracts');
    expect(result.skipped.get('design-db')?.decidedBy).toBe('zhengshan');
    expect(result.state.version).toBe(1);
  });

  it('errors naming an artifact that is neither active nor skipped', () => {
    const state = baseState();
    delete (state.skipped as Record<string, unknown>)['design-db'];
    writeState(changeDir, state);

    const result = readWorkflowState(changeDir, schema);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.issues.some((issue) => issue.includes("'design-db'"))).toBe(true);
  });

  it('errors naming unknown IDs in active and in skipped keys', () => {
    const state = baseState();
    (state as Record<string, unknown>).active = ['prd', 'tasks', 'ghost'];
    (state.skipped as Record<string, unknown>)['phantom'] = {
      reason: 'r',
      evidence: ['e'],
      decidedBy: 'd',
    };
    writeState(changeDir, state);

    const result = readWorkflowState(changeDir, schema);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.issues.some((issue) => issue.includes("'ghost'"))).toBe(true);
    expect(result.issues.some((issue) => issue.includes("'phantom'"))).toBe(true);
  });

  it('rejects skip entries missing reason/evidence/decidedBy or with empty evidence, with Zod paths', () => {
    const state = baseState();
    (state.skipped as Record<string, unknown>)['design-api'] = { reason: 'r', decidedBy: 'd' };
    (state.skipped as Record<string, unknown>)['design-db'] = {
      reason: 'r',
      evidence: [],
      decidedBy: 'd',
    };
    writeState(changeDir, state);

    const result = readWorkflowState(changeDir, schema);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.issues.some((issue) => issue.includes('skipped.design-api.evidence'))).toBe(true);
    expect(result.issues.some((issue) => issue.includes('skipped.design-db.evidence'))).toBe(true);
  });

  it('rejects skipping tasks (v1)', () => {
    const state = baseState();
    (state as Record<string, unknown>).active = ['prd', 'design-api', 'design-db'];
    (state.skipped as Record<string, unknown>)['tasks'] = {
      reason: 'r',
      evidence: ['e'],
      decidedBy: 'd',
    };
    writeState(changeDir, state);

    const result = readWorkflowState(changeDir, schema);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.issues.some((issue) => issue.includes('tasks') && issue.includes('skip'))).toBe(
      true
    );
  });

  it('reports the broken dependency edge alongside the coverage error', () => {
    const state = baseState();
    delete (state.skipped as Record<string, unknown>)['design-db'];
    writeState(changeDir, state);

    const result = readWorkflowState(changeDir, schema);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    // Coverage: design-db itself is uncovered.
    expect(result.issues.some((issue) => /design-db.*(neither active nor skipped)/.test(issue))).toBe(
      true
    );
    // Broken edge: active tasks requires the uncovered design-db.
    expect(
      result.issues.some((issue) => issue.includes("'tasks'") && issue.includes("'design-db'"))
    ).toBe(true);
  });

  it('errors when entry.requirement points at a missing file', () => {
    const state = baseState();
    (state as Record<string, unknown>).entry = { requirement: 'no-such-requirement.md' };
    writeState(changeDir, state);

    const result = readWorkflowState(changeDir, schema);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.issues.some((issue) => issue.includes('no-such-requirement.md'))).toBe(true);
  });

  it('errors when the exploration key is present but its file is missing', () => {
    const state = baseState();
    (state as Record<string, unknown>).entry = {
      requirement: 'requirement.md',
      exploration: 'no-such-exploration.md',
    };
    writeState(changeDir, state);

    const result = readWorkflowState(changeDir, schema);
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.issues.some((issue) => issue.includes('exploration'))).toBe(true);
  });

  it('treats bad JSON, non-objects, version 2, and unknown top-level keys as error, not none', () => {
    const cases: Array<{ name: string; state: unknown }> = [
      { name: 'bad JSON', state: '{not json' },
      { name: 'non-object', state: '["array"]' },
      { name: 'version 2', state: { ...baseState(), version: 2 } },
      { name: 'unknown top-level key', state: { ...baseState(), extra: true } },
    ];
    for (const { name, state } of cases) {
      writeState(changeDir, state);
      const result = readWorkflowState(changeDir, schema);
      expect(result.status, name).toBe('error');
    }
  });

  it('rejects upgrade events missing evidence or added, accepts a well-formed one', () => {
    const malformed = baseState();
    (malformed as Record<string, unknown>).upgrades = [
      { date: '2026-10-17', reason: 'api risk', decidedBy: 'zhengshan', reopens: ['tasks'] },
    ];
    writeState(changeDir, malformed);
    expect(readWorkflowState(changeDir, schema).status).toBe('error');

    const noAdded = baseState();
    (noAdded as Record<string, unknown>).upgrades = [
      {
        date: '2026-10-17',
        reason: 'api risk',
        evidence: ['design review'],
        decidedBy: 'zhengshan',
        reopens: [],
      },
    ];
    writeState(changeDir, noAdded);
    expect(readWorkflowState(changeDir, schema).status).toBe('error');

    const valid = baseState();
    (valid as Record<string, unknown>).upgrades = [
      {
        date: '2026-10-17',
        reason: 'api risk',
        evidence: ['design review'],
        decidedBy: 'zhengshan',
        added: ['design-api'],
        reopens: ['tasks'],
        explore: 're-check contract surface',
      },
    ];
    writeState(changeDir, valid);
    const result = readWorkflowState(changeDir, schema);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.state.upgrades[0]?.added).toEqual(['design-api']);
    }
  });

  it('rejects an artifact listed both active and skipped, and duplicate active entries', () => {
    const overlap = baseState();
    (overlap as Record<string, unknown>).active = ['prd', 'tasks', 'design-db'];
    writeState(changeDir, overlap);
    const overlapResult = readWorkflowState(changeDir, schema);
    expect(overlapResult.status).toBe('error');
    if (overlapResult.status === 'error') {
      expect(overlapResult.issues.some((issue) => issue.includes('both active and skipped'))).toBe(
        true
      );
    }

    const duplicate = baseState();
    (duplicate as Record<string, unknown>).active = ['prd', 'tasks', 'prd'];
    writeState(changeDir, duplicate);
    expect(readWorkflowState(changeDir, schema).status).toBe('error');
  });
});

describe('workflow-state/loadWorkflowState', () => {
  let tempDir: string;
  let changeDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-wfstate-'));
    changeDir = path.join(tempDir, 'change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'requirement.md'), '# Requirement');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('throws WorkflowStateError with statePath and issues on a corrupt file', () => {
    writeState(changeDir, { ...baseState(), active: ['prd'] });
    try {
      loadWorkflowState(changeDir, schema);
      expect.unreachable('loadWorkflowState must throw on a corrupt state file');
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowStateError);
      const wfError = error as WorkflowStateError;
      expect(wfError.statePath).toBe(path.join(changeDir, WORKFLOW_STATE_FILENAME));
      expect(wfError.issues.length).toBeGreaterThan(0);
      expect(wfError.message).toContain(WORKFLOW_STATE_FILENAME);
    }
  });

  it('returns undefined when no state file exists', () => {
    expect(loadWorkflowState(changeDir, schema)).toBeUndefined();
  });
});
