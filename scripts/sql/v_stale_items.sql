-- 세션 23: 신선도 재수집 대상 VIEW
-- 목적: stale_likely/stale_confirmed 행을 소스별 리프레시 러너로 매핑

create or replace view public.v_stale_items as
select
  p.id,
  p.product_id,
  p.pa_source,
  p.market_segment,
  p.pa_refresh_cycle,
  p.pa_item_collected_at,
  p.crawled_at,
  p.pa_freshness_status,
  case
    when p.pa_source = 'datos_gov_co' then 'datos_gov_co'
    when p.pa_source = 'superxtra_vtex' then 'superxtra_vtex'
    when p.pa_source in ('acodeco_cabamed_self', 'acodeco_cabamed_competitor') then 'pa_acodeco_cabamed'
    else null
  end as refresh_runner_key,
  floor(extract(epoch from (now() - coalesce(p.pa_item_collected_at, p.crawled_at))) / 86400)::int as days_since_collected
from public.panama p
where p.pa_freshness_status in ('stale_likely', 'stale_confirmed')
  and p.pa_source in (
    'datos_gov_co',
    'superxtra_vtex',
    'acodeco_cabamed_self',
    'acodeco_cabamed_competitor'
  );
