import Image from "next/image";
import Link from "next/link";
import { Eye, Heart } from "lucide-react";
import type { Article } from "@/features/articles/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ArticleCardProps {
   article: Article;
   canEdit: boolean;
   canDelete: boolean;
   onEdit: () => void;
   onDelete: () => void;
   onLike: () => void;
}

export function ArticleCard({
   article,
   canEdit,
   canDelete,
   onEdit,
   onDelete,
   onLike,
}: ArticleCardProps): React.JSX.Element {
   return (
      <div className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
         <div className="relative aspect-16/10 w-full">
            {article.coverImage ? (
               <Image
                  src={article.coverImage}
                  alt={article.title}
                  fill
                  unoptimized
                  className="object-cover"
               />
            ) : (
               <div className="flex h-full w-full items-center justify-center bg-muted">
                  <span className="text-sm text-muted-foreground">
                     No image
                  </span>
               </div>
            )}
         </div>
         <div className="flex flex-col gap-2 p-4">
            <Badge variant="secondary" className="w-fit text-[10px]">
               {article.category}
            </Badge>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
               {article.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
               <span className="flex items-center gap-1">
                  <Eye className="size-3.5" />
                  {article.views}
               </span>
               <button
                  type="button"
                  onClick={onLike}
                  className="flex items-center gap-1 transition-colors hover:text-red-500"
               >
                  <Heart className="size-3.5" />
                  {article.likes}
               </button>
            </div>
            <div className="mt-1 flex items-center gap-2">
               <Link href={`/news/${article.id}`}>
                  <Button variant="outline" size="xs">
                     Read
                  </Button>
               </Link>
               {canEdit && (
                  <Button variant="ghost" size="xs" onClick={onEdit}>
                     Edit
                  </Button>
               )}
               {canDelete && (
                  <Button variant="destructive" size="xs" onClick={onDelete}>
                     Delete
                  </Button>
               )}
            </div>
         </div>
      </div>
   );
}
