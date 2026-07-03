import { Children, createContext, isValidElement, useContext, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight native-<select>-backed replacement for Radix Select, kept
// API-compatible with the shadcn pattern used across the app:
//   <Select value onValueChange>
//     <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
//     <SelectContent><SelectItem value="x">X</SelectItem></SelectContent>
//   </Select>
const SelectContext = createContext(null);

function extractItems(children) {
  const items = [];
  let placeholder;

  function walk(nodes) {
    Children.forEach(nodes, (node) => {
      if (!isValidElement(node)) return;
      if (node.type === SelectItem) {
        items.push({ value: node.props.value, label: node.props.children });
      } else if (node.type === SelectValue && node.props.placeholder) {
        placeholder = node.props.placeholder;
      } else if (node.props?.children) {
        walk(node.props.children);
      }
    });
  }
  walk(children);
  return { items, placeholder };
}

export function Select({ value, onValueChange, children }) {
  const { items, placeholder } = useMemo(() => extractItems(children), [children]);
  return (
    <SelectContext.Provider value={{ value, onValueChange, items, placeholder }}>
      {children}
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className }) {
  const { value, onValueChange, items, placeholder } = useContext(SelectContext);
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(
          "flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 py-1 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

// Rendering is handled entirely by SelectTrigger; these exist only so JSX
// authored in the shadcn style still type-checks and reads naturally.
export function SelectValue() {
  return null;
}
export function SelectContent({ children }) {
  return <>{children}</>;
}
export function SelectItem() {
  return null;
}
