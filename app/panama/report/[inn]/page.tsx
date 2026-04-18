import { redirect } from "next/navigation";

import { findProductByInnSlug } from "@/src/logic/inn_slug";

type Props = {
  params: { inn: string };
};

/** 구 경로 `/panama/report/[slug]` → `/panama/report?inn=` 로 통일 */
export default function PanamaReportLegacyRedirect({ params }: Props) {
  const slug = params.inn ?? "";
  const product = findProductByInnSlug(decodeURIComponent(slug));
  if (product === undefined) {
    redirect("/panama/report?inn=UNKNOWN");
  }
  redirect(`/panama/report?inn=${encodeURIComponent(product.who_inn_en)}`);
}
