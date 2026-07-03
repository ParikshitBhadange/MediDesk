import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("surface-card", className)} {...props} />;
}
