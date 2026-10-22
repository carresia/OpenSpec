import * as path from 'node:path';
import { z } from 'zod';

/** Per-change workflow state file: the single source of active/skipped stages. */
export const WORKFLOW_STATE_FILENAME = '.openspec-workflow.json';

function relativePathSchema(fieldName: string) {
  return z
    .string()
    .min(1, { error: `${fieldName} is required` })
    .superRefine((value, ctx) => {
      const segments = value.split(/[\\/]+/u);
      const isDrivePath = /^[A-Za-z]:/u.test(value);
      const isAbsolute =
        path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || isDrivePath;
      const escapes = segments.includes('..');

      if (isAbsolute || escapes || value.includes('\0')) {
        ctx.addIssue({
          code: 'custom',
          message: `${fieldName} must be a relative path inside the change directory`,
        });
      }
    });
}

/** One skipped stage: the decision record that justifies zero output. */
const SkipEntrySchema = z
  .object({
    reason: z.string().min(1, { error: 'reason is required' }),
    evidence: z
      .array(z.string().min(1))
      .min(1, { error: 'evidence must list at least one item' }),
    decidedBy: z.string().min(1, { error: 'decidedBy is required' }),
  })
  .strict();

/**
 * One human-confirmed workflow upgrade event. W0.5 validates structure only
 * (required fields present, evidence non-empty); ID membership and date
 * semantics are W3's upgrade-command territory.
 */
const UpgradeEventSchema = z
  .object({
    date: z.string().min(1, { error: 'date is required' }),
    reason: z.string().min(1, { error: 'reason is required' }),
    evidence: z
      .array(z.string().min(1))
      .min(1, { error: 'evidence must list at least one item' }),
    decidedBy: z.string().min(1, { error: 'decidedBy is required' }),
    added: z.array(z.string().min(1)).min(1, { error: 'added must list at least one stage' }),
    reopens: z.array(z.string().min(1)),
    explore: z.string().optional(),
  })
  .strict();

const WorkflowEntrySchema = z
  .object({
    requirement: relativePathSchema('entry.requirement'),
    exploration: relativePathSchema('entry.exploration').optional(),
  })
  .strict();

/**
 * The whole state file. `.strict()` with no defaults: every key is required
 * and unknown keys are rejected, so a state written by a future version fails
 * loudly here instead of half-applying.
 */
export const WorkflowStateSchema = z
  .object({
    version: z.literal(1, { error: 'version must be 1' }),
    entry: WorkflowEntrySchema,
    active: z.array(z.string().min(1)),
    skipped: z.record(z.string(), SkipEntrySchema),
    upgrades: z.array(UpgradeEventSchema),
  })
  .strict();

export type WorkflowSkipEntry = z.infer<typeof SkipEntrySchema>;
export type WorkflowUpgradeEvent = z.infer<typeof UpgradeEventSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
