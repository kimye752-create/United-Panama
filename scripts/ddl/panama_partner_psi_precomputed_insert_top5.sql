-- ============================================================
-- panama_partner_psi_precomputed — 상위 5사 × 8제품 = 40행 INSERT
-- 실행 전 확인: panama_partner_candidates 에 5사 존재 여부 검증
--   SELECT id, company_name FROM panama_partner_candidates
--   WHERE company_name IN (
--     'SEVEN PHARMA PANAMA', 'MENAFAR, SA - Panama',
--     'APOTEX PANAMA S.A.', 'C.G. de Haseth & Cía., S.A.', 'Medipan, S.A.'
--   );
-- 없으면 이 파일 하단의 INSERT INTO panama_partner_candidates 섹션 먼저 실행
-- 주의: 브라우저 자동 번역 비활성화 상태에서 실행 권장
-- ※ DB 실제 회사명 기준 (company_name 컬럼값):
--   'SEVEN PHARMA PANAMA'  (S.A. 없음)
--   'MENAFAR, SA - Panama' (국가명 포함)
--   'Medipan, S.A.'        (쉼표 위치 주의)
--   'APOTEX PANAMA S.A.'   (신규 추가 필요)
--   'C.G. de Haseth & Cía., S.A.' (신규 추가 필요)
-- ============================================================

-- ============================================================
-- PSI 계산 공식 (가중치 확정):
--   psi_base = revenue*0.35 + pipeline*0.28 + manufacturing*0.20
--              + import_experience*0.12 + pharmacy_chain*0.05
-- 예) SEVEN PHARMA: 80*0.35 + 60*0.28 + 100*0.20 + 100*0.12 + 0*0.05
--   = 28 + 16.8 + 20 + 12 + 0 = 76.8
-- ============================================================

WITH partner_lookup AS (
  SELECT id, company_name
  FROM panama_partner_candidates
  WHERE company_name IN (
    'SEVEN PHARMA PANAMA',
    'MENAFAR, SA - Panama',
    'APOTEX PANAMA S.A.',
    'C.G. de Haseth & Cía., S.A.',
    'Medipan, S.A.'
  )
)

INSERT INTO panama_partner_psi_precomputed (
  partner_id, product_id,
  pipeline_tier, conflict_level, conflict_insight,
  revenue_tier, revenue_score, pipeline_score,
  manufacturing_score, import_experience_score, pharmacy_chain_score,
  psi_base, notes
)

-- ============================================================
-- 1. SEVEN PHARMA PANAMA (Hetero Labs 그룹)
--    매출Tier2(80) / 제조100 / 수입100 / 약국0
--    PSI 기준점: 80*0.35 + X*0.28 + 100*0.20 + 100*0.12 + 0*0.05
-- ============================================================

