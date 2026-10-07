import { Category } from "./types";

export const ARTICLES_QUERY_KEY = "articles" as const;
export const ARTICLE_QUERY_KEY = "article" as const;

export const ARTICLES_PAGE_SIZE = 12;

export const SORT_OPTIONS = [
   { label: "Newest", value: "date" },
   { label: "Most Viewed", value: "views" },
   { label: "Most Liked", value: "likes" },
] as const;

export const CATEGORY_OPTIONS = [
   { label: "All", value: "ALL" },
   ...Object.values(Category).map((c) => ({ label: c, value: c })),
] as const;

export const CATEGORIES = Object.values(Category);
