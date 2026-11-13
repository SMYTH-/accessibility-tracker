/**
 * M10 engineering rate limits (§10.4).
 * Exact product thresholds remain OPEN (Gate 1.1); these are conservative
 * implementation defaults for auth / invite / contribution / export actions.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthMode } from "@/lib/auth/config";
import { createClient } from "@/lib/auth/supabase/server";

export type RateLimitAction =
  | "auth.sign_in"
  | "auth.sign_up"
  | "auth.recovery"
  | "invite.create"
  | "membership.request"
  | "contribution.record"
  | "account.export";

export type RateLimitPolicy = {
  action: RateLimitAction;
  limit: number;
  windowSeconds: number;
};

/** Conservative defaults — not a PO product rule lock. */
export const RATE_LIMIT_POLICIES: Record<RateLimitAction, RateLimitPolicy> = {
  "auth.sign_in": { action: "auth.sign_in", limit: 20, windowSeconds: 900 },
  "auth.sign_up": { action: "auth.sign_up", limit: 10, windowSeconds: 3600 },
  "auth.recovery": { action: "auth.recovery", limit: 10, windowSeconds: 3600 },
  "invite.create": { action: "invite.create", limit: 30, windowSeconds: 3600 },
  "membership.request": {
    action: "membership.request",
    limit: 30,
    windowSeconds: 3600,
  },
  "contribution.record": {
    action: "contribution.record",
    limit: 60,
    windowSeconds: 3600,
  },
  "account.export": { action: "account.export", limit: 5, windowSeconds: 3600 },
};

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: string }
  | { allowed: false; remaining: 0; resetAt: string; error: "RATE_LIMITED" };

type MemoryBucket = { windowStartedAt: number; hitCount: number };

const memoryBuckets = new Map<string, MemoryBucket>();

function memoryConsume(
  action: string,
  subject: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const key = `${action}:${subject}`.toLowerCase();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = memoryBuckets.get(key);
  if (!existing || existing.windowStartedAt + windowMs <= now) {
    memoryBuckets.set(key, { windowStartedAt: now, hitCount: 1 });
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      resetAt: new Date(now + windowMs).toISOString(),
    };
  }
  if (existing.hitCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(existing.windowStartedAt + windowMs).toISOString(),
      error: "RATE_LIMITED",
    };
  }
  existing.hitCount += 1;
  return {
    allowed: true,
    remaining: Math.max(limit - existing.hitCount, 0),
    resetAt: new Date(existing.windowStartedAt + windowMs).toISOString(),
  };
}

async function pgConsume(
  supabase: SupabaseClient,
  action: string,
  subject: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_action: action,
    p_subject: subject,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Fail closed on unexpected RPC errors for mutating sensitive actions.
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + windowSeconds * 1000).toISOString(),
      error: "RATE_LIMITED",
    };
  }
  const row = (data ?? {}) as Record<string, unknown>;
  const allowed = Boolean(row.allowed);
  if (!allowed) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: String(row.reset_at ?? new Date().toISOString()),
      error: "RATE_LIMITED",
    };
  }
  return {
    allowed: true,
    remaining: Number(row.remaining ?? 0),
    resetAt: String(row.reset_at ?? new Date().toISOString()),
  };
}

export async function consumeRateLimit(
  action: RateLimitAction,
  subject: string,
): Promise<RateLimitResult> {
  const policy = RATE_LIMIT_POLICIES[action];
  const normalized = subject.trim().toLowerCase() || "anonymous";
  if (getAuthMode() === "supabase") {
    try {
      const supabase = await createClient();
      return pgConsume(
        supabase,
        policy.action,
        normalized,
        policy.limit,
        policy.windowSeconds,
      );
    } catch {
      return memoryConsume(
        policy.action,
        normalized,
        policy.limit,
        policy.windowSeconds,
      );
    }
  }
  return memoryConsume(
    policy.action,
    normalized,
    policy.limit,
    policy.windowSeconds,
  );
}

/** Test helper — clears in-memory buckets only. */
export function resetMemoryRateLimits(): void {
  memoryBuckets.clear();
}

export const RATE_LIMITED_MESSAGE =
  "Too many requests. Please wait a moment and try again.";
