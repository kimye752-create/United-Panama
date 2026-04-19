/**
 * ISO 3166-1 alpha-2 코드 → 국기 이모지 (3공정 카드·리스트용)
 */
export function getFlagEmojiFromCountryCode(code: string | null | undefined): string {
  if (code === null || code === undefined || code === "") {
    return "🌐";
  }
  const c = code.toUpperCase();
  const map: Record<string, string> = {
    IN: "🇮🇳",
    IT: "🇮🇹",
    CA: "🇨🇦",
    GB: "🇬🇧",
    PA: "🇵🇦",
    GT: "🇬🇹",
    CH: "🇨🇭",
    CO: "🇨🇴",
    DE: "🇩🇪",
    FR: "🇫🇷",
    US: "🇺🇸",
    AR: "🇦🇷",
    MX: "🇲🇽",
  };
  return map[c] ?? "🌐";
}

/**
 * 회사명·유형 문자열에서 국가 힌트를 잡아 플래그 이모지 표시 (간이 휴리스틱)
 */
export function getCountryFlagEmoji(companyType: string | null, companyName: string): string {
  const blob = `${companyType ?? ""} ${companyName}`.toLowerCase();

  if (blob.includes("panamá") || blob.includes("panama")) return "🇵🇦";
  if (blob.includes("méxico") || blob.includes("mexico")) return "🇲🇽";
  if (blob.includes("colombia")) return "🇨🇴";
  if (blob.includes("guatemala")) return "🇬🇹";
  if (blob.includes("argentin")) return "🇦🇷";
  if (blob.includes("brasil") || blob.includes("brazil")) return "🇧🇷";
  if (blob.includes("india") || blob.includes("hetero")) return "🇮🇳";
  if (blob.includes("italy") || blob.includes("menarini")) return "🇮🇹";
  if (blob.includes("canada") || blob.includes("apotex")) return "🇨🇦";
  if (blob.includes("france") || blob.includes("sanofi") || blob.includes("guerbet")) return "🇫🇷";
  if (blob.includes("germany") || blob.includes("bayer")) return "🇩🇪";
  if (blob.includes("switzerland") || blob.includes("novartis") || blob.includes("roche"))
    return "🇨🇭";
  if (blob.includes("united kingdom") || blob.includes("gsk") || blob.includes("glaxo"))
    return "🇬🇧";
  if (blob.includes("usa") || blob.includes("united states") || blob.includes("pfizer"))
    return "🇺🇸";

  return "🌐";
}
