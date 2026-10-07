import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "./label"

export const FieldGroup = React.forwardRef<
   HTMLDivElement,
   React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
   <div ref={ref} className={cn("grid gap-4", className)} {...props} />
))
FieldGroup.displayName = "FieldGroup"

export const Field = React.forwardRef<
   HTMLDivElement,
   React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
   <div ref={ref} className={cn("grid gap-2", className)} {...props} />
))
Field.displayName = "Field"

export const FieldLabel = React.forwardRef<
   React.ElementRef<typeof Label>,
   React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
   <Label ref={ref} className={cn("", className)} {...props} />
))
FieldLabel.displayName = "FieldLabel"

export const FieldDescription = React.forwardRef<
   HTMLParagraphElement,
   React.ComponentPropsWithoutRef<"p">
>(({ className, ...props }, ref) => (
   <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
   />
))
FieldDescription.displayName = "FieldDescription"
