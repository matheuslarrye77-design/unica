"use client";

import { use } from "react";
import { ArticleDetail } from "@/features/articles/components/article-detail";

export default function ArticleDetailPage({
   params,
}: {
   params: Promise<{ id: string }>;
}): React.JSX.Element {
   const { id } = use(params);
   return <ArticleDetail id={id} />;
}
