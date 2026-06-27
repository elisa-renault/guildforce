import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AtSign,
  Bold,
  CheckSquare,
  Code,
  Edit3,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Table as TableIcon,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { AtlasMarkdownImage } from './AtlasMarkdownImage';
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
  normalizeMarkdownImageWidth,
  prepareMarkdownImageAttributes,
  type MarkdownImageAlign,
  type MarkdownImageWidth,
} from '@/lib/markdownImages';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  enableMentions?: boolean;
  visual?: boolean;
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

type EditorMode = 'visual' | 'source' | 'preview';

const imageWidthOptions: MarkdownImageWidth[] = [25, 50, 75, 100];
const imageAlignOptions: MarkdownImageAlign[] = ['left', 'center', 'right'];

const tableMarkdown = `
| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Cellule   | Cellule   | Cellule   |
| Cellule   | Cellule   | Cellule   |
`;

const createVisualExtensions = (placeholder?: string) => [
  StarterKit.configure({
    link: false,
  }),
  LinkExtension.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-primary underline underline-offset-2',
    },
  }),
  TaskList.configure({
    HTMLAttributes: {
      class: 'not-prose mb-2 space-y-1',
    },
  }),
  TaskItem.configure({
    nested: true,
    HTMLAttributes: {
      class: 'flex items-start gap-2 text-foreground/90',
    },
  }),
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: 'min-w-full border-collapse border border-border',
    },
  }),
  TableRow,
  TableHeader.configure({
    HTMLAttributes: {
      class: 'border border-border bg-muted/50 px-3 py-2 text-left font-semibold',
    },
  }),
  TableCell.configure({
    HTMLAttributes: {
      class: 'border border-border px-3 py-2',
    },
  }),
  AtlasMarkdownImage.configure({
    resize: {
      enabled: true,
      directions: ['bottom-left', 'bottom-right', 'top-left', 'top-right', 'left', 'right'],
      minWidth: 80,
      minHeight: 40,
      alwaysPreserveAspectRatio: true,
    },
  }),
  Placeholder.configure({
    placeholder,
  }),
  Markdown.configure({
    markedOptions: {
      gfm: true,
    },
  }),
];

const getMarkdownFromEditor = (editor: Editor) => editor.getMarkdown().trimEnd();

const markdownToEditorContent = (markdown: string) => prepareMarkdownImageAttributes(markdown);

