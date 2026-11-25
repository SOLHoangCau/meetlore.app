-- MeetLore: "Nhân vật hôm nay" chuyển lên bảng để cập nhật bằng CSV, không cần phát hành lại app.
-- Tên cột trùng tiêu đề CSV mẫu (supabase/daily-figures.csv) để nhập thẳng bằng Table Editor > Import data from CSV.

create table public.daily_figures (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  date text check (date ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  name text not null check (length(trim(name)) >= 2),
  born_year int not null check (born_year between -3000 and 2100),
  born_month int check (born_month between 1 and 12),
  born_day int check (born_day between 1 and 31),
  died_year int not null,
  field text not null check (field in ('literature','philosophy','music','art','economy','astronomy','physics','chemistry','biology','medicine','math','engineering','linguistics','history','sport')),
  art text not null check (art in ('portrait','symbol')),
  image text check (image ~ '^[A-Za-z0-9._-]+\.(webp|png|jpe?g)$'),
  vi_hint text not null, vi_fact text not null, en_hint text not null, en_fact text not null,
  quote_orig text, quote_vi text, quote_en text, quote_src text,
  active boolean not null default true,
  symbol text not null default '',
  note text,
  updated_at timestamptz not null default now(),
  check (died_year >= born_year),
  check (born_day is null or born_month is not null),
  check ((quote_orig is null) = (quote_src is null))
);
-- Mỗi ngày chỉ một nhân vật đang bật.
create unique index daily_figures_one_per_day on public.daily_figures(date) where active and date is not null;
alter table public.daily_figures enable row level security;
create policy daily_figures_read_anon on public.daily_figures for select to anon using (active);
create policy daily_figures_read on public.daily_figures for select to authenticated using (active or is_admin());
create policy daily_figures_admin on public.daily_figures for all to authenticated using (is_admin()) with check (is_admin());
grant select on public.daily_figures to anon, authenticated;
grant insert, update, delete on public.daily_figures to authenticated;
grant all on public.daily_figures to service_role;

-- Nhập nhiều dòng một lần (màn hình admin). Cập nhật theo id; cả lô bị hủy nếu có dòng lỗi.
create or replace function public.import_daily_figures(p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 1000 then raise exception 'bad_rows'; end if;
  -- Tắt trước các dòng cũ đang giữ ngày mà lô mới chiếm, để đổi ngày giữa các nhân vật không vướng chỉ mục.
  update daily_figures d set active = false, updated_at = now()
   where d.active and d.date in (select r->>'date' from jsonb_array_elements(p_rows) r where coalesce((r->>'active')::boolean, true))
     and d.id not in (select r->>'id' from jsonb_array_elements(p_rows) r);
  insert into daily_figures(id, date, name, born_year, born_month, born_day, died_year, field, art, image, vi_hint, vi_fact, en_hint, en_fact,
    quote_orig, quote_vi, quote_en, quote_src, active, symbol, note)
  select r->>'id', nullif(r->>'date', ''), r->>'name', (r->>'born_year')::int, nullif(r->>'born_month', '')::int, nullif(r->>'born_day', '')::int,
    (r->>'died_year')::int, r->>'field', r->>'art', nullif(r->>'image', ''), r->>'vi_hint', r->>'vi_fact', r->>'en_hint', r->>'en_fact',
    nullif(r->>'quote_orig', ''), nullif(r->>'quote_vi', ''), nullif(r->>'quote_en', ''), nullif(r->>'quote_src', ''),
    coalesce((r->>'active')::boolean, true), coalesce(r->>'symbol', ''), nullif(r->>'note', '')
  from jsonb_array_elements(p_rows) r
  on conflict (id) do update set date = excluded.date, name = excluded.name, born_year = excluded.born_year, born_month = excluded.born_month,
    born_day = excluded.born_day, died_year = excluded.died_year, field = excluded.field, art = excluded.art, image = excluded.image,
    vi_hint = excluded.vi_hint, vi_fact = excluded.vi_fact, en_hint = excluded.en_hint, en_fact = excluded.en_fact,
    quote_orig = excluded.quote_orig, quote_vi = excluded.quote_vi, quote_en = excluded.quote_en, quote_src = excluded.quote_src,
    active = excluded.active, symbol = excluded.symbol, note = excluded.note, updated_at = now();
  get diagnostics n = row_count;
  perform audit('daily_figures.import', 'daily_figures', 'csv', jsonb_build_object('rows', n));
  return n;
end $$;
revoke execute on function public.import_daily_figures(jsonb) from public, anon;
grant execute on function public.import_daily_figures(jsonb) to authenticated;

-- Cờ bật/tắt. Mặc định tắt; admin bật từ ngày 01/12 trong Cài đặt.
insert into public.platform_flags values ('daily_figure', false, 'Nhân vật hôm nay trên màn hình Hub')
on conflict (key) do update set note = excluded.note;
create or replace function public.public_flags() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(key, enabled), '{}') from platform_flags
  where key in ('invite_required','verification_photo','verification_in_person','message_translation','points_redemption','sponsor_screen','daily_figure')
$$;

-- Đổi tên Hub theo mẫu "TriGiao Hub – <địa danh>" cho cơ sở dữ liệu đã chạy seed cũ.
update public.hub_translations t set name = v.name
from (values
  ('ho-guom','vi','TriGiao Hub – Hồ Hoàn Kiếm'), ('ho-guom','en','TriGiao Hub – Hoan Kiem Lake'),
  ('van-mieu','vi','TriGiao Hub – Văn Miếu Quốc Tử Giám'), ('van-mieu','en','TriGiao Hub – Van Mieu Quoc Tu Giam'),
  ('sa-pa','vi','TriGiao Hub – Trung tâm Sa Pa'), ('sa-pa','en','TriGiao Hub – Sa Pa Center'),
  ('cat-cat','vi','TriGiao Hub – Cát Cát'), ('cat-cat','en','TriGiao Hub – Cat Cat'),
  ('ta-van','vi','TriGiao Hub – Tả Van'), ('ta-van','en','TriGiao Hub – Ta Van')
) as v(slug, locale, name), public.hubs h
where h.slug = v.slug and t.hub_id = h.id and t.locale = v.locale;
