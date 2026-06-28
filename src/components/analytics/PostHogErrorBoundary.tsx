import { Component } from 'react';

import type { ErrorInfo, ReactNode } from 'react';

import { CosmicBackground } from '@/components/CosmicBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { capturePostHogException } from '@/lib/posthogErrors';

interface PostHogErrorBoundaryProps {
  children: ReactNode;
  fallbackText: string;
}

interface PostHogErrorBoundaryState {
  hasError: boolean;
}

class PostHogErrorBoundaryBase extends Component<PostHogErrorBoundaryProps, PostHogErrorBoundaryState> {
  state: PostHogErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PostHogErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error);
      console.error('[ErrorBoundary component stack]', errorInfo.componentStack);
    }

    capturePostHogException(error, {
      source: 'react_error_boundary',
      feature_area: 'app',
      component_stack_present: errorInfo.componentStack ? 'true' : 'false',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="relative z-10 flex min-h-dvh min-h-screen items-center justify-center p-6">
          <CosmicBackground />
          <p className="text-sm text-muted-foreground">{this.props.fallbackText}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export const PostHogErrorBoundary = ({ children }: { children: ReactNode }) => {
  const { t } = useLanguage();

  return (
    <PostHogErrorBoundaryBase fallbackText={t.errors.generic}>
      {children}
    </PostHogErrorBoundaryBase>
  );
};
