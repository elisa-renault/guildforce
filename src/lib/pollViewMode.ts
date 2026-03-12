interface PollViewModeOptions {
  hasResponded: boolean;
  isClosed: boolean;
  isEditing: boolean;
  isGM: boolean;
  requestedView: string | null;
  showResults: boolean;
  userCanRespond: boolean;
  userCanViewResults: boolean;
}

export const isReadOnlyResponsesView = ({
  hasResponded,
  isClosed,
  requestedView,
}: Pick<PollViewModeOptions, 'hasResponded' | 'isClosed' | 'requestedView'>) =>
  requestedView === 'responses' && hasResponded && isClosed;

export const shouldShowPollResultsPane = ({
  hasResponded,
  isClosed,
  isEditing,
  isGM,
  requestedView,
  showResults,
  userCanRespond,
  userCanViewResults,
}: PollViewModeOptions) => {
  if (isEditing || isReadOnlyResponsesView({ hasResponded, isClosed, requestedView })) {
    return false;
  }

  return (
    isClosed ||
    showResults ||
    (!userCanRespond && userCanViewResults) ||
    (!isGM && hasResponded && userCanViewResults)
  );
};
