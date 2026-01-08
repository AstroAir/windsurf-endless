import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Markdown renderer component with GitHub Flavored Markdown support
 * Safely renders markdown content with proper styling
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Custom component renderers for better styling
          h1: ({ ...props }) => <h1 className="text-lg font-bold mb-2 mt-3" {...props} />,
          h2: ({ ...props }) => <h2 className="text-base font-bold mb-2 mt-3" {...props} />,
          h3: ({ ...props }) => <h3 className="text-sm font-semibold mb-1 mt-2" {...props} />,
          p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
          ul: ({ ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
          li: ({ ...props }) => <li className="ml-2" {...props} />,
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono border"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={`block bg-muted p-2 rounded text-xs font-mono overflow-x-auto border ${className || ''}`}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ ...props }) => <pre className="mb-2 overflow-x-auto" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-4 border-muted-foreground/30 pl-3 italic my-2" {...props} />
          ),
          a: ({ ...props }) => (
            <a
              className="text-primary underline hover:text-primary/80"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
          em: ({ ...props }) => <em className="italic" {...props} />,
          hr: ({ ...props }) => <hr className="my-3 border-muted-foreground/30" {...props} />,
          table: ({ ...props }) => (
            <div className="overflow-x-auto mb-2">
              <table className="min-w-full border-collapse border border-muted" {...props} />
            </div>
          ),
          thead: ({ ...props }) => <thead className="bg-muted" {...props} />,
          th: ({ ...props }) => <th className="border border-muted px-2 py-1 text-left font-semibold" {...props} />,
          td: ({ ...props }) => <td className="border border-muted px-2 py-1" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
