import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ZodError } from 'zod';
import type { SchemaYaml } from '../artifact-graph/types.js';
import {
  WORKFLOW_STATE_FILENAME,
  WorkflowStateSchema,
  type WorkflowSkipEntry,
  type WorkflowState,
} from './schema.js';

export { WORKFLOW_STATE_FILENAME } from './schema.js';

/** Loaded workflow state: parsed file plus the derived lookup collections. */
export interface WorkflowStateOk {
  status: 'ok';
  state: WorkflowState;
  active: Set<string>;
  skipped: Map<string, WorkflowSkipEntry>;
}

export type WorkflowStateResult =
  | { status: 'none' }
  | WorkflowStateOk
  | { status: 'error'; issues: string[] };

/**
 * Error thrown when the workflow state file exists but fails validation.
 * Carries the file path and every issue, mirroring ChangeMetadataError.
 */
export class WorkflowStateError extends Error {
  constructor(
    message: string,
    public readonly statePath: string,
    public readonly issues: string[]
  ) {
    super(message);
    this.name = 'WorkflowStateError';
  }
}

function formatZodIssues(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const where = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${where}${issue.message}`;
  });
}

/**
 * Cross-checks the parsed state against the change's schema and filesystem.
 * Each rule reports its own issue so a consumer sees every problem at once:
 * coverage gaps, unknown IDs, overlap, the v1 tasks restriction, broken
 * dependency edges, and missing entry files.
 */
function collectSemanticIssues(
  state: WorkflowState,
  schema: SchemaYaml,
  changeDir: string
): string[] {
  const issues: string[] = [];
  const schemaIds = schema.artifacts.map((artifact) => artifact.id);
  const knownIds = new Set(schemaIds);

  const active = new Set<string>();
  for (const id of state.active) {
    if (active.has(id)) {
      issues.push(`duplicate artifact ID '${id}' in active`);
    }
    active.add(id);
  }
  const skippedIds = new Set(Object.keys(state.skipped));

  for (const id of active) {
    if (!knownIds.has(id)) {
      issues.push(
        `unknown artifact ID '${id}' in active (not declared by schema '${schema.name}')`
      );
    }
  }
  for (const id of skippedIds) {
    if (!knownIds.has(id)) {
      issues.push(
        `unknown artifact ID '${id}' in skipped (not declared by schema '${schema.name}')`
      );
    }
  }
  for (const id of active) {
    if (skippedIds.has(id)) {
      issues.push(`artifact '${id}' is both active and skipped`);
    }
  }
  for (const id of schemaIds) {
    if (!active.has(id) && !skippedIds.has(id)) {
      issues.push(`artifact '${id}' is neither active nor skipped`);
    }
  }
  for (const id of skippedIds) {
    if (id === 'tasks') {
      issues.push(
        `artifact 'tasks' cannot be skipped in v1: implement's input contract depends on the task list`
      );
    }
  }

  // Logically redundant under full coverage, but implemented so a broken edge
  // is named even when the coverage issues are also firing (fail-closed).
  const covered = new Set([...active, ...skippedIds]);
  for (const artifact of schema.artifacts) {
    if (!active.has(artifact.id)) continue;
    for (const req of artifact.requires) {
      if (!covered.has(req)) {
        issues.push(
          `active artifact '${artifact.id}' requires '${req}', which is neither active nor skipped`
        );
      }
    }
  }

  if (!fs.existsSync(path.resolve(changeDir, state.entry.requirement))) {
    issues.push(`entry.requirement file does not exist: ${state.entry.requirement}`);
  }
  if (state.entry.exploration !== undefined) {
    if (!fs.existsSync(path.resolve(changeDir, state.entry.exploration))) {
      issues.push(`entry.exploration file does not exist: ${state.entry.exploration}`);
    }
  }

  return issues;
}

/**
 * Non-throwing read of the change's workflow state.
 *
 * - No state file → `{status:'none'}`: the change keeps today's behavior.
 * - File present but unreadable, unparseable, or failing any validation rule
 *   → `{status:'error', issues}` — never silently downgraded to none.
 * - Valid → `{status:'ok', state, active, skipped}`.
 */
export function readWorkflowState(changeDir: string, schema: SchemaYaml): WorkflowStateResult {
  const statePath = path.join(changeDir, WORKFLOW_STATE_FILENAME);
  if (!fs.existsSync(statePath)) {
    return { status: 'none' };
  }

  let raw: string;
  try {
    raw = fs.readFileSync(statePath, 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'error', issues: [`cannot read ${WORKFLOW_STATE_FILENAME}: ${message}`] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'error',
      issues: [`${WORKFLOW_STATE_FILENAME} is not valid JSON: ${message}`],
    };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { status: 'error', issues: [`${WORKFLOW_STATE_FILENAME} must contain a JSON object`] };
  }

  const zodResult = WorkflowStateSchema.safeParse(parsed);
  if (!zodResult.success) {
    return { status: 'error', issues: formatZodIssues(zodResult.error) };
  }
  const state = zodResult.data;

  const issues = collectSemanticIssues(state, schema, changeDir);
  if (issues.length > 0) {
    return { status: 'error', issues };
  }

  return {
    status: 'ok',
    state,
    active: new Set(state.active),
    skipped: new Map(Object.entries(state.skipped)),
  };
}

/**
 * Throwing variant for lifecycle entry points: every consumer gate routes
 * through here so a corrupt state fails the command instead of falling back.
 * Returns undefined when the change has no state file.
 */
export function loadWorkflowState(changeDir: string, schema: SchemaYaml): WorkflowStateOk | undefined {
  const result = readWorkflowState(changeDir, schema);
  if (result.status === 'none') {
    return undefined;
  }
  if (result.status === 'error') {
    const statePath = path.join(changeDir, WORKFLOW_STATE_FILENAME);
    throw new WorkflowStateError(
      `Invalid workflow state in ${statePath}:\n${result.issues.map((i) => `  - ${i}`).join('\n')}`,
      statePath,
      result.issues
    );
  }
  return result;
}
