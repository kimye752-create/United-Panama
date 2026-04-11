import { notFound } from "next/navigation";

import { Report1 } from "@/components/Report1";
import { findProductByInnSlug } from "@/src/logic/inn_slug";
import { analyzePanamaProduct } from "@/src/logic/panama_analysis";

type Props = {
  params: { inn: string };
};

export default async function PanamaReportPage({ params }: Props) {
  const slug = params.inn ?? "";
  const product = findProductByInnSlug(decodeURIComponent(slug));
  if (product === undefined) {
    notFound();
  }

  let data;
  try {
    data = await analyzePanamaProduct(product.product_id);
  } catch {
    notFound();
  }

  return (
    <main>
      <Report1 data={data} />
    </main>
  );
}
