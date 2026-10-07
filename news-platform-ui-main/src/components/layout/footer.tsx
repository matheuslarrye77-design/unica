export function Footer() {
   return (
      <footer className="border-t bg-muted/40">
         <div className="mx-auto flex h-14 max-w-7xl items-center justify-center px-4">
            <p className="text-sm text-muted-foreground">
               &copy; {new Date().getFullYear()} News Platform. All rights
               reserved.
            </p>
         </div>
      </footer>
   );
}
