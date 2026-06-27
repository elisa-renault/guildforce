import ReactMarkdown, { type Components } from 'react-markdown';

import { parseMarkdownImageTitle, prepareMarkdownImageAttributes } from '@/lib/markdownImages';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  content: string;
  emptyText?: string;
  className?: string;
  emptyClassName?: string;
}

const imageAlignClass = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
} as const;

const markdownContentComponents: Components = {
  h1: ({ children }) => <h1 className="mt-4 mb-2 text-2xl font-bold text-foreground">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-3 mb-2 text-xl font-bold text-foreground">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-2 mb-1 text-lg font-semibold text-foreground">{children}</h3>,
  p: ({ children }) => <p className="mb-2 text-foreground/90">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-inside list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-inside list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => (
    <li className="text-foreground/90 [&>p:first-child]:inline [&>p:first-child]:mb-0">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-4 border-primary/50 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isInline = !className;
    return isInline ? (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-primary">
        {children}
      </code>
    ) : (
      <code className={cn(className, 'block overflow-x-auto rounded-lg bg-muted p-3 font-mono text-sm')}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-muted p-3">
      {children}
    </pre>
  ),
  a: ({ href, children }) => {
    if (href?.startsWith('/profile/')) {
      return (
        <span className="inline-flex cursor-pointer items-center rounded bg-primary/20 px-1.5 py-0.5 text-sm font-medium text-primary transition-colors hover:bg-primary/30">
          {children}
        </span>
      );
    }

    return (
      <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  hr: () => <hr className="my-4 border-border" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse border border-border">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-muted/50 px-3 py-2 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-2">
      {children}
    </td>
  ),
  img: ({ src, alt, title }) => {
    const imageOptions = parseMarkdownImageTitle(title);

    return (
      <img
        src={src || ''}
        alt={alt || ''}
        className={cn(
          'my-3 block h-auto max-w-full rounded-lg border border-border/35 bg-card/30 object-contain',
          imageAlignClass[imageOptions.align],
        )}
        style={{ width: `${imageOptions.width}%` }}
      />
    );
  },
};

export const MarkdownContent = ({
  content,
  emptyText,
  className,
  emptyClassName,
}: MarkdownContentProps) => {
  const preparedContent = prepareMarkdownImageAttributes(content);

  if (!preparedContent.trim()) {
    return emptyText ? (
      <p className={cn('text-muted-foreground', emptyClassName)}>{emptyText}</p>
    ) : null;
  }

  return (
    <div className={cn('prose prose-invert max-w-none prose-headings:tracking-normal prose-a:text-primary prose-code:text-primary', className)}>
      <ReactMarkdown components={markdownContentComponents}>
        {preparedContent}
      </ReactMarkdown>
    </div>
  );
};
