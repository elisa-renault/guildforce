import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bold, Italic, Link, List, ListOrdered, Quote, Code, 
  Eye, Edit3, Heading1, Heading2, Heading3, Strikethrough,
  Image, Table, Minus, CheckSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const MarkdownEditor = ({ value, onChange, placeholder, minHeight = '150px' }: MarkdownEditorProps) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { language } = useLanguage();

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
        { icon: Heading1, action: () => insertMarkdown('# ', '', true), title: language === 'fr' ? 'Titre 1' : 'Heading 1' },
        { icon: Heading2, action: () => insertMarkdown('## ', '', true), title: language === 'fr' ? 'Titre 2' : 'Heading 2' },
        { icon: Heading3, action: () => insertMarkdown('### ', '', true), title: language === 'fr' ? 'Titre 3' : 'Heading 3' },
      ]
    },
    {
      buttons: [
        { icon: Bold, action: () => insertMarkdown('**', '**'), title: language === 'fr' ? 'Gras' : 'Bold' },
        { icon: Italic, action: () => insertMarkdown('*', '*'), title: language === 'fr' ? 'Italique' : 'Italic' },
        { icon: Strikethrough, action: () => insertMarkdown('~~', '~~'), title: language === 'fr' ? 'Barré' : 'Strikethrough' },
      ]
    },
    {
      buttons: [
        { icon: List, action: () => insertMarkdown('- ', '', true), title: language === 'fr' ? 'Liste à puces' : 'Bullet list' },
        { icon: ListOrdered, action: () => insertMarkdown('1. ', '', true), title: language === 'fr' ? 'Liste numérotée' : 'Numbered list' },
        { icon: CheckSquare, action: () => insertMarkdown('- [ ] ', '', true), title: language === 'fr' ? 'Liste de tâches' : 'Task list' },
      ]
    },
    {
      buttons: [
        { icon: Quote, action: () => insertMarkdown('> ', '', true), title: language === 'fr' ? 'Citation' : 'Quote' },
        { icon: Code, action: () => insertMarkdown('`', '`'), title: language === 'fr' ? 'Code inline' : 'Inline code' },
        { icon: Minus, action: () => insertMarkdown('\n---\n', '', true), title: language === 'fr' ? 'Séparateur' : 'Divider' },
      ]
    },
    {
      buttons: [
        { icon: Link, action: () => insertMarkdown('[', '](https://)'), title: language === 'fr' ? 'Lien' : 'Link' },
        { icon: Image, action: () => insertMarkdown('![alt](', ')'), title: language === 'fr' ? 'Image' : 'Image' },
        { icon: Table, action: insertTable, title: language === 'fr' ? 'Tableau' : 'Table' },
      ]
    },
  ];

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'write' | 'preview')}>
          <TabsList className="h-7 bg-transparent">
            <TabsTrigger value="write" className="h-6 px-2 text-xs data-[state=active]:bg-primary/20">
              <Edit3 className="h-3 w-3 mr-1" />
              {language === 'fr' ? 'Écrire' : 'Write'}
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-6 px-2 text-xs data-[state=active]:bg-primary/20">
              <Eye className="h-3 w-3 mr-1" />
              {language === 'fr' ? 'Aperçu' : 'Preview'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'write' ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="border-0 rounded-none focus-visible:ring-0 resize-none font-mono text-sm"
          style={{ minHeight }}
        />
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
                a: ({ href, children }) => (
                  <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
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
              {language === 'fr' ? 'Rien à prévisualiser' : 'Nothing to preview'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
