import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type MockUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
};

export type MockToken = {
  token: string;
  email: string;
  type: "verify" | "recovery";
  expiresAt: string;
};

type MockDb = {
  users: MockUser[];
  tokens: MockToken[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "mock-auth.json");
const PEPPER = process.env.MOCK_AUTH_PEPPER || "m1-local-dev-pepper-not-for-prod";

/** Recovery / verify tokens expire after 1 hour (AUTH-01 time-limited recovery). */
export const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashPassword(password: string): string {
  return createHmac("sha256", PEPPER).update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  const next = Buffer.from(hashPassword(password));
  const prev = Buffer.from(hash);
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

async function ensureDb(): Promise<MockDb> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(raw) as MockDb;
  } catch {
    const empty: MockDb = { users: [], tokens: [] };
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function saveDb(db: MockDb): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

function pruneExpired(db: MockDb): void {
  const now = Date.now();
  db.tokens = db.tokens.filter((t) => Date.parse(t.expiresAt) > now);
}

export async function findUserByEmail(email: string): Promise<MockUser | null> {
  const db = await ensureDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string): Promise<MockUser | null> {
  const db = await ensureDb();
  return db.users.find((u) => u.id === id) ?? null;
}

export async function createUser(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<MockUser> {
  const db = await ensureDb();
  if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("An account with this email already exists.");
  }
  const user: MockUser = {
    id: randomBytes(12).toString("hex"),
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim() || "Member",
    passwordHash: hashPassword(input.password),
    emailVerified: false,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await saveDb(db);
  return user;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<MockUser> {
  const db = await ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found.");
  user.displayName = displayName.trim() || user.displayName;
  await saveDb(db);
  return user;
}

export async function markEmailVerified(email: string): Promise<MockUser | null> {
  const db = await ensureDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;
  user.emailVerified = true;
  await saveDb(db);
  return user;
}

export async function updatePassword(email: string, password: string): Promise<void> {
  const db = await ensureDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error("User not found.");
  user.passwordHash = hashPassword(password);
  await saveDb(db);
}

export async function issueToken(email: string, type: "verify" | "recovery"): Promise<MockToken> {
  const db = await ensureDb();
  pruneExpired(db);
  db.tokens = db.tokens.filter((t) => !(t.email === email.toLowerCase() && t.type === type));
  const token: MockToken = {
    token: randomBytes(24).toString("hex"),
    email: email.toLowerCase(),
    type,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  };
  db.tokens.push(token);
  await saveDb(db);
  return token;
}

export async function consumeToken(
  token: string,
  type: "verify" | "recovery",
): Promise<MockToken | null> {
  const db = await ensureDb();
  pruneExpired(db);
  const idx = db.tokens.findIndex((t) => t.token === token && t.type === type);
  if (idx < 0) return null;
  const found = db.tokens[idx];
  if (Date.parse(found.expiresAt) <= Date.now()) {
    db.tokens.splice(idx, 1);
    await saveDb(db);
    return null;
  }
  db.tokens.splice(idx, 1);
  await saveDb(db);
  return found;
}

export async function peekLatestToken(
  email: string,
  type: "verify" | "recovery",
): Promise<MockToken | null> {
  const db = await ensureDb();
  pruneExpired(db);
  await saveDb(db);
  const matches = db.tokens.filter(
    (t) => t.email === email.toLowerCase() && t.type === type,
  );
  return matches[matches.length - 1] ?? null;
}
