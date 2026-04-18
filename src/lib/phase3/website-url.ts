/**
 * 파트너 website 컬럼 — null/공백만 걸러 URL 표시 여부 판단
 */
export function getPartnerWebsiteHref(website: string | null | undefined): string | null {
  if (website === null || website === undefined) {
    return null;
  }
  const trimmed = website.trim();
  return trimmed.length > 0 ? trimmed : null;
}
