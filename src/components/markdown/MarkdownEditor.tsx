import { 
  Bold, Italic, Link, List, ListOrdered, Quote, Code, 
  Eye, Edit3, Heading1, Heading2, Heading3, Strikethrough,
  Image, Table, Minus, CheckSquare, AtSign, Upload
} from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

import { MentionAutocomplete } from './MentionAutocomplete';

import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import {
  createAdvancedMarkdownImage,
  type MarkdownImageAlign,
  type MarkdownImageWidth,
} from '@/lib/markdownImages';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  enableMentions?: boolean;
  imageTools?: {
    uploadImage?: (file: File) => Promise<string>;
    maxSizeBytes?: number;
  };
}

interface ToolbarButton {
  icon: typeof Bold;
  action: () => void;
  title: string;
  id?: string;
}

const imageWidthOptions: MarkdownImageWidth[] = [25, 50, 75, 100];
const imageAlignOptions: MarkdownImageAlign[] = ['left', 'center', 'right'];

export const MarkdownEditor = ({
  value,
  onChange,
  placeholder,
  minHeight = '150px',
  enableMentions = true,
  imageTools,
}: MarkdownEditorProps) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { language, t } = useLanguage();
  const s = (key: SemanticKey) => resolveSemanticMessage({ key, language, translations: t });
  
  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionStartPos, setMentionStartPos] = useState<number>(0);
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageWidth, setImageWidth] = useState<MarkdownImageWidth>(100);
  const [imageAlign, setImageAlign] = useState<MarkdownImageAlign>('center');
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const resetImageForm = () => {
    setImageUrl('');
    setImageAlt('');
    setImageWidth(100);
    setImageAlign('center');
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleAdvancedImageInsert = () => {
    const trimmedUrl = imageUrl.trim();
    if (!trimmedUrl) return;

    insertMarkdown(
      createAdvancedMarkdownImage({
        src: trimmedUrl,
        alt: imageAlt.trim() || 'image',
        width: imageWidth,
        align: imageAlign,
      }),
      '',
      true,
    );
    setImagePopoverOpen(false);
    resetImageForm();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !imageTools?.uploadImage) return;

    if (!file.type.startsWith('image/')) {
      toast.error(s('markdown.image.invalid_type'));
      event.target.value = '';
      return;
    }

    if (imageTools.maxSizeBytes && file.size > imageTools.maxSizeBytes) {
      toast.error(s('markdown.image.invalid_size'));
      event.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const uploadedUrl = await imageTools.uploadImage(file);
      setImageUrl(uploadedUrl);
      if (!imageAlt.trim()) {
        setImageAlt(file.name.replace(/\.[^.]+$/, ''));
      }
    } catch {
      event.target.value = '';
    } finally {
      setUploadingImage(false);
    }
  };

  const toolbarGroups = [
    {
      buttons: [
        { icon: Heading1, action: () => insertMarkdown('# ', '', true), title: s('markdown.toolbar.heading1') },
        { icon: Heading2, action: () => insertMarkdown('## ', '', true), title: s('markdown.toolbar.heading2') },
        { icon: Heading3, action: () => insertMarkdown('### ', '', true), title: s('markdown.toolbar.heading3') },
      ]
    },
    {
      buttons: [
        { icon: Bold, action: () => insertMarkdown('**', '**'), title: s('markdown.toolbar.bold') },
        { icon: Italic, action: () => insertMarkdown('*', '*'), title: s('markdown.toolbar.italic') },
        { icon: Strikethrough, action: () => insertMarkdown('~~', '~~'), title: s('markdown.toolbar.strikethrough') },
      ]
    },
    {
      buttons: [
        { icon: List, action: () => insertMarkdown('- ', '', true), title: s('markdown.toolbar.list') },
        { icon: ListOrdered, action: () => insertMarkdown('1. ', '', true), title: s('markdown.toolbar.list_ordered') },
        { icon: CheckSquare, action: () => insertMarkdown('- [ ] ', '', true), title: s('markdown.toolbar.task_list') },
      ]
    },
    {
      buttons: [
        { icon: Quote, action: () => insertMarkdown('> ', '', true), title: s('markdown.toolbar.quote') },
        { icon: Code, action: () => insertMarkdown('`', '`'), title: s('markdown.toolbar.code') },
        { icon: Minus, action: () => insertMarkdown('\n---\n', '', true), title: s('markdown.toolbar.separator') },
      ]
    },
    {
      buttons: [
        { icon: Link, action: () => insertMarkdown('[', '](https://)'), title: s('markdown.toolbar.link') },
        {
          id: 'image',
          icon: Image,
          action: () => imageTools ? setImagePopoverOpen(true) : insertMarkdown('![alt](', ')'),
          title: s('markdown.toolbar.image'),
        },
        { icon: Table, action: insertTable, title: s('markdown.toolbar.table') },
        ...(enableMentions
          ? [{ icon: AtSign, action: () => insertMarkdown('@'), title: s('markdown.toolbar.mention') }]
          : []),
      ] as ToolbarButton[],
    },
  ];

  // Handle mention detection
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPos);

    if (!enableMentions) {
      setMentionQuery(null);
      return;
    }
    
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
  }, [enableMentions, onChange]);

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
                btn.id === 'image' && imageTools ? (
                  <Popover key={btn.id} open={imagePopoverOpen} onOpenChange={setImagePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-primary/20"
                        title={btn.title}
                        type="button"
                      >
                        <btn.icon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 border-border/60 bg-popover/95 p-3">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="markdown-image-url">{s('markdown.image.url')}</Label>
                          <Input
                            id="markdown-image-url"
                            value={imageUrl}
                            onChange={(event) => setImageUrl(event.target.value)}
                            placeholder="https://..."
                          />
                        </div>

                        {imageTools.uploadImage ? (
                          <div className="space-y-1.5">
                            <input
                              ref={imageInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full justify-center gap-2"
                              onClick={() => imageInputRef.current?.click()}
                              disabled={uploadingImage}
                            >
                              <Upload className="h-4 w-4" />
                              {uploadingImage ? s('markdown.image.uploading') : s('markdown.image.upload')}
                            </Button>
                          </div>
                        ) : null}

                        <div className="space-y-1.5">
                          <Label htmlFor="markdown-image-alt">{s('markdown.image.alt')}</Label>
                          <Input
                            id="markdown-image-alt"
                            value={imageAlt}
                            onChange={(event) => setImageAlt(event.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label>{s('markdown.image.width')}</Label>
                            <Select
                              value={String(imageWidth)}
                              onValueChange={(nextValue) => setImageWidth(Number(nextValue) as MarkdownImageWidth)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {imageWidthOptions.map((width) => (
                                  <SelectItem key={width} value={String(width)}>
                                    {width}%
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>{s('markdown.image.align')}</Label>
                            <Select
                              value={imageAlign}
                              onValueChange={(nextValue) => setImageAlign(nextValue as MarkdownImageAlign)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {imageAlignOptions.map((align) => (
                                  <SelectItem key={align} value={align}>
                                    {s(`markdown.image.align_${align}` as SemanticKey)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button
                          type="button"
                          className="w-full"
                          onClick={handleAdvancedImageInsert}
                          disabled={!imageUrl.trim() || uploadingImage}
                        >
                          {s('markdown.image.insert')}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Button
                    key={`${btn.title}-${i}`}
                    variant="ghost"
                    size="sm"
                    onClick={btn.action}
                    className="h-7 w-7 p-0 hover:bg-primary/20"
                    title={btn.title}
                    type="button"
                  >
                    <btn.icon className="h-4 w-4" />
                  </Button>
                )
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
            {s('markdown.tab.write')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-xs ${activeTab === 'preview' ? 'bg-primary/20' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <Eye className="h-3 w-3 mr-1" />
            {s('markdown.tab.preview')}
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
          {enableMentions && mentionQuery !== null && (
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
          className="p-4 overflow-auto"
          style={{ minHeight }}
        >
          {value ? (
            <MarkdownContent content={value} className="prose-sm" />
          ) : (
            <p className="text-muted-foreground italic">
              {s('markdown.preview.empty')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
