import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});
