"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Eye, Heart, Tag } from "lucide-react";
import { useArticleDetail } from "@/features/articles/hooks/use-article-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ROUTES } from "@/lib/constants";

function formatDate(dateStr: string): string {
   return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
   });
}

interface ArticleDetailProps {
   id: string;
}

export function ArticleDetail({ id }: ArticleDetailProps): React.JSX.Element {
   const { article, isLoading } = useArticleDetail(id);

   if (isLoading) {
      return (
         <div className="flex justify-center py-32">
            <Spinner className="size-8" />
         </div>
      );
   }

   if (!article) {
      return (
         <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            <h1 className="text-2xl font-bold">Article not found</h1>
            <Link href={ROUTES.NEWS}>
               <Button variant="outline" className="mt-4">
                  Back to News
               </Button>
            </Link>
         </div>
      );
   }

   const publishedDate = article.publishedAt
      ? formatDate(article.publishedAt)
      : null;
   const createdDate = formatDate(article.createdAt);
   const updatedDate = formatDate(article.updatedAt);

   return (
      <div className="mx-auto max-w-6xl px-4 py-8">
         <Link
            href={ROUTES.NEWS}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
         >
            <ArrowLeft className="size-4" />
            Back to News
         </Link>

         <h1 className="mb-6 text-3xl font-bold leading-tight lg:text-4xl">
            {article.title}
         </h1>

         {article.coverImage && (
            <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-xl">
               <Image
                  src={article.coverImage}
                  alt={article.title}
                  fill
                  unoptimized
                  className="object-cover"
               />
            </div>
         )}

         <div className="flex flex-col gap-8 lg:flex-row">
            <article className="min-w-0 flex-1">
               <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
                  {article.content}
               </div>
            </article>

            <aside className="w-full shrink-0 lg:w-72">
               <div className="sticky top-20 flex flex-col gap-4 rounded-xl border bg-card p-5">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                     Article Details
                  </h3>

                  <div className="flex items-center gap-2">
                     <Tag className="size-4 text-muted-foreground" />
                     <Badge variant="secondary">{article.category}</Badge>
                  </div>

                  {publishedDate && (
                     <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span>Published {publishedDate}</span>
                     </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                     <Clock className="size-4 text-muted-foreground" />
                     <span>Created {createdDate}</span>
                  </div>

                  {updatedDate !== createdDate && (
                     <div className="flex items-center gap-2 text-sm">
                        <Clock className="size-4 text-muted-foreground" />
                        <span>Updated {updatedDate}</span>
                     </div>
                  )}

                  <div className="border-t pt-3">
                     <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                           <Eye className="size-4" />
                           {article.views} views
                        </span>
                        <span className="flex items-center gap-1.5">
                           <Heart className="size-4" />
                           {article.likes} likes
                        </span>
                     </div>
                  </div>

                  {!article.published && (
                     <Badge variant="outline" className="w-fit text-amber-600">
                        Draft
                     </Badge>
                  )}
               </div>
            </aside>
         </div>
      </div>
   );
}
