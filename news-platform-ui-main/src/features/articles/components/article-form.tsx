"use client";

import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
   articleSchema,
   type ArticleFormValues,
} from "@/features/articles/schemas";
import { CATEGORIES } from "@/features/articles/constants";
import type { Category } from "@/features/articles/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";

interface ArticleFormProps {
   defaultValues?: Partial<ArticleFormValues>;
   onSubmit: (data: ArticleFormValues) => void;
   isLoading: boolean;
   submitLabel: string;
   error?: string | null;
}

export function ArticleForm({
   defaultValues,
   onSubmit,
   isLoading,
   submitLabel,
   error,
}: ArticleFormProps): React.JSX.Element {
   const {
      register,
      handleSubmit,
      control,
      formState: { errors },
   } = useForm<ArticleFormValues>({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore -- zod v4.3.x minor version type mismatch with @hookform/resolvers@5.2.2
      resolver: zodResolver(articleSchema),
      defaultValues: {
         title: "",
         content: "",
         category: undefined,
         coverImage: "",
         published: false,
         ...defaultValues,
      },
   });

   const isPublished: boolean = useWatch({ control, name: "published" });

   return (
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
         <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
               id="title"
               placeholder="Article title"
               {...register("title")}
            />
            {errors.title && (
               <p className="text-xs text-destructive">
                  {errors.title.message}
               </p>
            )}
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="content">Content</Label>
            <Textarea
               id="content"
               placeholder="Article content..."
               rows={8}
               {...register("content")}
            />
            {errors.content && (
               <p className="text-xs text-destructive">
                  {errors.content.message}
               </p>
            )}
         </div>

         <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Controller
               control={control}
               name="category"
               render={({ field }) => (
                  <select
                     value={field.value ?? ""}
                     onChange={(e) => {
                        if (e.target.value)
                           field.onChange(e.target.value as Category);
                     }}
                     className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                     <option value="" disabled>
                        Select category
                     </option>
                     {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                           {cat}
                        </option>
                     ))}
                  </select>
               )}
            />
            {errors.category && (
               <p className="text-xs text-destructive">
                  {errors.category.message}
               </p>
            )}
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="coverImage">Cover Image URL</Label>
            <Input
               id="coverImage"
               placeholder="https://example.com/image.jpg"
               {...register("coverImage")}
            />
            {errors.coverImage && (
               <p className="text-xs text-destructive">
                  {errors.coverImage.message}
               </p>
            )}
         </div>

         <div className="flex items-center gap-3">
            <Controller
               control={control}
               name="published"
               render={({ field }) => (
                  <Switch
                     checked={field.value}
                     onCheckedChange={field.onChange}
                  />
               )}
            />
            <Label>{isPublished ? "Published" : "Unpublished"}</Label>
         </div>

         {error && <p className="text-sm text-destructive">{error}</p>}

         <Button type="submit" disabled={isLoading} className="self-start">
            {isLoading && <Spinner className="mr-2" />}
            {submitLabel}
         </Button>
      </form>
   );
}
