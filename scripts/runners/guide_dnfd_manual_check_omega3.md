# Omega-3 처방약 DNFD 수동 조회 가이드

## 접속

URL: https://consultamedicamentos.minsa.gob.pa

## 검색 키워드 (순서대로)

1. Omacor
2. Lovaza
3. Ésteres etílicos omega-3
4. Ácidos grasos omega-3
5. Hipertrigliceridemia

## 수집 항목 (각 결과마다)

- 등록번호 (Número de Registro)
- 제품명 (Nombre Comercial)
- 제조사 (Fabricante)
- 허가권자 (Titular)
- 발효일 / 만료일 (Vigencia)
- 상태 (Activo / Vencido)
- **처방약(Rx) vs OTC 구분** — 세션 19 박제 원칙 "Rx vs OTC 엄격 분리" 준수

## 결과 기록 위치

`data/raw/panama_consulta/omega3_manual.json`

## JSON 스키마 (결과 있을 시)

```json
{
  "inn": "omega_3_acid_ethyl_esters",
  "checked_at": "2026-04-16",
  "confirmed_absence": false,
  "results": [
    {
      "registration_no": "R-xxxxx",
      "nombre_comercial": "",
      "fabricante": "",
      "titular": "",
      "vigencia_inicio": "YYYY-MM-DD",
      "vigencia_fin": "YYYY-MM-DD",
      "estado": "Activo",
      "rx_vs_otc": "Rx | OTC | unclear"
    }
  ]
}
```

## 결과 없을 시

```json
{
  "inn": "omega_3_acid_ethyl_esters",
  "checked_at": "YYYY-MM-DD",
  "confirmed_absence": true,
  "results": [],
  "keywords_checked": ["Omacor", "Lovaza", "Ésteres etílicos omega-3", "Ácidos grasos omega-3", "Hipertrigliceridemia"]
}
```

→ 이것도 1차 출처로 인정 (`primary_source_strength=high`)
