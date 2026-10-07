"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { articlesApi } from "@/features/articles/api";
import { ARTICLES_QUERY_KEY } from "@/features/articles/constants";
import type { CreateArticlePayload, Article } from "@/features/articles/types";

interface UseCreateArticleOptions {
   onSuccess?: () => void;
}

interface UseCreateArticleReturn {
   mutate: (data: CreateArticlePayload) => void;
   isPending: boolean;
   error: Error | null;
}

export function useCreateArticle({
   onSuccess,
}: UseCreateArticleOptions = {}): UseCreateArticleReturn {
   const queryClient = useQueryClient();

   const mutation = useMutation<Article, Error, CreateArticlePayload>({
      mutationFn: (data) => articlesApi.create(data),
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
