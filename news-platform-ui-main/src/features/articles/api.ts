import { apiClient } from "@/lib/api-client";
import type {
   Article,
   ArticlesResponse,
   ArticlesQueryParams,
   CreateArticlePayload,
   UpdateArticlePayload,
} from "./types";

export const articlesApi = {
   getAll: async (params?: ArticlesQueryParams): Promise<ArticlesResponse> => {
      const response = await apiClient.get<ArticlesResponse>("/articles", {
         params,
      });
      return response.data;
   },
   getOne: async (id: string): Promise<Article> => {
      const response = await apiClient.get<Article>(`/articles/${id}`);
      return response.data;
   },
   create: async (data: CreateArticlePayload): Promise<Article> => {
      const response = await apiClient.post<Article>("/articles", data);
      return response.data;
   },
   update: async (id: string, data: UpdateArticlePayload): Promise<Article> => {
      const response = await apiClient.patch<Article>(`/articles/${id}`, data);
      return response.data;
   },
   remove: async (id: string): Promise<Article> => {
      const response = await apiClient.delete<Article>(`/articles/${id}`);
      return response.data;
   },
   like: async (id: string): Promise<Article> => {
      const response = await apiClient.post<Article>(`/articles/${id}/like`);
      return response.data;
   },
};
