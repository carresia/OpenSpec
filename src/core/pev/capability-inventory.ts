import * as fs from 'node:fs';
import * as path from 'node:path';

export interface CapabilityRef {
  /** Capability path relative to openspec/specs/, e.g. "user-auth". */
  path: string;
  /** First line of the capability's ## Purpose section, when present. */
  purpose?: string;
  /** Requirement titles ("### Requirement: X") already covered by the capability. */
  requirements: string[];
}

function walkSpecFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkSpecFiles(full));
    else if (entry.name === 'spec.md') out.push(full);
  }
  return out;
}

function extractPurpose(text: string): string | undefined {
  const match = text.match(/^##\s+Purpose\s*\n\s*([^\n]+)/m);
  return match ? match[1].trim() : undefined;
}

function listRequirementHeadings(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const match = line.match(/^###\s+Requirement:\s*(.+)$/);
    if (match) out.push(match[1].trim());
  }
  return out;
}

/**
 * Builds the "existing capability inventory" consumed by the PRD stage (US3).
 * Every `spec.md` under `openspec/specs/` contributes its path, Purpose, and
 * requirement titles so the PRD can mark each as 复用 / 修改 / 新增.
 */
export function collectCapabilityInventory(specsDir: string): CapabilityRef[] {
  return walkSpecFiles(specsDir)
    .map((specFile) => {
      const text = fs.readFileSync(specFile, 'utf8');
      return {
        path: path.relative(specsDir, path.dirname(specFile)).split(path.sep).join('/'),
        purpose: extractPurpose(text),
        requirements: listRequirementHeadings(text),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}
