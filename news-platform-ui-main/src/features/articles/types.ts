export enum Category {
   SPORTS = "SPORTS",
   BUSINESS = "BUSINESS",
   ENTERTAINMENT = "ENTERTAINMENT",
   TECHNOLOGY = "TECHNOLOGY",
   POLITICS = "POLITICS",
   HEALTH = "HEALTH",
}

export interface Article {
   id: string;
   title: string;
   slug: string;
   content: string;
   coverImage: string | null;
   category: Category;
   views: number;
   likes: number;
   published: boolean;
   publishedAt: string | null;
   createdAt: string;
   updatedAt: string;
   authorId: string;
}

export interface ArticlesResponse {
   data: Article[];
   total: number;
   page: number;
   limit: number;
   totalPages: number;
}

export interface ArticlesQueryParams {
   sortBy?: "date" | "views" | "likes";
   category?: Category;
   page?: number;
   limit?: number;
}

export interface CreateArticlePayload {
   title: string;
   content: string;
   category: Category;
   coverImage?: string;
   published?: boolean;
}

export interface UpdateArticlePayload {
   title?: string;
   content?: string;
   category?: Category;
   coverImage?: string;
   published?: boolean;
}
