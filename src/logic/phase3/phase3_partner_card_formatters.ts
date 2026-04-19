/**
 * 3공정 파트너 카드 표시용 — UI와 분리된 순수 포맷
 */

/** 회사명이 긴 경우 2줄로 분리, 법인 접미사 정리 */
export function formatPartnerName(name: string): string {
  const cleaned = name.replace(/,?\s*S\.?A\.?$/iu, "").trim();

  if (cleaned.length > 20 && cleaned.includes(" ")) {
    const mid = Math.floor(cleaned.length / 2);
    const spaceAfterMid = cleaned.indexOf(" ", mid - 3);
    if (spaceAfterMid > 0 && spaceAfterMid < cleaned.length - 3) {
      return `${cleaned.slice(0, spaceAfterMid)}\n${cleaned.slice(spaceAfterMid + 1)}`;
    }
  }
  return cleaned;
}

/** 주소에서 카드용 파나마 운영 거점 한 줄 표기 */
export function formatPanamaAddress(address: string): string {
  if (address.includes("Zona Libre de Colón") || address.includes("ZLC")) {
    return "파나마시티 ZLC";
  }
  if (address.includes("Costa del Este")) {
    return "파나마시티 Costa del Este";
  }
  if (address.includes("MMG Tower")) {
    return "파나마시티 MMG Tower";
  }
  return "파나마시티";
}
