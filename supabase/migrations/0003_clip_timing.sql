-- Capture timing from the recorder so the stitcher can trim pre/post-roll precisely.
alter table public.clips
  add column if not exists action_at_ms int,
  add column if not exists trim_start_ms int,
  add column if not exists trim_end_ms int;
