-- Top 9 검증 — pa_notes TEXT 가정 시 ::json
SELECT COUNT(*) AS 총_건수
FROM panama
WHERE pa_source = 'panamacompra_atc4_competitor';

SELECT
  pa_notes::json->>'self_inn_atc4' AS ATC4,
  pa_notes::json->>'self_inn_target' AS 자사_INN,
  COUNT(*) AS 매칭수,
  array_agg(DISTINCT pa_ingredient_inn) AS 경쟁품_리스트,
  ROUND(AVG((pa_price_local)::numeric), 2) AS 평균낙찰가,
  MIN((pa_price_local)::numeric) AS 최저낙찰가,
  MAX((pa_price_local)::numeric) AS 최고낙찰가
FROM panama
WHERE pa_source = 'panamacompra_atc4_competitor'
GROUP BY 1, 2
ORDER BY 매칭수 DESC;

SELECT
  pa_currency_unit,
  COUNT(*) AS 건수,
  ROUND(AVG((pa_price_local)::numeric), 2) AS 평균가
FROM panama
WHERE pa_source = 'panamacompra_atc4_competitor'
GROUP BY pa_currency_unit;

SELECT
  pa_ingredient_inn,
  pa_price_local,
  pa_currency_unit,
  pa_notes::json->>'buyer_entity' AS 구매기관,
  pa_notes::json->>'contract_date' AS 계약일,
  pa_product_name_local AS 원문
FROM panama
WHERE pa_source = 'panamacompra_atc4_competitor'
ORDER BY (pa_notes::json->>'contract_date') DESC
LIMIT 10;
