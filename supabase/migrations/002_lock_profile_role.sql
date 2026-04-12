-- Migration: förhindra att en användare uppgraderar sin egen roll
--
-- Den befintliga policyn "profiles_update_own" tillåter authenticated users att
-- uppdatera hela sin profilrad utan att kontrollera vilka kolumner som ändras.
-- Det innebär att en vanlig worker-användare kan köra:
--   UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
-- och därmed få admin-behörighet i Edge Functions som bygger på profiles.role.
--
-- Åtgärd: lägg till WITH CHECK som kräver att role-värdet förblir oförändrat
-- (lika med det värde som redan finns i databasen för den här raden).

drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own" on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (
    role = (select role from public.profiles where id = auth.uid())
  );
