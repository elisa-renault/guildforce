import { mergeAttributes, ResizableNodeView } from '@tiptap/core';
import Image from '@tiptap/extension-image';

import {
  normalizeMarkdownImageAlign,
  normalizeMarkdownImageWidth,
  parseMarkdownImageTitle,
  serializeMarkdownImageOptions,
  type MarkdownImageAlign,
} from '@/lib/markdownImages';
import { cn } from '@/lib/utils';

const imageAlignClass: Record<MarkdownImageAlign, string> = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
};

const getEditorWidth = (editorElement: HTMLElement) =>
  Math.max(editorElement.getBoundingClientRect().width, 1);

const toPercentWidth = (pixelWidth: number, editorElement: HTMLElement) =>
  normalizeMarkdownImageWidth((pixelWidth / getEditorWidth(editorElement)) * 100);

export const AtlasMarkdownImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 100,
        parseHTML: (element) => normalizeMarkdownImageWidth(element.getAttribute('data-width') || element.getAttribute('width')),
        renderHTML: (attributes) => ({
          'data-width': normalizeMarkdownImageWidth(attributes.width),
        }),
      },
      align: {
        default: 'center',
        parseHTML: (element) => normalizeMarkdownImageAlign(element.getAttribute('data-align')),
        renderHTML: (attributes) => ({
          'data-align': normalizeMarkdownImageAlign(attributes.align),
        }),
      },
    };
  },

  parseMarkdown: (token, helpers) => {
    const options = parseMarkdownImageTitle(token.title);

    return helpers.createNode('image', {
      src: token.href,
      title: null,
      alt: token.text,
      width: options.width,
      align: options.align,
    });
  },

  renderMarkdown: (node) => {
    const src = node.attrs?.src ?? '';
    const alt = node.attrs?.alt ?? '';
    const width = normalizeMarkdownImageWidth(node.attrs?.width);
    const align = normalizeMarkdownImageAlign(node.attrs?.align);

    return `![${alt}](${src}){${serializeMarkdownImageOptions({ width, align })}}`;
  },

  renderHTML({ HTMLAttributes }) {
    const width = normalizeMarkdownImageWidth(HTMLAttributes.width);
    const align = normalizeMarkdownImageAlign(HTMLAttributes.align);

    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: cn(
          'my-3 block h-auto max-w-full rounded-lg border border-border/35 bg-card/30 object-contain',
          imageAlignClass[align],
        ),
        style: `width: ${width}%;`,
        'data-width': width,
        'data-align': align,
        width: null,
        height: null,
      }),
    ];
  },

  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled || typeof document === 'undefined') {
      return null;
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = this.options.resize;

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement('img');
      const width = normalizeMarkdownImageWidth(node.attrs.width);
      const align = normalizeMarkdownImageAlign(node.attrs.align);

      el.draggable = false;
      el.className = cn(
        'my-3 block h-auto max-w-full rounded-lg border border-border/35 bg-card/30 object-contain',
        imageAlignClass[align],
      );
      el.style.width = `${width}%`;

      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);

      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value == null || key === 'width' || key === 'height' || key === 'align' || key === 'class' || key === 'style') {
          return;
        }

        el.setAttribute(key, String(value));
      });

      if (mergedAttributes.src !== null) {
        el.src = mergedAttributes.src;
      }

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (pixelWidth) => {
          el.style.width = `${toPercentWidth(pixelWidth, editor.view.dom)}%`;
          el.style.height = 'auto';
        },
        onCommit: (pixelWidth) => {
          const pos = getPos();
          if (pos === undefined) return;

          editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(this.name, {
              width: toPercentWidth(pixelWidth, editor.view.dom),
              height: null,
            })
            .run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) {
            return false;
          }

          const nextWidth = normalizeMarkdownImageWidth(updatedNode.attrs.width);
          const nextAlign = normalizeMarkdownImageAlign(updatedNode.attrs.align);
          el.style.width = `${nextWidth}%`;
          el.style.height = 'auto';
          el.className = cn(
            'my-3 block h-auto max-w-full rounded-lg border border-border/35 bg-card/30 object-contain',
            imageAlignClass[nextAlign],
          );

          return true;
        },
        options: {
          directions,
          min: {
            width: minWidth,
            height: minHeight,
          },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
          className: {
            container: 'gf-image-resize-container',
            wrapper: 'gf-image-resize-wrapper',
            handle: 'gf-image-resize-handle',
            resizing: 'gf-image-resizing',
          },
        },
      });

      const dom = nodeView.dom as HTMLElement;
      dom.dataset.align = align;

      if (el.complete) {
        return nodeView;
      }

      dom.style.visibility = 'hidden';
      dom.style.pointerEvents = 'none';
      el.onload = () => {
        dom.style.visibility = '';
        dom.style.pointerEvents = '';
      };

      return nodeView;
    };
  },
});
