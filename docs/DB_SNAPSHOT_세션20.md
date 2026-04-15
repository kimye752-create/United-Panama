# United Panama DB 스냅샷 — 세션 20 진입

생성 시각: 2026-04-15 09:40:06 KST  
작성자: Cursor (Claude 요청)

실행: Supabase MCP `execute_sql`로 아래 쿼리를 순서대로 실행. 쿼리 9는 `panama` 테이블에 `pa_metric_name` 컬럼이 없어, 동일 목적(거시·MACRO 행의 세분 구분)에 가까운 `market_segment`를 `array_agg`로 대체 실행함.

---

## 쿼리 1: 전체 테이블 목록

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 결과

| table_name |
|------------|
| panama |
| panama_backup_session13 |
| panama_distributors |
| panama_eml |
| panama_perplexity_cache |
| panama_report_cache |

---

## 쿼리 2: panama 테이블 전체 컬럼 스펙

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'panama'
ORDER BY ordinal_position;
```

### 결과

| column_name | data_type | is_nullable | column_default |
|-------------|-----------|---------------|----------------|
| id | uuid | NO | gen_random_uuid() |
| product_id | uuid | NO | null |
| market_segment | text | NO | null |
| fob_estimated_usd | numeric | YES | null |
| confidence | numeric | NO | null |
| crawled_at | timestamp with time zone | NO | now() |
| pa_source | text | YES | null |
| pa_source_type | text | YES | null |
| pa_source_url | text | YES | null |
| pa_collected_at | text | YES | null |
| pa_product_name_local | text | YES | null |
| pa_ingredient_inn | text | YES | null |
| pa_price_type | text | YES | null |
| pa_price_local | numeric | YES | null |
| pa_currency_unit | text | YES | 'USD'::text |
| pa_package_unit | text | YES | null |
| pa_decree_listed | boolean | YES | null |
| pa_stock_status | text | YES | null |
| pa_notes | text | YES | null |
| pa_milestone_type | text | YES | null |
| pa_released_at | text | YES | null |
| pa_refresh_cycle | text | YES | null |
| pa_item_collected_at | timestamp with time zone | YES | null |
| pa_freshness_status | text | YES | null |
| pa_freshness_checked_at | timestamp with time zone | YES | null |

---

## 쿼리 3: panama 외 모든 테이블의 컬럼 스펙

```sql
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name != 'panama'
ORDER BY table_name, ordinal_position;
```

### 결과

#### panama_backup_session13

| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id | uuid | YES |
| product_id | uuid | YES |
| market_segment | text | YES |
| fob_estimated_usd | numeric | YES |
| confidence | numeric | YES |
| crawled_at | timestamp with time zone | YES |
| pa_source | text | YES |
| pa_source_type | text | YES |
| pa_source_url | text | YES |
| pa_collected_at | text | YES |
| pa_product_name_local | text | YES |
| pa_ingredient_inn | text | YES |
| pa_price_type | text | YES |
| pa_price_local | numeric | YES |
| pa_currency_unit | text | YES |
| pa_package_unit | text | YES |
| pa_decree_listed | boolean | YES |
| pa_stock_status | text | YES |
| pa_notes | text | YES |

#### panama_distributors

| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id | uuid | NO |
| company_name | text | NO |
| company_name_local | text | YES |
| focus_area | text | YES |
| target_market | text | YES |
| estimated_revenue_usd | numeric | YES |
| has_gmp_certification | boolean | YES |
| has_mah_capability | boolean | YES |
| product_lines | text | YES |
| korean_partnership_history | boolean | YES |
| source | text | NO |
| source_url | text | YES |
| source_quote | text | YES |
| confidence | numeric | NO |
| collected_at | timestamp with time zone | NO |
| ahp_psi_score | numeric | YES |
| ahp_rank | integer | YES |

#### panama_eml

| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id | uuid | NO |
| product_id | uuid | NO |
| market_segment | text | NO |
| fob_estimated_usd | numeric | YES |
| confidence | numeric | NO |
| crawled_at | timestamp with time zone | NO |
| pa_inn_name | text | NO |
| pa_eml_listed | boolean | YES |
| pa_paho_procurable | boolean | YES |
| pa_minsa_essential | boolean | YES |
| pa_atc_code | text | YES |
| pa_therapeutic_class | text | YES |
| pa_notes | text | YES |
| pa_source_url | text | YES |
| pa_raw_data | jsonb | YES |

#### panama_perplexity_cache

| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id | uuid | NO |
| inn_target | text | NO |
| papers | jsonb | NO |
| generated_at | timestamp with time zone | YES |
| expires_at | timestamp with time zone | NO |

#### panama_report_cache

| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id | uuid | NO |
| product_id | uuid | NO |
| case_grade | text | NO |
| report_payload | jsonb | NO |
| llm_model | text | NO |
| generated_at | timestamp with time zone | NO |
| expires_at | timestamp with time zone | NO |

---

## 쿼리 4: 현재 사용 중인 product_id UUID 전체 목록 + 각 UUID별 건수

```sql
SELECT 
  product_id,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT pa_source) AS source_count,
  MIN(crawled_at) AS first_seen,
  MAX(crawled_at) AS last_seen
