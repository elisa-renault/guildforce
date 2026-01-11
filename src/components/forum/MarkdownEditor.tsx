import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bold, Italic, Link, List, Quote, Code, Eye, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const MarkdownEditor = ({ value, onChange, placeholder, minHeight = '150px' }: MarkdownEditorProps) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown('**', '**'), title: 'Gras' },
    { icon: Italic, action: () => insertMarkdown('*', '*'), title: 'Italique' },
    { icon: Link, action: () => insertMarkdown('[', '](url)'), title: 'Lien' },
    { icon: List, action: () => insertMarkdown('\n- '), title: 'Liste' },
    { icon: Quote, action: () => insertMarkdown('\n> '), title: 'Citation' },
    { icon: Code, action: () => insertMarkdown('`', '`'), title: 'Code' },
  ];

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="flex items-center justify-between border-b border-border px-2 py-1 bg-muted/30">
        <div className="flex items-center gap-1">
          {toolbarButtons.map((btn, i) => (
            <Button
              key={i}
              variant="ghost"
              size="sm"
              onClick={btn.action}
              className="h-7 w-7 p-0"
              title={btn.title}
              type="button"
            >
              <btn.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'write' | 'preview')}>
          <TabsList className="h-7 bg-transparent">
            <TabsTrigger value="write" className="h-6 px-2 text-xs data-[state=active]:bg-primary/20">
              <Edit3 className="h-3 w-3 mr-1" />
              Écrire
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-6 px-2 text-xs data-[state=active]:bg-primary/20">
              <Eye className="h-3 w-3 mr-1" />
              Aperçu
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'write' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="border-0 rounded-none focus-visible:ring-0 resize-none"
          style={{ minHeight }}
        />
      ) : (
        <div 
          className="prose prose-invert prose-sm max-w-none p-3 overflow-auto"
          style={{ minHeight }}
        >
          {value ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">Rien à prévisualiser</p>
          )}
        </div>
      )}
    </div>
  );
};
