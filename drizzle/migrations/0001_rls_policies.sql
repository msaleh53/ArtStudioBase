alter table artworks enable row level security;
create policy "own artworks" on artworks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table customers enable row level security;
create policy "own customers" on customers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table commissions enable row level security;
create policy "own commissions" on commissions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table exhibitions enable row level security;
create policy "own exhibitions" on exhibitions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table print_editions enable row level security;
create policy "own print editions" on print_editions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- exhibition_artworks has no user_id column of its own; ownership is
-- derived from the exhibition it belongs to.
alter table exhibition_artworks enable row level security;
create policy "own exhibition artworks" on exhibition_artworks
  for all using (
    exists (select 1 from exhibitions e where e.id = exhibition_id and e.user_id = auth.uid())
  ) with check (
    exists (select 1 from exhibitions e where e.id = exhibition_id and e.user_id = auth.uid())
  );
