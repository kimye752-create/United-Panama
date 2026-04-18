import type { ProductId } from "@/src/lib/phase3/partners-data";

/** 1공정 세션 저장 `product_id`(UUID) → partners-data `ProductId` 슬러그 */
const UUID_TO_SLUG: Record<string, ProductId> = {
  "bdfc9883-6040-438a-8e7a-df01f1230682": "hydrine",
  "fcae4399-aa80-4318-ad55-89d6401c10a9": "ciloduo",
  "24738c3b-3a5b-40a9-9e8e-889ec075b453": "gastiin",
  "2504d79b-c2ce-4660-9ea7-5576c8bb755f": "rosumeg",
  "859e60f9-8544-43b3-a6a0-f6c7529847eb": "atmeg",
  "014fd4d2-dc66-4fc1-8d4f-59695183387f": "sereterol",
  "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18": "omethyl",
  "895f49ae-6ce3-44a3-93bd-bb77e027ba59": "gadvoa",
};

export function uuidToProductSlug(uuid: string | null | undefined): ProductId | null {
  if (uuid === null || uuid === undefined) {
    return null;
  }
  const t = uuid.trim();
  if (t === "") {
    return null;
  }
  return UUID_TO_SLUG[t] ?? null;
}
