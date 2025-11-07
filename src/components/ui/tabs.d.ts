import { JSX } from "react";

interface TabsProps {
  defaultValue?: string;
  className?: string;
  children: React.ReactNode;
}

interface TabsListProps {
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
}

export function Tabs(props: TabsProps): JSX.Element;
export function TabsList(props: TabsListProps): JSX.Element;
export function TabsTrigger(props: TabsTriggerProps): JSX.Element;
export function TabsContent(props: TabsContentProps): JSX.Element; 