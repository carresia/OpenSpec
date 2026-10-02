import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { discoverPevSkills } from '../../../src/core/pev/skill-registry.js';

describe('discoverPevSkills', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-pev-skill-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('discovers only skills carrying the .pev contract (scripts/validate.py)', () => {
    const pev = path.join(tempDir, 'product-manager');
    fs.mkdirSync(path.join(pev, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(pev, 'SKILL.md'), '# product-manager');
    fs.writeFileSync(path.join(pev, 'scripts', 'validate.py'), '# validate');

    const plain = path.join(tempDir, 'plain-skill');
    fs.mkdirSync(plain, { recursive: true });
    fs.writeFileSync(path.join(plain, 'SKILL.md'), '# plain');

    const names = discoverPevSkills([tempDir]).map((s) => s.name);
    expect(names).toContain('product-manager');
    expect(names).not.toContain('plain-skill');
  });

  it('deduplicates a skill present in multiple search dirs', () => {
    const a = path.join(tempDir, 'a');
    const b = path.join(tempDir, 'b');
    for (const dir of [a, b]) {
      fs.mkdirSync(path.join(dir, 'shared-skill', 'scripts'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'shared-skill', 'SKILL.md'), '# shared');
      fs.writeFileSync(path.join(dir, 'shared-skill', 'scripts', 'validate.py'), '# validate');
    }

    expect(discoverPevSkills([a, b]).map((s) => s.name)).toEqual(['shared-skill']);
  });
});
