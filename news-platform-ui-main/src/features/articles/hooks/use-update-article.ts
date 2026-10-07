"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { articlesApi } from "@/features/articles/api";
import { ARTICLES_QUERY_KEY } from "@/features/articles/constants";
import type { UpdateArticlePayload, Article } from "@/features/articles/types";

interface UseUpdateArticleOptions {
   onSuccess?: () => void;
}

interface UseUpdateArticleReturn {
   mutate: (data: UpdateArticlePayload) => void;
   isPending: boolean;
   error: Error | null;
}

export function useUpdateArticle(
   articleId: string,
   { onSuccess }: UseUpdateArticleOptions = {},
): UseUpdateArticleReturn {
   const queryClient = useQueryClient();

   const mutation = useMutation<Article, Error, UpdateArticlePayload>({
      mutationFn: (data) => articlesApi.update(articleId, data),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: [ARTICLES_QUERY_KEY] });
         onSuccess?.();
      },
   });

   return {
      mutate: mutation.mutate,
      isPending: mutation.isPending,
      error: mutation.error,
   };
}
