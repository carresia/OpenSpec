import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { SchemaYaml } from '../../../src/core/artifact-graph/types.js';
import { promotePevArtifacts, writePevLog } from '../../../src/core/pev/promotion.js';

const createSchema = (artifacts: SchemaYaml['artifacts']): SchemaYaml => ({
  name: 'pev',
  version: 1,
  artifacts,
});

/**
 * Promotion × workflow state: a skipped stage is neither promoted, copied,
 * nor logged - "SKIPPED 不计 COMPLETE" extends to never entering the
 * provenance table as unverified.
 */
describe('promotePevArtifacts with skippedArtifactIds', () => {
  let tempDir: string;
  let changeDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-promo-'));
    changeDir = path.join(tempDir, 'change');
    fs.mkdirSync(changeDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('skips a skipped stage entirely: no result row, no copy, no log line', async () => {
    const round = path.join(tempDir, '.pev', 'round-2026-10-17');
    const seed = (runDir: string, output: string, content: string): void => {
      fs.mkdirSync(path.join(round, path.dirname(output)), { recursive: true });
      fs.writeFileSync(
        path.join(round, runDir, 'state.json'),
        JSON.stringify({ status: 'COMPLETE', iteration: 1 })
      );
      fs.writeFileSync(path.join(round, output), content);
    };
    seed('pm', 'pm/output/prd.md', '# PRD');
    seed('db', 'db/output/D1/schema.md', '# DB');

    const schema = createSchema([
      {
        id: 'prd',
        generates: 'prd.md',
        description: 'PRD',
        template: 'prd.md',
        requires: [],
        pev: { skill: 'product-manager', runDir: 'pm', output: 'pm/output/prd.md' },
        promotes: 'prd.md',
      },
      {
        id: 'design-db',
        generates: 'design/db',
        description: 'DB',
        template: 'db.md',
        requires: ['prd'],
        pev: { skill: 'database-schema-design', runDir: 'db', output: 'db/output' },
        promotes: 'design/db',
      },
    ]);

    const results = await promotePevArtifacts({
      changeDir,
      projectRoot: tempDir,
      roundName: 'round-2026-10-17',
      schema,
      artifactsRoot: path.join(tempDir, 'openspec', 'artifacts'),
      skippedArtifactIds: new Set(['design-db']),
    });

    // No result row: skipped stages are not "unverified" - they are outside
    // the plan, so they never reach the provenance table at all.
    expect(results.map((r) => r.artifactId)).toEqual(['prd']);
    expect(results[0]?.status).toBe('promoted');

    // Nothing was copied for the skipped stage, in either target.
    expect(fs.existsSync(path.join(changeDir, 'design', 'db'))).toBe(false);
    expect(
      fs.existsSync(path.join(tempDir, 'openspec', 'artifacts', 'design', 'db'))
    ).toBe(false);
    expect(fs.existsSync(path.join(changeDir, 'prd.md'))).toBe(true);

    // And the log written from these results carries no design-db line.
    await writePevLog(changeDir, results);
    const log = fs.readFileSync(path.join(changeDir, 'pev-log.md'), 'utf8');
    expect(log).toContain('prd');
    expect(log).not.toContain('design-db');
  });
});
