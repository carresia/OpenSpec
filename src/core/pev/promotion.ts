import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SchemaYaml } from '../artifact-graph/types.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { readPevState, resolveRoundDir } from './state.js';

export interface PromotionResult {
  artifactId: string;
  skill?: string;
  round?: string;
  runDir?: string;
  iteration?: number;
  verdict?: string;
  source?: string;
  target?: string;
  status: 'promoted' | 'unverified' | 'missing' | 'conflict';
}

/** `fs.stat` that returns undefined instead of throwing when the path is absent. */
function statOrNull(p: string): fs.Stats | undefined {
  return fs.statSync(p, { throwIfNoEntry: false });
}

/** True when both paths exist and differ in type or content. */
function contentDiffers(a: string, b: string): boolean {
  const aStat = statOrNull(a);
  const bStat = statOrNull(b);
  if (!aStat || !bStat) return Boolean(aStat) !== Boolean(bStat);
  if (aStat.isDirectory() !== bStat.isDirectory()) return true;
  if (!aStat.isDirectory()) {
    return !fs.readFileSync(a).equals(fs.readFileSync(b));
  }
  const aNames = fs.readdirSync(a).sort();
  const bNames = fs.readdirSync(b).sort();
  if (aNames.length !== bNames.length) return true;
  for (let i = 0; i < aNames.length; i++) {
    if (aNames[i] !== bNames[i]) return true;
    if (contentDiffers(path.join(a, aNames[i]), path.join(b, bNames[i]))) return true;
  }
  return false;
}

/** Copies a single file or an entire directory tree from `source` to `target`. */
async function copySource(source: string, target: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  if (statOrNull(source)?.isDirectory()) {
    await fs.promises.cp(source, target, { recursive: true });
  } else {
    await fs.promises.copyFile(source, target);
  }
}

/**
 * Promotes each PEV-backed artifact's final deliverable out of `.pev/<round>/`
 * and into the OpenSpec change directory (`generates`), and, when declared,
 * into `openspec/artifacts/` (`promotes`). Returns per-artifact results so
 * archive can render a provenance log instead of silently succeeding.
 */
export async function promotePevArtifacts(input: {
  changeDir: string;
  projectRoot: string;
  roundName?: string;
  schema: SchemaYaml;
  artifactsRoot: string;
  /** Workflow-state skipped artifact IDs: promoted never, not even as unverified. */
  skippedArtifactIds?: ReadonlySet<string>;
}): Promise<PromotionResult[]> {
  const results: PromotionResult[] = [];
  const { changeDir, projectRoot, roundName, schema, artifactsRoot } = input;
  if (!roundName) return results;
  const roundDir = resolveRoundDir(projectRoot, roundName);

  for (const artifact of schema.artifacts) {
    if (!artifact.pev) continue;
    // A workflow-skipped stage produces nothing under .pev/ by contract, so
    // it must not surface as unverified, be copied, or reach pev-log.md.
    if (input.skippedArtifactIds?.has(artifact.id)) continue;
    const source = path.join(roundDir, artifact.pev.output);
    const state = readPevState(roundDir, artifact.pev.runDir);
    const base = {
      artifactId: artifact.id,
      skill: artifact.pev.skill,
      round: roundName,
      runDir: artifact.pev.runDir,
      iteration: state?.iteration,
      verdict: state?.status,
    };

    // State is checked before file existence: an output file without a
    // COMPLETE state.json is the hand-written bypass shape, and must never
    // reach the change directory even though the file is right there.
    if (!state || state.status !== 'COMPLETE') {
      results.push({ ...base, status: 'unverified' });
      continue;
    }

    if (!fs.existsSync(source)) {
      results.push({ ...base, status: 'missing' });
      continue;
    }

    const changeTarget = path.join(changeDir, artifact.generates);
    FileSystemUtils.assertPathWithin(changeDir, changeTarget);
    if (fs.existsSync(changeTarget) && contentDiffers(source, changeTarget)) {
      results.push({ ...base, source, target: changeTarget, status: 'conflict' });
      continue;
    }

    await copySource(source, changeTarget);
    results.push({ ...base, source, target: changeTarget, status: 'promoted' });

    if (artifact.promotes && !artifact.generates.startsWith('specs/')) {
      const artTarget = path.join(artifactsRoot, artifact.promotes);
      FileSystemUtils.assertPathWithin(artifactsRoot, artTarget);
      await copySource(source, artTarget);
    }
  }

  return results;
}

/** Renders promotion results as the markdown table shared by pev-log.md and gate errors. */
export function formatPevLogTable(results: PromotionResult[]): string {
  const lines = [
    '| artifact | skill | round | runDir | iteration | verdict | status |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of results) {
    lines.push(
      `| ${r.artifactId} | ${r.skill ?? ''} | ${r.round ?? ''} | ${r.runDir ?? ''} | ${
        r.iteration ?? ''
      } | ${r.verdict ?? ''} | ${r.status} |`
    );
  }
  return lines.join('\n');
}

/** Writes the provenance log that survives into the archive. */
export async function writePevLog(
  changeDir: string,
  results: PromotionResult[]
): Promise<void> {
  const lines = ['# PEV Log', '', formatPevLogTable(results)];
  await fs.promises.writeFile(path.join(changeDir, 'pev-log.md'), lines.join('\n') + '\n', 'utf8');
}
