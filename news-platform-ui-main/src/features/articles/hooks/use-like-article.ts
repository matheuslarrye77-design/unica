"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { articlesApi } from "@/features/articles/api";
import { ARTICLES_QUERY_KEY } from "@/features/articles/constants";
import type { Article } from "@/features/articles/types";

interface UseLikeArticleReturn {
   mutate: (id: string) => void;
   isPending: boolean;
}

export function useLikeArticle(): UseLikeArticleReturn {
   const queryClient = useQueryClient();

   const mutation = useMutation<Article, Error, string>({
      mutationFn: (id) => articlesApi.like(id),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: [ARTICLES_QUERY_KEY] });
      },
   });

   return {
      mutate: mutation.mutate,
      isPending: mutation.isPending,
   };
}
