"use client";

import { useState } from "react";

export type FobOptionType = "subtract_pct" | "add_pct" | "multiply";

export interface FobOption {
  id: string;
  name: string;
  type: FobOptionType;
  value: number;
}

/** 파나마 시장 맞춤 AI 추천 기본 옵션 */
const PANAMA_DEFAULTS: Record<
  "public" | "private",
  Record<"agg" | "avg" | "cons", FobOption[]>
> = {
  public: {
    agg: [
      { id: "p1", name: "에이전트 수수료",         type: "subtract_pct", value: 8  },
      { id: "p2", name: "관세 (한-파나마 FTA)",     type: "subtract_pct", value: 0  },
      { id: "p3", name: "ALPS 조달 낙찰 마진",      type: "subtract_pct", value: 30 },
      { id: "p4", name: "입찰 준비 수수료",          type: "subtract_pct", value: 2  },
    ],
    avg: [
      { id: "p1", name: "에이전트 수수료",         type: "subtract_pct", value: 10 },
      { id: "p2", name: "관세 (한-파나마 FTA)",     type: "subtract_pct", value: 0  },
      { id: "p3", name: "ALPS 조달 낙찰 마진",      type: "subtract_pct", value: 25 },
      { id: "p4", name: "입찰 준비 수수료",          type: "subtract_pct", value: 2  },
    ],
    cons: [
      { id: "p1", name: "에이전트 수수료",         type: "subtract_pct", value: 12 },
      { id: "p2", name: "관세 (한-파나마 FTA)",     type: "subtract_pct", value: 0  },
      { id: "p3", name: "ALPS 조달 낙찰 마진",      type: "subtract_pct", value: 20 },
      { id: "p4", name: "입찰 준비 수수료",          type: "subtract_pct", value: 2  },
    ],
  },
  private: {
    agg: [
      { id: "p1", name: "에이전트 수수료",          type: "subtract_pct", value: 5    },
      { id: "p2", name: "운임 배수",                type: "multiply",     value: 0.88 },
      { id: "p3", name: "약국·병원 유통 마진",       type: "subtract_pct", value: 20   },
      { id: "p4", name: "도매상 마크업",             type: "add_pct",      value: 10   },
    ],
    avg: [
      { id: "p1", name: "에이전트 수수료",          type: "subtract_pct", value: 8    },
      { id: "p2", name: "운임 배수",                type: "multiply",     value: 1.0  },
      { id: "p3", name: "약국·병원 유통 마진",       type: "subtract_pct", value: 18   },
      { id: "p4", name: "도매상 마크업",             type: "add_pct",      value: 10   },
    ],
    cons: [
      { id: "p1", name: "에이전트 수수료",          type: "subtract_pct", value: 10   },
      { id: "p2", name: "운임 배수",                type: "multiply",     value: 1.0  },
      { id: "p3", name: "약국·병원 유통 마진",       type: "subtract_pct", value: 15   },
      { id: "p4", name: "도매상 마크업",             type: "add_pct",      value: 10   },
    ],
  },
};

/** unique id 생성 */
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** 옵션 목록을 순서대로 적용해 FOB 계산 */
function calcFob(base: number, options: FobOption[]): number {
  let price = base;
  for (const opt of options) {
    const v = opt.value;
    if (opt.type === "subtract_pct") price = price * (1 - v / 100);
    else if (opt.type === "add_pct")  price = price * (1 + v / 100);
    else if (opt.type === "multiply") price = price * v;
  }
  return price;
}

/** 기본 옵션 복사 (id 재생성) */
function cloneDefaults(
  segment: "public" | "private",
  scenario: "agg" | "avg" | "cons",
): FobOption[] {
  return PANAMA_DEFAULTS[segment][scenario].map((o) => ({ ...o, id: uid() }));
}

const TYPE_LABELS: Record<FobOptionType, string> = {
  subtract_pct: "% 차감",
  add_pct:      "% 가산",
  multiply:     "× 배수",
};

const SCENARIO_LABELS: Record<"agg" | "avg" | "cons", string> = {
  agg:  "저가 진입",
  avg:  "기준가",
  cons: "프리미엄",
};

interface Props {
  scenario: "agg" | "avg" | "cons";
  segment: "public" | "private";
  /** price_pab — 파나마는 PAB=USD 1:1 */
  basePrice: number;
  onClose: () => void;
}

