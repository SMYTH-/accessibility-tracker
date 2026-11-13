/**
 * Offline M6 progress / milestone helper smoke (no DB).
 */
import assert from "node:assert/strict";

function progressPercent(saved, target) {
  if (target == null || target <= 0) return null;
  return Math.min(100, Math.floor((saved * 100) / target));
}

function milestonesReached(saved, target) {
  const pct = progressPercent(saved, target);
  if (pct == null) return [];
  const out = [];
  if (pct >= 25) out.push(25);
  if (pct >= 50) out.push(50);
  if (pct >= 75) out.push(75);
  if (pct >= 100) out.push(100);
  return out;
}

function milestoneRecognitionLabel(milestones) {
  if (!milestones.length) return null;
  const hi = milestones[milestones.length - 1];
  if (hi === 25) return "25% Quarter milestone · reached";
  if (hi === 50) return "50% Halfway milestone · reached";
  if (hi === 75) return "75% Three-quarters milestone · reached";
  if (hi === 100) return "100% Target milestone · reached";
  return null;
}

// Canonical Path A: £1,240 of £2,000 → 62%; Halfway distinct
assert.equal(progressPercent(124000, 200000), 62);
assert.deepEqual(milestonesReached(124000, 200000), [25, 50]);
assert.equal(
  milestoneRecognitionLabel(milestonesReached(124000, 200000)),
  "50% Halfway milestone · reached",
);

// Before £50: £1,190 → 59%? mid-fi says 60% — floor(1190/2000*100)=59.
// Mid-fi sample uses 60% for £1,190; we use integer floor math consistently.
assert.equal(progressPercent(119000, 200000), 59);
assert.deepEqual(milestonesReached(119000, 200000), [25, 50]);

assert.equal(progressPercent(0, 200000), 0);
assert.deepEqual(milestonesReached(0, 200000), []);
assert.equal(milestoneRecognitionLabel([]), null);

assert.equal(progressPercent(200000, 200000), 100);
assert.deepEqual(milestonesReached(200000, 200000), [25, 50, 75, 100]);

console.log("PASS  m6 progress helpers (Halfway ≠ current %)");
