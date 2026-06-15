export type MarkdownImageAlign = 'left' | 'center' | 'right';
export type MarkdownImageWidth = 25 | 50 | 75 | 100;

export interface MarkdownImageOptions {
  width: MarkdownImageWidth;
  align: MarkdownImageAlign;
}

export interface MarkdownImageInput extends MarkdownImageOptions {
  src: string;
  alt: string;
}

const IMAGE_TITLE_PREFIX = 'gf-image:';
const ALLOWED_WIDTHS: MarkdownImageWidth[] = [25, 50, 75, 100];
const ALLOWED_ALIGNS: MarkdownImageAlign[] = ['left', 'center', 'right'];
const DEFAULT_OPTIONS: MarkdownImageOptions = {
  width: 100,
  align: 'center',
};

const stripWrappingQuotes = (value: string) => value.replace(/^["']|["']$/g, '');

const escapeMarkdownImageAlt = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\]/g, '\\]');

export const normalizeMarkdownImageWidth = (value: unknown): MarkdownImageWidth => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return ALLOWED_WIDTHS.includes(numeric as MarkdownImageWidth)
    ? numeric as MarkdownImageWidth
    : DEFAULT_OPTIONS.width;
};

export const normalizeMarkdownImageAlign = (value: unknown): MarkdownImageAlign => {
  const normalized = String(value || '').toLowerCase();
  return ALLOWED_ALIGNS.includes(normalized as MarkdownImageAlign)
    ? normalized as MarkdownImageAlign
    : DEFAULT_OPTIONS.align;
};

export const parseMarkdownImageAttributeText = (attributeText: string): MarkdownImageOptions => {
  const entries = new Map<string, string>();

  attributeText
    .trim()
    .split(/\s+/)
    .forEach((token) => {
      const [key, ...rest] = token.split('=');
      if (!key || rest.length === 0) return;
      entries.set(key.toLowerCase(), stripWrappingQuotes(rest.join('=')));
    });

  return {
    width: normalizeMarkdownImageWidth(entries.get('width')),
    align: normalizeMarkdownImageAlign(entries.get('align')),
  };
};

export const serializeMarkdownImageOptions = ({ width, align }: MarkdownImageOptions) =>
  `width=${normalizeMarkdownImageWidth(width)} align=${normalizeMarkdownImageAlign(align)}`;

export const createAdvancedMarkdownImage = ({ src, alt, width, align }: MarkdownImageInput) =>
  `![${escapeMarkdownImageAlt(alt)}](${src}){${serializeMarkdownImageOptions({ width, align })}}`;

export const encodeMarkdownImageTitle = (options: MarkdownImageOptions) =>
  `${IMAGE_TITLE_PREFIX}${serializeMarkdownImageOptions(options).replace(' ', ';')}`;

export const parseMarkdownImageTitle = (title?: string | null): MarkdownImageOptions => {
  if (!title?.startsWith(IMAGE_TITLE_PREFIX)) {
    return DEFAULT_OPTIONS;
  }

  return parseMarkdownImageAttributeText(title.slice(IMAGE_TITLE_PREFIX.length).replace(/;/g, ' '));
};

export const prepareMarkdownImageAttributes = (markdown: string) =>
  markdown.replace(
    /!\[([^\]\n]*)\]\(([^)\n]+)\)\{([^}\n]+)\}/g,
    (_match, alt: string, src: string, attributes: string) =>
      `![${alt}](${src} "${encodeMarkdownImageTitle(parseMarkdownImageAttributeText(attributes))}")`,
  );

