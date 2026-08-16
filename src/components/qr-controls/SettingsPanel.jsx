import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * Shared settings shell replacing ad-hoc gray inline panels.
 * Use collapsible + defaultOpen={false} for progressive disclosure.
 */
export function SettingsPanel({
  title,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
}) {
  const body = <div className="grid gap-3">{children}</div>;

  if (collapsible) {
    return (
      <Collapsible
        defaultOpen={defaultOpen}
        className={cn(
          "group/settings mt-4 rounded-lg border bg-muted/50",
          className
        )}
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted/80 rounded-lg">
          {title}
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/settings:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">{body}</CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className={cn("mt-4 rounded-lg border bg-muted/50 p-4", className)}>
      {title ? (
        <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      ) : null}
      {body}
    </div>
  );
}

/** Labeled control row for settings panels. */
export function ControlRow({ label, htmlFor, hint, children, className }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="min-w-[7.5rem] text-sm text-muted-foreground"
        >
          {label}
        </label>
      ) : null}
      {children}
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}
