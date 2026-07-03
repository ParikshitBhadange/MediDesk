import { cn } from "@/lib/utils";

export function Checkbox({ checked, onCheckedChange, className, ...props }) {
  return (
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn("h-4 w-4 rounded border-input accent-primary cursor-pointer", className)}
      {...props}
    />
  );
}
