"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
}

export class DashboardWidgetBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("FGC Stream dashboard widget failed", {
      error,
      componentStack: info.componentStack,
      label: this.props.label,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="rounded-card border border-dashed border-arena-600 p-5 text-sm text-ink-muted" role="status">
        <p>{this.props.label ?? "This dashboard section"} is temporarily unavailable.</p>
        <button type="button" onClick={this.handleRetry} className="action-secondary mt-3 min-h-10 px-4">
          Retry
        </button>
      </div>
    );
  }
}
