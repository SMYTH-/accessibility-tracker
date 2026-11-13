import { parsePositiveMajorToMinor } from "./money";

export type ValidatedSavingsAmounts = {
  targetMinor: number;
  weeklyCommitmentMinor: number;
};

export function validateSavingsAmounts(
  targetMajor: string,
  weeklyCommitmentMajor: string,
): { ok: true; value: ValidatedSavingsAmounts } | { ok: false; error: string } {
  const target = parsePositiveMajorToMinor(targetMajor, "Personal savings target");
  if (!target.ok) return target;
  const weekly = parsePositiveMajorToMinor(
    weeklyCommitmentMajor,
    "Weekly commitment",
  );
  if (!weekly.ok) return weekly;
  return {
    ok: true,
    value: {
      targetMinor: target.minor,
      weeklyCommitmentMinor: weekly.minor,
    },
  };
}
