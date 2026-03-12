import { describe, expect, it } from 'vitest';

import { isReadOnlyResponsesView, shouldShowPollResultsPane } from '@/lib/pollViewMode';

describe('pollViewMode', () => {
  it('keeps closed poll review mode on personal responses', () => {
    const options = {
      hasResponded: true,
      isClosed: true,
      isEditing: false,
      isGM: false,
      requestedView: 'responses',
      showResults: false,
      userCanRespond: false,
      userCanViewResults: true,
    } as const;

    expect(isReadOnlyResponsesView(options)).toBe(true);
    expect(shouldShowPollResultsPane(options)).toBe(false);
  });

  it('defaults closed polls to results when no personal review is requested', () => {
    expect(
      shouldShowPollResultsPane({
        hasResponded: true,
        isClosed: true,
        isEditing: false,
        isGM: false,
        requestedView: null,
        showResults: false,
        userCanRespond: false,
        userCanViewResults: true,
      }),
    ).toBe(true);
  });

  it('ignores response review mode when the viewer has no saved answers', () => {
    expect(
      isReadOnlyResponsesView({
        hasResponded: false,
        isClosed: true,
        requestedView: 'responses',
      }),
    ).toBe(false);
  });
});
