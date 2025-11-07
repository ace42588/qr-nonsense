import { JSX } from "react";

interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Separator(props: SeparatorProps): JSX.Element; 