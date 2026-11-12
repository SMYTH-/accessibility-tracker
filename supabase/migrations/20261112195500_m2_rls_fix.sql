-- Fix RLS recursion: memberships policy must not self-reference.

drop policy if exists memberships_select_own_or_same_challenge on public.challenge_memberships;
drop policy if exists challenges_select_approved_member on public.challenges;
drop policy if exists audit_select_approved_member on public.challenge_lifecycle_audit;

-- M2: members only need their own membership row (roster/sharing arrives later).
create policy memberships_select_own
  on public.challenge_memberships
  for select
  to authenticated
  using (user_id = auth.uid());

create policy challenges_select_approved_member
  on public.challenges
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.challenge_memberships m
      where m.challenge_id = challenges.id
        and m.user_id = auth.uid()
        and m.status = 'approved'
    )
  );

create policy audit_select_approved_member
  on public.challenge_lifecycle_audit
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.challenge_memberships m
      where m.challenge_id = challenge_lifecycle_audit.challenge_id
        and m.user_id = auth.uid()
        and m.status = 'approved'
    )
  );