FROM panama
GROUP BY product_id
ORDER BY total_rows DESC;
```

### 결과

| product_id | total_rows | source_count | first_seen | last_seen |
|------------|------------|--------------|------------|-----------|
| ba6cf610-9d7c-4fb9-9506-eabd7a5457b8 | 35 | 15 | 2024-06-15 12:00:00+00 | 2026-04-15 00:19:48.338+00 |
| fcae4399-aa80-4318-ad55-89d6401c10a9 | 4 | 3 | 2026-04-11 20:32:14.506+00 | 2026-04-14 16:28:13.36+00 |
| 014fd4d2-dc66-4fc1-8d4f-59695183387f | 3 | 2 | 2026-04-11 20:32:14.506+00 | 2026-04-14 16:28:13.36+00 |
| 2504d79b-c2ce-4660-9ea7-5576c8bb755f | 3 | 2 | 2026-04-11 20:32:14.506+00 | 2026-04-14 16:28:13.36+00 |
| 895f49ae-6ce3-44a3-93bd-bb77e027ba59 | 2 | 1 | 2026-04-11 20:32:14.506+00 | 2026-04-12 00:34:39.275027+00 |
| 859e60f9-8544-43b3-a6a0-f6c7529847eb | 2 | 1 | 2026-04-11 20:32:14.506+00 | 2026-04-12 00:31:15.968001+00 |
| bdfc9883-6040-438a-8e7a-df01f1230682 | 2 | 1 | 2026-04-11 20:32:14.506+00 | 2026-04-12 00:31:15.968001+00 |
| f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18 | 2 | 1 | 2026-04-11 20:32:14.506+00 | 2026-04-12 00:34:39.275027+00 |
| 24738c3b-3a5b-40a9-9e8e-889ec075b453 | 2 | 1 | 2026-04-11 20:32:14.506+00 | 2026-04-12 00:34:39.275027+00 |

---

## 쿼리 5: 각 UUID가 실제로 어떤 제품인지 식별 가능한 컬럼 샘플

```sql
SELECT 
  product_id,
  pa_ingredient_inn,
  pa_product_name_local,
  pa_source,
  COUNT(*) AS cnt
FROM panama
WHERE product_id != 'ba6cf610-9d7c-4fb9-9506-eabd7a5457b8'
GROUP BY product_id, pa_ingredient_inn, pa_product_name_local, pa_source
ORDER BY product_id, cnt DESC;
```

### 결과

| product_id | pa_ingredient_inn | pa_product_name_local | pa_source | cnt |
|------------|---------------------|------------------------|-----------|-----|
| 014fd4d2-dc66-4fc1-8d4f-59695183387f | BECLOMETASONA | BECLOMETASONA DIPROPIONATO 50 mcg/inhalación... | acodeco_cabamed_competitor | 1 |
| 014fd4d2-dc66-4fc1-8d4f-59695183387f | Erdosteine | null | gemini_seed | 1 |
| 014fd4d2-dc66-4fc1-8d4f-59695183387f | Erdosteina | Dostein 300mg (Techsphere) | gemini_seed | 1 |
| 24738c3b-3a5b-40a9-9e8e-889ec075b453 | Itopride | null | gemini_seed | 1 |
| 24738c3b-3a5b-40a9-9e8e-889ec075b453 | Itoprida | Talnesis 50mg (Senosiain) | gemini_seed | 1 |
| 2504d79b-c2ce-4660-9ea7-5576c8bb755f | Aceclofenac | null | gemini_seed | 1 |
| 2504d79b-c2ce-4660-9ea7-5576c8bb755f | Aceclofenaco | Ainedix Aceclofenaco 100mg (Galenica) | gemini_seed | 1 |
| 2504d79b-c2ce-4660-9ea7-5576c8bb755f | SIMVASTATINA | SIMVASTATINA 20  mg cápsula o comprimido (*) | acodeco_cabamed_competitor | 1 |
| 859e60f9-8544-43b3-a6a0-f6c7529847eb | Rabeprazole | null | gemini_seed | 1 |
| 859e60f9-8544-43b3-a6a0-f6c7529847eb | Rabeprazole | Rabeprazol 20mg (Lafrancol/Abbott) | gemini_seed | 1 |
| 895f49ae-6ce3-44a3-93bd-bb77e027ba59 | Levodropropizine | null | gemini_seed | 1 |
| 895f49ae-6ce3-44a3-93bd-bb77e027ba59 | Levodropropizina | Levodropropizina Niños 30mg/5ml MK (Tecnoquimicas) | gemini_seed | 1 |
| bdfc9883-6040-438a-8e7a-df01f1230682 | Hydroxyurea | null | gemini_seed | 1 |
| bdfc9883-6040-438a-8e7a-df01f1230682 | Hydroxyurea | Hidroxiurea 500mg | gemini_seed | 1 |
| f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18 | Omega-3-acid ethyl esters | null | gemini_seed | 1 |
| f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18 | Ésteres etílicos omega-3 | Omacor 1000mg (Ferrer) | gemini_seed | 1 |
| fcae4399-aa80-4318-ad55-89d6401c10a9 | CLOPIDOGREL | CLOPIDOGREL 75 MG COMPRIMIDOS (*) | acodeco_cabamed_competitor | 1 |
| fcae4399-aa80-4318-ad55-89d6401c10a9 | Cilostazol | Cilostazol 100mg (Genfar) | gemini_seed | 1 |
| fcae4399-aa80-4318-ad55-89d6401c10a9 | Cilostazol | null | gemini_seed | 1 |
| fcae4399-aa80-4318-ad55-89d6401c10a9 | Cilostazol + Rosuvastatin | ROSUVASTATINA 10 MG Tabletas (*) | acodeco_cabamed_self | 1 |

---

## 쿼리 6: pa_source 전체 목록 + 건수

```sql
SELECT pa_source, COUNT(*) AS cnt
FROM panama
GROUP BY pa_source
ORDER BY cnt DESC;
```

### 결과

| pa_source | cnt |
|-----------|-----|
| gemini_seed | 29 |
| acodeco_cabamed_competitor | 3 |
| acodeco | 2 |
| exchange_rate_exim | 2 |
| ita | 2 |
| kotra | 2 |
| motie | 2 |
| pubmed | 2 |
| who_paho | 2 |
| worldbank | 2 |
| currency_peg_meta | 1 |
| dnfd_procedure_meta | 1 |
| kotra_2026 | 1 |
| acodeco_cabamed_self | 1 |
| iqvia_sandoz_2024 | 1 |
| minsa_official | 1 |
| worldbank_who_ghed | 1 |

---

## 쿼리 7: 자사 제품 고유 특성 컬럼이 별도 테이블인지 탐색

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%product%' OR table_name LIKE '%catalog%' OR table_name LIKE '%master%' OR table_name LIKE '%kup%' OR table_name LIKE '%united%');
```

### 결과

| table_name |
|------------|
| panama_backup_session13 |

### 해석 (중요)

- 테이블명 `LIKE '%kup%'` 조건은 **`backup` 단어 안의 부분문자열 `kup`(k-u-p)에 매칭**되어 `panama_backup_session13`만 걸린 것으로 보임. (`%product%` 등과 무관하게 `backup` → `kup` 매칭)
- DB에 별도 `product_catalog` / `united_*` 마스터 테이블은 **스키마 상 보이지 않음**. 제품 정의는 코드(`src/utils/product-dictionary.ts`)와 `panama.product_id`·`panama_eml` 등에 분산.

