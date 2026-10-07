"use client";

import { ArticleForm } from "@/features/articles/components/article-form";
import { useCreateArticle } from "@/features/articles/hooks/use-create-article";
import type { ArticleFormValues } from "@/features/articles/schemas";
import type { CreateArticlePayload } from "@/features/articles/types";
import {
   Drawer,
   DrawerClose,
   DrawerContent,
   DrawerHeader,
   DrawerTitle,
   DrawerDescription,
} from "@/components/ui/drawer";
import { X } from "lucide-react";

interface CreateArticleDrawerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function CreateArticleDrawer({
   open,
   onOpenChange,
}: CreateArticleDrawerProps): React.JSX.Element {
   const { mutate, isPending, error } = useCreateArticle({
      onSuccess: () => onOpenChange(false),
   });

   const handleSubmit = (values: ArticleFormValues): void => {
      const payload: CreateArticlePayload = {
         title: values.title,
         content: values.content,
         category: values.category,
         published: values.published,
         ...(values.coverImage ? { coverImage: values.coverImage } : {}),
      };
      mutate(payload);
   };

   return (
      <Drawer
         direction="right"
         open={open}
         onOpenChange={onOpenChange}
         modal={false}
      >
         <DrawerContent className="w-[30vw]! max-w-none!">
            <DrawerHeader className="flex flex-row items-start justify-between">
               <div className="flex flex-col gap-0.5">
                  <DrawerTitle>Create Article</DrawerTitle>
                  <DrawerDescription>
                     Fill in the details below to create a new article.
                  </DrawerDescription>
               </div>
               <DrawerClose className="rounded-sm opacity-70 transition-opacity hover:opacity-100 cursor-pointer">
                  <X className="size-4" />
               </DrawerClose>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
               <ArticleForm
                  onSubmit={handleSubmit}
                  isLoading={isPending}
                  submitLabel="Create Article"
                  error={error?.message ?? null}
               />
            </div>
         </DrawerContent>
      </Drawer>
   );
}
