"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { getUser } from "@/features/auth/utils";
import { Role } from "@/features/auth/types";
import { useArticles } from "@/features/articles/hooks/use-articles";
import { useDeleteArticle } from "@/features/articles/hooks/use-delete-article";
import { useLikeArticle } from "@/features/articles/hooks/use-like-article";
import { ArticleCard } from "@/features/articles/components/article-card";
import { CreateArticleDrawer } from "@/features/articles/components/create-article-drawer";
import { EditArticleDrawer } from "@/features/articles/components/edit-article-drawer";
import { SORT_OPTIONS, CATEGORY_OPTIONS } from "@/features/articles/constants";
import type { Article, ArticlesQueryParams } from "@/features/articles/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
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

export function ArticleList(): React.JSX.Element {
   const user = getUser();
   const canCreate = user?.role === Role.ADMIN || user?.role === Role.EDITOR;
   const canEdit = canCreate;
   const canDelete = user?.role === Role.ADMIN;

   const [sortBy, setSortBy] = useState<ArticlesQueryParams["sortBy"]>("date");
   const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
   const [searchQuery, setSearchQuery] = useState<string>("");
   const [page, setPage] = useState<number>(1);

   const [createOpen, setCreateOpen] = useState<boolean>(false);
   const [editArticle, setEditArticle] = useState<Article | null>(null);
   const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);

   const { data, isLoading } = useArticles({
      sortBy,
      category: categoryFilter,
      page,
   });
   const { mutate: deleteMutate, isPending: isDeleting } = useDeleteArticle({
      onSuccess: () => setDeleteTarget(null),
   });
   const { mutate: likeMutate } = useLikeArticle();

   const articles = data?.data ?? [];
   const totalPages = data?.totalPages ?? 1;
   const filteredArticles = searchQuery.trim()
      ? articles.filter((a) =>
           a.title.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : articles;

   return (
      <div className="mx-auto max-w-7xl px-4 py-8">
         <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Latest News</h1>
            {canCreate && (
               <Button onClick={() => setCreateOpen(true)}>New Article</Button>
            )}
         </div>

         <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
               <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
               <Input
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
               />
            </div>
            <Select
               value={categoryFilter}
               onValueChange={(val) => {
                  if (val) setCategoryFilter(val);
               }}
            >
               <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Category" />
               </SelectTrigger>
               <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                     <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
            <Select
               value={sortBy}
               onValueChange={(val) => {
                  if (val) setSortBy(val as ArticlesQueryParams["sortBy"]);
               }}
            >
               <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Sort" />
               </SelectTrigger>
               <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                     <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>

         {isLoading && (
            <div className="flex justify-center py-20">
               <Spinner className="size-8" />
            </div>
         )}

         {!isLoading && filteredArticles.length === 0 && (
            <p className="py-20 text-center text-muted-foreground">
               No articles found.
            </p>
         )}

         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
               <ArticleCard
                  key={article.id}
                  article={article}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={() => setEditArticle(article)}
                  onDelete={() => setDeleteTarget(article)}
                  onLike={() => likeMutate(article.id)}
               />
            ))}
         </div>

         {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
               <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
               >
                  <ChevronLeft className="size-4" />
               </Button>
               {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                     <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="icon"
                        onClick={() => setPage(pageNum)}
                     >
                        {pageNum}
                     </Button>
                  ),
               )}
               <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
               >
                  <ChevronRight className="size-4" />
               </Button>
            </div>
         )}

         <CreateArticleDrawer open={createOpen} onOpenChange={setCreateOpen} />

         {editArticle && (
            <EditArticleDrawer
               article={editArticle}
               open={!!editArticle}
               onOpenChange={(v: boolean) => {
                  if (!v) setEditArticle(null);
               }}
            />
         )}

         <AlertDialog
            open={!!deleteTarget}
            onOpenChange={(open) => {
               if (!open) setDeleteTarget(null);
            }}
         >
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Delete Article</AlertDialogTitle>
                  <AlertDialogDescription>
                     Are you sure you want to delete &quot;{deleteTarget?.title}
                     &quot;? This action cannot be undone.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                     variant="destructive"
                     disabled={isDeleting}
                     onClick={() => {
                        if (deleteTarget) deleteMutate(deleteTarget.id);
                     }}
                  >
                     {isDeleting && <Spinner className="mr-2" />}
                     Delete
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </div>
   );
}
