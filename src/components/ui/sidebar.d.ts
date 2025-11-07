import { JSX } from "react";

interface SidebarProviderProps {
  children: React.ReactNode;
}

interface SidebarInsetProps {
  children: React.ReactNode;
}

interface SidebarTriggerProps {
  className?: string;
}

export function SidebarProvider(props: SidebarProviderProps): JSX.Element;
export function SidebarInset(props: SidebarInsetProps): JSX.Element;
export function SidebarTrigger(props: SidebarTriggerProps): JSX.Element; 