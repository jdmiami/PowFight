-- Close voting for a production: pick winners per role, compute prize pools, queue the render.
-- Prize math per role (per spec): every actor pays $12; house keeps $2 of each; the winner
-- receives $10 from EACH actor who entered that role, including their own $10 back.
create or replace function public.close_casting(p_production_id uuid)
returns table (character_id uuid, winner_audition_id uuid, prize_cents int)
language plpgsql security definer as $$
declare
  r record;
  v_entry int;
  v_house int;
begin
  select entry_fee_cents, house_fee_cents into v_entry, v_house from public.productions where id = p_production_id;

  update public.productions set status = 'voting_closed' where id = p_production_id and status = 'casting';

  for r in
    select a.character_id,
           (array_agg(a.id order by a.vote_count desc, a.submitted_at asc))[1] as winner_id,
           count(*)::int as entrants
    from public.auditions a
    where a.production_id = p_production_id and a.status = 'submitted'
    group by a.character_id
  loop
    prize_cents := (v_entry - v_house) * r.entrants;
    character_id := r.character_id;
    winner_audition_id := r.winner_id;

    insert into public.cast_members (production_id, character_id, actor_id, audition_id, prize_cents)
    select p_production_id, r.character_id, a.actor_id, a.id, prize_cents
    from public.auditions a where a.id = r.winner_id
    on conflict (production_id, character_id) do nothing;

    update public.auditions set status = 'won' where id = r.winner_id;
    update public.auditions set status = 'lost'
      where production_id = p_production_id and character_id = r.character_id and status = 'submitted';

    insert into public.ledger (user_id, production_id, audition_id, kind, amount_cents, memo)
    select a.actor_id, p_production_id, a.id, 'prize', prize_cents,
           format('Won %s: %s entrants x $%s', r.character_id, r.entrants, (v_entry - v_house) / 100)
    from public.auditions a where a.id = r.winner_id;

    insert into public.ledger (production_id, kind, amount_cents, memo)
    values (p_production_id, 'house_fee', v_house * r.entrants, format('House fee for role %s', r.character_id));

    return next;
  end loop;

  update public.productions set status = 'filming' where id = p_production_id;
end $$;

-- Roles nobody auditioned for still need a voice: the production owner can assign a stand-in.
create or replace function public.assign_standin(p_production_id uuid, p_character_id uuid, p_actor_id uuid)
returns void language sql security definer as $$
  insert into public.cast_members (production_id, character_id, actor_id, prize_cents)
  values (p_production_id, p_character_id, p_actor_id, 0)
  on conflict (production_id, character_id) do update set actor_id = excluded.actor_id;
$$;

-- When every dialogue line of a production has an approved performance clip, queue the stitch.
create or replace function public.try_queue_production_render(p_production_id uuid)
returns boolean language plpgsql security definer as $$
declare
  missing int;
begin
  select count(*) into missing
  from public.script_lines l
  join public.productions p on p.script_id = l.script_id
  where p.id = p_production_id and l.type = 'dialogue'
    and not exists (
      select 1 from public.clips c
      where c.production_id = p_production_id and c.line_id = l.id
        and c.purpose = 'performance' and c.moderation = 'approved'
    );
  if missing > 0 then return false; end if;
  insert into public.render_jobs (kind, production_id) values ('production', p_production_id);
  update public.productions set status = 'rendering' where id = p_production_id;
  return true;
end $$;