-- Rosumeg Combigel (Rosuvastatin+Omega-3) — upgrade_opportunity
SELECT pl.id,
  '2504d79b-c2ce-4660-9ea7-5576c8bb755f'::uuid,
  2, 'upgrade_opportunity',
  '파트너가 Rosuvastatin 단일제를 유통 중이므로, 우리 Rosumeg Combigel(Rosuvastatin+Omega-3 복합제)을 기존 유통 제품의 업그레이드 버전으로 제안 가능. 복합제 수입유통 Upgrade 전략이 발표 차별점. Hetero 그룹 LATAM 11개국 유통망 활용 가능.',
  2, 80, 60, 100, 100, 0,
  ROUND((80*0.35 + 60*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://sevenpharma.com/nuestra-presencia/panama/'
FROM partner_lookup pl WHERE pl.company_name = 'SEVEN PHARMA PANAMA'

UNION ALL
-- Atmeg Combigel (Atorvastatin+Omega-3) — adjacent_category
SELECT pl.id,
  '859e60f9-8544-43b3-a6a0-f6c7529847eb'::uuid,
  4, 'adjacent_category',
  '파트너는 Rosuvastatin 단일제만 보유하고 Atorvastatin 라인은 미확인. 동일 이상지질혈증 카테고리(C10AA) 처방 네트워크 활용 가능. Atorvastatin+Omega-3 복합제는 파트너 포트폴리오 미중복으로 신규 도입 제안 여지 있음.',
  2, 80, 40, 100, 100, 0,
  ROUND((80*0.35 + 40*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://sevenpharma.com/nuestra-presencia/panama/'
FROM partner_lookup pl WHERE pl.company_name = 'SEVEN PHARMA PANAMA'

UNION ALL
-- Ciloduo (Cilostazol+Rosuvastatin) — adjacent_category
SELECT pl.id,
  'fcae4399-aa80-4318-ad55-89d6401c10a9'::uuid,
  4, 'adjacent_category',
  '파트너 포트폴리오에 Cilostazol 제품 미확인. Rosuvastatin 성분은 파트너가 보유하나 Cilostazol 복합제는 별개 카테고리(B01AC). 인접 심혈관 네트워크 활용 가능하며 직접 경쟁 없음.',
  2, 80, 40, 100, 100, 0,
  ROUND((80*0.35 + 40*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://sevenpharma.com/nuestra-presencia/panama/'
FROM partner_lookup pl WHERE pl.company_name = 'SEVEN PHARMA PANAMA'

UNION ALL
-- Gastiin CR (Mosapride) — upgrade_opportunity
SELECT pl.id,
  '24738c3b-3a5b-40a9-9e8e-889ec075b453'::uuid,
  2, 'upgrade_opportunity',
  '파트너가 Mosapride 단일 속방정을 유통 중이므로, 우리 Gastiin CR(서방형 제어방출 제형)을 기술적 업그레이드 버전으로 포지셔닝 가능. CR 제형 차별성으로 약국 체인 채널에서 프리미엄 제안 기회.',
  2, 80, 60, 100, 100, 0,
  ROUND((80*0.35 + 60*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://sevenpharma.com/nuestra-presencia/panama/'
FROM partner_lookup pl WHERE pl.company_name = 'SEVEN PHARMA PANAMA'

UNION ALL
-- Omethyl Cutielet (Omega-3) — none
SELECT pl.id,
  'f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18'::uuid,
  5, 'none',
  '파트너 포트폴리오에 Omega-3(C10AX06) 제품 미확인. 경쟁 없는 깨끗한 협력 가능. Hetero 그룹의 광범위한 LATAM 유통망과 결합 시 파나마 진출 파나마 우선 2종 중 하나로 빠른 침투 가능.',
  2, 80, 20, 100, 100, 0,
  ROUND((80*0.35 + 20*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://sevenpharma.com/nuestra-presencia/panama/'
FROM partner_lookup pl WHERE pl.company_name = 'SEVEN PHARMA PANAMA'

UNION ALL
-- Sereterol Activair (Salmeterol+Fluticasone) — direct_competition
SELECT pl.id,
  '014fd4d2-dc66-4fc1-8d4f-59695183387f'::uuid,
  1, 'direct_competition',
  '파트너가 PULMETERO(Salmeterol+Fluticasone 동일 조합)를 자체 포트폴리오로 보유하므로 Sereterol Activair 주 파트너보다 보조 파트너로 검토 필요. 다만 Hetero 그룹의 LATAM 11개국 유통망은 다른 7개 제품에서 충분히 활용 가능.',
  2, 80, 100, 100, 100, 0,
  ROUND((80*0.35 + 100*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://sevenpharma.com/nuestra-presencia/panama/ — PULMETERO 동일성분 확인'
FROM partner_lookup pl WHERE pl.company_name = 'SEVEN PHARMA PANAMA'

UNION ALL
-- Gadvoa Inj (Gadobutrol) — none
SELECT pl.id,
  '895f49ae-6ce3-44a3-93bd-bb77e027ba59'::uuid,
  5, 'none',
  '파트너 포트폴리오에 조영제(V08CA) 제품 미확인. Gadobutrol 경쟁 없음. 파트너의 Oncology 강점 병원 네트워크와 연계 시 영상진단 채널 접근 가능.',
  2, 80, 20, 100, 100, 0,
  ROUND((80*0.35 + 20*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://sevenpharma.com/nuestra-presencia/panama/'
FROM partner_lookup pl WHERE pl.company_name = 'SEVEN PHARMA PANAMA'

UNION ALL
-- Hydrine (Hydroxyurea) — direct_competition
SELECT pl.id,
  'bdfc9883-6040-438a-8e7a-df01f1230682'::uuid,
  1, 'direct_competition',
  '파트너가 Oncology 포트폴리오 20종 이상 보유하며 Hydroxyurea 제조 가능성 높음. 직접 경쟁 위험이 있어 보조 파트너 또는 별도 조건 협의 필요. 파트너의 Oncology 채널 활용 시 다른 제품과 패키지 딜 가능성 검토.',
  2, 80, 100, 100, 100, 0,
  ROUND((80*0.35 + 100*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://sevenpharma.com/nuestra-presencia/panama/ — Oncology 20종+ 확인'
FROM partner_lookup pl WHERE pl.company_name = 'SEVEN PHARMA PANAMA'

UNION ALL

-- ============================================================
-- 2. MENAFAR, SA - Panama (Grupo Menarini — 이탈리아 MNC, 34억 유로)
--    매출Tier2(80) / 제조100 / 수입100 / 약국0
-- ============================================================

-- Rosumeg Combigel — upgrade_opportunity
SELECT pl.id,
  '2504d79b-c2ce-4660-9ea7-5576c8bb755f'::uuid,
  2, 'upgrade_opportunity',
  '파트너가 Rozetin(Rosuvastatin+Ezetimibe) 복합제를 보유하나, 우리 Rosumeg(Rosuvastatin+Omega-3)는 다른 복합 파트너로 직접 경쟁 아닌 포트폴리오 확장. Menarini 이상지질혈증 처방 네트워크를 통해 Omega-3 병용 복합제 니즈 공략 가능.',
  2, 80, 60, 100, 100, 0,
  ROUND((80*0.35 + 60*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.menariniamla.com/es/about-us/quienes-somos.html'
FROM partner_lookup pl WHERE pl.company_name = 'MENAFAR, SA - Panama'

UNION ALL
-- Atmeg Combigel — upgrade_opportunity
SELECT pl.id,
  '859e60f9-8544-43b3-a6a0-f6c7529847eb'::uuid,
  3, 'upgrade_opportunity',
  'Menarini 이상지질혈증 포트폴리오 강점 활용 가능. Atorvastatin+Omega-3 복합제는 파트너 라인업 미중복으로 신규 도입 제안. Menarini의 LATAM 전역 법인망으로 파나마 진출 후 확장 경로 확보.',
  2, 80, 60, 100, 100, 0,
  ROUND((80*0.35 + 60*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.menariniamla.com/es/about-us/quienes-somos.html'
FROM partner_lookup pl WHERE pl.company_name = 'MENAFAR, SA - Panama'

UNION ALL
-- Ciloduo — adjacent_category
SELECT pl.id,
  'fcae4399-aa80-4318-ad55-89d6401c10a9'::uuid,
  4, 'adjacent_category',
  '파트너 포트폴리오에 Cilostazol 미확인. 심혈관 카테고리 인접성으로 처방 네트워크 활용 가능. Menarini의 심혈관 영역 전문성과 결합 시 시너지 기대.',
  2, 80, 40, 100, 100, 0,
  ROUND((80*0.35 + 40*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.menariniamla.com/es/about-us/quienes-somos.html'
FROM partner_lookup pl WHERE pl.company_name = 'MENAFAR, SA - Panama'

UNION ALL
-- Gastiin CR — upgrade_opportunity
SELECT pl.id,
  '24738c3b-3a5b-40a9-9e8e-889ec075b453'::uuid,
  3, 'upgrade_opportunity',
  'Menarini 소화기 포트폴리오에 Mosapride 라인 보유 가능성. CR 서방형 제형 기술 차별화로 업그레이드 제안 가능. Menarini의 전문의 처방 채널을 통해 고부가가치 포지셔닝.',
  2, 80, 60, 100, 100, 0,
  ROUND((80*0.35 + 60*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.menariniamla.com/es/about-us/quienes-somos.html'
FROM partner_lookup pl WHERE pl.company_name = 'MENAFAR, SA - Panama'

UNION ALL
-- Omethyl Cutielet — none
SELECT pl.id,
  'f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18'::uuid,
  5, 'none',
  '파트너 포트폴리오에 Omega-3 단독 제품 미확인. 경쟁 없는 깨끗한 협력 가능. Menarini의 파나마 처방 채널을 통해 파나마 최우선 2종 중 하나로 빠른 침투 기대.',
  2, 80, 20, 100, 100, 0,
  ROUND((80*0.35 + 20*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.menariniamla.com/es/about-us/quienes-somos.html'
FROM partner_lookup pl WHERE pl.company_name = 'MENAFAR, SA - Panama'

UNION ALL
-- Sereterol Activair — adjacent_category
SELECT pl.id,
  '014fd4d2-dc66-4fc1-8d4f-59695183387f'::uuid,
  3, 'adjacent_category',
  'Menarini 호흡기 포트폴리오 보유 확인됨. Salmeterol+Fluticasone 동일 조합 보유 여부 재검증 필요. 현재 인접 카테고리로 분류하며, 직접 경쟁 미확인 시 협력 파트너 유력.',
  2, 80, 60, 100, 100, 0,
  ROUND((80*0.35 + 60*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.menariniamla.com/es/about-us/quienes-somos.html — Salmeterol+Fluticasone DPI 보유 여부 재검증 필요'
FROM partner_lookup pl WHERE pl.company_name = 'MENAFAR, SA - Panama'

UNION ALL
-- Gadvoa Inj — none
SELECT pl.id,
  '895f49ae-6ce3-44a3-93bd-bb77e027ba59'::uuid,
  5, 'none',
  '파트너 포트폴리오에 조영제 제품 미확인. 경쟁 없음. Menarini의 병원 전문의 채널 네트워크를 통해 영상진단과에 접근 가능.',
  2, 80, 20, 100, 100, 0,
  ROUND((80*0.35 + 20*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.menariniamla.com/es/about-us/quienes-somos.html'
FROM partner_lookup pl WHERE pl.company_name = 'MENAFAR, SA - Panama'

UNION ALL
-- Hydrine — adjacent_category
SELECT pl.id,
  'bdfc9883-6040-438a-8e7a-df01f1230682'::uuid,
  4, 'adjacent_category',
  'Menarini Oncology 포트폴리오 구체적 확인 미완. 인접 종양 카테고리로 분류. Menarini의 전문의 처방 채널은 혈액종양과 접근에 유용하며 Hydroxyurea 직접 경쟁 없을 경우 협력 가능.',
  2, 80, 40, 100, 100, 0,
  ROUND((80*0.35 + 40*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.menariniamla.com/es/about-us/quienes-somos.html'
FROM partner_lookup pl WHERE pl.company_name = 'MENAFAR, SA - Panama'

UNION ALL

-- ============================================================
-- 3. APOTEX PANAMA S.A. (캐나다 본사, 연 20억USD+, 125개국)
--    매출Tier2(80) / 제조100 / 수입100 / 약국0
-- ============================================================

-- Rosumeg Combigel — upgrade_opportunity
SELECT pl.id,
  '2504d79b-c2ce-4660-9ea7-5576c8bb755f'::uuid,
  2, 'upgrade_opportunity',
  'Apotex가 Apo-Rosuvastatin 단일제를 직접 생산·유통 중. 우리 Rosumeg(Rosuvastatin+Omega-3 복합제)를 기존 Apo-Rosuvastatin의 업그레이드 버전으로 제안 가능. 복합제 전환 마케팅으로 프리미엄 가격대 포지셔닝 기회.',
  2, 80, 60, 100, 100, 0,
  ROUND((80*0.35 + 60*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america'
FROM partner_lookup pl WHERE pl.company_name = 'APOTEX PANAMA S.A.'

UNION ALL
-- Atmeg Combigel — upgrade_opportunity
SELECT pl.id,
  '859e60f9-8544-43b3-a6a0-f6c7529847eb'::uuid,
  2, 'upgrade_opportunity',
  'Apotex가 Apo-Atorvastatin 단일제를 직접 생산 중. 우리 Atmeg(Atorvastatin+Omega-3 복합제)를 동일 성분 업그레이드 버전으로 제안 가능. Apotex의 파나마 유통망을 통해 복합제 라인 확장 전략 실행.',
  2, 80, 60, 100, 100, 0,
  ROUND((80*0.35 + 60*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america'
FROM partner_lookup pl WHERE pl.company_name = 'APOTEX PANAMA S.A.'

UNION ALL
-- Ciloduo — adjacent_category
SELECT pl.id,
  'fcae4399-aa80-4318-ad55-89d6401c10a9'::uuid,
  4, 'adjacent_category',
  'Apotex 포트폴리오에 Cilostazol 단독 제품 미확인. 심혈관 카테고리 인접성으로 Apotex 처방 채널 활용 가능. Rosuvastatin 성분 포함 복합제로 Apotex 기존 채널과 시너지.',
  2, 80, 40, 100, 100, 0,
  ROUND((80*0.35 + 40*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america'
FROM partner_lookup pl WHERE pl.company_name = 'APOTEX PANAMA S.A.'

UNION ALL
-- Gastiin CR — upgrade_opportunity
SELECT pl.id,
  '24738c3b-3a5b-40a9-9e8e-889ec075b453'::uuid,
  2, 'upgrade_opportunity',
  'Apotex가 Apo-Mosapride를 직접 생산 중. 우리 Gastiin CR(서방형 제어방출)을 기술 업그레이드 버전으로 제안 가능. CR 제형 우수성 강조로 Apotex 기존 Mosapride 채널 공략.',
  2, 80, 60, 100, 100, 0,
  ROUND((80*0.35 + 60*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america'
FROM partner_lookup pl WHERE pl.company_name = 'APOTEX PANAMA S.A.'

UNION ALL
-- Omethyl Cutielet — none
SELECT pl.id,
  'f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18'::uuid,
  5, 'none',
  'Apotex 포트폴리오에 Omega-3 단독 제품 미확인. 경쟁 없는 깨끗한 협력 가능. Apotex의 파나마 유통 채널로 파나마 최우선 2종 중 하나의 빠른 침투 기대.',
  2, 80, 20, 100, 100, 0,
  ROUND((80*0.35 + 20*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america'
FROM partner_lookup pl WHERE pl.company_name = 'APOTEX PANAMA S.A.'

UNION ALL
-- Sereterol Activair — none
SELECT pl.id,
  '014fd4d2-dc66-4fc1-8d4f-59695183387f'::uuid,
  5, 'none',
  'Apotex 포트폴리오에 Salmeterol+Fluticasone 복합제 미확인. 직접 경쟁 없음. Apotex의 광범위한 LATAM 유통망을 통해 호흡기 채널 접근 가능.',
  2, 80, 20, 100, 100, 0,
  ROUND((80*0.35 + 20*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america'
FROM partner_lookup pl WHERE pl.company_name = 'APOTEX PANAMA S.A.'

UNION ALL
-- Gadvoa Inj — none
SELECT pl.id,
  '895f49ae-6ce3-44a3-93bd-bb77e027ba59'::uuid,
  5, 'none',
  'Apotex 포트폴리오에 조영제 미확인. 경쟁 없음. Apotex 병원 채널 활용 가능.',
  2, 80, 20, 100, 100, 0,
  ROUND((80*0.35 + 20*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america'
FROM partner_lookup pl WHERE pl.company_name = 'APOTEX PANAMA S.A.'

UNION ALL
-- Hydrine — adjacent_category
SELECT pl.id,
  'bdfc9883-6040-438a-8e7a-df01f1230682'::uuid,
  4, 'adjacent_category',
  'Apotex Oncology 라인 보유 가능성 있으나 Hydroxyurea 직접 경쟁 미확인. 인접 카테고리 분류. Apotex 병원 채널을 통한 혈액종양과 접근 가능.',
  2, 80, 40, 100, 100, 0,
  ROUND((80*0.35 + 40*0.28 + 100*0.20 + 100*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.apotex.com/mx/es/about-us/25-years-in-latin-america'
FROM partner_lookup pl WHERE pl.company_name = 'APOTEX PANAMA S.A.'

UNION ALL

-- ============================================================
-- 4. C.G. de Haseth & Cía., S.A. (파나마 100년 기업, El Javillo 약국 18지점+)
--    매출Tier3(60) / 제조0 / 수입100 / 약국100
-- ============================================================

-- Rosumeg Combigel — adjacent_category
SELECT pl.id,
  '2504d79b-c2ce-4660-9ea7-5576c8bb755f'::uuid,
  3, 'adjacent_category',
  '파트너가 Bayer·Pfizer 스타틴 라인을 대표하나 우리 복합제(Rosuvastatin+Omega-3)와 직접 중복 미확인. El Javillo 18지점 약국 체인 채널로 이상지질혈증 시장 직접 접근 가능. 파나마 로컬 100년 기업의 신뢰도 활용.',
  3, 60, 60, 0, 100, 100,
  ROUND((60*0.35 + 60*0.28 + 0*0.20 + 100*0.12 + 100*0.05)::numeric, 2),
  '근거: https://www.grupodehaseth.com/'
FROM partner_lookup pl WHERE pl.company_name = 'C.G. de Haseth & Cía., S.A.'

UNION ALL
-- Atmeg Combigel — adjacent_category
SELECT pl.id,
  '859e60f9-8544-43b3-a6a0-f6c7529847eb'::uuid,
  3, 'adjacent_category',
  '파트너 Bayer·Pfizer 스타틴 대표 중 Atorvastatin 라인 보유 가능성. 인접 카테고리 분류. El Javillo 약국 체인 채널로 복합제 소비자 접점 확보 가능.',
  3, 60, 60, 0, 100, 100,
  ROUND((60*0.35 + 60*0.28 + 0*0.20 + 100*0.12 + 100*0.05)::numeric, 2),
  '근거: https://www.grupodehaseth.com/'
FROM partner_lookup pl WHERE pl.company_name = 'C.G. de Haseth & Cía., S.A.'

UNION ALL
-- Ciloduo — adjacent_category
SELECT pl.id,
  'fcae4399-aa80-4318-ad55-89d6401c10a9'::uuid,
  4, 'adjacent_category',
  '파트너 포트폴리오에 Cilostazol 미확인. 심혈관 카테고리 인접으로 El Javillo 처방·OTC 채널 활용 가능. 약국 체인 직접 유통으로 소비자 접점 확보.',
  3, 60, 40, 0, 100, 100,
  ROUND((60*0.35 + 40*0.28 + 0*0.20 + 100*0.12 + 100*0.05)::numeric, 2),
  '근거: https://www.grupodehaseth.com/'
FROM partner_lookup pl WHERE pl.company_name = 'C.G. de Haseth & Cía., S.A.'

UNION ALL
-- Gastiin CR — none
SELECT pl.id,
  '24738c3b-3a5b-40a9-9e8e-889ec075b453'::uuid,
  5, 'none',
  '파트너 소화기 라인 미확인. 직접 경쟁 없음. El Javillo 약국 체인을 통한 소화기약 OTC·처방 채널 접근 가능. 파나마 로컬 유통 최강자 활용.',
  3, 60, 20, 0, 100, 100,
  ROUND((60*0.35 + 20*0.28 + 0*0.20 + 100*0.12 + 100*0.05)::numeric, 2),
  '근거: https://www.grupodehaseth.com/'
FROM partner_lookup pl WHERE pl.company_name = 'C.G. de Haseth & Cía., S.A.'

UNION ALL
-- Omethyl Cutielet — none
SELECT pl.id,
  'f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18'::uuid,
  5, 'none',
  '파트너 포트폴리오에 Omega-3 제품 미확인. 경쟁 없는 깨끗한 협력. El Javillo 18지점 약국 체인으로 파나마 최우선 2종 직접 소비자 유통 최적 채널.',
  3, 60, 20, 0, 100, 100,
  ROUND((60*0.35 + 20*0.28 + 0*0.20 + 100*0.12 + 100*0.05)::numeric, 2),
  '근거: https://www.grupodehaseth.com/'
FROM partner_lookup pl WHERE pl.company_name = 'C.G. de Haseth & Cía., S.A.'

UNION ALL
-- Sereterol Activair — direct_competition
SELECT pl.id,
  '014fd4d2-dc66-4fc1-8d4f-59695183387f'::uuid,
  1, 'direct_competition',
  '파트너가 GSK Seretide(Salmeterol+Fluticasone DPI, 동일 조합)를 MINSA Resol.292 등록 보유. Sereterol Activair 직접 경쟁 제품. 주 파트너 아닌 보조 파트너로 검토하되, El Javillo 약국망은 다른 7개 제품 유통에 적극 활용 권장.',
  3, 60, 100, 0, 100, 100,
  ROUND((60*0.35 + 100*0.28 + 0*0.20 + 100*0.12 + 100*0.05)::numeric, 2),
  '근거: https://www.grupodehaseth.com/ / https://www.minsa.gob.pa/informacion-salud/resoluciones-251-500 (Resol.292)'
FROM partner_lookup pl WHERE pl.company_name = 'C.G. de Haseth & Cía., S.A.'

UNION ALL
-- Gadvoa Inj — adjacent_category
SELECT pl.id,
  '895f49ae-6ce3-44a3-93bd-bb77e027ba59'::uuid,
  3, 'adjacent_category',
  '파트너가 Bayer Gadobutrol(동일 성분)를 대표할 가능성. 인접 카테고리 분류. 조영제는 병원 채널 전용으로 El Javillo 약국 채널과 별도 병원 영업 병행 필요.',
  3, 60, 60, 0, 100, 100,
  ROUND((60*0.35 + 60*0.28 + 0*0.20 + 100*0.12 + 100*0.05)::numeric, 2),
  '근거: https://www.grupodehaseth.com/ — Bayer Gadobutrol 대표 가능성'
FROM partner_lookup pl WHERE pl.company_name = 'C.G. de Haseth & Cía., S.A.'

UNION ALL
-- Hydrine — adjacent_category
SELECT pl.id,
  'bdfc9883-6040-438a-8e7a-df01f1230682'::uuid,
  4, 'adjacent_category',
  '파트너 Oncology 라인 미확인. 인접 카테고리. Roche·Novartis 등 대형 MNC 대표 경험으로 혈액종양과 접근 네트워크 보유 가능성.',
  3, 60, 40, 0, 100, 100,
  ROUND((60*0.35 + 40*0.28 + 0*0.20 + 100*0.12 + 100*0.05)::numeric, 2),
  '근거: https://www.grupodehaseth.com/'
FROM partner_lookup pl WHERE pl.company_name = 'C.G. de Haseth & Cía., S.A.'

UNION ALL

-- ============================================================
-- 5. Medipan, S.A. (파나마 로컬 제조사, 1천만~1억USD)
--    매출Tier4(40) / 제조100 / 수입0 / 약국0
-- ============================================================

-- Rosumeg Combigel — direct_competition
SELECT pl.id,
  '2504d79b-c2ce-4660-9ea7-5576c8bb755f'::uuid,
  1, 'direct_competition',
  '파트너가 RosuMed 시리즈(Rosuvastatin)를 자체 생산 중. 우리 Rosumeg의 직접 경쟁 제품 보유. 주 파트너보다 보조 파트너 또는 라이선스 협상 대상으로 검토. 파나마 로컬 제조 역량 활용 가능성 별도 검토 필요.',
  4, 40, 100, 100, 0, 0,
  ROUND((40*0.35 + 100*0.28 + 100*0.20 + 0*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.medipanpanama.com/ — RosuMed 자체 생산 확인'
FROM partner_lookup pl WHERE pl.company_name = 'Medipan, S.A.'

UNION ALL
-- Atmeg Combigel — direct_competition
SELECT pl.id,
  '859e60f9-8544-43b3-a6a0-f6c7529847eb'::uuid,
  2, 'direct_competition',
  '파트너가 Atorvastatin 계열 제품 자체 생산 가능성. 직접 경쟁 위험. 파나마 로컬 제조 강점을 역이용한 라이선스 협상 또는 OEM 공급 가능성 검토.',
  4, 40, 80, 100, 0, 0,
  ROUND((40*0.35 + 80*0.28 + 100*0.20 + 0*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.medipanpanama.com/'
FROM partner_lookup pl WHERE pl.company_name = 'Medipan, S.A.'

UNION ALL
-- Ciloduo — adjacent_category
SELECT pl.id,
  'fcae4399-aa80-4318-ad55-89d6401c10a9'::uuid,
  4, 'adjacent_category',
  'Medipan 포트폴리오에 Cilostazol 미확인. 인접 카테고리. 로컬 제조 역량 보유로 향후 로컬 생산 파트너십 검토 가능.',
  4, 40, 40, 100, 0, 0,
  ROUND((40*0.35 + 40*0.28 + 100*0.20 + 0*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.medipanpanama.com/'
FROM partner_lookup pl WHERE pl.company_name = 'Medipan, S.A.'

UNION ALL
-- Gastiin CR — none
SELECT pl.id,
  '24738c3b-3a5b-40a9-9e8e-889ec075b453'::uuid,
  5, 'none',
  'Medipan 포트폴리오에 Mosapride 미확인. 경쟁 없음. 파나마 로컬 제조사로 규제 대응 및 로컬 생산 파트너십 검토 가능.',
  4, 40, 20, 100, 0, 0,
  ROUND((40*0.35 + 20*0.28 + 100*0.20 + 0*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.medipanpanama.com/'
FROM partner_lookup pl WHERE pl.company_name = 'Medipan, S.A.'

UNION ALL
-- Omethyl Cutielet — none
SELECT pl.id,
  'f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18'::uuid,
  5, 'none',
  'Medipan 포트폴리오에 Omega-3 미확인. 경쟁 없음. 로컬 제조 역량 활용 OEM 협력 가능성 검토.',
  4, 40, 20, 100, 0, 0,
  ROUND((40*0.35 + 20*0.28 + 100*0.20 + 0*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.medipanpanama.com/'
FROM partner_lookup pl WHERE pl.company_name = 'Medipan, S.A.'

UNION ALL
-- Sereterol Activair — none
SELECT pl.id,
  '014fd4d2-dc66-4fc1-8d4f-59695183387f'::uuid,
  5, 'none',
  'Medipan 포트폴리오에 Salmeterol+Fluticasone 미확인. 경쟁 없음. 호흡기 채널 접근은 별도 경로 필요.',
  4, 40, 20, 100, 0, 0,
  ROUND((40*0.35 + 20*0.28 + 100*0.20 + 0*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.medipanpanama.com/'
FROM partner_lookup pl WHERE pl.company_name = 'Medipan, S.A.'

UNION ALL
-- Gadvoa Inj — none
SELECT pl.id,
  '895f49ae-6ce3-44a3-93bd-bb77e027ba59'::uuid,
  5, 'none',
  'Medipan 포트폴리오에 조영제 미확인. 경쟁 없음.',
  4, 40, 20, 100, 0, 0,
  ROUND((40*0.35 + 20*0.28 + 100*0.20 + 0*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.medipanpanama.com/'
FROM partner_lookup pl WHERE pl.company_name = 'Medipan, S.A.'

UNION ALL
-- Hydrine — none
SELECT pl.id,
  'bdfc9883-6040-438a-8e7a-df01f1230682'::uuid,
  5, 'none',
  'Medipan 포트폴리오에 Hydroxyurea 미확인. 경쟁 없음. 로컬 제조 역량을 활용한 향후 파트너십 검토 가능.',
  4, 40, 20, 100, 0, 0,
  ROUND((40*0.35 + 20*0.28 + 100*0.20 + 0*0.12 + 0*0.05)::numeric, 2),
  '근거: https://www.medipanpanama.com/'
FROM partner_lookup pl WHERE pl.company_name = 'Medipan, S.A.';


-- ============================================================
-- 검증 쿼리 (실행 후 40행 확인)
-- ============================================================
-- SELECT
--   pc.company_name,
--   pp.product_id,
--   pp.pipeline_tier,
--   pp.conflict_level,
--   pp.psi_base
-- FROM panama_partner_psi_precomputed pp
-- JOIN panama_partner_candidates pc ON pc.id = pp.partner_id
-- ORDER BY pp.psi_base DESC
-- LIMIT 20;
