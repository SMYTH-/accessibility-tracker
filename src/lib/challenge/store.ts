import { promises as fs } from "fs";
import path from "path";
import type { ChallengeInvitation, NotificationRecord } from "@/lib/membership/types";
import type { Contribution, ContributionRevision } from "@/lib/contributions/types";
import type { SavingsSetup, SavingsSetupAuditEvent } from "@/lib/savings/types";
import type { Challenge, LifecycleAuditEvent, Membership } from "./types";
import type { ProgressMilestoneAnnouncement } from "@/lib/activity/types";

export type StoredInvitation = ChallengeInvitation & { tokenHash: string };

export type ChallengeDb = {
  challenges: Challenge[];
  memberships: Membership[];
  audit: LifecycleAuditEvent[];
  invitations: StoredInvitation[];
  notifications: NotificationRecord[];
  /** M4 mock persistence (file store; Postgres uses membership_savings_setup). */
  savingsSetups: SavingsSetup[];
  savingsAudit: SavingsSetupAuditEvent[];
  /** M5 mock persistence (file store; Postgres uses contributions). */
  contributions: Contribution[];
  contributionRevisions: ContributionRevision[];
  /** M9 retained progress milestone announcements (append-only per threshold). */
  progressMilestoneAnnouncements: ProgressMilestoneAnnouncement[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH =
  process.env.CHALLENGE_DATA_PATH?.trim() || path.join(DATA_DIR, "challenges.json");

async function ensureDb(): Promise<ChallengeDb> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as ChallengeDb;
    return {
      challenges: parsed.challenges ?? [],
      memberships: parsed.memberships ?? [],
      audit: parsed.audit ?? [],
      invitations: parsed.invitations ?? [],
      notifications: parsed.notifications ?? [],
      savingsSetups: parsed.savingsSetups ?? [],
      savingsAudit: parsed.savingsAudit ?? [],
      contributions: parsed.contributions ?? [],
      contributionRevisions: parsed.contributionRevisions ?? [],
      progressMilestoneAnnouncements: parsed.progressMilestoneAnnouncements ?? [],
    };
  } catch {
    const empty: ChallengeDb = {
      challenges: [],
      memberships: [],
      audit: [],
      invitations: [],
      notifications: [],
      savingsSetups: [],
      savingsAudit: [],
      contributions: [],
      contributionRevisions: [],
      progressMilestoneAnnouncements: [],
    };
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function saveDb(db: ChallengeDb): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

/**
 * Run a mutation against the challenge store with a simple write lock via
 * read→mutate→write. Sufficient for local single-process Next.js preview.
 */
export async function withChallengeDb<T>(
  fn: (db: ChallengeDb) => Promise<T> | T,
): Promise<T> {
  const db = await ensureDb();
  const result = await fn(db);
  await saveDb(db);
  return result;
}

export async function readChallengeDb(): Promise<ChallengeDb> {
  return ensureDb();
}
