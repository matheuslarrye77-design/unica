import { z } from "zod";
import { Category } from "./types";

export const articleSchema = z.object({
   title: z.string().min(3, "Title must be at least 3 characters"),
   content: z.string().min(10, "Content must be at least 10 characters"),
   category: z.nativeEnum(Category, { error: "Please select a category" }),
   coverImage: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
   published: z.boolean(),
});

export type ArticleFormValues = z.infer<typeof articleSchema>;
