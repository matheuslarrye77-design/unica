"use client";

import { useQuery } from "@tanstack/react-query";
import { articlesApi } from "@/features/articles/api";
import {
   ARTICLES_QUERY_KEY,
   ARTICLES_PAGE_SIZE,
} from "@/features/articles/constants";
import type {
   ArticlesQueryParams,
   ArticlesResponse,
   Category,
} from "@/features/articles/types";

interface UseArticlesParams {
   sortBy: ArticlesQueryParams["sortBy"];
   category: string;
   page: number;
}

interface UseArticlesReturn {
   data: ArticlesResponse | undefined;
   isLoading: boolean;
}

export function useArticles({
   sortBy,
   category,
   page,
}: UseArticlesParams): UseArticlesReturn {
   const queryParams: ArticlesQueryParams = {
      sortBy,
      page,
      limit: ARTICLES_PAGE_SIZE,
      ...(category !== "ALL" && { category: category as Category }),
   };

   const { data, isLoading } = useQuery({
      queryKey: [ARTICLES_QUERY_KEY, { sortBy, category, page }],
      queryFn: () => articlesApi.getAll(queryParams),
   });

   return { data, isLoading };
}
