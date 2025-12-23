import { JSX, ReactNode } from "react";

interface ToggleGroupProps<T extends string = string> {
  type: "single" | "multiple";
  value: T;
  onValueChange: (value: T) => void;
  size?: "sm" | "lg";
  children: ReactNode;
}

interface ToggleGroupItemProps {
  value: string;
  "aria-label": string;
  children: ReactNode;
}

export declare function ToggleGroup<T extends string = string>(props: ToggleGroupProps<T>): JSX.Element;
export declare function ToggleGroupItem(props: ToggleGroupItemProps): JSX.Element;

