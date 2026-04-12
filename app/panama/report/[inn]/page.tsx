import { notFound } from "next/navigation";

import { PanamaReportClient } from "@/components/PanamaReportClient";
import { findProductByInnSlug } from "@/src/logic/inn_slug";

type Props = {
  params: { inn: string };
};

export default async function PanamaReportPage({ params }: Props) {
  const slug = params.inn ?? "";
  const product = findProductByInnSlug(decodeURIComponent(slug));
  if (product === undefined) {
    notFound();
  }

  return (
    <main>
      <PanamaReportClient product={product} />
    </main>
  );
}
