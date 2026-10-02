import * as fs from 'node:fs';
import type { CompletedSet } from './types.js';
import type { ArtifactGraph } from './graph.js';
import { artifactOutputExists } from './outputs.js';
import { isPevStageComplete } from '../pev/state.js';

/**
 * Detects which artifacts are completed by checking file existence in the change directory.
 * Returns a Set of completed artifact IDs.
 *
 * @param graph - The artifact graph to check
 * @param changeDir - The change directory to scan for files
 * @returns Set of artifact IDs whose generated files exist
 */
export function detectCompleted(
  graph: ArtifactGraph,
  changeDir: string,
  options: { roundDir?: string } = {}
): CompletedSet {
  const completed = new Set<string>();

  // Handle missing change directory gracefully
  if (!fs.existsSync(changeDir)) {
    return completed;
  }

  for (const artifact of graph.getAllArtifacts()) {
    // PEV 后端：完成 = skill 状态机 COMPLETE 且 output 已渲染。文件存在本身
    // 不作为 PEV artifact 的完成信号，避免"手写产物/未 PASS"被误判完成。
    if (artifact.pev) {
      if (
        options.roundDir &&
        isPevStageComplete(options.roundDir, artifact.pev.runDir, artifact.pev.output)
      ) {
        completed.add(artifact.id);
      }
      continue;
    }
    if (isArtifactComplete(artifact.generates, changeDir)) {
      completed.add(artifact.id);
    }
  }

  return completed;
}

/**
 * Checks if an artifact is complete by checking if its generated file(s) exist.
 * Supports both simple paths and glob patterns.
 */
function isArtifactComplete(generates: string, changeDir: string): boolean {
  return artifactOutputExists(changeDir, generates);
}
