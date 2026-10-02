import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectCompleted } from '../../../src/core/artifact-graph/state.js';
import { ArtifactGraph } from '../../../src/core/artifact-graph/graph.js';
import type { SchemaYaml } from '../../../src/core/artifact-graph/types.js';
import { promotePevArtifacts, writePevLog } from '../../../src/core/pev/promotion.js';
import { collectCapabilityInventory } from '../../../src/core/pev/capability-inventory.js';

const createSchema = (artifacts: SchemaYaml['artifacts']): SchemaYaml => ({
  name: 'pev',
  version: 1,
  artifacts,
});

describe('pev integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-pev-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectCompleted (pev backend)', () => {
    it('marks a pev artifact done only on COMPLETE state + rendered output', () => {
      const roundDir = path.join(tempDir, '.pev', 'prd-2026-10-01');
      fs.mkdirSync(path.join(roundDir, 'pm', 'output'), { recursive: true });
      const changeDir = path.join(tempDir, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      const graph = ArtifactGraph.fromSchema(
        createSchema([
          {
            id: 'prd',
            generates: 'prd.md',
            description: 'PRD',
            template: 'prd.md',
            requires: [],
            pev: { skill: 'product-manager', runDir: 'pm', output: 'pm/output/prd.md' },
          },
        ])
      );

      // File presence alone must not complete a pev artifact.
      fs.writeFileSync(path.join(changeDir, 'prd.md'), 'hand-written');
      expect(detectCompleted(graph, changeDir, { roundDir }).has('prd')).toBe(false);

      // COMPLETE state + output is the authoritative signal.
      fs.writeFileSync(
        path.join(roundDir, 'pm', 'state.json'),
        JSON.stringify({ status: 'COMPLETE', iteration: 1 })
      );
      fs.writeFileSync(path.join(roundDir, 'pm', 'output', 'prd.md'), 'PRD');
      expect(detectCompleted(graph, changeDir, { roundDir }).has('prd')).toBe(true);
    });
  });

  describe('promotePevArtifacts + writePevLog', () => {
    it('promotes output into the change dir and writes provenance', async () => {
      const roundDir = path.join(tempDir, '.pev', 'prd-2026-10-01');
      fs.mkdirSync(path.join(roundDir, 'pm', 'output'), { recursive: true });
      fs.writeFileSync(
        path.join(roundDir, 'pm', 'state.json'),
        JSON.stringify({ status: 'COMPLETE', iteration: 3 })
      );
      fs.writeFileSync(path.join(roundDir, 'pm', 'output', 'prd.md'), 'PRD content');
      const changeDir = path.join(tempDir, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      const schema = createSchema([
        {
          id: 'prd',
          generates: 'prd.md',
          description: 'PRD',
          template: 'prd.md',
          requires: [],
          pev: { skill: 'product-manager', runDir: 'pm', output: 'pm/output/prd.md' },
        },
      ]);

      const results = await promotePevArtifacts({
        changeDir,
        projectRoot: tempDir,
        roundName: 'prd-2026-10-01',
        schema,
        artifactsRoot: path.join(tempDir, 'openspec', 'artifacts'),
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ status: 'promoted', iteration: 3, verdict: 'COMPLETE' });
      expect(fs.readFileSync(path.join(changeDir, 'prd.md'), 'utf8')).toBe('PRD content');

      await writePevLog(changeDir, results);
      const log = fs.readFileSync(path.join(changeDir, 'pev-log.md'), 'utf8');
      expect(log).toContain('product-manager');
      expect(log).toContain('promoted');
    });

    it('promotes a directory output recursively (module-design)', async () => {
      const roundDir = path.join(tempDir, '.pev', 'prd-2026-10-01');
      fs.mkdirSync(path.join(roundDir, 'module', 'output', 'M1'), { recursive: true });
      fs.mkdirSync(path.join(roundDir, 'module', 'output', 'M2'), { recursive: true });
      fs.writeFileSync(
        path.join(roundDir, 'module', 'state.json'),
        JSON.stringify({ status: 'COMPLETE', iteration: 2 })
      );
      fs.writeFileSync(
        path.join(roundDir, 'module', 'output', 'M1', 'module-detail.md'),
        'M1 detail'
      );
      fs.writeFileSync(
        path.join(roundDir, 'module', 'output', 'M2', 'module-brief.md'),
        'M2 brief'
      );
      const changeDir = path.join(tempDir, 'change');
      fs.mkdirSync(changeDir, { recursive: true });
      const schema = createSchema([
        {
          id: 'design-module',
          generates: 'design/modules',
          description: 'Module design',
          template: 'design.md',
          requires: [],
          pev: { skill: 'module-design', runDir: 'module', output: 'module/output' },
          promotes: 'modules',
        },
      ]);

      const results = await promotePevArtifacts({
        changeDir,
        projectRoot: tempDir,
        roundName: 'prd-2026-10-01',
        schema,
        artifactsRoot: path.join(tempDir, 'openspec', 'artifacts'),
      });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('promoted');
      expect(
        fs.readFileSync(
          path.join(changeDir, 'design', 'modules', 'M1', 'module-detail.md'),
          'utf8'
        )
      ).toBe('M1 detail');
      expect(
        fs.readFileSync(
          path.join(changeDir, 'design', 'modules', 'M2', 'module-brief.md'),
          'utf8'
        )
      ).toBe('M2 brief');
      expect(
        fs.readFileSync(
          path.join(tempDir, 'openspec', 'artifacts', 'modules', 'M1', 'module-detail.md'),
          'utf8'
        )
      ).toBe('M1 detail');
    });
  });

  describe('collectCapabilityInventory', () => {
    it('reads specs into a capability inventory', () => {
      const specsDir = path.join(tempDir, 'openspec', 'specs', 'user-auth');
      fs.mkdirSync(specsDir, { recursive: true });
      fs.writeFileSync(
        path.join(specsDir, 'spec.md'),
        [
          '# user-auth',
          '',
          '## Purpose',
          '用户登录与鉴权能力',
          '',
          '## Requirements',
          '',
          '### Requirement: 用户可登录',
          '系统 SHALL 允许登录',
        ].join('\n')
      );

      const refs = collectCapabilityInventory(path.join(tempDir, 'openspec', 'specs'));

      expect(refs).toHaveLength(1);
      expect(refs[0].path).toBe('user-auth');
      expect(refs[0].purpose).toBe('用户登录与鉴权能力');
      expect(refs[0].requirements).toEqual(['用户可登录']);
    });
  });
});
