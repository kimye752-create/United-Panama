# panama 테이블 `pa_source` 인벤토리 (신선도 사전조사)

- **DB 스냅샷 기준**: Supabase `public.panama` 직접 조회 (세션 조사 시점).
- **집계 SQL (Step 1)**:

```sql
SELECT pa_source, COUNT(*) AS 건수,
  MIN(crawled_at) AS 최초_수집, MAX(crawled_at) AS 최근_수집
FROM panama GROUP BY pa_source ORDER BY pa_source;
```

- **샘플 SQL (Step 2)**: `DISTINCT ON (pa_source) … ORDER BY pa_source, crawled_at DESC` — 소스별 **가장 최근 1건**이 대표 샘플임.
- **`pa_notes` 키 추출 (Step 3)**: `pa_notes`가 `{` 로 시작하는 JSON 행에 한해 `jsonb_object_keys(pa_notes::jsonb)` 적용함. 그 외는 **평문·파이프 구분 텍스트**로 별도 기술함.

---

## 1. 요약: `pa_source` 종류 수 및 건수

| 항목 | 값 |
|------|-----|
| **`pa_source` 종류 수** | **17** |
| **총 행 수** | **75** |

| pa_source | 건수 | 최초 수집 (UTC) | 최근 수집 (UTC) |
|-----------|------|-----------------|------------------|
| `acodeco` | 2 | 2026-04-10 15:55:00 | 동일 |
| `acodeco_cabamed_competitor` | 8 | 2026-04-14 01:00:57 | 동일 |
| `currency_peg_meta` | 1 | 2026-04-13 14:52:51 | 동일 |
| `dnfd_procedure_meta` | 1 | 2026-04-13 11:14:18 | 동일 |
| `gemini_prevalence` | 9 | 2026-04-13 04:40:36 | 동일 |
| `gemini_seed` | 29 | 2026-04-11 16:11:24 | 2026-04-12 00:34:39 |
| `iqvia_sandoz_2024` | 1 | 2024-06-15 12:00:00 | 동일 |
| `ita` | 2 | 2026-04-10 15:35:00 | 동일 |
| `kotra` | 2 | 2026-04-10 15:40:00 | 동일 |
| `kotra_2026` | 1 | 2026-04-12 09:47:31 | 동일 |
| `minsa_official` | 1 | 2026-04-12 09:47:31 | 동일 |
| `motie` | 2 | 2026-04-10 15:45:00 | 동일 |
| `panamacompra_atc4_competitor` | 8 | 2026-04-14 03:42:38 | 동일 |
| `pubmed` | 2 | 2026-04-10 15:50:00 | 동일 |
| `who_paho` | 2 | 2026-04-10 16:00:00 | 동일 |
| `worldbank` | 2 | 2026-04-10 15:30:00 | 동일 |
| `worldbank_who_ghed` | 1 | 2026-04-10 15:30:00 | 동일 |

---

## 2. 소스별 상세 (대표 1건·의미·`pa_notes`·URL)

아래 **대표 데이터**는 Step 2 쿼리 결과(소스별 최신 1건)를 요약한 것임.

### `acodeco`

| 항목 | 내용 |
|------|------|
| 건수 | 2 |
| 대표 데이터 (한 줄) | 기관 메타: ACODECO(파나마 소비자보호청) 설명·법령 인용 텍스트, 가격 수치 없음. |
| 데이터 의미 추정 | ACODECO 공식 사이트·CABAMED 제도 관련 **기관·규정 맥락** 시드(거시/제도). |
| pa_notes 주요 키 | **JSON 아님** — 스페인어 장문 평문(결의·행정명령 인용). |
| 원본 출처 URL | `https://www.acodeco.gob.pa` (`pa_source_url`) |

### `acodeco_cabamed_competitor`

| 항목 | 내용 |
|------|------|
| 건수 | 8 |
| 대표 데이터 (한 줄) | DICLOFENAC 경쟁품, 민간 약국 평균가 0.29 USD/단위, `retail_average_published`, ATC4 매칭 메타 포함. |
| 데이터 의미 추정 | **ACODECO CABAMED XLSX** 기반 민간 약국 **참조 평균가**(자사 INN과 ATC4 동급 경쟁품). |
| pa_notes 주요 키 (JSON) | `price_unit`, `price_unit_detail`, `usage_purpose`, `self_inn_strategy`, `item_no`, `descripcion_full`, `precio_referencia_*`, `precio_generico_*`, `data_nature`, `not_government_procurement`, `legal_basis`, `publication_month`, `competitor_inn`, `self_inn_target`, `self_inn_atc4`, `match_type` 등 |
| 원본 출처 URL | `https://www.acodeco.gob.pa/inicio/wp-content/uploads/` (`pa_source_url`, 월별 XLSX 경로와 결합) |