### 보조: 동일 DB 내 `product_id` 컬럼 보유 테이블 행 수 (세션20 추가 측정)

| 테이블 | 행 수 |
|--------|-------|
| panama_eml | 48 |
| panama_report_cache | 1 |
| panama_distributors | 12 |
| panama_perplexity_cache | 13 |

---

## 쿼리 8: 쿼리 7에서 발견된 테이블 전체 덤프

쿼리 7에서 매칭된 테이블: `panama_backup_session13` (35행).

```sql
SELECT * FROM panama_backup_session13 ORDER BY product_id, crawled_at;
```

### 결과

전체 35행 JSON (컬럼 다수·노트 장문 포함). 구조 파악용으로 원본 배열을 그대로 보관:

```json
[
  {"id":"542bd989-f93c-46ce-901f-3d67178f997d","product_id":"014fd4d2-dc66-4fc1-8d4f-59695183387f","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.850","crawled_at":"2026-04-11 20:32:14.506+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":null,"pa_collected_at":null,"pa_product_name_local":null,"pa_ingredient_inn":"Erdosteine","pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"prevalence: COPD / 만성 호흡기 질환 | 만성 호흡기 질환 사망률 인구 10만 명당 17.5명 | source: WHO Global Health Estimates Panama 2019 | panama_specific: true"},
  {"id":"cb639b4e-05c0-43a9-8def-4e1880436c48","product_id":"014fd4d2-dc66-4fc1-8d4f-59695183387f","market_segment":"private","fob_estimated_usd":null,"confidence":"0.850","crawled_at":"2026-04-12 00:34:39.275027+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://inkafarma.pe/producto/dostein-300mg-capsula/030506","pa_collected_at":"2024-04-01","pa_product_name_local":"Dostein 300mg (Techsphere)","pa_ingredient_inn":"Erdosteina","pa_price_type":"retail_normal","pa_price_local":"0.6900","pa_currency_unit":"USD","pa_package_unit":"1 cap","pa_decree_listed":false,"pa_stock_status":"unknown","pa_notes":"COMPETITOR | source_tier=erp_fallback | Peru Inkafarma, 20cap 52 PEN, 1USD=3.75 PEN | round6"},
  {"id":"e32af297-b715-497d-a558-d696b5dd3be7","product_id":"24738c3b-3a5b-40a9-9e8e-889ec075b453","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.700","crawled_at":"2026-04-11 20:32:14.506+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":null,"pa_collected_at":null,"pa_product_name_local":null,"pa_ingredient_inn":"Itopride","pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"prevalence: 기능성 소화불량 | 유병률 약 10% (중남미 평균) | source: Rome Foundation Global Epidemiology Study (Sperber et al. 2020) | panama_specific: false"},
  {"id":"b3465a62-45a7-43bb-b580-813d44a6f084","product_id":"24738c3b-3a5b-40a9-9e8e-889ec075b453","market_segment":"private","fob_estimated_usd":null,"confidence":"0.800","crawled_at":"2026-04-12 00:34:39.275027+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.rappi.com.mx/p/talnesis-30-tabletas-50-mg-82597","pa_collected_at":"2024-04-01","pa_product_name_local":"Talnesis 50mg (Senosiain)","pa_ingredient_inn":"Itoprida","pa_price_type":"retail_normal","pa_price_local":"0.7100","pa_currency_unit":"USD","pa_package_unit":"1 tab","pa_decree_listed":false,"pa_stock_status":"unknown","pa_notes":"COMPETITOR | source_tier=erp_fallback | Mexico Farmacias Guadalajara, 30tab 417 MXN, 1USD=19.5 MXN | round6"},
  {"id":"901e377d-f922-4d3e-988c-4d2e41c5ae67","product_id":"2504d79b-c2ce-4660-9ea7-5576c8bb755f","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.700","crawled_at":"2026-04-11 20:32:14.506+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":null,"pa_collected_at":null,"pa_product_name_local":null,"pa_ingredient_inn":"Aceclofenac","pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"prevalence: 골관절염 / 근골격계 질환 | 유병률 약 10.5% (중남미 평균) | source: PAHO / GBD Database 2019 | panama_specific: false"},
  {"id":"52663b47-7b11-43ca-b574-e1e5a79a4c0e","product_id":"2504d79b-c2ce-4660-9ea7-5576c8bb755f","market_segment":"private","fob_estimated_usd":null,"confidence":"0.800","crawled_at":"2026-04-12 00:34:39.275027+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://drogueriaxuasha.com/es/productos/ainedix-aceclofenaco-100-mg","pa_collected_at":"2024-04-01","pa_product_name_local":"Ainedix Aceclofenaco 100mg (Galenica)","pa_ingredient_inn":"Aceclofenaco","pa_price_type":"retail_normal","pa_price_local":"0.4000","pa_currency_unit":"USD","pa_package_unit":"1 tab","pa_decree_listed":false,"pa_stock_status":"unknown","pa_notes":"COMPETITOR | source_tier=erp_fallback | Colombia retail, 10tab 16000 COP, 1USD=4000 COP | round6"},
  {"id":"aeefc858-d3de-42e8-9329-1ef1586977b1","product_id":"859e60f9-8544-43b3-a6a0-f6c7529847eb","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.850","crawled_at":"2026-04-11 20:32:14.506+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":null,"pa_collected_at":null,"pa_product_name_local":null,"pa_ingredient_inn":"Rabeprazole","pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"prevalence: 소화성 궤양 / H. pylori 감염 | 위궤양 환자 60~70% H. pylori 감염 | source: Gorgas Memorial Institute / MINSA 2021 | panama_specific: true"},
  {"id":"a97ab550-10fa-49ea-83a6-f9938ec3ba75","product_id":"859e60f9-8544-43b3-a6a0-f6c7529847eb","market_segment":"private","fob_estimated_usd":null,"confidence":"0.750","crawled_at":"2026-04-12 00:31:15.968001+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.colombiacompra.gov.co/secop","pa_collected_at":"2024-06-30","pa_product_name_local":"Rabeprazol 20mg (Lafrancol/Abbott)","pa_ingredient_inn":"Rabeprazole","pa_price_type":"wholesale","pa_price_local":"0.1000","pa_currency_unit":"USD","pa_package_unit":"1 tab","pa_decree_listed":false,"pa_stock_status":"unknown","pa_notes":"COMPETITOR | source_tier=erp_fallback | Lafrancol(Abbott) Colombia, WHO 2015 ERP 방법론 | round5"},
  {"id":"f3bc50ac-07cc-4d9c-b474-31d6df4d9ee4","product_id":"895f49ae-6ce3-44a3-93bd-bb77e027ba59","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.900","crawled_at":"2026-04-11 20:32:14.506+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":null,"pa_collected_at":null,"pa_product_name_local":null,"pa_ingredient_inn":"Levodropropizine","pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"prevalence: 급성 호흡기 감염 | 연간 120만 건 이상 (전체 인구 약 26%) | source: MINSA Boletín Epidemiológico 2022 | panama_specific: true"},
  {"id":"f474a484-fb94-48d3-af67-9a3f66bd5387","product_id":"895f49ae-6ce3-44a3-93bd-bb77e027ba59","market_segment":"private","fob_estimated_usd":null,"confidence":"0.800","crawled_at":"2026-04-12 00:34:39.275027+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.cruzverde.com.co/levodropropizina-ninos-30mg5ml0.6-jbe-frasco-x-120mljerin-dosif-mk-uva/COCV_546958.html","pa_collected_at":"2024-04-01","pa_product_name_local":"Levodropropizina Niños 30mg/5ml MK (Tecnoquimicas)","pa_ingredient_inn":"Levodropropizina","pa_price_type":"retail_normal","pa_price_local":"0.1100","pa_currency_unit":"USD","pa_package_unit":"1 ml","pa_decree_listed":false,"pa_stock_status":"unknown","pa_notes":"COMPETITOR | source_tier=erp_fallback | Colombia Cruz Verde, 120ml 51650 COP, 6mg/ml, 1USD=4000 COP | round6"},
  {"id":"ed6891fb-6c6b-4315-997f-b35cf83b3176","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.900","crawled_at":"2026-04-10 15:35:00+00","pa_source":"ita","pa_source_type":null,"pa_source_url":"https://www.trade.gov/country-commercial-guides/panama-healthcare","pa_collected_at":"2026-04-10T15:35:00Z","pa_product_name_local":"ITA Country Commercial Guide","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"As Covid-19 declines, Panama plans to implement preventive measures, including vaccination campaigns... The health market is expected to grow at a rate of 10% over the next three years.\\n\\nCancer Treatment medicines. Chemotherapy drugs are in high demand in Panama due to the high number of cancer cases.\\n\\nThe public sector is the primary end-user of medical equipment, composed of the Social Security Fund (CSS) and the Ministry of Health (MINSA)."},
  {"id":"b39abf21-fd72-4c7d-b195-77eadbc09276","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.850","crawled_at":"2026-04-10 15:40:00+00","pa_source":"kotra","pa_source_type":null,"pa_source_url":"https://www.kotra.or.kr/bigdata/visualization/country/PA","pa_collected_at":"2026-04-10T15:40:00Z","pa_product_name_local":"KOTRA 해외시장뉴스","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"작은 시장 규모로 인해 대량 주문 방식이 드물며, 흔히 국내기업 브랜드 및 포장에 번역 라벨을 붙여 수입함.\\n\\n우리나라 제조 의약품 절차 간소화로 의약품 진입장벽 하락. * '23.6.28부 파나마 보건부 지정 '위생 선진국(Países de Alto Estándar)' 명단에 대한민국 포함.\\n\\n유망 품목 : 소매용 의약품(HS코드 3004). * 기타 비타민 등 함유 의약품(3004.50), 기타 소매용의약품(3004.90)."},
  {"id":"25b1ef1d-f515-4f04-9bef-6a283e63bbdf","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.900","crawled_at":"2026-04-10 15:45:00+00","pa_source":"motie","pa_source_type":null,"pa_source_url":"https://www.motie.go.kr","pa_collected_at":"2026-04-10T15:45:00Z","pa_product_name_local":"한국 산업통상자원부 (MOTIE)","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"※ 한-중미 FTA : 2018.2월 한-중미 5개국(엘살바도르, 니카라과, 코스타리카, 온두라스, 파나마)간 체결... 파나마 발효일 2021-03-01\\n\\n정부는 △한-중미 FTA 체결 및 중미경제통합은행(CABEI) 가입, △코로나19 보건·방역 협력... 의약품 조달 참여 전략 등을 제안하였습니다."},
  {"id":"c9798eaa-d8df-417f-9a28-00f503d15df9","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.800","crawled_at":"2026-04-10 15:50:00+00","pa_source":"pubmed","pa_source_type":null,"pa_source_url":"https://pubmed.ncbi.nlm.nih.gov","pa_collected_at":"2026-04-10T15:50:00Z","pa_product_name_local":"PubMed (NCBI)","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"Panama, like most Latin American countries, has insufficient regulatory safeguards to ensure the safety and efficacy of all pharmaceutical products in the market...\\n\\nThe results showed that the productivity growth of hospitals belonging to the SSF has been much higher than that of the hospitals belonging to the Ministry of Health..."},
  {"id":"26ad7e6d-9f7b-480b-a13b-d9f0d9a7c508","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.900","crawled_at":"2026-04-10 15:55:00+00","pa_source":"acodeco","pa_source_type":null,"pa_source_url":"https://www.acodeco.gob.pa","pa_collected_at":"2026-04-10T15:55:00Z","pa_product_name_local":"ACODECO (파나마 소비자보호청)","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"CABAMED-Resol. No. 774 de 7 de octubre de 2019. Fuente: Departamento de Investigación.\\n\\nFalta al Decreto Ejecutivo 114 de 2020 sobre el margen de comercialización de venta de productos de aseo, limpieza y consumo establecimiento."},
  {"id":"8bbb1fec-26a7-4700-9123-8c26583ac34a","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.920","crawled_at":"2026-04-10 16:00:00+00","pa_source":"who_paho","pa_source_type":null,"pa_source_url":"https://www.paho.org","pa_collected_at":"2026-04-10T16:00:00Z","pa_product_name_local":"WHO + PAHO","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"Because of the Fund's effectiveness in facilitating enhanced supply chain management of critical public health supplies, we have signed participating agreements with 34 countries and territories...\\n\\nThe Strategic Fund is a regional technical cooperation mechanism for the pooled procurement of essential medicines and strategic health supplies."},
  {"id":"cb3f3acc-155e-4b86-a54d-fdd74a4b457d","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.propanama.gob.pa/wp-content/uploads/2024/04/HUB-FARMA.pdf","pa_collected_at":null,"pa_product_name_local":"Medipan","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·competitors]\\n\\ntype: Local manufacturer\\n\\nsource_quote: • Medipan."},
  {"id":"39085878-34d3-4767-9d31-ef7c69474171","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":null,"pa_collected_at":null,"pa_product_name_local":"round3/pricing_data: Cilostazol, Itoprida, Aceclofenaco, Rabeprazol, Erdosteina","pa_ingredient_inn":"Cilostazol, Itoprida, Aceclofenaco, Rabeprazol, Erdosteina","pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·pricing_data]\\n\\nsource_quote: datos no encontrados"},
  {"id":"755214cb-a792-46af-8ccd-93ad30d1e631","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.merco.info/pa/ranking-merco-empresas","pa_collected_at":null,"pa_product_name_local":"Clínica Hospital San Fernando","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·infrastructure]\\n\\naffiliation: Privado\\n\\nfocus: Atención general\\n\\nsource_quote: CLÍNICA HOSPITAL SAN FERNANDO"},
  {"id":"9808691d-f46c-42a8-ac3f-1e5f2c2c1c3a","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://storymaps.arcgis.com/stories/eada014b04f94ce7b323132b83c5fe59","pa_collected_at":null,"pa_product_name_local":"Hospital Nacional","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·infrastructure]\\n\\naffiliation: Privado\\n\\nfocus: Oncología, cardiología, neurología\\n\\nsource_quote: HOSPITAL NACIONAL PRIVADO... Especialidades: Oncología..."},
  {"id":"192843e1-e564-4561-80fd-507a77813180","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://storymaps.arcgis.com/stories/eada014b04f94ce7b323132b83c5fe59","pa_collected_at":null,"pa_product_name_local":"Hospital del Niño","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·infrastructure]\\n\\naffiliation: Público (MINSA)\\n\\nfocus: Pediatría, cirugía oncológica pediátrica\\n\\nsource_quote: El hospital del niño ofrece una amplia gama de especialidades pediátricas, que incluyen:... Cirugía oncológica."},
  {"id":"76f8b0a1-e10d-4c7d-9a54-cb138ccdd626","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://storymaps.arcgis.com/stories/eada014b04f94ce7b323132b83c5fe59","pa_collected_at":null,"pa_product_name_local":"Instituto Oncológico Nacional Dr. Juan Demóstenes Arosemena (ION)","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·infrastructure]\\n\\naffiliation: Público (MINSA)\\n\\nfocus: Centro Nacional de Cáncer (Oncología médica, radioterápica, quirúrgica)\\n\\nsource_quote: El Instituto Oncológico Nacional... es un hospital público ubicado en la ciudad de Panamá... ofrece una amplia gama de especialidades oncológicas"},
  {"id":"2e1e7aa6-89a8-4cef-8100-29a02d44d50b","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.propanama.gob.pa/wp-content/uploads/2024/04/HUB-FARMA.pdf","pa_collected_at":null,"pa_product_name_local":"GSK","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·competitors]\\n\\ntype: Multinational importer / Local plant\\n\\nsource_quote: GSK has a plant in Panama that has been in operation for six decades"},
  {"id":"92471130-7921-4c20-85af-3bf9f20ab332","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.propanama.gob.pa/wp-content/uploads/2024/04/HUB-FARMA.pdf","pa_collected_at":null,"pa_product_name_local":"Rigar Laboratories, DMD","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·competitors]\\n\\ntype: Local manufacturer\\n\\nsource_quote: • Rigar Laboratories, DMD."},
  {"id":"1eee4747-32c7-4ed0-87a5-61b0dddcc942","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":null,"pa_collected_at":null,"pa_product_name_local":"round3/epidemiology: Hiperlipidemia (Colesterol alto)","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·epidemiology]\\n\\nprevalence: datos no encontrados\\n\\nsource_quote: datos no encontrados"},
  {"id":"ace49cc2-e35d-4f35-827b-186a74bd2511","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.gorgas.gob.pa/wp-content/uploads/external/SIGCANCER/documentos/Informe_CancerGastrico.pdf","pa_collected_at":null,"pa_product_name_local":"round3/epidemiology: Cáncer Gástrico","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·epidemiology]\\n\\nprevalence: Tasa de incidencia ajustada de 8.69 casos por 100,000 habitantes. Tasa de mortalidad ajustada de 7.02 defunciones por 100,000 habitantes.\\n\\nsource_quote: Tasas de incidencia y mortalidad ajustadas de 8.69 casos y 7.02 defunciones por 100 000 habitantes, respectivamente."},
  {"id":"60002e67-84e9-49c5-b0db-d3b00b47989a","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.worldlifeexpectancy.com/es/panama-peptic-ulcer-disease","pa_collected_at":null,"pa_product_name_local":"round3/epidemiology: Úlcera Péptica/Gástrica","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·epidemiology]\\n\\nprevalence: Se observa colonización gástrica por H. Pylori en el 60-70% de las úlceras gástricas. Mortalidad anual reciente registrada: 30 defunciones (0.17% del total nacional).\\n\\nsource_quote: Las muertes causadas por Úlcera péptica en Panamá han llegado a 30 (0,17% de todas las muertes)."},
  {"id":"1ac8b17c-03c4-4f13-b93f-56260b844578","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.820","crawled_at":"2026-04-11 16:11:24.489+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.saludyfarmacos.org/lang/es/boletin-farmacos/boletines/may202503/22_pa","pa_collected_at":null,"pa_product_name_local":"round3/regulatory: Dirección Nacional de Farmacia y Drogas (MINSA)","pa_ingredient_inn":null,"pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"[round3·regulatory_costs]\\n\\nregulatory_body: Dirección Nacional de Farmacia y Drogas (MINSA)\\n\\nhigh_standard_recognition: Decreto establece simplificación del registro sanitario y procedimiento abreviado para países de alto estándar (incluyendo Corea del Sur).\\n\\nadministrative_costs_usd: new_registry_reference_drug=500, free_sale_certificate=200, renewal_innovator_biologics=750\\n\\ntimeline_months: Aproximadamente 0.5 a 1 mes (Respuesta inicial en 10 días hábiles; corrección de observaciones en 5 días hábiles; asignación de registro en máximo 10 días hábiles posteriores al pago).\\n\\nsource_quote: Respuesta de la Dirección Nacional de Farmacia y Drogas: 10 días hábiles... Certificado de Medicamento de Referencia o Intercambiable (Primera Vez) B/. 500.00"},
  {"id":"e269c861-fde7-4ed9-9ece-87e335ce14fc","product_id":"ba6cf610-9d7c-4fb9-9506-eabd7a5457b8","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.900","crawled_at":"2026-04-11 20:32:14.506+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":null,"pa_collected_at":null,"pa_product_name_local":null,"pa_ingredient_inn":"MACRO_HEALTHCARE_INFRA","pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"prevalence: 파나마 국가 의료 인프라 | 총인구 4,515,577명 · 1인당 보건지출 $1,547 · CSS 사회보장 가입률 70% | source: World Bank 2024 + KOTRA 파나마 무역관 2024 | panama_specific: true"},
  {"id":"0bc4b349-459f-436f-b5ff-1e3848c04188","product_id":"bdfc9883-6040-438a-8e7a-df01f1230682","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.850","crawled_at":"2026-04-11 20:32:14.506+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":null,"pa_collected_at":null,"pa_product_name_local":null,"pa_ingredient_inn":"Hydroxyurea","pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"prevalence: 백혈병 / 혈액암 | 연간 신규 발병률 인구 10만 명당 4.3명 | source: GLOBOCAN Panama 2022 | panama_specific: true"},
  {"id":"d53f0305-d961-411b-b198-bd17d7ebbf91","product_id":"bdfc9883-6040-438a-8e7a-df01f1230682","market_segment":"public","fob_estimated_usd":null,"confidence":"0.900","crawled_at":"2026-04-12 00:31:15.968001+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.paho.org/en/paho-strategic-fund","pa_collected_at":"2023-12-31","pa_product_name_local":"Hidroxiurea 500mg","pa_ingredient_inn":"Hydroxyurea","pa_price_type":"regulated","pa_price_local":"0.1880","pa_currency_unit":"USD","pa_package_unit":"1 cap","pa_decree_listed":false,"pa_stock_status":"unknown","pa_notes":"COMPETITOR | source_tier=paho_regional | PAHO Strategic Fund 2023 공시가 | round5"},
  {"id":"35e13863-35b2-4627-9dc5-68e7f589ab5a","product_id":"f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.850","crawled_at":"2026-04-11 20:32:14.506+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":null,"pa_collected_at":null,"pa_product_name_local":null,"pa_ingredient_inn":"Omega-3-acid ethyl esters","pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"prevalence: 이상지질혈증 / 고중성지방혈증 | 성인 35~40% 이상지질혈증 보유 | source: MINSA Estudio PREFREC / PAHO Cardiovascular Risk Factors 2019 | panama_specific: true"},
  {"id":"970fa39a-e0fb-490b-bdeb-7407d815f1b8","product_id":"f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18","market_segment":"private","fob_estimated_usd":null,"confidence":"0.850","crawled_at":"2026-04-12 00:34:39.275027+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.farmaciasguadalajara.com/vitaminas-y-suplementos-/multivitaminas/omacor-1000-mg--28-capsulas.-1121731.html","pa_collected_at":"2024-04-01","pa_product_name_local":"Omacor 1000mg (Ferrer)","pa_ingredient_inn":"Ésteres etílicos omega-3","pa_price_type":"retail_normal","pa_price_local":"1.1600","pa_currency_unit":"USD","pa_package_unit":"1 cap","pa_decree_listed":false,"pa_stock_status":"unknown","pa_notes":"COMPETITOR | source_tier=erp_fallback | Mexico Farmacias Guadalajara, 28cap 631.79 MXN, 1USD=19.5 MXN | round6"},
  {"id":"45b0dd73-11c4-41a4-b5de-058beb2ab83a","product_id":"fcae4399-aa80-4318-ad55-89d6401c10a9","market_segment":"macro","fob_estimated_usd":null,"confidence":"0.850","crawled_at":"2026-04-11 20:32:14.506+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":null,"pa_collected_at":null,"pa_product_name_local":null,"pa_ingredient_inn":"Cilostazol","pa_price_type":null,"pa_price_local":null,"pa_currency_unit":"USD","pa_package_unit":null,"pa_decree_listed":null,"pa_stock_status":null,"pa_notes":"prevalence: 뇌졸중 / 심혈관 질환 | 뇌졸중 사망률 인구 10만 명당 32.8명 | source: PAHO Health in the Americas Panama Profile 2019 | panama_specific: true"},
  {"id":"15f62c3c-dfa7-41c7-96bc-9ac05b6cd453","product_id":"fcae4399-aa80-4318-ad55-89d6401c10a9","market_segment":"private","fob_estimated_usd":null,"confidence":"0.750","crawled_at":"2026-04-12 00:31:15.968001+00","pa_source":"gemini_seed","pa_source_type":null,"pa_source_url":"https://www.colombiacompra.gov.co/secop","pa_collected_at":"2024-06-30","pa_product_name_local":"Cilostazol 100mg (Genfar)","pa_ingredient_inn":"Cilostazol","pa_price_type":"wholesale","pa_price_local":"0.1200","pa_currency_unit":"USD","pa_package_unit":"1 tab","pa_decree_listed":false,"pa_stock_status":"unknown","pa_notes":"COMPETITOR | source_tier=erp_fallback | Genfar Colombia, WHO 2015 ERP 방법론 | round5"}
]
```

