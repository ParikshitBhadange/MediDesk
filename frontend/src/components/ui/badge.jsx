import { cn } from "@/lib/utils";

const tones = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  destructive: "bg-destructive/15 text-destructive",
  accent: "bg-accent text-accent-foreground",
};

export function Badge({ tone = "default", className, ...props }) {
  return <span className={cn("chip", tones[tone], className)} {...props} />;
}
