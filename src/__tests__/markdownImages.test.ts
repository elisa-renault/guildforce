import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import {
  createAdvancedMarkdownImage,
  parseMarkdownImageAttributeText,
  parseMarkdownImageTitle,
  prepareMarkdownImageAttributes,
} from '@/lib/markdownImages';

describe('advanced markdown images', () => {
  it('creates Atlas image markdown with responsive width and alignment attributes', () => {
    expect(
      createAdvancedMarkdownImage({
        src: 'https://cdn.example.com/raid.png',
        alt: 'Raid diagram',
        width: 50,
        align: 'center',
      }),
    ).toBe('![Raid diagram](https://cdn.example.com/raid.png){width=50 align=center}');
  });

  it('normalizes unsupported image controls to responsive defaults', () => {
    expect(parseMarkdownImageAttributeText('width=42 align=wide')).toEqual({
      width: 100,
      align: 'center',
    });
  });

  it('converts attribute syntax into react-markdown image title metadata', () => {
    const prepared = prepareMarkdownImageAttributes(
      '![Raid diagram](https://cdn.example.com/raid.png){width=75 align=right}',
    );

    expect(prepared).toBe('![Raid diagram](https://cdn.example.com/raid.png "gf-image:width=75;align=right")');
    expect(parseMarkdownImageTitle('gf-image:width=75;align=right')).toEqual({
      width: 75,
      align: 'right',
    });
  });

  it('renders images with responsive width and alignment classes', () => {
    render(
      createElement(MarkdownContent, {
        content: '![Raid diagram](https://cdn.example.com/raid.png){width=50 align=right}',
      }),
    );

    const image = screen.getByAltText('Raid diagram');
    expect(image).toHaveStyle({ width: '50%' });
    expect(image).toHaveClass('max-w-full', 'ml-auto');
  });
});