export const MarkdownEditor = ({
  value,
  onChange,
  placeholder,
  minHeight = '150px',
  enableMentions = true,
  visual = false,
  imageTools,
}: MarkdownEditorProps) => {
  const [activeMode, setActiveMode] = useState<EditorMode>(visual ? 'visual' : 'source');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const { language, t } = useLanguage();
  const s = (key: SemanticKey) => resolveSemanticMessage({ key, language, translations: t });

  const visualExtensions = useMemo(() => createVisualExtensions(placeholder), [placeholder]);
  const visualEditor = useEditor(
    {
      extensions: visualExtensions,
      content: markdownToEditorContent(value),
      contentType: 'markdown',
      editable: activeMode === 'visual',
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm prose-invert max-w-none prose-headings:tracking-normal prose-a:text-primary',
            'min-h-full p-4 text-sm outline-none focus:outline-none',
          ),
        },
      },
      onUpdate: ({ editor }) => {
        const nextValue = getMarkdownFromEditor(editor);
        valueRef.current = nextValue;
        onChange(nextValue);
      },
    },
    [visualExtensions],
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!visualEditor) return;
    visualEditor.setEditable(activeMode === 'visual');
  }, [activeMode, visualEditor]);

  useEffect(() => {
    if (!visual || !visualEditor || value === valueRef.current) return;

    visualEditor.commands.setContent(markdownToEditorContent(value), {
      contentType: 'markdown',
      emitUpdate: false,
    });
  }, [value, visual, visualEditor]);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionStartPos, setMentionStartPos] = useState<number>(0);
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageWidth, setImageWidth] = useState<MarkdownImageWidth>(100);
  const [imageAlign, setImageAlign] = useState<MarkdownImageAlign>('center');
  const [uploadingImage, setUploadingImage] = useState(false);

  const insertSourceMarkdown = useCallback((before: string, after: string = '', newLine: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const prefix = newLine && start > 0 && value[start - 1] !== '\n' ? '\n' : '';
    const newText = value.substring(0, start) + prefix + before + selectedText + after + value.substring(end);
    onChange(newText);

    window.setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + before.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
    }, 0);
  }, [onChange, value]);

  const insertVisualMarkdown = useCallback((markdown: string) => {
    if (!visualEditor) return;
    visualEditor.chain().focus().insertContent(markdownToEditorContent(markdown), { contentType: 'markdown' }).run();
  }, [visualEditor]);

  const insertMarkdown = useCallback((before: string, after: string = '', newLine: boolean = false) => {
    if (visual && activeMode === 'visual') {
      insertVisualMarkdown(`${newLine ? '\n' : ''}${before}${after}`);
      return;
    }

    insertSourceMarkdown(before, after, newLine);
  }, [activeMode, insertSourceMarkdown, insertVisualMarkdown, visual]);

  const resetImageForm = () => {
    setImageUrl('');
    setImageAlt('');
    setImageWidth(100);
    setImageAlign('center');
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const insertImage = () => {
    const trimmedUrl = imageUrl.trim();
    if (!trimmedUrl) return;

    const alt = imageAlt.trim() || 'image';
    const width = normalizeMarkdownImageWidth(imageWidth);

    if (visual && activeMode === 'visual' && visualEditor) {
      visualEditor
        .chain()
        .focus()
        .setImage({
          src: trimmedUrl,
          alt,
          width,
        })
        .updateAttributes('image', {
          align: imageAlign,
          width,
        })
        .run();
    } else {
      insertSourceMarkdown(
        createAdvancedMarkdownImage({
          src: trimmedUrl,
          alt,
          width,
          align: imageAlign,
        }),
        '',
        true,
      );
    }

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

  const runVisualCommand = (command: (editor: Editor) => void, sourceFallback: () => void) => {
    if (visual && activeMode === 'visual' && visualEditor) {
      command(visualEditor);
      return;
    }

    sourceFallback();
  };

  const toolbarGroups = [
    {
      buttons: [
        {
          icon: Heading1,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
            () => insertSourceMarkdown('# ', '', true),
          ),
          title: s('markdown.toolbar.heading1'),
        },
        {
          icon: Heading2,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
            () => insertSourceMarkdown('## ', '', true),
          ),
          title: s('markdown.toolbar.heading2'),
        },
        {
          icon: Heading3,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
            () => insertSourceMarkdown('### ', '', true),
          ),
          title: s('markdown.toolbar.heading3'),
        },
      ],
    },
    {
      buttons: [
        {
          icon: Bold,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().toggleBold().run(),
            () => insertSourceMarkdown('**', '**'),
          ),
          title: s('markdown.toolbar.bold'),
        },
        {
          icon: Italic,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().toggleItalic().run(),
            () => insertSourceMarkdown('*', '*'),
          ),
          title: s('markdown.toolbar.italic'),
        },
        {
          icon: Strikethrough,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().toggleStrike().run(),
            () => insertSourceMarkdown('~~', '~~'),
          ),
          title: s('markdown.toolbar.strikethrough'),
        },
      ],
    },
    {
      buttons: [
        {
          icon: List,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().toggleBulletList().run(),
            () => insertSourceMarkdown('- ', '', true),
          ),
          title: s('markdown.toolbar.list'),
        },
        {
          icon: ListOrdered,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().toggleOrderedList().run(),
            () => insertSourceMarkdown('1. ', '', true),
          ),
          title: s('markdown.toolbar.list_ordered'),
        },
        {
          icon: CheckSquare,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().toggleTaskList().run(),
            () => insertSourceMarkdown('- [ ] ', '', true),
          ),
          title: s('markdown.toolbar.task_list'),
        },
      ],
    },
    {
      buttons: [
        {
          icon: Quote,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().toggleBlockquote().run(),
            () => insertSourceMarkdown('> ', '', true),
          ),
          title: s('markdown.toolbar.quote'),
        },
        {
          icon: Code,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().toggleCode().run(),
            () => insertSourceMarkdown('`', '`'),
          ),
          title: s('markdown.toolbar.code'),
        },
        {
          icon: Minus,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().setHorizontalRule().run(),
            () => insertSourceMarkdown('\n---\n', '', true),
          ),
          title: s('markdown.toolbar.separator'),
        },
      ],
    },
    {
      buttons: [
        {
          icon: Link,
          action: () => runVisualCommand(
            (editor) => {
              if (editor.state.selection.empty) {
                editor.chain().focus().insertContent('[link](https://)').run();
                return;
              }

              editor.chain().focus().extendMarkRange('link').setLink({ href: 'https://' }).run();
            },
            () => insertSourceMarkdown('[', '](https://)'),
          ),
          title: s('markdown.toolbar.link'),
        },
        {
          id: 'image',
          icon: Image,
          action: () => imageTools ? setImagePopoverOpen(true) : insertMarkdown('![alt](', ')'),
          title: s('markdown.toolbar.image'),
        },
        {
          icon: TableIcon,
          action: () => runVisualCommand(
            (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
            () => insertSourceMarkdown(tableMarkdown, '', true),
          ),
          title: s('markdown.toolbar.table'),
        },
        ...(enableMentions
          ? [{ icon: AtSign, action: () => insertMarkdown('@'), title: s('markdown.toolbar.mention') }]
          : []),
      ] as ToolbarButton[],
    },
  ];

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

    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setMentionStartPos(cursorPos - query.length - 1);

      if (editorContainerRef.current && textarea) {
        const lineHeight = 20;
        const lines = textBeforeCursor.split('\n');
        const currentLineNumber = lines.length;
        const currentLineLength = lines[lines.length - 1].length;

        setMentionPosition({
          top: currentLineNumber * lineHeight + 40,
          left: Math.min(currentLineLength * 8, 200),
        });
      }
    } else {
      setMentionQuery(null);
    }
  }, [enableMentions, onChange]);

  const handleMentionSelect = useCallback((username: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const before = value.substring(0, mentionStartPos);
    const after = value.substring(textarea.selectionStart);
    const newValue = before + '@' + username + ' ' + after;

    onChange(newValue);
    setMentionQuery(null);

    window.setTimeout(() => {
      const newPos = mentionStartPos + username.length + 2;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [value, mentionStartPos, onChange]);

  const renderModeButton = (mode: EditorMode, icon: typeof Edit3, label: string) => {
    const Icon = icon;

    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-6 px-2 text-xs', activeMode === mode && 'bg-primary/20')}
        onClick={() => setActiveMode(mode)}
      >
        <Icon className="mr-1 h-3 w-3" />
        {label}
      </Button>
    );
  };

  return (
    <div ref={editorContainerRef} className="relative overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5">
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
                              onValueChange={(nextValue) => setImageWidth(Number(nextValue))}
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
                          onClick={insertImage}
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
                <div className="mx-1 h-5 w-px bg-border" />
              )}
            </div>
          ))}
        </div>
        <div className="inline-flex h-7 items-center rounded-md border border-border/60 bg-transparent p-0.5">
          {visual
            ? renderModeButton('visual', Edit3, s('markdown.tab.visual'))
            : renderModeButton('source', Edit3, s('markdown.tab.write'))}
          {visual ? renderModeButton('source', Code, s('markdown.tab.source')) : null}
          {renderModeButton('preview', Eye, s('markdown.tab.preview'))}
        </div>
      </div>

      {activeMode === 'visual' && visual ? (
        <div className="gf-markdown-visual-editor overflow-auto" style={{ minHeight }}>
          <EditorContent editor={visualEditor} />
        </div>
      ) : null}

      {activeMode === 'source' ? (
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            placeholder={placeholder}
            className="resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
            style={{ minHeight }}
          />
          {enableMentions && mentionQuery !== null && (
            <MentionAutocomplete
              query={mentionQuery}
              position={mentionPosition}
              onSelect={handleMentionSelect}
              onClose={() => setMentionQuery(null)}
            />
          )}
        </div>
      ) : null}

      {activeMode === 'preview' ? (
        <div className="overflow-auto p-4" style={{ minHeight }}>
          {value ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="italic text-muted-foreground">
              {s('markdown.preview.empty')}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};
