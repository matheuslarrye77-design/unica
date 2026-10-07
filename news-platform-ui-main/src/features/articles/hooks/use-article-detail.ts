"use client";

import { useQuery } from "@tanstack/react-query";
import { articlesApi } from "@/features/articles/api";
import { ARTICLE_QUERY_KEY } from "@/features/articles/constants";
import type { Article } from "@/features/articles/types";

interface UseArticleDetailReturn {
   article: Article | undefined;
   isLoading: boolean;
}

export function useArticleDetail(id: string): UseArticleDetailReturn {
   const { data: article, isLoading } = useQuery({
      queryKey: [ARTICLE_QUERY_KEY, id],
      queryFn: () => articlesApi.getOne(id),
   });

   return { article, isLoading };
}