---

## 쿼리 9: 거시 데이터(MACRO_PRODUCT_ID) 컬럼 사용 현황

원본 의도 SQL은 `pa_metric_name`을 사용했으나, **`panama` 테이블에 `pa_metric_name` 컬럼 없음**(쿼리 2 참고). 아래는 동일 `product_id`(MACRO)에 대해 `pa_source`별 건수와 `market_segment` 분포를 본 대체 쿼리.

```sql
SELECT 
  pa_source,
  COUNT(*) AS cnt,
  array_agg(DISTINCT market_segment) AS market_segments
FROM panama
WHERE product_id = 'ba6cf610-9d7c-4fb9-9506-eabd7a5457b8'
GROUP BY pa_source
ORDER BY cnt DESC;
```

### 결과

| pa_source | cnt | market_segments |
|-----------|-----|-----------------|
| gemini_seed | 13 | {macro} |
| acodeco | 2 | {macro} |
| ita | 2 | {macro} |
| kotra | 2 | {macro} |
| motie | 2 | {macro} |
| pubmed | 2 | {macro} |
| who_paho | 2 | {macro} |
| worldbank | 2 | {macro} |
| exchange_rate_exim | 2 | {macro} |
| dnfd_procedure_meta | 1 | {regulatory_milestone} |
| kotra_2026 | 1 | {regulatory_milestone} |
| currency_peg_meta | 1 | {macro} |
| iqvia_sandoz_2024 | 1 | {macro} |
| minsa_official | 1 | {regulatory_milestone} |
| worldbank_who_ghed | 1 | {macro} |

