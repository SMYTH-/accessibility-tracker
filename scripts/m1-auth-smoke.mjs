import {
  createUser,
  issueToken,
  consumeToken,
  markEmailVerified,
  findUserByEmail,
  verifyPassword,
  updatePassword,
} from "../src/lib/auth/mock/store.ts";

async function main() {
  const email = `m1.demo.${Date.now()}@example.com`;
  const pass = "TestPass123!";

  const user = await createUser({ email, password: pass, displayName: "M1 Demo" });
  console.log("created", user.email, "verified", user.emailVerified);

  const v = await issueToken(email, "verify");
  const consumed = await consumeToken(v.token, "verify");
  console.log("verify token ok", Boolean(consumed));
  await markEmailVerified(email);
  const after = await findUserByEmail(email);
  console.log("verified", after?.emailVerified);

  console.log("good login", verifyPassword(pass, after.passwordHash));
  console.log("bad login", verifyPassword("wrong-pass", after.passwordHash));

  const r = await issueToken(email, "recovery");
  console.log("bad recovery", await consumeToken("deadbeef", "recovery"));
  console.log("good recovery", Boolean(await consumeToken(r.token, "recovery")));
  await updatePassword(email, "NewPass123!");
  const again = await findUserByEmail(email);
  console.log("new pass works", verifyPassword("NewPass123!", again.passwordHash));
  console.log("old pass fails", verifyPassword(pass, again.passwordHash));

  const t2 = await issueToken(email, "verify");
  console.log("token ttl future", Date.parse(t2.expiresAt) > Date.now());
  console.log("FLOW_OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