### `currency_peg_meta`

| 항목 | 내용 |
|------|------|
| 건수 | 1 |
| 대표 데이터 (한 줄) | Panama USD/PAB 1:1 페그 메타, 환율 리스크 0 등 정책 요약. |
| 데이터 의미 추정 | **통화 제도·페그** 고정 메타(분석 시 USD 단일 환산 전제). |
| pa_notes 주요 키 (JSON) | `country`, `currency_official`, `currency_circulating`, `exchange_rate_policy`, `peg_since`, `peg_legal_basis`, `fx_risk_level`, `kr_business_implication`, `source_primary`, `source_secondary`, `data_freshness`, `confidence` |
| 원본 출처 URL | `https://www.banconal.com.pa` (`pa_source_url`) |

### `dnfd_procedure_meta`

| 항목 | 내용 |
|------|------|
| 건수 | 1 |
| 대표 데이터 (한 줄) | DNFD WLA 패스트트랙 5단계 절차·기간·인용문·출처 목록이 중첩 JSON으로 저장됨. |
| 데이터 의미 추정 | **위생등록·규제 절차** 구조화 시드(보고서·발표용). |
| pa_notes 주요 키 (JSON) | 최상위: `metadata`, `procedure_steps`, `total_duration_weeks`, `total_duration_label`, `key_message_for_report`, `differentiator_climate_zone`, `inn_specific_requirements`, `presentation_quotes`, `sources` (하위에 `metadata.title`, `procedure_steps[].title_kr` 등 다층 구조) |
| 원본 출처 URL | `https://tramites-minsa.panamadigital.gob.pa/` (`pa_source_url`) |

### `gemini_prevalence`

| 항목 | 내용 |
|------|------|
| 건수 | 9 |
| 대표 데이터 (한 줄) | INN별 유병률 문구(예: Cilostazol, `prevalence:` 로 시작하는 한 줄 + 논문·scope). |
| 데이터 의미 추정 | **유병률·역학** 보조 텍스트(Gemini 생성 경로, **실측 논문 URL과 대조 필요**). |
| pa_notes 주요 키 | **JSON 아님** — `prevalence:` 프리픽스 단문. |
| 원본 출처 URL | 샘플: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8166356/` (`pa_source_url`) |

### `gemini_seed`

| 항목 | 내용 |
|------|------|
| 건수 | 29 |
| 대표 데이터 (한 줄) | Levodropropizina 소아 시럽, 가격 0.11 USD, `COMPETITOR \| source_tier=erp_fallback \| Colombia Cruz Verde…` 형태. |
| 데이터 의미 추정 | 초기 시드·경쟁사 가격 **추정/폴백** 혼합(콜롬비아 소매 등, **검증 필수**). |
| pa_notes 주요 키 | **JSON 아님** — `COMPETITOR \| source_tier=… \| round6` 파이프 구분 텍스트. |
| 원본 출처 URL | 샘플: `https://www.cruzverde.com.co/...` (`pa_source_url`, 인접국 소매) |

### `iqvia_sandoz_2024`

| 항목 | 내용 |
|------|------|
| 건수 | 1 |
| 대표 데이터 (한 줄) | IQVIA/Sandoz 브리프 인용, 파나마 소매 YoY 3.4% 등 거시 수치. |
| 데이터 의미 추정 | **시장 성장률** 제3자 브리프(발표 자료 PDF 기반). |
| pa_notes 주요 키 | **JSON 아님** — 한글 설명 + KOTRA 수치 병기 안내. |
| 원본 출처 URL | `https://eventos-cr.com/sandoz/2024/.../javier-villacorta.pdf` (`pa_source_url`) |

### `ita`

