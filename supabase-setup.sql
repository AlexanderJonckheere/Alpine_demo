-- run this once in your Supabase project: dashboard → SQL Editor → New query → paste → Run

-- the table: one row per submitted poster
create table if not exists public.posters (
    id         bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    name       text not null check (char_length(trim(name)) between 1 and 20),
    poster     jsonb not null check (jsonb_typeof(poster) = 'object' and pg_column_size(poster) < 4000),
    hidden     boolean not null default false
);

-- security: the key in supabase-config.js is public, so these rules decide what visitors can do
alter table public.posters enable row level security;

-- visitors can see every poster that you didn't hide
create policy "anyone can read visible posters"
    on public.posters for select
    to anon, authenticated
    using (hidden = false);

-- visitors can add a poster, but can't add it as hidden
create policy "anyone can add a poster"
    on public.posters for insert
    to anon, authenticated
    with check (hidden = false);

-- there are no update or delete rules on purpose: visitors can't change or remove anything.
-- you can, in the dashboard (Table Editor → posters → set "hidden" to true, or delete the row).

-- live updates: new posters are pushed to the gallery as soon as they're added
alter publication supabase_realtime add table public.posters;

-- the example posters, so the gallery never starts empty (only added if the table is still empty)
insert into public.posters (name, poster)
select name, poster from (values
    ('example · bauhaus', '{"title":"BAUHAUS","subtitle":"form follows function · 1919","titleSize":110,"shape":"mix","cols":4,"rows":5,"size":90,"density":85,"rotation":0,"chaos":0,"colors":["#f4efe6","#1d1d1b","#e63946","#1d3557","#f1a208"],"seed":7,"animate":false}'::jsonb),
    ('example · night dots', '{"title":"night","subtitle":"alpine.js · capita selecta","titleSize":130,"shape":"circle","cols":12,"rows":14,"size":70,"density":70,"rotation":0,"chaos":60,"colors":["#0b0c2a","#f2f2f2","#ff4d6d","#7b2cbf","#4cc9f0"],"seed":3,"animate":false}'::jsonb),
    ('example · confetti', '{"title":"party!","subtitle":"saturday 22:00 · bring friends","titleSize":120,"shape":"mix","cols":9,"rows":11,"size":45,"density":60,"rotation":30,"chaos":100,"colors":["#ffe5ec","#590d22","#ff4d6d","#ff8fa3","#c9184a"],"seed":11,"animate":false}'::jsonb),
    ('example · lines', '{"title":"flow","subtitle":"study in rotation","titleSize":140,"shape":"line","cols":14,"rows":16,"size":100,"density":100,"rotation":45,"chaos":40,"colors":["#111111","#fafafa","#fafafa","#777777","#333333"],"seed":5,"animate":false}'::jsonb),
    ('example · garden', '{"title":"garden","subtitle":"spring exhibition","titleSize":120,"shape":"triangle","cols":7,"rows":8,"size":80,"density":80,"rotation":0,"chaos":50,"colors":["#e9f5db","#132a13","#31572c","#90a955","#ecf39e"],"seed":21,"animate":false}'::jsonb)
) as examples(name, poster)
where not exists (select 1 from public.posters);
