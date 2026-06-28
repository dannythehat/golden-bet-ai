-- ============================================================================
-- Data repair: some AI-generated blog_posts rows stored the raw LLM JSON
-- envelope { "title": "...", "excerpt": "...", "content": "..." } in the
-- title/excerpt columns instead of the parsed value. This extracts the real
-- field. Per-row exception handling so invalid/truncated JSON is skipped
-- safely (the frontend cleaner still sanitises those at render). Idempotent.
-- ============================================================================
do $$
declare
  r record;
  v jsonb;
  v_ex text;
  v_ti text;
begin
  for r in
    select id, title, excerpt
    from public.blog_posts
    where (excerpt is not null and btrim(excerpt) like '{%'
            and (excerpt like '%"excerpt"%' or excerpt like '%"title"%'))
       or (title is not null and btrim(title) like '{%'
            and (title like '%"title"%' or title like '%"excerpt"%'))
  loop
    -- Repair excerpt
    if r.excerpt is not null and btrim(r.excerpt) like '{%' then
      begin v := r.excerpt::jsonb; exception when others then v := null; end;
      if v is not null then
        v_ex := coalesce(nullif(btrim(v->>'excerpt'), ''), nullif(btrim(v->>'title'), ''));
        if v_ex is not null then
          update public.blog_posts set excerpt = v_ex where id = r.id;
        end if;
      end if;
    end if;

    -- Repair title
    if r.title is not null and btrim(r.title) like '{%' then
      begin v := r.title::jsonb; exception when others then v := null; end;
      if v is not null then
        v_ti := nullif(btrim(v->>'title'), '');
        if v_ti is not null then
          update public.blog_posts set title = v_ti where id = r.id;
        end if;
      end if;
    end if;
  end loop;
end $$;
