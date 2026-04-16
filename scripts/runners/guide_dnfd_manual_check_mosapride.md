# Mosapride DNFD 수동 조회 가이드

## 접속

URL: https://consultamedicamentos.minsa.gob.pa

## 검색 키워드 (순서대로)

1. Mosaprida
2. Mosapride
3. Procinético
4. Dispepsia funcional
5. Gastiin

## 수집 항목 (각 결과마다)

- 등록번호 (Número de Registro)
- 제품명 (Nombre Comercial)
- 제조사 (Fabricante)
- 허가권자 (Titular)
- 발효일 / 만료일 (Vigencia)
- 상태 (Activo / Vencido)
- **제형(서방/일반) 구분** — CR 선례 존재 여부 확인용

## 결과 기록 위치

`data/raw/panama_consulta/mosapride_manual.json`

## JSON 스키마 (결과 있을 시)

```json
{
  "inn": "mosapride",
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
      "formulation_note": "CR / 일반"
    }
  ]
}
```

## 결과 없을 시

```json
{
  "inn": "mosapride",
  "checked_at": "YYYY-MM-DD",
  "confirmed_absence": true,
  "results": [],
  "keywords_checked": ["Mosaprida", "Mosapride", "Procinético", "Dispepsia funcional", "Gastiin"]
}
```

→ 이것도 1차 출처로 인정 (`primary_source_strength=high`)
