import { JSX, ReactNode } from "react";

interface SidebarProviderProps {
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface SidebarInsetProps {
  children: ReactNode;
  className?: string;
}

interface SidebarTriggerProps {
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export declare function SidebarProvider(props: SidebarProviderProps): JSX.Element;
export declare function SidebarInset(props: SidebarInsetProps): JSX.Element;
export declare function SidebarTrigger(props: SidebarTriggerProps): JSX.Element;

