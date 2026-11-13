import type { MilestonePercent } from "./types";

export function progressPercent(
  savedMinor: number,
  targetMinor: number | null | undefined,
): number | null {
  if (targetMinor == null || targetMinor <= 0) return null;
  return Math.min(100, Math.floor((savedMinor * 100) / targetMinor));
}

export function milestonesReached(
  savedMinor: number,
  targetMinor: number | null | undefined,
): MilestonePercent[] {
  const pct = progressPercent(savedMinor, targetMinor);
  if (pct == null) return [];
  const out: MilestonePercent[] = [];
  if (pct >= 25) out.push(25);
  if (pct >= 50) out.push(50);
  if (pct >= 75) out.push(75);
  if (pct >= 100) out.push(100);
  return out;
}

export function milestoneRecognitionLabel(
  milestones: MilestonePercent[],
): string | null {
  if (milestones.length === 0) return null;
  const hi = milestones[milestones.length - 1];
  if (hi === 25) return "25% Quarter milestone · reached";
  if (hi === 50) return "50% Halfway milestone · reached";
  if (hi === 75) return "75% Three-quarters milestone · reached";
  if (hi === 100) return "100% Target milestone · reached";
  return null;
}
