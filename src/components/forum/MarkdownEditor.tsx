import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Bold, Italic, Link, List, ListOrdered, Quote, Code, 
  Eye, Edit3, Heading1, Heading2, Heading3, Strikethrough,
  Image, Table, Minus, CheckSquare, AtSign
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MentionAutocomplete, renderMentions } from './MentionAutocomplete';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const MarkdownEditor = ({ value, onChange, placeholder, minHeight = '150px' }: MarkdownEditorProps) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { language, t } = useLanguage();
  const s = (key: SemanticKey) => resolveSemanticMessage({ key, language, translations: t });
  
  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionStartPos, setMentionStartPos] = useState<number>(0);

  const insertMarkdown = (before: string, after: string = '', newLine: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const prefix = newLine && start > 0 && value[start - 1] !== '\n' ? '\n' : '';
    const newText = value.substring(0, start) + prefix + before + selectedText + after + value.substring(end);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + before.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
    }, 0);
  };

  const insertTable = () => {
    const table = `
| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Cellule   | Cellule   | Cellule   |
| Cellule   | Cellule   | Cellule   |
`;
    insertMarkdown(table, '', true);
  };

  const toolbarGroups = [
    {
      buttons: [
        { icon: Heading1, action: () => insertMarkdown('# ', '', true), title: s('forum.markdown.toolbar.heading1') },
        { icon: Heading2, action: () => insertMarkdown('## ', '', true), title: s('forum.markdown.toolbar.heading2') },
        { icon: Heading3, action: () => insertMarkdown('### ', '', true), title: s('forum.markdown.toolbar.heading3') },
      ]
    },
    {
      buttons: [
        { icon: Bold, action: () => insertMarkdown('**', '**'), title: s('forum.markdown.toolbar.bold') },
        { icon: Italic, action: () => insertMarkdown('*', '*'), title: s('forum.markdown.toolbar.italic') },
        { icon: Strikethrough, action: () => insertMarkdown('~~', '~~'), title: s('forum.markdown.toolbar.strikethrough') },
      ]
    },
    {
      buttons: [
        { icon: List, action: () => insertMarkdown('- ', '', true), title: s('forum.markdown.toolbar.list') },
        { icon: ListOrdered, action: () => insertMarkdown('1. ', '', true), title: s('forum.markdown.toolbar.list_ordered') },
        { icon: CheckSquare, action: () => insertMarkdown('- [ ] ', '', true), title: s('forum.markdown.toolbar.task_list') },
      ]
    },
    {
      buttons: [
        { icon: Quote, action: () => insertMarkdown('> ', '', true), title: s('forum.markdown.toolbar.quote') },
        { icon: Code, action: () => insertMarkdown('`', '`'), title: s('forum.markdown.toolbar.code') },
        { icon: Minus, action: () => insertMarkdown('\n---\n', '', true), title: s('forum.markdown.toolbar.separator') },
      ]
    },
    {
      buttons: [
        { icon: Link, action: () => insertMarkdown('[', '](https://)'), title: s('forum.markdown.toolbar.link') },
        { icon: Image, action: () => insertMarkdown('![alt](', ')'), title: s('forum.markdown.toolbar.image') },
        { icon: Table, action: insertTable, title: s('forum.markdown.toolbar.table') },
        { icon: AtSign, action: () => insertMarkdown('@'), title: s('forum.markdown.toolbar.mention') },
      ]
    },
  ];

  // Handle mention detection
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    
    // Check if we're typing a mention
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setMentionStartPos(cursorPos - query.length - 1); // -1 for @
      
      // Calculate position for dropdown
      if (editorContainerRef.current && textarea) {
        // Approximate position based on cursor
        const lineHeight = 20;
        const lines = textBeforeCursor.split('\n');
        const currentLineNumber = lines.length;
        const currentLineLength = lines[lines.length - 1].length;
        
        setMentionPosition({
          top: currentLineNumber * lineHeight + 40, // offset for toolbar
          left: Math.min(currentLineLength * 8, 200), // approximate char width
        });
      }
    } else {
      setMentionQuery(null);
    }
  }, [onChange]);

  const handleMentionSelect = useCallback((username: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Replace the @query with @username
    const before = value.substring(0, mentionStartPos);
    const after = value.substring(textarea.selectionStart);
    const newValue = before + '@' + username + ' ' + after;
    
    onChange(newValue);
    setMentionQuery(null);
    
    // Move cursor after the mention
    setTimeout(() => {
      const newPos = mentionStartPos + username.length + 2; // +2 for @ and space
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [value, mentionStartPos, onChange]);

  const handleCloseMention = useCallback(() => {
    setMentionQuery(null);
  }, []);

  return (
    <div ref={editorContainerRef} className="relative border border-border rounded-lg overflow-hidden bg-card">
      <div className="flex items-center justify-between border-b border-border px-2 py-1.5 bg-muted/30 flex-wrap gap-1">
        <div className="flex items-center gap-0.5 flex-wrap">
          {toolbarGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="flex items-center">
              {group.buttons.map((btn, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  onClick={btn.action}
                  className="h-7 w-7 p-0 hover:bg-primary/20"
                  title={btn.title}
                  type="button"
                >
                  <btn.icon className="h-4 w-4" />
                </Button>
              ))}
              {groupIndex < toolbarGroups.length - 1 && (
                <div className="w-px h-5 bg-border mx-1" />
              )}
            </div>
          ))}
        </div>
        <div className="inline-flex h-7 items-center rounded-md border border-border/60 bg-transparent p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-xs ${activeTab === 'write' ? 'bg-primary/20' : ''}`}
            onClick={() => setActiveTab('write')}
          >
            <Edit3 className="h-3 w-3 mr-1" />
            {s('forum.markdown.tab.write')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-xs ${activeTab === 'preview' ? 'bg-primary/20' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <Eye className="h-3 w-3 mr-1" />
            {s('forum.markdown.tab.preview')}
          </Button>
        </div>
      </div>

      {activeTab === 'write' ? (
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            placeholder={placeholder}
            className="border-0 rounded-none focus-visible:ring-0 resize-none font-mono text-sm"
            style={{ minHeight }}
          />
          {mentionQuery !== null && (
            <MentionAutocomplete
              query={mentionQuery}
              position={mentionPosition}
              onSelect={handleMentionSelect}
              onClose={handleCloseMention}
            />
          )}
        </div>
      ) : (
        <div 
          className="prose prose-invert prose-sm max-w-none p-4 overflow-auto"
          style={{ minHeight }}
        >
          {value ? (
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2 text-foreground">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold mt-3 mb-2 text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold mt-2 mb-1 text-foreground">{children}</h3>,
                p: ({ children }) => <p className="mb-2 text-foreground/90">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-foreground/90">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/50 pl-4 my-2 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                code: ({ className, children }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">
                      {children}
                    </code>
                  ) : (
                    <code className={`${className} block bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto`}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-2">
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => {
                  // Check if this is a mention (rendered from @username)
                  const childText = String(children);
                  if (childText.startsWith('@')) {
                    return (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium text-sm">
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
                hr: () => <hr className="border-border my-4" />,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
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
                img: ({ src, alt }) => (
                  <img src={src} alt={alt || ''} className="max-w-full h-auto rounded-lg my-2" />
                ),
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">
              {s('forum.markdown.preview.empty')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
