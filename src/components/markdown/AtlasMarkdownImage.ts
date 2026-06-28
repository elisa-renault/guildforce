import { mergeAttributes } from '@tiptap/core';
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

const renderedImageClass = 'my-3 block h-auto max-w-full rounded-lg border border-border/35 bg-card/30 object-contain';
const editorImageClass = 'block h-auto max-w-full rounded-lg border border-border/35 bg-card/30 object-contain';
const VISUAL_IMAGE_SELECTED_EVENT = 'guildforce:markdown-image-selected';

const getEditorWidth = (editorElement: HTMLElement) =>
  Math.max(editorElement.getBoundingClientRect().width, 1);

const toPercentWidth = (pixelWidth: number, editorElement: HTMLElement) =>
  normalizeMarkdownImageWidth((pixelWidth / getEditorWidth(editorElement)) * 100);

type ResizeDirection = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const DEFAULT_RESIZE_DIRECTIONS: ResizeDirection[] = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
const ALIGN_OPTIONS: MarkdownImageAlign[] = ['left', 'center', 'right'];
const ALIGN_ICON_SUBJECT_X: Record<MarkdownImageAlign, number> = {
  left: 2,
  center: 5,
  right: 8,
};

const createSvgElement = <K extends keyof SVGElementTagNameMap>(tagName: K, attributes: Record<string, string>) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
};

