alter table materials enable row level security;
create policy "own materials" on materials
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table material_logs enable row level security;
create policy "own material_logs" on material_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