| 건수 | 2 |
| 대표 데이터 (한 줄) | ITA Country Commercial Guide 인용 — 보건 시장 성장·암 치료 수요·공공 구매 주체(CSS/MINSA). |
| 데이터 의미 추정 | **미국 상무부 국가 가이드** 기반 거시·시장 설명. |
| pa_notes 주요 키 | **JSON 아님** — 영문 인용 단락. |
| 원본 출처 URL | `https://www.trade.gov/country-commercial-guides/panama-healthcare` |

### `kotra`

| 항목 | 내용 |
|------|------|
| 건수 | 2 |
| 대표 데이터 (한 줄) | KOTRA 해외시장뉴스 인용 — 수입 방식·WLA 고위생국·HS 3004 유망 품목. |
| 데이터 의미 추정 | **KOTRA 무역·시장 뉴스** 텍스트 시드. |
| pa_notes 주요 키 | **JSON 아님** — 한글 인용. |
| 원본 출처 URL | `https://www.kotra.or.kr/bigdata/visualization/country/PA` |

### `kotra_2026`

| 항목 | 내용 |
|------|------|
| 건수 | 1 |
| 대표 데이터 (한 줄) | 2024년 의약품 가격 제도 도입·브랜드 진입 등 규제 마일스톤 요약(p.33 인용). |
| 데이터 의미 추정 | **KOTRA 2026 전략 보고서** 기반 규제·정책 한 줄. |
| pa_notes 주요 키 | **JSON 아님** — 한글 단문. |
| 원본 출처 URL | `https://dream.kotra.or.kr/` |

### `minsa_official`

| 항목 | 내용 |
|------|------|
| 건수 | 1 |
| 대표 데이터 (한 줄) | 한국 고위생국 지정(2023.6.28)·등록 기간 단축 등 MINSA 성격 문구. |
| 데이터 의미 추정 | **MINSA 공식 정책** 요약(규제 마일스톤). |
| pa_notes 주요 키 | **JSON 아님** — 한글 단문. |
| 원본 출처 URL | `https://www.minsa.gob.pa/` |

### `motie`

| 항목 | 내용 |
|------|------|
| 건수 | 2 |
| 대표 데이터 (한 줄) | 한-중미 FTA·발효일·CABEI 등 산업통상 자료 인용. |
| 데이터 의미 추정 | **MOTIE FTA·통상** 메타. |
| pa_notes 주요 키 | **JSON 아님** — 한글 인용. |
| 원본 출처 URL | `https://www.motie.go.kr` |

### `panamacompra_atc4_competitor`

| 항목 | 내용 |
|------|------|
| 건수 | 8 |
| 대표 데이터 (한 줄) | Ambroxol 시럽 공공 낙찰 63 PAB, OCDS release id·구매자·수량·ATC4 경쟁품 매칭. |
| 데이터 의미 추정 | **PanamaCompra OCDS** 공공조달 **낙찰 실거래**(ATC4 동급 경쟁품). |
| pa_notes 주요 키 (JSON) | `ocds_release_id`, `buyer_entity`, `supplier_name`, `contract_date`, `quantity_awarded`, `competitor_inn`, `self_inn_target`, `self_inn_atc4`, `match_type`, `data_nature`, `is_government_procurement`, `usage_purpose`, `self_inn_strategy` |
| 원본 출처 URL | `https://www.panamacompra.gob.pa/Inicio/#/solicitud-de-cotizacion/...` (`pa_source_url`, 해시 라우트) |

### `pubmed`

| 항목 | 내용 |
|------|------|
| 건수 | 2 |
| 대표 데이터 (한 줄) | PubMed 초록 인용 — 규제·병원 생산성 등 학술 문헌 스니펫. |
| 데이터 의미 추정 | **NCBI 문헌** 기반 정성 인사이트. |
| pa_notes 주요 키 | **JSON 아님** — 영문 인용. |
| 원본 출처 URL | `https://pubmed.ncbi.nlm.nih.gov` |

### `who_paho`

| 항목 | 내용 |
|------|------|
| 건수 | 2 |
| 대표 데이터 (한 줄) | PAHO Strategic Fund·지역 조달 협력 문구 인용. |
| 데이터 의미 추정 | **WHO/PAHO** 공공보건·조달 맥락. |
| pa_notes 주요 키 | **JSON 아님** — 영문 인용. |
| 원본 출처 URL | `https://www.paho.org` |

### `worldbank`

