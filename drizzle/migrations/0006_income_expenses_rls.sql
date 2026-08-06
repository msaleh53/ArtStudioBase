alter table income enable row level security;
create policy "own income" on income
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table expenses enable row level security;
create policy "own expenses" on expenses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