export function PricingEditModal({ scenario, segment, basePrice, onClose }: Props) {
  const [currentBase, setCurrentBase] = useState(basePrice);
  const [options, setOptions]         = useState<FobOption[]>(() => cloneDefaults(segment, scenario));

  const [newName,  setNewName]  = useState("");
  const [newType,  setNewType]  = useState<FobOptionType>("subtract_pct");
  const [newValue, setNewValue] = useState("");

  const fob          = calcFob(currentBase, options);
  const segmentLabel = segment === "public" ? "공공 시장" : "민간 시장";
  const scenarioLabel = SCENARIO_LABELS[scenario];

  // ── 핸들러 ────────────────────────────────────────────────────────────
  function removeOption(id: string) {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }

  function updateValue(id: string, raw: string) {
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return;
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, value: v } : o)));
  }

  function addOption() {
    const v = parseFloat(newValue);
    if (!newName.trim() || !Number.isFinite(v)) return;
    setOptions((prev) => [
      ...prev,
      { id: uid(), name: newName.trim(), type: newType, value: v },
    ]);
    setNewName("");
    setNewValue("");
  }

  function resetToDefault() {
    setCurrentBase(basePrice);
    setOptions(cloneDefaults(segment, scenario));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[520px] rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => { e.stopPropagation(); }}
      >
        {/* 닫기 */}
        <button
          type="button"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 text-lg"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>

        {/* 제목 */}
        <h2 className="mb-5 text-[15px] font-extrabold tracking-[-0.02em] text-navy">
          {scenarioLabel} — 역산 · 옵션 편집 [{segmentLabel}]
        </h2>

        {/* 보고서 가격 */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#4a5a6f]">보고서 기준가</span>
          <span className="rounded-lg bg-navy px-3 py-1 text-[13px] font-extrabold text-white">
            USD {currentBase.toFixed(2)}
          </span>
        </div>

        {/* 기준가 입력 */}
        <div className="mb-5 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#4a5a6f]">기준가 (USD)</span>
          <input
            type="number"
            step="0.01"
            className="w-28 rounded-lg border border-[#d9e2ef] px-3 py-1.5 text-right text-[14px] font-extrabold text-navy shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            value={currentBase}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) setCurrentBase(v);
            }}
          />
        </div>

        {/* 옵션 목록 */}
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-[#9aafc5]">
          추가 옵션
        </p>
        <div className="mb-3 divide-y divide-[#f0f4f9] rounded-xl border border-[#e8eef5]">
          {options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2 px-3 py-2.5">
              <span className="flex-1 truncate text-[13px] text-[#273f60]">{opt.name}</span>
              <span className="w-14 text-right text-[11px] text-[#9aafc5]">
                {TYPE_LABELS[opt.type]}
              </span>
              <input
                type="number"
                step="0.01"
                className="w-16 rounded-lg border border-[#d9e2ef] px-2 py-1 text-center text-[13px] font-bold text-navy focus:outline-none focus:ring-1 focus:ring-navy/30"
                value={opt.value}
                onChange={(e) => { updateValue(opt.id, e.target.value); }}
              />
              <button
                type="button"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-[13px] text-red-400 hover:bg-red-100"
                onClick={() => { removeOption(opt.id); }}
                aria-label="삭제"
              >
                ×
              </button>
            </div>
          ))}

          {/* 새 옵션 추가 */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <input
              type="text"
              placeholder="옵션명"
              className="min-w-0 flex-1 rounded-lg border border-[#d9e2ef] px-2 py-1 text-[12px] text-[#273f60] placeholder:text-[#aab5c4] focus:outline-none focus:ring-1 focus:ring-navy/30"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); }}
            />
            <select
              className="rounded-lg border border-[#d9e2ef] px-1.5 py-1 text-[11px] text-[#273f60] focus:outline-none"
              value={newType}
              onChange={(e) => { setNewType(e.target.value as FobOptionType); }}
            >
              <option value="subtract_pct">% 차감</option>
              <option value="add_pct">% 가산</option>
              <option value="multiply">× 배수</option>
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="값"
              className="w-14 rounded-lg border border-[#d9e2ef] px-2 py-1 text-center text-[12px] text-[#273f60] placeholder:text-[#aab5c4] focus:outline-none focus:ring-1 focus:ring-navy/30"
              value={newValue}
              onChange={(e) => { setNewValue(e.target.value); }}
            />
            <button
              type="button"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
              onClick={addOption}
              aria-label="추가"
            >
              ✓
            </button>
          </div>
        </div>

        {/* 결과 + 되돌리기 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-[12px] text-[#7a8fa8] underline underline-offset-2 transition-colors hover:text-navy"
            onClick={resetToDefault}
          >
            ↺ 되돌리기 (AI 추천)
          </button>
          <p className="text-[14px] font-extrabold text-navy">
            결과: {fob.toFixed(2)} USD
          </p>
        </div>
      </div>
    </div>
  );
}
