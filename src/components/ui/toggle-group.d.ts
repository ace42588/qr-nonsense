import { JSX } from "react";

interface ToggleGroupProps<T extends string = string> {
  type: "single" | "multiple";
  value: T;
  onValueChange: (value: T) => void;
  size?: "sm" | "lg";
  children: React.ReactNode;
}

interface ToggleGroupItemProps {
  value: string;
  "aria-label": string;
  children: React.ReactNode;
}

export function ToggleGroup<T extends string = string>(props: ToggleGroupProps<T>): JSX.Element;
export function ToggleGroupItem(props: ToggleGroupItemProps): JSX.Element; 