| 항목 | 내용 |
|------|------|
| 건수 | 2 |
| 대표 데이터 (한 줄) | World Bank 지표 — 총인구 4,515,577(2024) 등. |
| 데이터 의미 추정 | **세계은행 개발지표**(인구 등 거시). |
| pa_notes 주요 키 | **JSON 아님** — 지표명·수치·출처 설명. |
| 원본 출처 URL | `https://data.worldbank.org/indicator/SP.POP.TOTL?locations=PA` |

### `worldbank_who_ghed`

| 항목 | 내용 |
|------|------|
| 건수 | 1 |
| 대표 데이터 (한 줄) | 1인당 보건지출 1,557.81 USD(2023) 등 GHED 연계 지표. |
| 데이터 의미 추정 | **World Bank / WHO GHED** 보건지출 **연간 공식치**. |
| pa_notes 주요 키 | **JSON 아님** — 지표·연도·출처 설명. |
| 원본 출처 URL | `https://data.worldbank.org/indicator/SH.XPD.CHEX.PC.CD?locations=PA` |

---

## 3. `pa_notes` 구조 요약

| 유형 | pa_source | 비고 |
|------|-----------|------|
| **중첩 JSON** | `acodeco_cabamed_competitor`, `currency_peg_meta`, `dnfd_procedure_meta`, `panamacompra_atc4_competitor` | 키 목록은 Step 3 쿼리로 추출됨. `dnfd_procedure_meta`는 배열·객체 중첩이 큼. |
| **평문/한 줄** | `acodeco`, `gemini_prevalence`, `iqvia_sandoz_2024`, `ita`, `kotra`, `kotra_2026`, `minsa_official`, `motie`, `pubmed`, `who_paho`, `worldbank`, `worldbank_who_ghed` | 스키마 고정 없음. 신선도 판단 시 **텍스트 내 연도·지표명** 파싱 필요. |
| **파이프 구분 텍스트** | `gemini_seed` | `COMPETITOR \| source_tier=…` 형식. |

---

## 4. Gemini 전달용 한눈 표 (갱신 주기 검증 요청용)

| pa_source | 건수 | 성격(한 줄) | pa_notes 형태 | 대표 URL 출처 |
|-----------|------|-------------|----------------|-----------------|
| `acodeco` | 2 | 기관·CABAMED 제도 맥락 | 평문 | acodeco.gob.pa |
| `acodeco_cabamed_competitor` | 8 | 민간 약국 평균가(경쟁품) | JSON | acodeco 업로드 경로 |
| `currency_peg_meta` | 1 | USD/PAB 1:1 페그 메타 | JSON | banconal.com.pa |
| `dnfd_procedure_meta` | 1 | WLA 등록 5단계 절차 | 중첩 JSON | panamadigital DNFD |
| `gemini_prevalence` | 9 | INN 유병률 텍스트 | 평문 | 논문 PMC 등 |
| `gemini_seed` | 29 | 시드·폴백 가격 | 파이프 텍스트 | 인접국 소매 등 |
| `iqvia_sandoz_2024` | 1 | 소매 시장 YoY | 평문 | Sandoz PDF |
| `ita` | 2 | 미 상무부 국가 가이드 | 평문 | trade.gov |
| `kotra` | 2 | KOTRA 시장 뉴스 | 평문 | kotra.or.kr |
| `kotra_2026` | 1 | 2026 전략·가격제도 | 평문 | dream.kotra.or.kr |
| `minsa_official` | 1 | 고위생국·등록 단축 | 평문 | minsa.gob.pa |
| `motie` | 2 | 한-중미 FTA | 평문 | motie.go.kr |
| `panamacompra_atc4_competitor` | 8 | 공공조달 OCDS 낙찰 | JSON | panamacompra.gob.pa |
| `pubmed` | 2 | 학술 초록 인용 | 평문 | pubmed.ncbi.nlm.nih.gov |
| `who_paho` | 2 | PAHO 조달·기금 | 평문 | paho.org |
| `worldbank` | 2 | 인구 등 개발지표 | 평문 | data.worldbank.org |
| `worldbank_who_ghed` | 1 | 1인당 보건지출 | 평문 | data.worldbank.org (GHED) |

---

*본 문서는 `pa_source` 신선도 정책 수립 전 **사실 조사**용이며, 권장 갱신 주기는 별도 LLM·운영 검토 결과에 따름.*