const createAlignIcon = (alignOption: MarkdownImageAlign) => {
  const svg = createSvgElement('svg', {
    class: `gf-image-align-icon gf-image-align-icon-${alignOption}`,
    viewBox: '0 0 18 16',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  const topGuide = createSvgElement('rect', {
    class: 'gf-image-align-guide',
    x: '1',
    y: '2',
    width: '16',
    height: '1.5',
    rx: '0.75',
  });
  const subject = createSvgElement('rect', {
    class: 'gf-image-align-subject',
    x: String(ALIGN_ICON_SUBJECT_X[alignOption]),
    y: '5',
    width: '8',
    height: '6',
    rx: '1.25',
  });
  const bottomGuide = createSvgElement('rect', {
    class: 'gf-image-align-guide',
    x: '1',
    y: '13',
    width: '16',
    height: '1.5',
    rx: '0.75',
  });

  svg.append(topGuide, subject, bottomGuide);
  return svg;
};

const getEventPoint = (event: MouseEvent | TouchEvent) => {
  if ('touches' in event) {
    return event.touches[0] || event.changedTouches[0];
  }

  return event;
};

const getResizeAspectRatio = (wrapper: HTMLElement, image: HTMLImageElement) => {
  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    return image.naturalWidth / image.naturalHeight;
  }

  const wrapperRect = wrapper.getBoundingClientRect();
  const imageRect = image.getBoundingClientRect();

  if (wrapperRect.width > 0 && imageRect.height > 0) {
    return wrapperRect.width / imageRect.height;
  }

  return 1;
};

const chooseDiagonalWidth = ({
  direction,
  deltaX,
  deltaY,
  startWidth,
  aspectRatio,
}: {
  direction: ResizeDirection;
  deltaX: number;
  deltaY: number;
  startWidth: number;
  aspectRatio: number;
}) => {
  const horizontalWidth = startWidth + (direction.includes('right') ? deltaX : -deltaX);
  const verticalWidth = startWidth + (direction.includes('bottom') ? deltaY : -deltaY) * aspectRatio;

  return Math.abs(verticalWidth - startWidth) > Math.abs(horizontalWidth - startWidth)
    ? verticalWidth
    : horizontalWidth;
};

export const AtlasMarkdownImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      height: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      displayWidth: {
        default: 100,
        parseHTML: (element) => normalizeMarkdownImageWidth(element.getAttribute('data-width') || element.getAttribute('width')),
        renderHTML: (attributes) => ({
          'data-width': normalizeMarkdownImageWidth(attributes.displayWidth),
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
      displayWidth: options.width,
      align: options.align,
    });
  },

  renderMarkdown: (node) => {
    const src = node.attrs?.src ?? '';
    const alt = node.attrs?.alt ?? '';
    const width = normalizeMarkdownImageWidth(node.attrs?.displayWidth);
    const align = normalizeMarkdownImageAlign(node.attrs?.align);

    return `![${alt}](${src}){${serializeMarkdownImageOptions({ width, align })}}`;
  },

  renderHTML({ HTMLAttributes }) {
    const width = normalizeMarkdownImageWidth(HTMLAttributes.displayWidth);
    const align = normalizeMarkdownImageAlign(HTMLAttributes.align);

    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: cn(
          renderedImageClass,
          imageAlignClass[align],
        ),
        style: `width: ${width}%; max-width: 100%;`,
        'data-width': width,
        'data-align': align,
        width: null,
        height: null,
        displayWidth: null,
      }),
    ];
  },

  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled || typeof document === 'undefined') {
      return null;
    }

    const directions = (this.options.resize.directions || DEFAULT_RESIZE_DIRECTIONS)
      .filter((direction): direction is ResizeDirection => DEFAULT_RESIZE_DIRECTIONS.includes(direction as ResizeDirection));
    const minWidth = this.options.resize.minWidth ?? 80;

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement('img');
      const container = document.createElement('div');
      const wrapper = document.createElement('div');
      const alignControls = document.createElement('div');
      const alignButtons = new Map<MarkdownImageAlign, HTMLButtonElement>();
      const width = normalizeMarkdownImageWidth(node.attrs.displayWidth);
      const align = normalizeMarkdownImageAlign(node.attrs.align);
      let currentNode = node;
      let isResizing = false;
      let activeDirection: ResizeDirection | null = null;
      let startX = 0;
      let startY = 0;
      let startWidth = 0;
      let aspectRatio = 1;
      let currentDisplayWidth = width;

      const applyDisplayWidth = (nextWidth: number) => {
        const normalizedWidth = normalizeMarkdownImageWidth(nextWidth);
        currentDisplayWidth = normalizedWidth;
        wrapper.style.width = `${normalizedWidth}%`;
        el.style.maxWidth = '100%';
        el.style.width = '100%';
        el.style.height = 'auto';
      };

      const applyAlign = (nextAlign: MarkdownImageAlign) => {
        container.dataset.align = nextAlign;
        el.className = editorImageClass;
        alignButtons.forEach((button, alignOption) => {
          button.dataset.active = String(alignOption === nextAlign);
        });
      };

      el.draggable = false;
      container.dataset.resizeContainer = '';
      container.dataset.node = this.name;
      container.className = 'gf-image-resize-container';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.contentEditable = 'false';
      wrapper.dataset.resizeWrapper = '';
      wrapper.className = 'gf-image-resize-wrapper';
      alignControls.className = 'gf-image-align-controls';

      applyAlign(align);
      applyDisplayWidth(width);

      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);

      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value == null || key === 'width' || key === 'height' || key === 'displayWidth' || key === 'align' || key === 'class' || key === 'style') {
          return;
        }

        el.setAttribute(key, String(value));
      });

      if (mergedAttributes.src !== null) {
        el.src = mergedAttributes.src;
      }

      const updateImageAlign = (nextAlign: MarkdownImageAlign, event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const pos = getPos();
        if (pos === undefined) return;

        applyAlign(nextAlign);
        editor
          .chain()
          .focus()
          .setNodeSelection(pos)
          .updateAttributes(this.name, { align: nextAlign })
          .run();
        window.dispatchEvent(new CustomEvent(VISUAL_IMAGE_SELECTED_EVENT, {
          detail: {
            pos,
            attrs: {
              ...currentNode.attrs,
              align: nextAlign,
            },
          },
        }));
      };

      const selectImageNode = (event?: MouseEvent) => {
        event?.preventDefault();
        const pos = getPos();
        if (pos === undefined) return;
        editor.chain().focus().setNodeSelection(pos).run();
        window.dispatchEvent(new CustomEvent(VISUAL_IMAGE_SELECTED_EVENT, {
          detail: {
            pos,
            attrs: currentNode.attrs,
          },
        }));
      };

      const commitResize = () => {
        const pos = getPos();
        if (pos === undefined) return;

        editor
          .chain()
          .setNodeSelection(pos)
          .updateAttributes(this.name, {
            displayWidth: currentDisplayWidth,
            width: null,
            height: null,
          })
          .run();
      };

      const handleResizeMove = (event: MouseEvent | TouchEvent) => {
        if (!isResizing || !activeDirection) return;
        const point = getEventPoint(event);
        if (!point) return;

        const nextPixelWidth = chooseDiagonalWidth({
          direction: activeDirection,
          deltaX: point.clientX - startX,
          deltaY: point.clientY - startY,
          startWidth,
          aspectRatio,
        });
        const editorWidth = getEditorWidth(editor.view.dom);
        const constrainedPixelWidth = Math.min(editorWidth, Math.max(minWidth, nextPixelWidth));
        applyDisplayWidth(toPercentWidth(constrainedPixelWidth, editor.view.dom));
      };

      const stopResize = () => {
        if (!isResizing) return;
        isResizing = false;
        activeDirection = null;
        container.dataset.resizeState = 'false';
        container.classList.remove('gf-image-resizing');
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('touchmove', handleResizeMove);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchend', stopResize);
        commitResize();
      };

      const startResize = (event: MouseEvent | TouchEvent, direction: ResizeDirection) => {
        event.preventDefault();
        event.stopPropagation();
        const point = getEventPoint(event);
        if (!point) return;

        const pos = getPos();
        if (pos !== undefined) {
          editor.chain().focus().setNodeSelection(pos).run();
        }

        isResizing = true;
        activeDirection = direction;
        startX = point.clientX;
        startY = point.clientY;
        startWidth = Math.max(wrapper.getBoundingClientRect().width, minWidth);
        aspectRatio = getResizeAspectRatio(wrapper, el);
        container.dataset.resizeState = 'true';
        container.classList.add('gf-image-resizing');
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('touchmove', handleResizeMove, { passive: false });
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchend', stopResize);
      };

      wrapper.addEventListener('mousedown', selectImageNode);
      directions.forEach((direction) => {
        const handle = document.createElement('div');
        handle.dataset.resizeHandle = direction;
        handle.className = 'gf-image-resize-handle';
        handle.style.position = 'absolute';
        if (direction.includes('top')) handle.style.top = '0';
        if (direction.includes('bottom')) handle.style.bottom = '0';
        if (direction.includes('left')) handle.style.left = '0';
        if (direction.includes('right')) handle.style.right = '0';
        handle.addEventListener('mousedown', (event) => startResize(event, direction));
        handle.addEventListener('touchstart', (event) => startResize(event, direction), { passive: false });
        wrapper.appendChild(handle);
      });

      ALIGN_OPTIONS.forEach((alignOption) => {
        const button = document.createElement('button');
        const icon = createAlignIcon(alignOption);
        button.type = 'button';
        button.className = 'gf-image-align-button';
        button.dataset.alignControl = alignOption;
        button.dataset.active = String(alignOption === align);
        button.appendChild(icon);
        button.addEventListener('mousedown', (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        button.addEventListener('click', (event) => updateImageAlign(alignOption, event));
        alignButtons.set(alignOption, button);
        alignControls.appendChild(button);
      });

      wrapper.appendChild(el);
      wrapper.appendChild(alignControls);
      container.appendChild(wrapper);

      if (el.complete) {
        return {
          dom: container,
          update: (updatedNode) => {
            if (updatedNode.type !== currentNode.type) return false;
            currentNode = updatedNode;
            applyDisplayWidth(updatedNode.attrs.displayWidth);
            applyAlign(normalizeMarkdownImageAlign(updatedNode.attrs.align));
            if (updatedNode.attrs.src) el.src = updatedNode.attrs.src;
            if (updatedNode.attrs.alt !== undefined) el.alt = updatedNode.attrs.alt || '';
            if (updatedNode.attrs.title !== undefined) el.title = updatedNode.attrs.title || '';
            return true;
          },
          selectNode: () => container.classList.add('ProseMirror-selectednode'),
          deselectNode: () => container.classList.remove('ProseMirror-selectednode'),
          destroy: () => stopResize(),
        };
      }

      container.style.visibility = 'hidden';
      container.style.pointerEvents = 'none';
      el.onload = () => {
        container.style.visibility = '';
        container.style.pointerEvents = '';
      };

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type !== currentNode.type) return false;
          currentNode = updatedNode;
          applyDisplayWidth(updatedNode.attrs.displayWidth);
          applyAlign(normalizeMarkdownImageAlign(updatedNode.attrs.align));
          if (updatedNode.attrs.src) el.src = updatedNode.attrs.src;
          if (updatedNode.attrs.alt !== undefined) el.alt = updatedNode.attrs.alt || '';
          if (updatedNode.attrs.title !== undefined) el.title = updatedNode.attrs.title || '';
          return true;
        },
        selectNode: () => container.classList.add('ProseMirror-selectednode'),
        deselectNode: () => container.classList.remove('ProseMirror-selectednode'),
        destroy: () => stopResize(),
      };
    };
  },
});
