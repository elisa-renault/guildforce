import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MarkdownEditor } from '@/components/markdown/MarkdownEditor';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: { auto: {} },
  }),
}));

afterEach(() => {
  cleanup();
});

describe('MarkdownEditor visual mode', () => {
  it('syncs visual content when the value is loaded after mount', async () => {
    const LoadedEditor = () => {
      const [value, setValue] = useState('');

      useEffect(() => {
        setValue('## Existing Atlas Content\n\nCurrent body');
      }, []);

      return (
        <MarkdownEditor
          value={value}
          onChange={setValue}
          visual
        />
      );
    };

    render(<LoadedEditor />);

    expect(await screen.findByRole('heading', { level: 2, name: 'Existing Atlas Content' })).toBeInTheDocument();
    expect(screen.getByText('Current body')).toBeInTheDocument();
  });

  it('initializes visual mode from Markdown content', async () => {
    render(
      <MarkdownEditor
        value="## Raid plan"
        onChange={() => undefined}
        visual
      />,
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Raid plan' })).toBeInTheDocument();
  });

  it('emits Markdown with Atlas image metadata after visual image insertion', async () => {
    const handleChange = vi.fn();

    render(
      <MarkdownEditor
        value=""
        onChange={handleChange}
        visual
        imageTools={{}}
      />,
    );

    fireEvent.click(screen.getByTitle('Image'));
    fireEvent.change(screen.getByLabelText('Image URL'), {
      target: { value: 'https://cdn.example.com/raid.png' },
    });
    fireEvent.change(screen.getByLabelText('Alt text'), {
      target: { value: 'Raid diagram' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(
        '![Raid diagram](https://cdn.example.com/raid.png){width=100 align=center}',
      );
    });
  });

  it('initializes visual image nodes with matching responsive width styling', async () => {
    render(
      <MarkdownEditor
        value="![Raid diagram](https://cdn.example.com/raid.png){width=50 align=right}"
        onChange={() => undefined}
        visual
      />,
    );

    const image = await screen.findByAltText('Raid diagram');
    const wrapper = image.closest('[data-resize-wrapper]');
    expect(wrapper).toHaveStyle({ width: '50%' });
    expect(image).toHaveStyle({ maxWidth: '100%', width: '100%' });
    expect(image.closest('[data-resize-container]')).toHaveAttribute('data-align', 'right');
  });

  it('persists the resized visual image width from diagonal dragging', async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = () => document.body;
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.classList.contains('ProseMirror')) {
        return { width: 1000, height: 600, top: 0, left: 0, right: 1000, bottom: 600, x: 0, y: 0, toJSON: () => undefined };
      }

      if (this.hasAttribute('data-resize-wrapper')) {
        const percent = Number.parseFloat((this as HTMLElement).style.width || '50');
        const width = Number.isFinite(percent) ? percent * 10 : 500;
        return { width, height: width, top: 0, left: 0, right: width, bottom: width, x: 0, y: 0, toJSON: () => undefined };
      }

      return originalGetBoundingClientRect.call(this);
    };

    const handleChange = vi.fn();

    try {
      render(
        <MarkdownEditor
          value="![Raid diagram](https://cdn.example.com/raid.png){width=50 align=center}"
          onChange={handleChange}
          visual
        />,
      );

      const image = await screen.findByAltText('Raid diagram');
      const wrapper = image.closest('[data-resize-wrapper]') as HTMLElement;
      const handle = wrapper.querySelector('[data-resize-handle="bottom-right"]') as HTMLElement;

      fireEvent.mouseDown(handle, { clientX: 500, clientY: 500 });
      fireEvent.mouseMove(document, { clientX: 500, clientY: 600 });
      fireEvent.mouseUp(document);

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(
          '![Raid diagram](https://cdn.example.com/raid.png){width=60 align=center}',
        );
      });
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      document.elementFromPoint = originalElementFromPoint;
    }
  });

  it('loads the selected visual image values for editing alignment', async () => {
    render(
      <MarkdownEditor
        value="![Raid diagram](https://cdn.example.com/raid.png){width=50 align=right}"
        onChange={() => undefined}
        visual
        imageTools={{}}
      />,
    );

    const image = await screen.findByAltText('Raid diagram');
    const wrapper = image.closest('[data-resize-wrapper]') as HTMLElement;

    fireEvent.mouseDown(wrapper);
    const imageButton = screen.getByTitle('Image');
    fireEvent.mouseDown(imageButton);
    fireEvent.click(imageButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Image URL')).toHaveValue('https://cdn.example.com/raid.png');
      expect(screen.getByLabelText('Alt text')).toHaveValue('Raid diagram');
      expect(screen.getByText('Right')).toBeInTheDocument();
    });
  });

  it('shows visible alignment controls for the selected visual image', async () => {
    const handleChange = vi.fn();

    render(
      <MarkdownEditor
        value="![Raid diagram](https://cdn.example.com/raid.png){width=50 align=center}"
        onChange={handleChange}
        visual
        imageTools={{}}
      />,
    );

    const image = await screen.findByAltText('Raid diagram');
    const wrapper = image.closest('[data-resize-wrapper]') as HTMLElement;
    const container = image.closest('[data-resize-container]') as HTMLElement;

    fireEvent.mouseDown(wrapper);

    const leftAlign = container.querySelector('[data-align-control="left"]') as HTMLButtonElement;
    const centerAlign = container.querySelector('[data-align-control="center"]') as HTMLButtonElement;
    const rightAlign = container.querySelector('[data-align-control="right"]') as HTMLButtonElement;

    expect(leftAlign).toBeInTheDocument();
    expect(leftAlign.closest('.gf-image-align-controls')?.parentElement).toBe(wrapper);
    expect(centerAlign).toHaveAttribute('data-active', 'true');
    expect(leftAlign.querySelector('.gf-image-align-subject')).toHaveAttribute('x', '2');
    expect(centerAlign.querySelector('.gf-image-align-subject')).toHaveAttribute('x', '5');
    expect(rightAlign.querySelector('.gf-image-align-subject')).toHaveAttribute('x', '8');
    expect(rightAlign).toBeInTheDocument();

    fireEvent.click(leftAlign);

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(
        '![Raid diagram](https://cdn.example.com/raid.png){width=50 align=left}',
      );
    });
  });
});
