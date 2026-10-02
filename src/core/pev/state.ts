import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * A PEV skill's `state.json` shape. Only the fields the integration depends on
 * are typed; the rest is preserved for extensibility as additional skills land.
 */
export interface PevState {
  status?: string;
  iteration?: number;
  max_iterations?: number;
  evidence?: unknown[];
  [key: string]: unknown;
}

/** Resolves the absolute `.pev/<round>/` directory for a project. */
export function resolveRoundDir(projectRoot: string, roundName: string): string {
  return path.join(projectRoot, '.pev', roundName);
}

/** Reads `.pev/<round>/<runDir>/state.json`, or null when absent/unreadable. */
export function readPevState(roundDir: string, runDir: string): PevState | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(roundDir, runDir, 'state.json'), 'utf8')
    ) as PevState;
  } catch {
    return null;
  }
}

/**
 * The authoritative "stage complete" signal for a PEV-backed artifact: the
 * skill's state machine reached COMPLETE and its final deliverable exists.
 * File existence alone is deliberately insufficient.
 */
export function isPevStageComplete(
  roundDir: string,
  runDir: string,
  outputRel: string
): boolean {
  const state = readPevState(roundDir, runDir);
  if (!state || state.status !== 'COMPLETE') return false;
  return fs.existsSync(path.join(roundDir, outputRel));
}
