import * as React from "react";

interface ToggleGroupBaseProps<T extends string = string> extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  children?: React.ReactNode;
}

export type ToggleGroupProps<T extends string = string> =
  | (ToggleGroupBaseProps<T> & {
      type: "single";
      value?: T;
      onValueChange?: (value: T) => void;
    })
  | (ToggleGroupBaseProps<T> & {
      type: "multiple";
      value?: T[];
      onValueChange?: (value: T[]) => void;
    });

export interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  children?: React.ReactNode;
}

export function ToggleGroup<T extends string = string>(
  props: ToggleGroupProps<T> & React.RefAttributes<HTMLDivElement>
): React.ReactElement | null;
export const ToggleGroupItem: React.ForwardRefExoticComponent<ToggleGroupItemProps & React.RefAttributes<HTMLButtonElement>>;
