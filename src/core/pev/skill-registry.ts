import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface DiscoveredPevSkill {
  name: string;
  skillDir: string;
}

const DEFAULT_SEARCH_DIRS = [
  path.join(os.homedir(), 'skills'),
  path.join(os.homedir(), '.claude', 'skills'),
];

/**
 * PEV skills carry a `.pev/` working-directory contract with deterministic
 * validation (`scripts/validate.py`). Its presence distinguishes PEV skills
 * from direct-write skills (api/database/c4/planning/tdd).
 */
function hasPevContract(skillDir: string): boolean {
  return fs.existsSync(path.join(skillDir, 'scripts', 'validate.py'));
}

/**
 * Discovers installed PEV skills across the known skill directories. The list
 * is never hard-coded: a newly installed PEV skill is found on the next scan,
 * so growing the family requires no glue-layer change.
 */
export function discoverPevSkills(
  dirs: string[] = DEFAULT_SEARCH_DIRS
): DiscoveredPevSkill[] {
  const found = new Map<string, DiscoveredPevSkill>();
  for (const dir of dirs) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(dir, entry.name);
      if (!fs.existsSync(path.join(skillDir, 'SKILL.md'))) continue;
      if (!hasPevContract(skillDir)) continue;
      if (!found.has(entry.name)) {
        found.set(entry.name, { name: entry.name, skillDir });
      }
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}
