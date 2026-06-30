import { describe, expect, it } from 'vitest';

import {
  demoViewUsesOwnPageContainer,
  getDemoLayoutProfile,
  resolveDemoAtlasDocumentId,
  resolveDemoMemberId,
  resolveDemoPollId,
  resolveDemoView,
} from '@/demo/demoRoutes';

describe('demo route resolution', () => {
  it('maps iso guild demo paths to local views', () => {
    expect(resolveDemoView('/demo')).toBe('overview');
    expect(resolveDemoView('/demo/roster')).toBe('roster');
    expect(resolveDemoView('/demo/analytics')).toBe('analytics');
    expect(resolveDemoView('/demo/polls')).toBe('polls');
    expect(resolveDemoView('/demo/polls/new')).toBe('poll-new');
    expect(resolveDemoView('/demo/polls/demo-poll-trial-feedback-prep/edit')).toBe('poll-edit');
    expect(resolveDemoView('/demo/poll/demo-poll-midnight-availability')).toBe('poll-detail');
    expect(resolveDemoView('/demo/poll/demo-poll-midnight-availability/results')).toBe('poll-results');
    expect(resolveDemoView('/demo/members')).toBe('members');
    expect(resolveDemoView('/demo/member/demo-01')).toBe('member');
    expect(resolveDemoView('/demo/atlas')).toBe('atlas');
    expect(resolveDemoView('/demo/atlas/new')).toBe('atlas-new');
    expect(resolveDemoView('/demo/atlas/demo-atlas-midnight-roster/edit')).toBe('atlas-edit');
    expect(resolveDemoView('/demo/vault')).toBe('vault');
    expect(resolveDemoView('/demo/settings')).toBe('settings');
  });

  it('extracts detail ids from demo routes', () => {
    expect(resolveDemoMemberId('/demo/member/demo-01')).toBe('demo-01');
    expect(resolveDemoPollId('/demo/poll/demo-poll-midnight-availability/results')).toBe('demo-poll-midnight-availability');
    expect(resolveDemoPollId('/demo/polls/demo-poll-trial-feedback-prep/edit')).toBe('demo-poll-trial-feedback-prep');
    expect(resolveDemoAtlasDocumentId('/demo/atlas/demo-atlas-midnight-roster/edit')).toBe('demo-atlas-midnight-roster');
  });

  it('locks iso layout profiles for demo poll routes', () => {
    expect(getDemoLayoutProfile(resolveDemoView('/demo'))).toBe('overview');
    expect(getDemoLayoutProfile(resolveDemoView('/demo/polls'))).toBe('poll-list');
    expect(getDemoLayoutProfile(resolveDemoView('/demo/poll/demo-poll-midnight-availability'))).toBe('poll-view');
    expect(getDemoLayoutProfile(resolveDemoView('/demo/poll/demo-poll-midnight-availability/results'))).toBe('poll-results');
    expect(getDemoLayoutProfile(resolveDemoView('/demo/polls/new'))).toBe('poll-editor');
    expect(getDemoLayoutProfile(resolveDemoView('/demo/polls/demo-poll-trial-feedback-prep/edit'))).toBe('poll-editor');
    expect(getDemoLayoutProfile(resolveDemoView('/demo/atlas'))).toBe('atlas');
    expect(getDemoLayoutProfile(resolveDemoView('/demo/atlas/new'))).toBe('atlas-editor');
    expect(getDemoLayoutProfile(resolveDemoView('/demo/atlas/demo-atlas-midnight-roster/edit'))).toBe('atlas-editor');
    expect(getDemoLayoutProfile(resolveDemoView('/demo/vault'))).toBe('vault');
    expect(getDemoLayoutProfile(resolveDemoView('/demo/settings'))).toBe('settings');
    expect(getDemoLayoutProfile(resolveDemoView('/demo/members'))).toBe('workspace');
    expect(demoViewUsesOwnPageContainer(resolveDemoView('/demo'))).toBe(true);
    expect(demoViewUsesOwnPageContainer(resolveDemoView('/demo/poll/demo-poll-midnight-availability'))).toBe(true);
    expect(demoViewUsesOwnPageContainer(resolveDemoView('/demo/atlas'))).toBe(true);
    expect(demoViewUsesOwnPageContainer(resolveDemoView('/demo/atlas/demo-atlas-midnight-roster/edit'))).toBe(true);
    expect(demoViewUsesOwnPageContainer(resolveDemoView('/demo/vault'))).toBe(true);
    expect(demoViewUsesOwnPageContainer(resolveDemoView('/demo/settings'))).toBe(true);
  });
});
