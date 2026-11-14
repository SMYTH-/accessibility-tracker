import { AppShell } from "@/components/AppShell";
import { ChallengeCreateForm } from "@/components/ChallengeCreateForm";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function NewChallengePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <AppShell
      title="Create challenge"
      subtitle="Name, schedule, currency, and time zone. Savings setup is optional later."
    >
      <ChallengeCreateForm defaultTimeZone="Europe/London" />
    </AppShell>
  );
}
