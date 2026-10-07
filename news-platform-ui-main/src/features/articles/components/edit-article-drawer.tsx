"use client";

import { useState } from "react";
import { ArticleForm } from "@/features/articles/components/article-form";
import { useUpdateArticle } from "@/features/articles/hooks/use-update-article";
import { useDeleteArticle } from "@/features/articles/hooks/use-delete-article";
import { getUser } from "@/features/auth/utils";
import { Role } from "@/features/auth/types";
import type { Article, UpdateArticlePayload } from "@/features/articles/types";
import type { ArticleFormValues } from "@/features/articles/schemas";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
   Drawer,
   DrawerClose,
   DrawerContent,
   DrawerHeader,
   DrawerTitle,
   DrawerDescription,
} from "@/components/ui/drawer";
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";

interface EditArticleDrawerProps {
   article: Article;
   open: boolean;
   onOpenChange: (open: boolean) => void;
}

export function EditArticleDrawer({
   article,
   open,
   onOpenChange,
}: EditArticleDrawerProps): React.JSX.Element {
   const user = getUser();
   const [deleteOpen, setDeleteOpen] = useState<boolean>(false);

   const {
      mutate: updateMutate,
      isPending: isUpdating,
      error: updateError,
   } = useUpdateArticle(article.id, {
      onSuccess: () => onOpenChange(false),
   });

   const { mutate: deleteMutate, isPending: isDeleting } = useDeleteArticle({
      onSuccess: () => {
         setDeleteOpen(false);
         onOpenChange(false);
      },
   });

   const handleSubmit = (values: ArticleFormValues): void => {
      const payload: UpdateArticlePayload = {
         title: values.title,
         content: values.content,
         category: values.category,
         published: values.published,
         ...(values.coverImage ? { coverImage: values.coverImage } : {}),
      };
      updateMutate(payload);
   };

   return (
      <>
         <Drawer
            direction="right"
            open={open}
            onOpenChange={onOpenChange}
            modal={false}
         >
            <DrawerContent className="w-[30vw]! max-w-none!">
               <DrawerHeader className="flex flex-row items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                     <DrawerTitle>Edit Article</DrawerTitle>
                     <DrawerDescription>
                        Update the article details below.
                     </DrawerDescription>
                  </div>
                  <DrawerClose className="rounded-sm opacity-70 transition-opacity hover:opacity-100 cursor-pointer">
                     <X className="size-4" />
                  </DrawerClose>
               </DrawerHeader>
               <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-6">
                  <ArticleForm
                     key={article.id}
                     defaultValues={{
                        title: article.title,
                        content: article.content,
                        category: article.category,
                        coverImage: article.coverImage ?? "",
                        published: article.published,
                     }}
                     onSubmit={handleSubmit}
                     isLoading={isUpdating}
                     submitLabel="Update Article"
                     error={updateError?.message ?? null}
                  />
                  {user?.role === Role.ADMIN && (
                     <div className="mt-6 border-t pt-4">
                        <Button
                           variant="destructive"
                           onClick={() => setDeleteOpen(true)}
                        >
                           Delete Article
                        </Button>
                     </div>
                  )}
               </div>
            </DrawerContent>
         </Drawer>

         <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Delete Article</AlertDialogTitle>
                  <AlertDialogDescription>
                     Are you sure you want to delete &quot;{article.title}
                     &quot;? This action cannot be undone.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                     variant="destructive"
                     disabled={isDeleting}
                     onClick={() => deleteMutate(article.id)}
                  >
                     {isDeleting && <Spinner className="mr-2" />}
                     Delete
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   );
}
