import { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { log } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary component to catch rendering errors and async operation failures
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    log.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Card/Alert components are JSX files without proper TypeScript types, so we cast to any
      const CardAny = Card as any;
      const CardHeaderAny = CardHeader as any;
      const CardTitleAny = CardTitle as any;
      const CardContentAny = CardContent as any;
      const AlertAny = Alert as any;
      const AlertTitleAny = AlertTitle as any;
      const AlertDescriptionAny = AlertDescription as any;

      return (
        <CardAny className="w-full max-w-2xl mx-auto mt-8">
          <CardHeaderAny>
            <CardTitleAny className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Something went wrong
            </CardTitleAny>
          </CardHeaderAny>
          <CardContentAny>
            <AlertAny variant="destructive" className="mb-4">
              <AlertTitleAny>Error</AlertTitleAny>
              <AlertDescriptionAny>
                {this.state.error?.message || "An unexpected error occurred"}
              </AlertDescriptionAny>
            </AlertAny>
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                  {this.state.error?.stack}
                  {"\n\n"}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Try Again
            </button>
          </CardContentAny>
        </CardAny>
      );
    }

    return this.props.children;
  }
}