---

## 쿼리 10: crawled_at 기준 최근 7일 적재 추이

```sql
SELECT 
  DATE(crawled_at) AS day,
  COUNT(*) AS inserts
FROM panama
WHERE crawled_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(crawled_at)
ORDER BY day DESC;
```

### 결과

| day | inserts |
|-----|---------|
| 2026-04-15 | 1 |
| 2026-04-14 | 5 |
| 2026-04-13 | 2 |
| 2026-04-12 | 10 |
| 2026-04-11 | 21 |
| 2026-04-10 | 15 |

---

## 쿼리 11: `src/utils/product-dictionary.ts` 파일 전체

터미널 `type src\utils\product-dictionary.ts` 대응: 워크스페이스 파일 원문.

```typescript
/**
 * D2 작업 — product_id UUID 정책 확정
 * 세션 19 긴급 수정 (2026-04-14):
 * 기존 8개 제품 정보가 실제 유나이티드 제품 포트폴리오와 불일치
 * 발견되어 전면 교체. UUID는 그대로 재사용.
 * 근거: 유나이티드_8개제품_분석.docx
 */

export interface ProductMaster {
  product_id: string;
  kr_brand_name: string;
  who_inn_en: string;
  atc4_code: string;
  secondary_atc4?: string;
  is_combination_drug?: boolean;
  hs_code: string;
  therapeutic_area: string;
  formulation: string;
  patent_tech?: string;
  panama_target: boolean;
  panama_search_keywords: string[];
}

export const MACRO_PRODUCT_ID = "ba6cf610-9d7c-4fb9-9506-eabd7a5457b8" as const;

export const TARGET_PRODUCTS: readonly ProductMaster[] = [
  {
    product_id: "bdfc9883-6040-438a-8e7a-df01f1230682",
    kr_brand_name: "Hydrine",
    who_inn_en: "Hydroxyurea",
    atc4_code: "L01XX",
    hs_code: "3004.90.1000",
    therapeutic_area: "종양학 (항암)",
    formulation: "Cap.",
    panama_target: false,
    panama_search_keywords: [
      "Hidroxiurea",
      "Hidroxicarbamida",
      "Hydroxyurea",
      "Hydrea",
      "Siklos",
      "Droxia",
      "Onco-Carbide",
      "Idrossiurea",
      "Imatinib",
      "Busulfan",
      "Cytarabine",
    ],
  },
  {
    product_id: "fcae4399-aa80-4318-ad55-89d6401c10a9",
    kr_brand_name: "Ciloduo",
    who_inn_en: "Cilostazol + Rosuvastatin",
    atc4_code: "B01AC",
    secondary_atc4: "C10AA",
    is_combination_drug: true,
    hs_code: "3004.90",
    therapeutic_area: "순환기 (항혈전+고지혈증)",
    formulation: "Tab.",
    panama_target: false,
    panama_search_keywords: [
      "Cilostazol",
      "Rosuvastatina",
      "Rosuvastatin",
      "Atorvastatina",
      "Simvastatina",
      "Clopidogrel",
      "Acetilsalicilico",
      "Pletal",
      "Pletaal",
      "Cilostan",
      "Vasocil",
      "Plavix",
      "Brilinta",
      "Crestor",
      "Rovas",
      "Roxaten",
    ],
  },
  {
    product_id: "24738c3b-3a5b-40a9-9e8e-889ec075b453",
    kr_brand_name: "Gastiin CR",
    who_inn_en: "Mosapride Citrate",
    atc4_code: "A03FA",
    hs_code: "3004.90",
    therapeutic_area: "소화기 (기능성 소화불량)",
    formulation: "Tab. CR (BILDAS)",
    patent_tech: "BILDAS (Controlled Release)",
    panama_target: false,
    panama_search_keywords: [
      "Mosaprida",
      "Mosapride",
      "Itoprida",
      "Domperidona",
      "Metoclopramida",
      "Gasmotin",
      "Levosulpiride",
      "Dislep",
      "Trimebutina",
      "Debridat",
      "Cinitapride",
      "Blaston",
      "Endial",
    ],
  },
  {
    product_id: "2504d79b-c2ce-4660-9ea7-5576c8bb755f",
    kr_brand_name: "Rosumeg Combigel",
    who_inn_en: "Rosuvastatin + Omega-3-acid ethyl esters",
    atc4_code: "C10AA",
    secondary_atc4: "C10AX",
    is_combination_drug: true,
    hs_code: "3004.90",
    therapeutic_area: "순환기 (고지혈증)",
    formulation: "Soft Cap.",
    patent_tech: "CombiGel",
    panama_target: true,
    panama_search_keywords: [
      "Rosuvastatina",
      "Rosuvastatin",
      "Atorvastatina",
      "Atorvastatin",
      "Simvastatina",
      "Simvastatin",
      "Lovastatina",
      "Pravastatina",
      "Omega 3",
      "Omega-3",
      "Ésteres etílicos",
      "Rosuzet",
      "Rosumax Plus",
      "Rosulip Plus",
      "Lipitor",
      "Crestor",
      "Zocor",
      "Omacor",
      "Lovaza",
      "Vascepa",
      "Zetia",
      "Ezetrol",
      "Zient",
      "Lipox",
      "Cardio-Aspirina",
    ],
  },
  {
    product_id: "859e60f9-8544-43b3-a6a0-f6c7529847eb",
    kr_brand_name: "Atmeg Combigel",
    who_inn_en: "Atorvastatin + Omega-3-acid ethyl esters",
    atc4_code: "C10AA",
    secondary_atc4: "C10AX",
    is_combination_drug: true,
    hs_code: "3004.90",
    therapeutic_area: "순환기 (고지혈증)",
    formulation: "Soft Cap.",
    patent_tech: "CombiGel",
    panama_target: false,
    panama_search_keywords: [
      "Atorvastatina",
      "Atorvastatin",
      "Rosuvastatina",
      "Simvastatina",
      "Omega 3",
      "Omega-3",
      "Lipitor",
      "Atorvas",
      "Atormax",
      "Lipox",
      "Torvast",
      "Omacor",
      "Vascepa",
    ],
  },
  {
    product_id: "014fd4d2-dc66-4fc1-8d4f-59695183387f",
    kr_brand_name: "Sereterol Activair",
    who_inn_en: "Salmeterol + Fluticasone",
    atc4_code: "R03AK",
    is_combination_drug: true,
    hs_code: "3004.90",
    therapeutic_area: "호흡기 (천식/COPD)",
    formulation: "Inhaler DPI",
    patent_tech: "Activair DPI",
    panama_target: false,
    panama_search_keywords: [
      "Salmeterol",
      "Fluticasona",
      "Fluticasone",
      "Budesonida",
      "Formoterol",
      "Beclometasona",
      "Mometasona",
      "Seretide",
      "Advair",
      "Symbicort",
      "Foster",
      "Relvar",
      "Breo Ellipta",
      "Seroflo",
      "Fluticort",
      "Spiriva",
      "Trelegy",
    ],
  },
  {
    product_id: "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18",
    kr_brand_name: "Omethyl Cutielet",
    who_inn_en: "Omega-3-acid ethyl esters",
    atc4_code: "C10AX",
    hs_code: "3004.90",
    therapeutic_area: "순환기 (고중성지방)",
    formulation: "Pouch (Seamless)",
    patent_tech: "Seamless Pouch",
    panama_target: true,
    panama_search_keywords: [
      "Omega 3",
      "Omega-3",
      "Ésteres etílicos",
      "Omacor",
      "Lovaza",
      "Vascepa",
      "Vazkepa",
      "Lipanthyl",
      "Tricor",
      "Fenofibrato",
      "Lopid",
      "Gemfibrozilo",
      "Niaspan",
      "Niacina",
    ],
  },
  {
    product_id: "895f49ae-6ce3-44a3-93bd-bb77e027ba59",
    kr_brand_name: "Gadvoa Inj.",
    who_inn_en: "Gadobutrol",
    atc4_code: "V08CA",
    hs_code: "3006.30",
    therapeutic_area: "영상진단 (MRI 조영)",
    formulation: "PFS 주사",
    panama_target: false,
    panama_search_keywords: [
      "Gadobutrol",
      "Gadolinio",
      "Gadoteridol",
      "Gadopentetato",
      "medio de contraste",
      "Gadovist",
      "Gadavist",
      "ProHance",
      "Dotarem",
      "Clariscan",
      "Gadoterate",
      "Magnevist",
      "Omniscan",
      "Gadodiamida",
      "Gadoversetamide",
      "OptiMARK",
    ],
  },
] as const;

export function findProductByInn(inn: string): ProductMaster | undefined {
  const normalized = inn.toLowerCase();
  return TARGET_PRODUCTS.find(
    (p) => p.who_inn_en.toLowerCase() === normalized,
  );
}

export function findProductById(id: string): ProductMaster | undefined {
  return TARGET_PRODUCTS.find((p) => p.product_id === id);
}

export function findProductByKeyword(keyword: string): ProductMaster | undefined {
  const normalized = keyword.toLowerCase();
  return TARGET_PRODUCTS.find((p) =>
    p.panama_search_keywords.some((k) => k.toLowerCase() === normalized),
  );
}

export function findProductByPanamaText(blob: string): ProductMaster | undefined {
  const lower = blob.trim().toLowerCase();
  if (lower === "") {
    return undefined;
  }
  for (const product of TARGET_PRODUCTS) {
    for (const keyword of product.panama_search_keywords) {
      if (lower.includes(keyword.trim().toLowerCase())) {
        return product;
      }
    }
  }
  for (const product of TARGET_PRODUCTS) {
    const inn = product.who_inn_en.trim().toLowerCase();
    if (inn !== "" && lower.includes(inn)) {
      return product;
    }
  }
  return undefined;
}

export function getPanamaTargetProducts(): ProductMaster[] {
  return TARGET_PRODUCTS.filter((p) => p.panama_target);
}
```

---

## 쿼리 12: 핸드오프 18번 md / `docs/handoffs` 확인

- `docs/handoffs` 폴더: **존재하나 비어 있음** (파일 0개).
- 프로젝트 루트에 `핸드오프_세션17.md`, `핸드오프_세션19.md` 등은 있으나 **`핸드오프_세션18.md` 파일 없음** (세션18 전용 핸드오프 미작성·미보관으로 추정).
- 요청하신 “최신 2개 파일 `type` 출력”은 **대상 파일이 `docs/handoffs`에 없어 생략**. 루트의 `핸드오프_세션19.md` 등이 필요하면 별도 지정 요청.

---

## 한 줄 요약 (Claude 설계용)

- **`panama`가 사실상 모든 시계열·소스 타입을 흡수하는 wide 테이블**이며, 거시(MACRO UUID)·품목별 UUID·경쟁품/가격·규제 메타가 한 테이블에 공존한다. **제품 마스터 전용 테이블은 DB에 없고**, UUID↔브랜드/INN 매핑은 **`product-dictionary.ts` + `panama_eml`(INN/ATC 보조)** 조합으로 보면 된다.
