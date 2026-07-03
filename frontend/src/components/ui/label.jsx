import { cn } from "@/lib/utils";

export function Label({ className, ...props }) {
  return <label className={cn("text-xs font-medium text-foreground mb-1 block", className)} {...props} />;
}
