# preload/ — 보완 크롤러 (Phase A 보조)

이 폴더의 크롤러들은 **Gemini seed**가 못 채운 빈칸을 보완하는 역할입니다.

**메인 데이터 수집**은 `data/seed/panama/`의 JSON + `src/seed_loaders/` 적재가 담당합니다.

## 실행 순서 (재정립 후)

1. **seed_loader 먼저 실행** → DB에 Gemini 데이터 적재  
2. **(D6 이후)** `gap_detector`가 빈칸 판단  
3. 이 폴더의 크롤러들이 **빈칸만** 보완 호출  

기존 `pa_*.ts` 크롤러는 폐기하지 않고, 위 흐름에서 **보완용**으로 사용합니다.
