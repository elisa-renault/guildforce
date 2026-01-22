// Internationalization translations
export type Language = 'en' | 'fr';

export interface Translations {
  // Common
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    submit: string;
    copy: string;
    copied: string;
    search: string;
    filter: string;
    export: string;
    logout: string;
    login: string;
    myGuilds: string;
    signup: string;
    email: string;
    password: string;
    confirmPassword: string;
    you: string;
    settings: string;
    tipMe: string;
    all: string;
    refresh: string;
    confirm: string;
    add: string;
    reset: string;
    results: string;
    publish: string;
    close: string;
    processing: string;
    upload: string;
    uploading: string;
    confirmDelete: string;
    admin: string;
    saveDraft: string;
    new: string;
    activityLog: string;
    savedAutomatically: string;
    error: string;
  };
  routeMeta: {
    home: string;
    auth: string;
    guilds: string;
    profile: string;
    publicProfile: string;
    forum: string;
    forumAdmin: string;
    admin: string;
    legal: string;
    privacy: string;
    terms: string;
    changelog: string;
    forumCategory: string;
    forumNewTopic: string;
    forumTopic: string;
    guildOverview: string;
    guildRoster: string;
    guildWishes: string;
    guildSettings: string;
    guildMemberWishes: string;
    guildPolls: string;
    guildPollNew: string;
    guildPollEdit: string;
    guildPollView: string;
    guildPollResults: string;
    guildMembers: string;
    notFound: string;
  };
  // Bug Report
  bugReport: {
    button: string;
    title: string;
    subtitle: string;
    titleField: string;
    titlePlaceholder: string;
    descriptionField: string;
    descriptionPlaceholder: string;
    category: string;
    categories: {
      bug: string;
      ui: string;
      performance: string;
      feature: string;
      other: string;
    };
    priority: string;
    priorities: {
      low: string;
      medium: string;
      high: string;
      critical: string;
    };
    statuses: {
      open: string;
      investigating: string;
      resolved: string;
      closed: string;
      wontfix: string;
    };
    autoInfo: string;
    errorsDetected: string;
    browser: string;
    userStatus: string;
    submit: string;
    success: string;
    error: string;
    errorMissingFields: string;
    rateLimitError: string;
    anonymous: string;
    admin: {
      title: string;
      criticalPending: string;
      noReports: string;
      fetchError: string;
      updateError: string;
      statusUpdated: string;
      deleted: string;
      deleteError: string;
      filterStatus: string;
      filterPriority: string;
      reporter: string;
      createdAt: string;
      consoleLogs: string;
      browserInfo: string;
      userContext: string;
      resolvedBy: string;
      resolutionNote: string;
      resolutionNotePlaceholder: string;
      markInvestigating: string;
      markResolved: string;
      markWontfix: string;
      delete: string;
    };
  };
  // Battle.net
  battlenet: {
    connect: string;
    connected: string;
    disconnect: string;
    disconnected: string;
    connectDescription: string;
    yourCharacters: string;
    noCharacters: string;
    noCharactersHint: string;
    main: string;
    mainSet: string;
    refresh: string;
    connecting: string;
    region: string;
    selectRegion: string;
    connectedTo: string;
    resync: string;
    resyncSuccess: string;
    resyncError: string;
    errorNoLicense: string;
    errorParentalControls: string;
    errorTokenExpired: string;
  };
  // Home page
  home: {
    title: string;
    subtitle: string;
    description: string;
    createGuild: string;
    joinGuild: string;
    features: {
      collect: { title: string; description: string };
      visualize: { title: string; description: string };
      export: { title: string; description: string };
    };
  };
  // Auth
  auth: {
    loginTitle: string;
    signupTitle: string;
    loginDescription: string;
    signupDescription: string;
    noAccount: string;
    hasAccount: string;
    pseudo: string;
    pseudoPlaceholder: string;
    forgotPassword: string;
    invalidEmail: string;
    passwordTooShort: string;
    passwordsDontMatch: string;
    userAlreadyExists: string;
    invalidCredentials: string;
    orContinueWith: string;
    loginWithBattleNet: string;
    signupWithBattleNet: string;
    battlenetError: string;
    bnetRequired: string;
    bnetNote: string;
    accountCreated: string;
    welcomeBack: string;
    existingAccountsOnly: string;
  };
  // Guild
  guild: {
    create: string;
    join: string;
    name: string;
    namePlaceholder: string;
    server: string;
    serverPlaceholder: string;
    faction: string;
    horde: string;
    alliance: string;
    members: string;
    member: string;
    memberPlural: string;
    charactersShown: string;
    uniqueMember: string;
    uniqueMembers: string;
    characters: string;
    charactersNotRegistered: string;
    noMembers: string;
    leaveGuild: string;
    deleteGuild: string;
    guildCreated: string;
    guildJoined: string;
    alreadyMember: string;
    // WoW Guild memberships
    myGuilds: string;
    guildMaster: string;
    yourCharacters: string;
    gmNote: string;
    noGuilds: string;
    rank0: string;
    createInApp: string;
    alreadyInApp: string;
    accessGuild: string;
    pendingSync: string;
    awaitingGM: string;
  };
  // Wishes
  wishes: {
    title: string;
    wishesOf: string;
    subtitle: string;
    choice: string;
    choiceNumber: string;
    selectClass: string;
    selectSpecs: string;
    comment: string;
    commentPlaceholder: string;
    status: string;
    confirmed: string;
    potential: string;
    noWishes: string;
    saveWishes: string;
    wishesSaved: string;
    clickToExpand: string;
    clickToEdit: string;
    editMyWishes: string;
    specs: string;
    preferredChoice: string;
    secondChoice: string;
    thirdChoice: string;
    addWish: string;
    removeWish: string;
    noRosterSelected: string;
    commitment: {
      title: string;
      confirmed: string;
      confirmedDesc: string;
      undecided: string;
      undecidedDesc: string;
      withdrawn: string;
      withdrawnDesc: string;
    };
    validation: {
      pending: string;
      approved: string;
      rejected: string;
      approve: string;
      reject: string;
      reset: string;
      approvedBy: string;
      rejectedBy: string;
    };
    specRequired: string;
    specRequiredDesc: string;
  };
  // Dashboard
  dashboard: {
    title: string;
    overview: string;
    roster: string;
    filters: string;
    allRoles: string;
    allClasses: string;
    tank: string;
    healer: string;
    dps: string;
    melee: string;
    ranged: string;
    player: string;
    discord: string;
    firstChoice: string;
    secondChoice: string;
    thirdChoice: string;
    comments: string;
    exportCSV: string;
    exportSuccess: string;
    noData: string;
    totalPlayers: string;
    confirmedPlayers: string;
    potentialPlayers: string;
    roleSummary: string;
    // RosterFilters
    clear: string;
    validation: string;
    classesCount: string;
    // Extended filters
    commitment: string;
    allCommitments: string;
    minWishes: string;
    minWishesPlaceholder: string;
    range: string;
    allRanges: string;
    withComment: string;
    withoutComment: string;
    allComments: string;
    wishesMin: string;
    wishesCount: string;
    additionalWishes: string;
    addWish: string;
    // Analytics tabs and sections
    table: string;
    analytics: string;
    classDistribution: string;
    specDistribution: string;
    topSpecs: string;
    rolesByPriority: string;
    wish1: string;
    otherWishes: string;
    missingClasses: string;
    allClassesRepresented: string;
    // Wish range filter
    wishRangeFilter: string;
    wishRange1: string;
    wishRangeN: string;
    allWishes: string;
  };
  // Profile
  profile: {
    title: string;
    editProfile: string;
    battletag: string;
    battletagPlaceholder: string;
    mainCharacter: string;
    mainCharacterPlaceholder: string;
    language: string;
    characters: string;
    addCharacter: string;
    noCharacters: string;
    characterName: string;
    characterClass: string;
    characterLevel: string;
    isMain: string;
    connectedViaBnet: string;
    avatar: string;
    uploadAvatar: string;
    removeAvatar: string;
    avatarHint: string;
    profileInfo: string;
    accountConnection: string;
    deletion: {
      pending: string;
      cancelRequest: string;
      requestDeletion: string;
      confirmTitle: string;
      confirmDescription: string;
      dataList: {
        profile: string;
        characters: string;
        wishes: string;
        forumPosts: string;
      };
      typeToConfirm: string;
      confirmDeletion: string;
    };
    battletagVisibility: {
      label: string;
      everyone: string;
      everyoneDesc: string;
      guildOnly: string;
      guildOnlyDesc: string;
      nobody: string;
      nobodyDesc: string;
      saved: string;
    };
  };
  // Guild Settings
  guildSettings: {
    title: string;
    avatar: string;
    uploadAvatar: string;
    removeAvatar: string;
    avatarHint: string;
    avatarUpdated: string;
    avatarRemoved: string;
    uploadError: string;
    guildInfo: string;
    syncedFromBnet: string;
    comingSoon: string;
    gmOnly: string;
    resyncBattlenet: string;
    resyncDescription: string;
    resyncSuccess: string;
    resyncError: string;
    resyncTokenExpired: string;
    syncing: string;
    officerRankUpdated: string;
  };
  // Rosters
  rosters: {
    title: string;
    createRoster: string;
    editRoster: string;
    rosterName: string;
    rosterNamePlaceholder: string;
    rosterDescription: string;
    rosterDescriptionPlaceholder: string;
    rosterCreated: string;
    rosterUpdated: string;
    rosterDeleted: string;
    selectRoster: string;
    default: string;
    ranks: string;
    everyone: string;
    noAccess: string;
    accessRules: string;
    byRank: string;
    byUser: string;
    selectUser: string;
    addRankRule: string;
    addUserRule: string;
    noAccessWarning: string;
    noAccessMessage: string;
  };
  // Forum
  forum: {
    title: string;
    categories: string;
    topics: string;
    posts: string;
    newTopic: string;
    reply: string;
    quote: string;
    edit: string;
    delete: string;
    pin: string;
    unpin: string;
    lock: string;
    unlock: string;
    pinned: string;
    locked: string;
    views: string;
    replies: string;
    lastReply: string;
    noTopics: string;
    noPosts: string;
    writeReply: string;
    preview: string;
    postReply: string;
    editPost: string;
    deleteConfirm: string;
    topicCreated: string;
    postCreated: string;
    postUpdated: string;
    postDeleted: string;
    topicDeleted: string;
    backToForum: string;
    backToCategory: string;
    globalForum: string;
    guildForum: string;
    noCategory: string;
    noTopicYet: string;
    topicsCount: string;
    by: string;
    unknownUser: string;
    categoryNames: {
      feedback: string;
      support: string;
      general: string;
      bugs: string;
    };
    categoryDescriptions: {
      feedback: string;
      support: string;
      general: string;
      bugs: string;
    };
    empty: {
      noCategories: string;
      beingSetUp: string;
    };
    moderation: {
      sanction: string;
      revokeSanction: string;
      revokeSanctionConfirm: string;
      revoke: string;
    };
    createTopic: string;
    contentPlaceholder: string;
    confirmDeleteTopic: string;
    confirmDeletePost: string;
    topicNotFound: string;
    topicLocked: string;
    replyingTo: string;
    noReplies: string;
    previous: string;
    categoryNotFound: string;
    viewProfile: string;
    siteAdministrator: string;
    forumModerator: string;
    // ForumPost
    edited: string;
    report: string;
    quoteFrom: string;
  };
  // Admin
  admin: {
    forumAdmin: string;
    userManagement: string;
    userManagementDesc: string;
    guildManagement: string;
    guildManagementDesc: string;
    legalPages: string;
    legalPagesDesc: string;
    deletionRequests: string;
    deletionRequestsDesc: string;
    bugReports: string;
    bugReportsDesc: string;
    quickAccess: string;
    forumCategories: string;
    forumModerators: string;
    noCategories: string;
    noModerators: string;
    accessRestricted: string;
    // ForumAdmin specific
    loadingError: string;
    backToForum: string;
    reports: string;
    categories: string;
    moderators: string;
    users: string;
    sanctions: string;
    nameAndSlugRequired: string;
    categoryUpdated: string;
    categoryCreated: string;
    categoryDeleted: string;
    orderUpdated: string;
    moderatorAdded: string;
    moderatorRemoved: string;
    roleRemoved: string;
    roleAdded: string;
    editCategory: string;
    newCategory: string;
    addModerator: string;
    selectUser: string;
    confirmDeletion: string;
    actionIrreversible: string;
    you: string;
    user: string;
    roleManagement: string;
    adminRoleDesc: string;
    modRoleDesc: string;
    global: string;
    // GuildManager specific
    searchGuilds: string;
    syncBattlenet: string;
    syncComplete: string;
    syncError: string;
    noGuildsFound: string;
    totalGuilds: string;
    viewGuild: string;
    editGuild: string;
    deleteGuild: string;
    guildUpdated: string;
    guildUpdateError: string;
    guildDeleted: string;
    guildDeleteError: string;
    editGuildInfo: string;
    confirmDeleteGuild: string;
    deleteGuildWarning: string;
    name: string;
    server: string;
    region: string;
    faction: string;
    order: string;
    icon: string;
    saving: string;
    deleting: string;
    // Admin dashboard
    administration: string;
    adminDashboard: string;
    moderatorDashboard: string;
    stats: {
      users: string;
      guilds: string;
      pendingReports: string;
      activeSanctions: string;
      openBugs: string;
      forumAdminDesc: string;
      uniqueWishUsers: string;
      totalWishes: string;
      guildsWithWishes: string;
      engagementRate: string;
    };
  };
  // Accessibility
  accessibility: {
    previousSlide: string;
    nextSlide: string;
    close: string;
    toggleSidebar: string;
    goToPreviousPage: string;
    goToNextPage: string;
    previous: string;
    next: string;
    morePages: string;
  };
  // Notifications
  notifications: {
    title: string;
    empty: string;
    markAllRead: string;
    mention: string;
    topicReply: string;
    postReply: string;
    subscribe: string;
    subscribed: string;
    subscribedNoNotif: string;
    unsubscribe: string;
    subscribeWithNotif: string;
    subscribeNoNotif: string;
    clickToSubscribe: string;
    clickToMute: string;
    clickToUnsubscribe: string;
  };
  // Activity Log
  activityLog: {
    title: string;
    all: string;
    validations: string;
    members: string;
    rostersCreated: string;
    rostersUpdated: string;
    rostersDeleted: string;
    noActivity: string;
    joinedGuild: string;
    newRoster: string;
    updated: string;
    deleted: string;
  };
  // Permissions
  permissions: {
    title: string;
    description: string;
    noRules: string;
    saved: string;
    addRankRule: string;
    addUserRule: string;
    manageWishes: string;
    manageWishesDesc: string;
    managePolls: string;
    managePollsDesc: string;
    manageRosters: string;
    manageRostersDesc: string;
    viewActivityLog: string;
    viewActivityLogDesc: string;
    manageMembers: string;
    manageMembersDesc: string;
    delegated: string;
    users: string;
    gmOnly: string;
    resetToGmOnly: string;
    resetTooltip: string;
    myPermissions: string;
    guildMaster: string;
    guildMasterDesc: string;
    noPermissions: string;
    grantedByGm: string;
    // PermissionRow & IndividualAccessEditor
    officers: string;
    allMembers: string;
    custom: string;
    ranksRange: string;
    maxRank: string;
    sensitivePermission: string;
    noIndividualAccess: string;
    addSpecificUsers: string;
    individualAccess: string;
    selectMember: string;
  };
  // Guild Navigation
  guildNav: {
    dashboard: string;
    myWishes: string;
    polls: string;
    settings: string;
    activity: string;
    welcome: string;
    myStatus: string;
    guildOverview: string;
    quickAccess: string;
    wishesTable: string;
    noWishApproved: string;
    noWishesYet: string;
  };
  // Errors
  errors: {
    generic: string;
    network: string;
    unauthorized: string;
    notFound: string;
  };
  // Legal pages
  legal: {
    legalNotice: string;
    privacyPolicy: string;
    termsOfService: string;
    lastUpdated: string;
    editLegalPages: string;
    editLegalPagesDesc: string;
  };
  // Cookie consent
  cookies: {
    title: string;
    description: string;
    learnMore: string;
    acceptAll: string;
    rejectAll: string;
    customize: string;
    savePreferences: string;
    preferencesTitle: string;
    preferencesDescription: string;
    essential: string;
    essentialDesc: string;
    analytics: string;
    analyticsDesc: string;
    marketing: string;
    marketingDesc: string;
    manageCookies: string;
  };
  // Polls
  polls: {
    new: string;
    edit: string;
    confirmReset: string;
    resetDescription: string;
    resetAndSave: string;
    settingsOnlyMode: string;
    settingsOnlyDesc: string;
    fullEditMode: string;
    fullEditDesc: string;
    alreadyResponded: string;
    updateResponses: string;
    submitResponses: string;
    notFound: string;
    anonymous: string;
    anonymousDesc: string;
    respond: string;
    viewResults: string;
    hideResults: string;
    closed: string;
    endsOn: string;
    responses: string;
    resultsRestricted: string;
    unstableConnection: string;
    unstableConnectionDesc: string;
    saved: string;
    draftSaved: string;
    published: string;
    updated: string;
    error: string;
    status: {
      draft: string;
      active: string;
      closed: string;
    };
    // PollSectionEditor
    sectionTitle: string;
    sectionDescription: string;
    addQuestionToSection: string;
    // EditActivePollDialog
    editActivePoll: string;
    editActivePollDesc: string;
    editSettings: string;
    editSettingsDesc: string;
    editStructure: string;
    editStructureDesc: string;
    // RankingInput
    dragToRank: string;
    // ActivePollWidget
    activePoll: string;
    ends: string;
    view: string;
    // Other option
    allowOther: string;
    otherSpecify: string;
    otherPlaceholder: string;
    textResponsePlaceholder: string;
    // Conditional questions
    addCondition: string;
    conditionalQuestion: string;
    showIf: string;
    conditionOperator: string;
    conditionValues: string;
    selectAtLeastOneValue: string;
    conditionalBadge: string;
    // Preview
    preview: string;
    previewNote: string;
    closePreview: string;
    duplicate: string;
    duplicateSuccess: string;
  };
  // Patchnotes
  patchnotes: {
    changelog: string;
    changelogDesc: string;
    newVersion: string;
    version: string;
    title: string;
    content: string;
    draft: string;
    published: string;
    publishedAt: string;
    noNotes: string;
    confirmDelete: string;
    confirmDeleteDesc: string;
    versionFormat: string;
    versionExists: string;
    saved: string;
    deleted: string;
    preview: string;
    status: string;
  };
  auto: Record<string, string>;
}

export const translations: Record<Language, Translations> = {
  en: {
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      copy: 'Copy',
      copied: 'Copied!',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      logout: 'Logout',
      login: 'Login',
      myGuilds: 'My Guilds',
      signup: 'Sign up',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      you: 'You',
      settings: 'Settings',
      tipMe: 'Buy me a drink',
      all: 'All',
      refresh: 'Refresh',
      confirm: 'Confirm',
      add: 'Add',
      reset: 'Reset',
      results: 'Results',
      publish: 'Publish',
      close: 'Close',
      processing: 'Processing...',
      upload: 'Upload',
      uploading: 'Uploading...',
      confirmDelete: 'Confirm deletion',
      admin: 'Admin',
      saveDraft: 'Save Draft',
      new: 'New',
      activityLog: 'Activity Log',
      savedAutomatically: 'Saved automatically',
      error: 'Error',
    },
    routeMeta: {
      home: 'Home',
      auth: 'Authentication',
      guilds: 'Guilds',
      profile: 'Profile',
      publicProfile: 'Public profile',
      forum: 'Forum',
      forumAdmin: 'Forum admin',
      admin: 'Administration',
      legal: 'Legal notice',
      privacy: 'Privacy',
      terms: 'Terms of service',
      changelog: 'Changelog',
      forumCategory: 'Forum category',
      forumNewTopic: 'New topic',
      forumTopic: 'Forum topic',
      guildOverview: 'Guild overview',
      guildRoster: 'Roster',
      guildWishes: 'Wishes',
      guildSettings: 'Guild settings',
      guildMemberWishes: 'Member wishes',
      guildPolls: 'Polls',
      guildPollNew: 'New poll',
      guildPollEdit: 'Edit poll',
      guildPollView: 'Poll',
      guildPollResults: 'Poll results',
      guildMembers: 'Members',
      notFound: 'Not found',
    },
    battlenet: {
      connect: 'Link my Battle.net account',
      connected: 'Connected to Battle.net',
      disconnect: 'Unlink Battle.net',
      disconnected: 'Disconnected from Battle.net',
      connectDescription: 'Connect your Battle.net account to automatically import your WoW characters.',
      yourCharacters: 'Your characters',
      noCharacters: 'No characters found',
      noCharactersHint: 'Check that your WoW license is active and that you selected the correct region. If the issue persists, try reconnecting your Battle.net account.',
      main: 'Main',
      mainSet: 'Main character set',
      refresh: 'Refresh',
      connecting: 'Connecting with Battle.net...',
      region: 'Region',
      selectRegion: 'Select your region',
      connectedTo: 'Connected to',
      resync: 'Resync characters',
      resyncSuccess: 'Characters synced successfully',
      resyncError: 'Sync failed. Please try again.',
      errorNoLicense: 'Active WoW license required. Please verify your subscription at battle.net.',
      errorParentalControls: 'Access blocked by parental controls. Please check your Battle.net account settings.',
      errorTokenExpired: 'Battle.net session expired. Please reconnect your account.',
    },
    home: {
      title: 'Guildforce',
      subtitle: 'Plan your raid roster for the next expansion',
      description: 'Collect class and specialization preferences from your guild members to build the perfect roster.',
      createGuild: 'Manage my Guild',
      joinGuild: 'Join my Guild',
      features: {
        collect: {
          title: 'Collect Wishes',
          description: 'Members submit up to 3 class choices with preferred specs',
        },
        visualize: {
          title: 'Visualize Roster',
          description: 'See all wishes at a glance with role and class filters',
        },
        export: {
          title: 'Export Data',
          description: 'Export to CSV for spreadsheets or further analysis',
        },
      },
    },
    auth: {
      loginTitle: 'Login',
      signupTitle: 'Create your account',
      loginDescription: 'Sign in to manage your guild wishes',
      signupDescription: 'Join to start collecting class wishes',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      pseudo: 'Username',
      pseudoPlaceholder: 'Your username',
      forgotPassword: 'Forgot password?',
      invalidEmail: 'Please enter a valid email',
      passwordTooShort: 'Password must be at least 6 characters',
      passwordsDontMatch: 'Passwords do not match',
      userAlreadyExists: 'An account with this email already exists',
      invalidCredentials: 'Invalid email or password',
      orContinueWith: 'Or continue with',
      loginWithBattleNet: 'Continue with Battle.net',
      signupWithBattleNet: 'Continue with Battle.net',
      battlenetError: 'Battle.net authentication failed',
      bnetRequired: 'A Battle.net account is required to use Guildforce',
      bnetNote: 'Your characters and guilds will be automatically imported from Battle.net',
      accountCreated: 'Account created!',
      welcomeBack: 'Welcome back!',
      existingAccountsOnly: 'Login only — account creation requires Battle.net',
    },
    guild: {
      create: 'Create Guild',
      join: 'Join Guild',
      name: 'Guild name',
      namePlaceholder: 'Enter your guild name',
      server: 'Server',
      serverPlaceholder: 'e.g., Hyjal, Archimonde',
      faction: 'Faction',
      horde: 'Horde',
      alliance: 'Alliance',
      members: 'Members',
      member: 'member',
      memberPlural: 'members',
      charactersShown: 'characters',
      uniqueMember: 'unique member on Guildforce',
      uniqueMembers: 'unique members on Guildforce',
      characters: 'characters',
      charactersNotRegistered: 'characters not registered',
      noMembers: 'No members yet',
      leaveGuild: 'Leave guild',
      deleteGuild: 'Delete guild',
      guildCreated: 'Guild created successfully!',
      guildJoined: 'You joined the guild!',
      alreadyMember: 'You are already a member of this guild',
      myGuilds: 'My WoW Guilds',
      guildMaster: 'Guild Master',
      yourCharacters: 'Your characters in this guild',
      gmNote: 'You can manage this guild in Guildforce',
      noGuilds: 'No guilds found. Link your Battle.net account to import your guilds.',
      rank0: 'GM',
      createInApp: 'Create in Guildforce',
      alreadyInApp: 'Already created in Guildforce',
      accessGuild: 'Manage Guild',
      pendingSync: 'Link your Battle.net account to access this guild instantly',
      awaitingGM: 'Awaiting GM',
    },
    wishes: {
      title: 'My Class Wishes',
      wishesOf: 'Wishes of',
      subtitle: 'Select up to 3 classes you want to play next expansion',
      choice: 'Choice',
      choiceNumber: 'Choice #{{number}}',
      selectClass: 'Select a class',
      selectSpecs: 'Select specializations',
      comment: 'Comment',
      commentPlaceholder: 'Any additional information',
      status: 'Commitment',
      confirmed: 'Confirmed for next season',
      potential: 'Potential / Uncertain',
      noWishes: 'No wishes submitted yet',
      saveWishes: 'Save my wishes',
      wishesSaved: 'Your wishes have been saved!',
      clickToExpand: 'Click to see details',
      clickToEdit: 'Click to edit your wishes',
      editMyWishes: 'Edit my wishes',
      specs: 'Specializations',
      preferredChoice: 'Your preferred class',
      secondChoice: 'Second choice',
      thirdChoice: 'Third choice',
      addWish: 'Add a wish',
      removeWish: 'Remove',
      noRosterSelected: 'No roster selected. Please select a roster first.',
      commitment: {
        title: 'Mythic raid commitment',
        confirmed: 'Confirmed',
        confirmedDesc: 'I will be regularly available for mythic raids',
        undecided: 'Undecided',
        undecidedDesc: 'My availability or class choice may change',
        withdrawn: 'Withdrawn',
        withdrawnDesc: 'I will not participate this season',
      },
      validation: {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        approve: 'Approve',
        reject: 'Reject',
        reset: 'Reset',
        approvedBy: 'Approved by',
        rejectedBy: 'Rejected by',
      },
      specRequired: 'Specialization required',
      specRequiredDesc: 'Please select at least one specialization for {class}',
    },
    dashboard: {
      title: 'Roster Dashboard',
      overview: 'Overview',
      roster: 'Roster',
      filters: 'Filters',
      allRoles: 'All roles',
      allClasses: 'All classes',
      tank: 'Tank',
      healer: 'Healer',
      dps: 'DPS',
      melee: 'Melee',
      ranged: 'Ranged',
      player: 'Player',
      discord: 'Discord',
      firstChoice: '1st Choice',
      secondChoice: '2nd Choice',
      thirdChoice: '3rd Choice',
      comments: 'Comments',
      exportCSV: 'Export CSV',
      exportSuccess: 'Export successful',
      noData: 'No data to display',
      totalPlayers: 'Total players',
      confirmedPlayers: 'Confirmed',
      potentialPlayers: 'Potential',
      roleSummary: 'By role',
      clear: 'Clear',
      validation: 'Validation',
      classesCount: 'classes',
      // Extended filters
      commitment: 'Commitment',
      allCommitments: 'All commitments',
      minWishes: 'Min. wishes',
      minWishesPlaceholder: 'Minimum wishes',
      range: 'Range',
      allRanges: 'All ranges',
      withComment: 'With comment',
      withoutComment: 'Without comment',
      allComments: 'All comments',
      wishesMin: '≥{{count}} wishes',
      wishesCount: 'Wishes',
      additionalWishes: 'Additional wishes',
      addWish: 'Add a wish',
      // Analytics tabs and sections
      table: 'Table',
      analytics: 'Analytics',
      classDistribution: 'Class Distribution',
      specDistribution: 'Spec Distribution',
      topSpecs: 'Specialization Popularity',
      rolesByPriority: 'Roles',
      wish1: 'Wish 1',
      otherWishes: 'Other wishes',
      missingClasses: 'Missing Classes',
      allClassesRepresented: 'All classes are represented',
      // Wish range filter
      wishRangeFilter: 'Consider wishes',
      wishRange1: 'Wish 1 only',
      wishRangeN: 'Wishes 1-{{n}}',
      allWishes: 'All wishes',
    },
    profile: {
      title: 'My Profile',
      editProfile: 'Edit profile',
      battletag: 'BattleTag',
      battletagPlaceholder: 'YourName#1234',
      mainCharacter: 'Main character',
      mainCharacterPlaceholder: 'Character name',
      language: 'Language',
      characters: 'My Characters',
      addCharacter: 'Add character',
      noCharacters: 'No characters added',
      characterName: 'Name',
      characterClass: 'Class',
      characterLevel: 'Level',
      isMain: 'Main',
      connectedViaBnet: 'Connected via Battle.net',
      avatar: 'Profile Picture',
      uploadAvatar: 'Upload',
      removeAvatar: 'Remove',
      avatarHint: 'JPG, PNG or GIF. Max 2MB.',
      profileInfo: 'Profile Information',
      accountConnection: 'Account Connection',
      deletion: {
        pending: 'A deletion request is pending processing.',
        cancelRequest: 'Cancel request',
        requestDeletion: 'Request account deletion',
        confirmTitle: 'Delete your account?',
        confirmDescription: 'This action is irreversible. All your data will be permanently deleted:',
        dataList: {
          profile: 'Your profile and avatar',
          characters: 'Your WoW characters',
          wishes: 'Your class wishes',
          forumPosts: 'Your forum posts',
        },
        typeToConfirm: 'Type "{{username}}" to confirm',
        confirmDeletion: 'Confirm deletion',
      },
      battletagVisibility: {
        label: 'BattleTag Visibility',
        everyone: 'Everyone',
        everyoneDesc: 'Visible on your public profile',
        guildOnly: 'Guild members only',
        guildOnlyDesc: 'Only members of your guilds can see it',
        nobody: 'Nobody',
        nobodyDesc: 'Hidden for everyone (except app administrators)',
        saved: 'Visibility preference saved',
      },
    },
    guildSettings: {
      title: 'Guild Settings',
      avatar: 'Guild Avatar',
      uploadAvatar: 'Upload',
      removeAvatar: 'Remove',
      avatarHint: 'JPG, PNG or GIF. Max 2MB.',
      avatarUpdated: 'Avatar updated',
      avatarRemoved: 'Avatar removed',
      uploadError: 'Upload failed',
      guildInfo: 'Guild Information',
      syncedFromBnet: 'This information is synced from Battle.net',
      comingSoon: 'Coming Soon',
      gmOnly: 'Only Guild Masters can access this page',
      resyncBattlenet: 'Resync Battle.net',
      resyncDescription: 'Refresh characters and guild memberships from Battle.net',
      resyncSuccess: 'Battle.net data synced successfully',
      resyncError: 'Sync failed. Please try again.',
      resyncTokenExpired: 'Battle.net session expired. Please reconnect your Battle.net account from your profile.',
      syncing: 'Syncing...',
      officerRankUpdated: 'Officer rank updated',
    },
    rosters: {
      title: 'Rosters',
      createRoster: 'New Roster',
      editRoster: 'Edit Roster',
      rosterName: 'Name',
      rosterNamePlaceholder: 'e.g., Mythic Roster',
      rosterDescription: 'Description',
      rosterDescriptionPlaceholder: 'Optional description',
      rosterCreated: 'Roster created',
      rosterUpdated: 'Roster updated',
      rosterDeleted: 'Roster deleted',
      selectRoster: 'Select roster',
      default: 'Default',
      ranks: 'Ranks',
      everyone: 'All members',
      noAccess: "You don't have access to this roster",
      noAccessMessage: "You can view this roster but cannot edit your wishes.",
      accessRules: 'Who can submit wishes',
      byRank: 'By Rank',
      byUser: 'Specific User',
      selectUser: 'Select user',
      addRankRule: 'Add Rank Rule',
      addUserRule: 'Add User',
      noAccessWarning: 'No access rules defined. Only GMs will be able to submit wishes.',
    },
    forum: {
      title: 'Forum',
      categories: 'Categories',
      topics: 'Topics',
      posts: 'Posts',
      newTopic: 'New topic',
      reply: 'Reply',
      quote: 'Quote',
      edit: 'Edit',
      delete: 'Delete',
      pin: 'Pin',
      unpin: 'Unpin',
      lock: 'Lock',
      unlock: 'Unlock',
      pinned: 'Pinned',
      locked: 'Locked',
      views: 'views',
      replies: 'replies',
      lastReply: 'Last reply',
      noTopics: 'No topics yet',
      noPosts: 'No posts yet',
      writeReply: 'Write a reply...',
      preview: 'Preview',
      postReply: 'Post reply',
      editPost: 'Edit post',
      deleteConfirm: 'Are you sure you want to delete this?',
      topicCreated: 'Topic created!',
      postCreated: 'Reply posted!',
      postUpdated: 'Post updated!',
      postDeleted: 'Post deleted!',
      topicDeleted: 'Topic deleted!',
      backToForum: 'Back to forum',
      backToCategory: 'Back to category',
      globalForum: 'General Forum',
      guildForum: 'Guild Forum',
      noCategory: 'No category available',
      noTopicYet: 'No topic',
      topicsCount: 'topics',
      by: 'by',
      unknownUser: 'Unknown user',
      categoryNames: {
        feedback: 'Feedback & Ideas',
        support: 'Help & Support',
        general: 'General Discussion',
        bugs: 'Bugs & Issues',
      },
      categoryDescriptions: {
        feedback: 'Suggestions and feedback to improve Guildforce',
        support: 'Help and technical support',
        general: 'General discussions about Guildforce and the game',
        bugs: 'Report bugs and technical issues',
      },
      empty: {
        noCategories: 'No categories',
        beingSetUp: 'The forum is being set up.',
      },
      moderation: {
        sanction: 'Sanction',
        revokeSanction: 'Revoke sanction?',
        revokeSanctionConfirm: 'Are you sure you want to revoke the sanction for {{username}}?',
        revoke: 'Revoke',
      },
      createTopic: 'Create topic',
      contentPlaceholder: 'Your message content...',
      confirmDeleteTopic: 'Are you sure you want to delete this topic? This action cannot be undone.',
      confirmDeletePost: 'Are you sure you want to delete this post?',
      topicNotFound: 'Topic not found',
      topicLocked: 'This topic is locked',
      replyingTo: 'Replying to',
      noReplies: 'No replies yet',
      previous: 'Previous',
      categoryNotFound: 'Category not found',
      viewProfile: 'View profile',
      siteAdministrator: 'Site Administrator',
      forumModerator: 'Forum Moderator',
      edited: 'edited',
      report: 'Report',
      quoteFrom: 'Quote from',
    },
    notifications: {
      title: 'Notifications',
      empty: 'No notifications',
      markAllRead: 'Mark all read',
      mention: 'mentioned you',
      topicReply: 'replied to your topic',
      postReply: 'replied in a topic you follow',
      subscribe: 'Subscribe',
      subscribed: 'Subscribed',
      subscribedNoNotif: 'Following (muted)',
      unsubscribe: 'Unsubscribe',
      subscribeWithNotif: 'Subscribe with notifications',
      subscribeNoNotif: 'Follow without notifications',
      clickToSubscribe: 'Click to subscribe',
      clickToMute: 'Click to mute notifications',
      clickToUnsubscribe: 'Click to unsubscribe',
    },
    activityLog: {
      title: 'Activity Log',
      all: 'All',
      validations: 'Validations',
      members: 'Members',
      rostersCreated: 'Rosters Created',
      rostersUpdated: 'Rosters Updated',
      rostersDeleted: 'Rosters Deleted',
      noActivity: 'No activity yet',
      joinedGuild: 'joined the guild',
      newRoster: 'New roster:',
      updated: 'updated',
      deleted: 'deleted',
    },
    permissions: {
      title: 'Permissions',
      description: 'Delegate specific management rights to members based on their Battle.net rank or individually. GMs always have all permissions.',
      noRules: 'Only GMs have this permission',
      saved: 'Permissions saved',
      addRankRule: 'Add by rank',
      addUserRule: 'Add user',
      manageWishes: 'Manage Wishes',
      manageWishesDesc: 'Approve or reject member wishes',
      managePolls: 'Manage Polls',
      managePollsDesc: 'Create, edit and publish polls',
      manageRosters: 'Manage Rosters',
      manageRostersDesc: 'Create and configure rosters',
      viewActivityLog: 'View Activity Log',
      viewActivityLogDesc: 'Access the guild activity history',
      manageMembers: 'Manage Members',
      manageMembersDesc: 'Edit member commitment status',
      delegated: 'delegated',
      users: 'user(s)',
      gmOnly: 'GM only',
      resetToGmOnly: 'Permissions reset (GM only)',
      resetTooltip: 'Remove all delegated permissions',
      myPermissions: 'My permissions',
      guildMaster: 'Guild Master',
      guildMasterDesc: 'You have access to all guild management features.',
      noPermissions: "You don't have any specific permissions granted by the GM.",
      grantedByGm: 'These permissions were granted to you by the guild GM.',
      officers: 'Officers',
      allMembers: 'All members',
      custom: 'Custom...',
      ranksRange: 'Ranks 0-{{max}}',
      maxRank: 'Maximum rank',
      sensitivePermission: 'Sensitive permission',
      noIndividualAccess: 'No individual access defined',
      addSpecificUsers: 'Add specific users to give them additional permissions',
      individualAccess: 'Individual access',
      selectMember: 'Select a member...',
    },
    guildNav: {
      dashboard: 'Dashboard',
      myWishes: 'My Wishes',
      polls: 'Polls',
      settings: 'Settings',
      activity: 'Activity',
      welcome: 'Welcome',
      myStatus: 'My Status',
      guildOverview: 'Guild Overview',
      quickAccess: 'Quick Access',
      wishesTable: 'Wishes Table',
      noWishApproved: 'No wish approved',
      noWishesYet: "You haven't set your wishes yet",
    },
    errors: {
      generic: 'Something went wrong. Please try again.',
      network: 'Network error. Please check your connection.',
      unauthorized: 'You are not authorized to perform this action.',
      notFound: 'The requested resource was not found.',
    },
    legal: {
      legalNotice: 'Legal Notice',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      lastUpdated: 'Last updated',
      editLegalPages: 'Manage Legal Pages',
      editLegalPagesDesc: 'Edit mandatory legal pages content',
    },
    cookies: {
      title: 'We use cookies',
      description: 'We use cookies to improve your experience and analyze site traffic. You can choose which cookies to accept.',
      learnMore: 'Learn more about our privacy policy',
      acceptAll: 'Accept all',
      rejectAll: 'Reject all',
      customize: 'Customize',
      savePreferences: 'Save preferences',
      preferencesTitle: 'Cookie preferences',
      preferencesDescription: 'Manage your cookie preferences. Essential cookies are always enabled as they are necessary for the site to function.',
      essential: 'Essential cookies',
      essentialDesc: 'Required for the site to function properly. Cannot be disabled.',
      analytics: 'Analytics cookies',
      analyticsDesc: 'Help us understand how visitors interact with the site.',
      marketing: 'Marketing cookies',
      marketingDesc: 'Used to display personalized ads based on your interests.',
      manageCookies: 'Cookie settings',
    },
    polls: {
      new: 'New Poll',
      edit: 'Edit Poll',
      confirmReset: 'Confirm Reset',
      resetDescription: 'This action will permanently delete all existing responses. This action cannot be undone.',
      resetAndSave: 'Reset and Save',
      settingsOnlyMode: 'Settings only mode',
      settingsOnlyDesc: 'Questions cannot be modified. Existing responses will be preserved.',
      fullEditMode: 'Full edit mode',
      fullEditDesc: 'Warning: saving will reset all existing responses.',
      alreadyResponded: 'You have already responded to this poll',
      updateResponses: 'Update my responses',
      submitResponses: 'Submit my responses',
      notFound: 'Poll not found',
      anonymous: 'Anonymous',
      anonymousDesc: 'This poll is anonymous. Your responses will not be associated with your name.',
      respond: 'Respond',
      viewResults: 'View Results',
      hideResults: 'Hide Results',
      closed: 'Closed',
      endsOn: 'Ends',
      responses: 'responses',
      resultsRestricted: 'Results for this poll are restricted to certain members.',
      unstableConnection: 'Unstable connection',
      unstableConnectionDesc: "Some poll data couldn't be loaded. Check your connection and retry (you won't be redirected automatically).",
      saved: 'Poll saved',
      draftSaved: 'Draft saved',
      published: 'Poll published!',
      updated: 'Poll updated',
      error: 'Error',
      status: {
        draft: 'Draft',
        active: 'Active',
        closed: 'Closed',
      },
      sectionTitle: 'Section title...',
      sectionDescription: 'Description (optional)...',
      addQuestionToSection: 'Add question to this section',
      editActivePoll: 'Edit Active Poll',
      editActivePollDesc: 'This poll already has {{count}} response(s). Choose the type of edit.',
      editSettings: 'Edit Settings',
      editSettingsDesc: 'Title, description, end date, target roster. Responses are preserved.',
      editStructure: 'Edit Structure',
      editStructureDesc: 'Questions and options. ⚠️ This will reset all existing responses.',
      dragToRank: 'Drag and drop to rank items (1 = best)',
      activePoll: 'Active Poll',
      ends: 'Ends',
      view: 'View',
      allowOther: 'Allow "Other (specify)"',
      otherSpecify: 'Other (specify)',
      otherPlaceholder: 'Please specify...',
      textResponsePlaceholder: 'Your answer...',
      addCondition: 'Add condition',
      conditionalQuestion: 'Conditional question',
      showIf: 'Show if question',
      conditionOperator: 'Operator',
      conditionValues: 'Values',
      selectAtLeastOneValue: 'Select at least one value',
      conditionalBadge: 'Conditional',
      preview: 'Preview',
      previewNote: 'This is a preview. Your responses will not be saved.',
      closePreview: 'Close Preview',
      duplicate: 'Duplicate',
      duplicateSuccess: 'Poll duplicated as draft',
    },
    bugReport: {
      button: 'Report a bug',
      title: 'Bug Report',
      subtitle: 'Help us improve by reporting issues',
      titleField: 'Title',
      titlePlaceholder: 'Brief description of the issue',
      descriptionField: 'Description',
      descriptionPlaceholder: 'Explain what happened and how to reproduce it',
      category: 'Category',
      categories: {
        bug: 'Bug',
        ui: 'Interface',
        performance: 'Performance',
        feature: 'Suggestion',
        other: 'Other',
      },
      priority: 'Perceived priority',
      priorities: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical',
      },
      statuses: {
        open: 'Open',
        investigating: 'Investigating',
        resolved: 'Resolved',
        closed: 'Closed',
        wontfix: "Won't fix",
      },
      autoInfo: 'Automatic information',
      errorsDetected: 'errors detected',
      browser: 'Browser',
      userStatus: 'Connected',
      submit: 'Send report',
      success: 'Report sent, thank you!',
      error: 'Error sending report',
      errorMissingFields: 'Please fill in all required fields',
      rateLimitError: 'Too many reports submitted. Please try again later.',
      anonymous: 'Anonymous',
      admin: {
        title: 'Bug Reports',
        criticalPending: 'critical pending',
        noReports: 'No bug reports yet',
        fetchError: 'Error loading reports',
        updateError: 'Error updating report',
        statusUpdated: 'Status updated',
        deleted: 'Report deleted',
        deleteError: 'Error deleting report',
        filterStatus: 'Filter by status',
        filterPriority: 'Filter by priority',
        reporter: 'Reporter',
        createdAt: 'Created',
        consoleLogs: 'Console Logs',
        browserInfo: 'Browser Information',
        userContext: 'User Context',
        resolvedBy: 'Resolved by',
        resolutionNote: 'Resolution Note',
        resolutionNotePlaceholder: 'Add notes about how this was resolved...',
        markInvestigating: 'Mark as investigating',
        markResolved: 'Mark as resolved',
        markWontfix: "Mark as won't fix",
        delete: 'Delete',
      },
    },
    admin: {
      forumAdmin: 'Forum Administration',
      userManagement: 'User Management',
      userManagementDesc: 'Assign roles (Admin, Moderator) to users',
      guildManagement: 'Guild Management',
      guildManagementDesc: 'Search, edit and delete guilds',
      legalPages: 'Legal Pages',
      legalPagesDesc: 'Edit legal notice, privacy policy and terms of service content',
      deletionRequests: 'Deletion Requests',
      deletionRequestsDesc: 'Process account deletion requests (GDPR)',
      bugReports: 'Bug Reports',
      bugReportsDesc: 'View and manage bug reports',
      quickAccess: 'Quick Access',
      forumCategories: 'Forum Categories',
      forumModerators: 'Forum Moderators',
      noCategories: 'No categories',
      noModerators: 'No moderators',
      accessRestricted: 'Admin access only',
      // ForumAdmin specific
      loadingError: 'Loading error',
      backToForum: 'Back to forum',
      reports: 'Reports',
      categories: 'Categories',
      moderators: 'Moderators',
      users: 'Users',
      sanctions: 'Sanctions',
      nameAndSlugRequired: 'Name and slug required',
      categoryUpdated: 'Category updated',
      categoryCreated: 'Category created',
      categoryDeleted: 'Category deleted',
      orderUpdated: 'Order updated',
      moderatorAdded: 'Moderator added',
      moderatorRemoved: 'Moderator removed',
      roleRemoved: 'Role removed',
      roleAdded: 'Role added',
      editCategory: 'Edit Category',
      newCategory: 'New Category',
      addModerator: 'Add Moderator',
      selectUser: 'Select...',
      confirmDeletion: 'Confirm Deletion',
      actionIrreversible: 'This action cannot be undone.',
      you: 'You',
      user: 'User',
      roleManagement: 'Role Management',
      adminRoleDesc: 'Full access: manage categories, moderators, and all user roles',
      modRoleDesc: 'Forum moderation: pin, lock, and delete topics/posts',
      global: 'Global',
      // GuildManager specific
      searchGuilds: 'Search guilds...',
      syncBattlenet: 'Sync Battle.net',
      syncComplete: 'Sync complete',
      syncError: 'Error during sync',
      noGuildsFound: 'No guilds found',
      totalGuilds: 'guilds total',
      viewGuild: 'View guild',
      editGuild: 'Edit Guild',
      deleteGuild: 'Delete guild?',
      guildUpdated: 'Guild updated',
      guildUpdateError: 'Error updating guild',
      guildDeleted: 'Guild deleted',
      guildDeleteError: 'Error deleting guild',
      editGuildInfo: 'Update guild information.',
      confirmDeleteGuild: 'Are you sure you want to delete',
      deleteGuildWarning: 'This action is irreversible and will delete all associated data (members, wishes, polls, etc.).',
      name: 'Name',
      server: 'Server',
      region: 'Region',
      faction: 'Faction',
      order: 'Order',
      icon: 'Icon (emoji)',
      saving: 'Saving...',
      deleting: 'Deleting...',
      // Admin dashboard
      administration: 'Administration',
      adminDashboard: 'Admin dashboard',
      moderatorDashboard: 'Moderator dashboard',
      stats: {
        users: 'Users',
        guilds: 'Guilds',
        pendingReports: 'Pending Reports',
        activeSanctions: 'Active Sanctions',
        openBugs: 'Open Bugs',
        forumAdminDesc: 'Manage categories, moderators, reports and sanctions',
        uniqueWishUsers: 'Users with wishes',
        totalWishes: 'Total wishes',
        guildsWithWishes: 'Guilds with wishes',
        engagementRate: 'Engagement rate',
      },
    },
    accessibility: {
      previousSlide: 'Previous slide',
      nextSlide: 'Next slide',
      close: 'Close',
      toggleSidebar: 'Toggle Sidebar',
      goToPreviousPage: 'Go to previous page',
      goToNextPage: 'Go to next page',
      previous: 'Previous',
      next: 'Next',
      morePages: 'More pages',
    },
    patchnotes: {
      changelog: 'Changelog',
      changelogDesc: 'All updates and improvements to Guildforce',
      newVersion: 'New version',
      version: 'Version',
      title: 'Title',
      content: 'Content',
      draft: 'Draft',
      published: 'Published',
      publishedAt: 'Published on',
      noNotes: 'No updates yet',
      confirmDelete: 'Delete this version?',
      confirmDeleteDesc: 'This action cannot be undone. Delete version',
      versionFormat: 'Format: X.Y.Z (e.g., 1.0.0)',
      versionExists: 'This version already exists',
      saved: 'Version saved',
      deleted: 'Version deleted',
      preview: 'Preview',
      status: 'Status',
    },
                            auto: {
      components_AvatarCropDialog_crop_preview_alt: 'Aper?u du recadrage',
      components_AvatarCropDialog_title: 'Recadrer l\'avatar',
      components_BattleNetConnect_title: 'Battle.net',
      components_BugReportButton_url_label: 'URL:',
      components_Footer_brand: 'Guildforce',
      components_GlobalNav_auth_aria_label: 'Authentification',
      components_GlobalNav_home_aria_label: 'Accueil Guildforce',
      components_GlobalNav_menu_aria_label: 'Menu',
      components_GlobalNav_menu_label: 'Menu',
      components_GlobalNav_nav_aria_label: 'Navigation principale',
      components_admin_AdminDocumentation_405: 'Documentation',
      components_admin_AdminDocumentation_408: 'Guide complet de l\'application Guildforce',
      components_admin_AdminDocumentation_419: 'Rechercher...',
      components_admin_AdminDocumentation_475: 'Aucun résultat trouvé pour votre recherche',
      components_admin_BugReportsManager_url_label: 'URL',
      components_admin_DeletionRequestsManager_100: 'Erreur',
      components_admin_DeletionRequestsManager_126: 'Demandes de suppression',
      components_admin_DeletionRequestsManager_131: 'en attente',
      components_admin_DeletionRequestsManager_140: 'En attente',
      components_admin_DeletionRequestsManager_157: 'Demandé le',
      components_admin_DeletionRequestsManager_176: 'Marquer traité',
      components_admin_DeletionRequestsManager_180: 'Supprimez manuellement le compte dans Supabase Auth avant de marquer comme traité',
      components_admin_DeletionRequestsManager_193: 'Traitées',
      components_admin_DeletionRequestsManager_211: 'Annulée',
      components_admin_DeletionRequestsManager_212: 'Traitée le',
      components_admin_DeletionRequestsManager_222: 'Annulée',
      components_admin_DeletionRequestsManager_223: 'Traitée',
      components_admin_DeletionRequestsManager_237: 'Aucune demande de suppression',
      components_admin_DeletionRequestsManager_60: 'Erreur',
      components_admin_DeletionRequestsManager_61: 'Impossible de charger les demandes',
      components_admin_DeletionRequestsManager_90: 'Demande traitée',
      components_admin_DeletionRequestsManager_91: 'La demande a été marquée comme traitée',
      components_admin_GuildManager_actions: 'Actions',
      components_admin_GuildManager_sync_job: 'Sync lanc?e (job {{jobId}}). Rafra?chis dans 1-2 min.',
      components_admin_GuildManager_sync_started: 'Sync lanc?e, ?a peut prendre quelques minutes (rafra?chis ensuite).',
      components_admin_LegalPagesEditor_137: 'Éditer',
      components_admin_LegalPagesEditor_137_2: 'Aperçu',
      components_admin_LegalPagesEditor_217: 'Titre',
      components_admin_LegalPagesEditor_234: 'Contenu',
      components_admin_LegalPagesEditor_244: 'Contenu en Markdown...',
      components_admin_LegalPagesEditor_259: 'Gérez les pages légales obligatoires de votre site. Le contenu est affiché en Markdown.',
      components_admin_LegalPagesEditor_267: 'fr-FR',
      components_admin_LegalPagesEditor_287: 'Modifier',
      components_admin_LegalPagesEditor_93: 'Page enregistrée',
      components_admin_LegalPagesEditor_language_en: 'English',
      components_admin_LegalPagesEditor_language_fr: 'Fran?ais',
      components_admin_PatchNotesEditor_content_en_placeholder: 'Describe the changes...',
      components_admin_PatchNotesEditor_content_fr_placeholder: 'D?crivez les changements...',
      components_admin_PatchNotesEditor_language_en: 'English',
      components_admin_PatchNotesEditor_language_fr: 'Fran?ais',
      components_admin_PatchNotesEditor_title_en_placeholder: 'Version title',
      components_admin_PatchNotesEditor_title_fr_placeholder: 'Titre de la version',
      components_admin_PatchNotesEditor_version_placeholder: '1.0.0',
      components_admin_UserManager_198: 'Erreur lors du chargement des utilisateurs',
      components_admin_UserManager_223: 'Vous ne pouvez pas retirer votre propre rôle admin',
      components_admin_UserManager_277: 'Erreur lors de la modification du rôle',
      components_admin_UserManager_286: 'fr-FR',
      components_admin_UserManager_349: 'Rechercher par nom ou battletag',
      components_admin_UserManager_355: 'Rechercher par nom ou battletag...',
      components_admin_UserManager_375: 'Utilisateur',
      components_admin_UserManager_386: 'BattleTag',
      components_admin_UserManager_397: 'Région',
      components_admin_UserManager_408: 'Créé le',
      components_admin_UserManager_419: 'Dernière maj',
      components_admin_UserManager_430: 'Langue',
      components_admin_UserManager_441: 'Perso principal',
      components_admin_UserManager_452: 'Rôles',
      components_admin_UserManager_456: 'Actions',
      components_admin_UserManager_471: 'Aucun utilisateur trouvé',
      components_admin_UserManager_490: 'Vous',
      components_admin_UserManager_role_assigned: 'R?le {{role}} attribu?',
      components_admin_UserManager_role_removed: 'R?le {{role}} retir?',
      components_admin_UserManager_total_users_plural: '{{count}} utilisateurs au total',
      components_admin_UserManager_total_users_single: '{{count}} utilisateur au total',
      components_dashboard_ActivityLog_172: 'a ajouté un vœu',
      components_dashboard_ActivityLog_205: 'a modifié un vœu',
      components_dashboard_ActivityLog_250: 'a supprimé un vœu',
      components_dashboard_ActivityLog_274: 'a rejoint la guilde',
      components_dashboard_ActivityLog_284: 'Confirmé',
      components_dashboard_ActivityLog_285: 'Retrait',
      components_dashboard_ActivityLog_286: 'Indécis',
      components_dashboard_ActivityLog_300: 'a changé son engagement',
      components_dashboard_ActivityLog_316: 'Nouveau roster :',
      components_dashboard_ActivityLog_336: 'modifié',
      components_dashboard_ActivityLog_350: 'supprimé',
      components_dashboard_ActivityLog_376: 'a modifié les permissions',
      components_dashboard_ActivityLog_389: 'règle(s) active(s)',
      components_dashboard_ActivityLog_409: 'Journal d\'activité',
      components_dashboard_ActivityLog_419: 'Tout',
      components_dashboard_ActivityLog_422: 'Vœux créés',
      components_dashboard_ActivityLog_425: 'Vœux modifiés',
      components_dashboard_ActivityLog_428: 'Vœux supprimés',
      components_dashboard_ActivityLog_431: 'Validations',
      components_dashboard_ActivityLog_434: 'Membres',
      components_dashboard_ActivityLog_437: 'Engagements',
      components_dashboard_ActivityLog_440: 'Rosters créés',
      components_dashboard_ActivityLog_443: 'Rosters modifiés',
      components_dashboard_ActivityLog_446: 'Rosters supprimés',
      components_dashboard_ActivityLog_449: 'Permissions',
      components_dashboard_ActivityLog_481: 'Aucune activité',
      components_dashboard_ActivityLog_entries: '{{count}} entr?es',
      components_dashboard_RosterAnalytics_wish_range: 'V?ux 1-{{n}}',
      components_dashboard_RosterFilters_168: 'vœux',
      components_dashboard_RosterFilters_261: 'Joueurs',
      components_dashboard_RosterFilters_324: 'Vœux',
      components_dashboard_RosterFilters_484: 'Spécialités',
      components_dashboard_RosterFilters_497: 'Rôles',
      components_dashboard_RosterFilters_551: 'Classes',
      components_dashboard_RosterFilters_616: 'Actifs :',
      components_dashboard_RosterFilters_636: 'Tout effacer',
      components_dashboard_RosterTable_419: 'vœux au total',
      components_forum_ForumTopicList_reactions_title: 'R?actions',
      components_forum_MarkdownEditor_188: 'Écrire',
      components_forum_MarkdownEditor_192: 'Aperçu',
      components_forum_MarkdownEditor_297: 'Rien à prévisualiser',
      components_forum_MarkdownEditor_64: 'Titre 1',
      components_forum_MarkdownEditor_65: 'Titre 2',
      components_forum_MarkdownEditor_66: 'Titre 3',
      components_forum_MarkdownEditor_71: 'Gras',
      components_forum_MarkdownEditor_72: 'Italique',
      components_forum_MarkdownEditor_73: 'Barré',
      components_forum_MarkdownEditor_78: 'Liste à puces',
      components_forum_MarkdownEditor_79: 'Liste numérotée',
      components_forum_MarkdownEditor_80: 'Liste de tâches',
      components_forum_MarkdownEditor_85: 'Citation',
      components_forum_MarkdownEditor_86: 'Code inline',
      components_forum_MarkdownEditor_87: 'Séparateur',
      components_forum_MarkdownEditor_92: 'Lien',
      components_forum_MarkdownEditor_93: 'Image',
      components_forum_MarkdownEditor_94: 'Tableau',
      components_forum_MarkdownEditor_95: 'Mention',
      components_forum_NotificationBell_mention: '{{username}} vous a mentionn? dans "{{topicTitle}}"',
      components_forum_NotificationBell_post_reply: '{{username}} a r?pondu dans "{{topicTitle}}"',
      components_forum_NotificationBell_topic_reply: '{{username}} a r?pondu ? votre sujet "{{topicTitle}}"',
      components_forum_ReportDialog_106: 'Détails (optionnel)',
      components_forum_ReportDialog_113: 'Décrivez le problème...',
      components_forum_ReportDialog_128: 'Annuler',
      components_forum_ReportDialog_138: 'Envoi...',
      components_forum_ReportDialog_143: 'Signaler',
      components_forum_ReportDialog_63: 'Signalement envoyé, merci !',
      components_forum_ReportDialog_71: 'Erreur lors du signalement',
      components_forum_ReportDialog_83: 'Signaler ce contenu',
      components_forum_ReportDialog_89: 'Raison du signalement',
      components_forum_ReportsManager_173: 'Erreur de chargement',
      components_forum_ReportsManager_218: 'Signalement résolu',
      components_forum_ReportsManager_219: 'Signalement rejeté',
      components_forum_ReportsManager_227: 'Erreur',
      components_forum_ReportsManager_251: 'En attente',
      components_forum_ReportsManager_255: 'Résolu',
      components_forum_ReportsManager_259: 'Rejeté',
      components_forum_ReportsManager_273: 'Signalements',
      components_forum_ReportsManager_285: 'Tous',
      components_forum_ReportsManager_286: 'En attente',
      components_forum_ReportsManager_287: 'Résolus',
      components_forum_ReportsManager_288: 'Rejetés',
      components_forum_ReportsManager_299: 'Aucun signalement',
      components_forum_ReportsManager_337: 'a signalé',
      components_forum_ReportsManager_347: 'Message de',
      components_forum_ReportsManager_356: 'Sujet de',
      components_forum_ReportsManager_364: 'Contenu supprimé',
      components_forum_ReportsManager_379: 'Traité par',
      components_forum_ReportsManager_395: 'Voir',
      components_forum_ReportsManager_404: 'Traiter',
      components_forum_ReportsManager_420: 'Traiter le signalement',
      components_forum_ReportsManager_428: 'Raison :',
      components_forum_ReportsManager_435: 'Détails :',
      components_forum_ReportsManager_443: 'Note de résolution (optionnel)',
      components_forum_ReportsManager_450: 'Action prise...',
      components_forum_ReportsManager_463: 'Rejeter',
      components_forum_ReportsManager_475: 'Résoudre',
      components_forum_SanctionDialog_117: 'Utilisateur ciblé',
      components_forum_SanctionDialog_124: 'Type de sanction',
      components_forum_SanctionDialog_133: 'Timeout (suspension temporaire)',
      components_forum_SanctionDialog_139: 'Bannissement',
      components_forum_SanctionDialog_148: 'Durée',
      components_forum_SanctionDialog_165: 'Raison',
      components_forum_SanctionDialog_171: 'Décrivez la raison de cette sanction...',
      components_forum_SanctionDialog_179: 'Annuler',
      components_forum_SanctionDialog_191: 'Appliquer',
      components_forum_SanctionDialog_62: 'Une raison est requise',
      components_forum_SanctionDialog_86: 'Erreur lors de l\'application de la sanction',
      components_forum_SanctionDialog_98: 'Appliquer une sanction',
      components_forum_SanctionDialog_applied: 'Sanction appliqu?e ? {{username}}',
      components_forum_SanctionsManager_128: 'Banni',
      components_forum_SanctionsManager_133: 'Timeout',
      components_forum_SanctionsManager_147: 'Par',
      components_forum_SanctionsManager_154: 'Expire',
      components_forum_SanctionsManager_158: 'Permanent',
      components_forum_SanctionsManager_177: 'Révoquer',
      components_forum_SanctionsManager_193: 'Révoquer la sanction ?',
      components_forum_SanctionsManager_196: 'Êtes-vous sûr de vouloir révoquer la sanction de {{username}} ?',
      components_forum_SanctionsManager_207: 'Révoquer',
      components_forum_SanctionsManager_40: 'Erreur de chargement',
      components_forum_SanctionsManager_57: 'Sanction révoquée',
      components_forum_SanctionsManager_63: 'Erreur',
      components_forum_SanctionsManager_86: 'Sanctions actives',
      components_forum_SanctionsManager_97: 'Aucune sanction active',
      components_polls_PollEditor_146: 'Section title...',
      components_polls_PollEditor_152: 'Description (optional)...',
      components_polls_PollEditor_527: 'General information',
      components_polls_PollEditor_533: 'Poll title',
      components_polls_PollEditor_539: 'e.g. Season 3 recap',
      components_polls_PollEditor_546: 'Description (optional)',
      components_polls_PollEditor_552: 'Explain the purpose of the poll...',
      components_polls_PollEditor_563: 'Target roster',
      components_polls_PollEditor_577: 'All members',
      components_polls_PollEditor_590: 'Closing date (optional)',
      components_polls_PollEditor_613: 'Anonymous responses',
      components_polls_PollEditor_649: 'Questions',
      components_polls_PollEditor_655: 'Section',
      components_polls_PollEditor_659: 'Question',
      components_polls_PollEditor_667: 'Questions cannot be edited in settings mode.',
      components_polls_PollEditor_683: 'Add questions or sections to get started',
      components_polls_PollEditor_699: 'General questions',
      components_polls_PollEditor_833: 'Add a question',
      components_polls_PollEditor_852: 'Question...',
      components_polls_PollEditor_868: 'Fill in all answer options (A, B, ...) to publish.',
      components_polls_PollEditor_896: 'Save draft',
      components_polls_PollEditor_897: 'Save',
      components_polls_PollEditor_911: 'Publish poll',
      components_polls_PollEditor_section_label: 'S{{index}}',
      components_polls_PollQuestionEditor_125: 'Your question...',
      components_polls_PollQuestionEditor_162: 'Items to rank',
      components_polls_PollQuestionEditor_163: 'Answer options',
      components_polls_PollQuestionEditor_173: 'Option',
      components_polls_PollQuestionEditor_195: 'Add an option',
      components_polls_PollQuestionEditor_217: 'Scale settings',
      components_polls_PollQuestionEditor_239: 'Steps',
      components_polls_PollQuestionEditor_250: 'Min label',
      components_polls_PollQuestionEditor_254: 'e.g. Not at all',
      components_polls_PollQuestionEditor_259: 'Max label',
      components_polls_PollQuestionEditor_263: 'e.g. Completely',
      components_polls_PollQuestionEditor_278: 'Required answer',
      components_polls_PollQuestionEditor_33: 'Single choice',
      components_polls_PollQuestionEditor_34: 'Multiple choice',
      components_polls_PollQuestionEditor_35: 'Free text',
      components_polls_PollQuestionEditor_36: 'Scale (1-5)',
      components_polls_PollQuestionEditor_37: 'Date',
      components_polls_PollQuestionEditor_38: 'Time',
      components_polls_PollQuestionEditor_39: 'Date and time',
      components_polls_PollQuestionEditor_40: 'Ranking',
      components_polls_PollQuestionEditor_41: 'Custom scale',
      components_polls_PollQuestionEditor_max_label: 'Max',
      components_polls_PollQuestionEditor_min_label: 'Min',
      components_polls_PollRespondentEditor_263: 'Respondent targeting',
      components_polls_PollRespondentEditor_274: 'Restrict who can respond',
      components_polls_PollRespondentEditor_280: 'All guild members can respond to this poll.',
      components_polls_PollRespondentEditor_292: 'By rank',
      components_polls_PollRespondentEditor_310: 'Specific user',
      components_polls_PollRespondentEditor_317: 'Select a user',
      components_polls_PollRespondentEditor_351: 'Add a user',
      components_polls_PollRespondentEditor_355: 'Users added individually can respond even if they are outside the rank range.',
      components_polls_PollResultsAccessEditor_276: 'Results visibility',
      components_polls_PollResultsAccessEditor_287: 'Restrict access to results',
      components_polls_PollResultsAccessEditor_293: 'All guild members can see the results.',
      components_polls_PollResultsAccessEditor_305: 'By rank',
      components_polls_PollResultsAccessEditor_324: 'Specific user',
      components_polls_PollResultsAccessEditor_331: 'Select...',
      components_polls_PollResultsAccessEditor_364: 'Add a user',
      components_polls_PollResultsAccessEditor_368: 'GMs and poll managers can always see the results.',
      components_polls_PollResultsAccessEditor_61: 'Officers',
      components_polls_PollResults_224: 'Anonymous',
      components_polls_PollResults_330: 'No responses',
      components_polls_PollResults_383: 'Individual votes',
      components_polls_PollResults_425: 'responses',
      components_polls_PollResults_435: 'No responses',
      components_polls_PollResults_536: 'Individual votes',
      components_polls_PollResults_574: 'responses',
      components_polls_PollResults_584: 'No responses',
      components_polls_PollResults_614: 'Score',
      components_polls_PollResults_response_plural: 'responses',
      components_polls_PollResults_response_single: 'response',
      components_polls_PollSectionEditor_section_label: 'S{{index}}',
      components_polls_QuestionConditionEditor_126: 'Add a condition',
      components_polls_QuestionConditionEditor_148: 'Conditional question',
      components_polls_QuestionConditionEditor_163: 'Show if the question',
      components_polls_QuestionConditionEditor_186: 'Operator',
      components_polls_QuestionConditionEditor_206: 'Values',
      components_polls_QuestionConditionEditor_224: 'Select at least one value',
      components_polls_QuestionConditionEditor_234: 'Value',
      components_polls_QuestionConditionEditor_250: 'Enter a value',
      components_polls_QuestionConditionEditor_41: 'equals',
      components_polls_QuestionConditionEditor_42: 'does not equal',
      components_polls_QuestionConditionEditor_43: 'contains',
      components_polls_QuestionConditionEditor_44: 'does not contain',
      components_polls_QuestionConditionEditor_49: 'equals',
      components_polls_QuestionConditionEditor_50: 'does not equal',
      components_polls_QuestionConditionEditor_51: 'is greater than',
      components_polls_QuestionConditionEditor_52: 'is less than',
      components_polls_QuestionConditionEditor_53: 'is greater than or equal to',
      components_polls_QuestionConditionEditor_54: 'is less than or equal to',
      components_polls_SortableQuestion_155: 'Your question...',
      components_polls_SortableQuestion_192: 'Items to rank',
      components_polls_SortableQuestion_193: 'Answer options',
      components_polls_SortableQuestion_203: 'Option',
      components_polls_SortableQuestion_225: 'Add an option',
      components_polls_SortableQuestion_247: 'Scale settings',
      components_polls_SortableQuestion_269: 'Steps',
      components_polls_SortableQuestion_280: 'Min label',
      components_polls_SortableQuestion_284: 'e.g. Not at all',
      components_polls_SortableQuestion_289: 'Max label',
      components_polls_SortableQuestion_293: 'e.g. Completely',
      components_polls_SortableQuestion_308: 'Required answer',
      components_polls_SortableQuestion_55: 'Single choice',
      components_polls_SortableQuestion_56: 'Multiple choice',
      components_polls_SortableQuestion_57: 'Free text',
      components_polls_SortableQuestion_58: 'Scale (1-5)',
      components_polls_SortableQuestion_59: 'Date',
      components_polls_SortableQuestion_60: 'Time',
      components_polls_SortableQuestion_61: 'Date and time',
      components_polls_SortableQuestion_62: 'Ranking',
      components_polls_SortableQuestion_63: 'Custom scale',
      components_polls_SortableQuestion_max_label: 'Max',
      components_polls_SortableQuestion_min_label: 'Min',
      components_settings_GuildBattleNetSection_title: 'Battle.net',
      components_ui_breadcrumb_label: 'Fil d\'Ariane',
      components_ui_breadcrumb_more: 'Plus',
      components_ui_pagination_label: 'Pagination',
      export_class: 'Classe',
      export_comment: 'Commentaire',
      export_commitment: 'Engagement',
      export_filename_suffix: 'voeux',
      export_player: 'Joueur',
      export_roles: 'R?les',
      export_specs: 'Sp?cialisations',
      export_validation: 'Validation',
      export_wish_label: 'V?u {{index}}',
      hooks_useGuildPolls_close_error: 'Error closing the poll',
      hooks_useGuildPolls_close_success: 'Poll closed',
      hooks_useGuildPolls_create_error: 'Error creating the poll',
      hooks_useGuildPolls_delete_error: 'Error deleting the poll',
      hooks_useGuildPolls_delete_success: 'Poll deleted',
      hooks_useGuildPolls_duplicate_error: 'Error duplicating the poll',
      hooks_useGuildPolls_duplicate_suffix: '(copy)',
      hooks_useGuildPolls_publish_error: 'Error publishing the poll',
      hooks_useGuildPolls_publish_success: 'Poll published!',
      hooks_useGuildPolls_questions_update_error: 'Error updating questions',
      hooks_useGuildPolls_questions_updated: 'Questions updated',
      hooks_useGuildPolls_reset_error: 'Error resetting responses',
      hooks_useGuildPolls_reset_success: 'Responses reset',
      hooks_useGuildPolls_respondent_rules_error: 'Error saving targeting',
      hooks_useGuildPolls_results_rules_error: 'Error saving permissions',
      hooks_useGuildPolls_submit_all_error: 'Error submitting responses',
      hooks_useGuildPolls_submit_all_success: 'Responses saved!',
      hooks_useGuildPolls_submit_response_error: 'Error submitting response',
      hooks_useGuildPolls_update_error: 'Error updating the poll',
      pages_Auth_brand: 'Guildforce',
      pages_Auth_email_placeholder: 'ton@email.com',
      pages_Auth_password_placeholder: '????????',
      pages_ForumAdmin_category_description_placeholder: 'Description...',
      pages_ForumAdmin_category_icon_placeholder: '??',
      pages_ForumAdmin_category_name_placeholder: 'Discussion g?n?rale',
      pages_ForumAdmin_category_slug_placeholder: 'general',
      pages_ForumAdmin_description_label: 'Description',
      pages_ForumAdmin_slug_label: 'Slug',
      pages_ForumNewTopic_112: 'Nouveau sujet',
      pages_ForumNewTopic_115: 'Dans {{categoryName}}',
      pages_ForumNewTopic_124: 'Titre',
      pages_ForumNewTopic_129: 'Titre du sujet',
      pages_ForumNewTopic_138: 'Contenu',
      pages_ForumNewTopic_143: 'Contenu de votre message...',
      pages_ForumNewTopic_160: 'Créer le sujet',
      pages_ForumNewTopic_34: 'Sujet créé !',
      pages_ForumNewTopic_37: 'Erreur lors de la création',
      pages_ForumNewTopic_50: 'Connectez-vous pour créer un sujet',
      pages_ForumNewTopic_53: 'Se connecter',
      pages_ForumNewTopic_75: 'Catégorie non trouvée',
      pages_ForumNewTopic_78: 'Retour au forum',
      pages_ForumNewTopic_97: 'Nouveau sujet',
      pages_ForumTopic_103: 'Sujet supprimé',
      pages_ForumTopic_107: 'Message supprimé',
      pages_ForumTopic_111: 'Erreur lors de la suppression',
      pages_ForumTopic_123: 'Sujet désépinglé',
      pages_ForumTopic_124: 'Sujet épinglé',
      pages_ForumTopic_128: 'Erreur',
      pages_ForumTopic_137: 'Sujet déverrouillé',
      pages_ForumTopic_138: 'Sujet verrouillé',
      pages_ForumTopic_142: 'Erreur',
      pages_ForumTopic_151: 'Erreur',
      pages_ForumTopic_70: 'Réponse publiée !',
      pages_ForumTopic_75: 'Erreur lors de la publication',
      pages_ForumTopic_90: 'Message modifié',
      pages_ForumTopic_93: 'Erreur lors de la modification',
      pages_Forum_42: 'Discussions et échanges avec la communauté',
      pages_Forum_72: 'Aucune catégorie',
      pages_Forum_75: 'Le forum est en cours de configuration.',
      pages_GuildMembers_385: 'Guildes',
      pages_GuildMembers_387: 'Membres',
      pages_GuildMembers_442: 'Mode lecture admin',
      pages_GuildMembers_452: 'Membres de la guilde',
      pages_GuildMembers_463: 'Synchro ',
      pages_GuildMembers_476: 'Sync Battle.net pour voir tous les membres',
      pages_GuildMembers_489: 'Rechercher un personnage ou joueur',
      pages_GuildMembers_495: 'Rechercher un personnage ou joueur...',
      pages_GuildMembers_530: 'classes',
      pages_GuildMembers_535: 'Toutes les classes',
      pages_GuildMembers_548: 'Effacer',
      pages_GuildMembers_589: 'Tous les rangs',
      pages_GuildMembers_602: 'Effacer',
      pages_GuildMembers_655: 'Non inscrit',
      pages_GuildMembers_672: 'Effacer',
      pages_GuildMembers_684: 'Sur Guildforce',
      pages_GuildMembers_695: 'Non inscrits',
      pages_GuildMembers_715: 'Mains',
      pages_GuildMembers_719: 'Alts',
      pages_GuildMembers_735: 'Effacer',
      pages_GuildMembers_747: 'Mains uniquement',
      pages_GuildMembers_757: 'Alts uniquement',
      pages_GuildMembers_789: 'Personnage',
      pages_GuildMembers_790: 'Classe',
      pages_GuildMembers_791: 'Joueur',
      pages_GuildMembers_792: 'Rang',
      pages_GuildMembers_800: 'Aucun membre trouvé',
      pages_GuildMembers_904: 'Page précédente',
      pages_GuildMembers_907: 'Précédent',
      pages_GuildMembers_911: 'Page',
      pages_GuildMembers_921: 'Page suivante',
      pages_GuildMembers_923: 'Suivant',
      pages_GuildMembers_brand: 'Guildforce',
      pages_GuildMembers_main_alt: 'Main/Alt',
      pages_GuildMembers_rank_plural: 'rangs',
      pages_GuildMembers_rank_single: 'rang',
      pages_GuildPolls_124: 'Polls',
      pages_GuildPolls_130: 'New poll',
      pages_GuildPolls_141: 'No polls yet.',
      pages_GuildPolls_147: 'Active',
      pages_GuildPolls_151: 'Drafts',
      pages_GuildPolls_155: 'Closed',
      pages_GuildPolls_172: 'No active polls',
      pages_GuildPolls_192: 'No drafts',
      pages_GuildPolls_211: 'No closed polls',
      pages_GuildPolls_89: 'Poll duplicated as draft',
      pages_Overview_243: 'Mode lecture admin',
      pages_Overview_more_wishes: '+{{count}} autres v?ux',
      pages_Profile_149: 'Demande enregistrée',
      pages_Profile_150: 'Ta demande de suppression a été enregistrée. Un administrateur la traitera sous 30 jours.',
      pages_Profile_174: 'Demande annulée',
      pages_Profile_175: 'Ta demande de suppression a été annulée.',
      pages_Profile_239: 'Avatar mis à jour !',
      pages_Profile_267: 'Avatar supprimé',
      pages_Profile_368: 'Voir mon profil public',
      pages_Profile_442: 'Enregistrer le pseudo',
      pages_Profile_462: 'Préférences',
      pages_Profile_479: 'Sauvegardé automatiquement',
      pages_Profile_536: 'En savoir plus sur tes données',
      pages_Profile_541: 'Données publiques',
      pages_Profile_544: 'Pseudo et avatar visibles sur ton profil public.',
      pages_Profile_551: 'Données de guilde',
      pages_Profile_554: 'Personnages et vœux visibles par ta guilde uniquement.',
      pages_Profile_561: 'Données privées',
      pages_Profile_564: 'Email et tokens Battle.net jamais partagés.',
      pages_Profile_577: 'Zone de danger',
      pages_Profile_583: 'Une demande de suppression est en cours de traitement.',
      pages_Profile_593: 'Annuler la demande',
      pages_Profile_605: 'Demander la suppression de mon compte',
      pages_Profile_611: 'Supprimer ton compte ?',
      pages_Profile_615: 'Cette action est irréversible. Toutes tes données seront définitivement supprimées :',
      pages_Profile_620: 'Ton profil et avatar',
      pages_Profile_621: 'Tes personnages WoW',
      pages_Profile_622: 'Tes vœux de classe',
      pages_Profile_623: 'Tes messages sur le forum',
      pages_Profile_651: 'Confirmer la suppression',
      pages_Profile_avatar_alt: 'Avatar',
      pages_Profile_confirm_delete: 'Tape "{{username}}" pour confirmer',
      pages_Profile_connected_as: 'Connect? en tant que {{battletag}}',
      pages_Profile_get_started: 'C\'est parti !',
      pages_Profile_image_size_error: 'L\'image doit faire moins de 5 Mo',
      pages_Profile_language_en: 'English',
      pages_Profile_language_fr: 'Fran?ais',
      pages_Profile_not_found: 'Profil introuvable.',
      pages_Profile_select_image_error: 'Veuillez s?lectionner un fichier image',
      pages_Profile_setup_success_desc: 'Ton profil a ?t? configur?.',
      pages_Profile_setup_success_title: 'Bienvenue !',
      pages_Profile_update_success_desc: 'Profil mis ? jour avec succ?s !',
      pages_Profile_username_hint: 'C\'est le nom qui sera affich? dans ta guilde',
      pages_Profile_username_placeholder: 'Ton pseudo sur le site',
      pages_Profile_welcome_subtitle: 'Choisis ton pseudo pour ?tre identifi? par ta guilde',
      pages_Profile_welcome_title: 'Bienvenue sur Guildforce !',
      pages_PublicProfile_131: 'Membre depuis',
      pages_PublicProfile_user_not_found: 'L\'utilisateur "{{username}}" n\'existe pas.',
      pages_RosterWishes_636: 'Mode lecture admin',
      pages_Wishes_drag_reorder: 'Glisser pour r?organiser',
      pages_Wishes_move_down: 'Descendre',
      pages_Wishes_move_up: 'Monter',
      pages_Wishes_session_expired: 'Session expir?e',
    },
  },
  fr: {
    common: {
      loading: 'Chargement...',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      back: 'Retour',
      next: 'Suivant',
      submit: 'Envoyer',
      copy: 'Copier',
      copied: 'Copié !',
      search: 'Rechercher',
      filter: 'Filtrer',
      export: 'Exporter',
      logout: 'Déconnexion',
      login: 'Connexion',
      myGuilds: 'Mes Guildes',
      signup: 'Inscription',
      email: 'Email',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      you: 'Vous',
      settings: 'Paramètres',
      tipMe: 'Me payer un coup',
      all: 'Tous',
      refresh: 'Actualiser',
      confirm: 'Confirmer',
      add: 'Ajouter',
      reset: 'Réinitialiser',
      results: 'Résultats',
      publish: 'Publier',
      close: 'Clôturer',
      processing: 'En cours...',
      upload: 'Télécharger',
      uploading: 'Envoi en cours...',
      confirmDelete: 'Confirmer la suppression',
      admin: 'Admin',
      saveDraft: 'Enregistrer brouillon',
      new: 'Nouveau',
      activityLog: 'Journal d\'activité',
      savedAutomatically: 'Sauvegardé automatiquement',
      error: 'Erreur',
    },
    routeMeta: {
      home: 'Accueil',
      auth: 'Authentification',
      guilds: 'Guildes',
      profile: 'Profil',
      publicProfile: 'Profil public',
      forum: 'Forum',
      forumAdmin: 'Administration du forum',
      admin: 'Administration',
      legal: 'Mentions légales',
      privacy: 'Confidentialité',
      terms: 'Conditions d\'utilisation',
      changelog: 'Historique des versions',
      forumCategory: 'Catégorie du forum',
      forumNewTopic: 'Nouveau sujet',
      forumTopic: 'Sujet du forum',
      guildOverview: 'Aperçu de guilde',
      guildRoster: 'Roster',
      guildWishes: 'Souhaits',
      guildSettings: 'Paramètres de guilde',
      guildMemberWishes: 'Souhaits du membre',
      guildPolls: 'Sondages',
      guildPollNew: 'Nouveau sondage',
      guildPollEdit: 'Modifier sondage',
      guildPollView: 'Sondage',
      guildPollResults: 'Résultats du sondage',
      guildMembers: 'Membres',
      notFound: 'Introuvable',
    },
    battlenet: {
      connect: 'Lier mon compte Battle.net',
      connected: 'Connecté à Battle.net',
      disconnect: 'Délier Battle.net',
      disconnected: 'Déconnecté de Battle.net',
      connectDescription: 'Connectez votre compte Battle.net pour importer automatiquement vos personnages WoW.',
      yourCharacters: 'Vos personnages',
      noCharacters: 'Aucun personnage trouvé',
      noCharactersHint: 'Vérifiez que votre licence WoW est active et que vous avez sélectionné la bonne région. Si le problème persiste, essayez de reconnecter votre compte Battle.net.',
      main: 'Principal',
      mainSet: 'Personnage principal défini',
      refresh: 'Actualiser',
      connecting: 'Connexion avec Battle.net...',
      region: 'Région',
      selectRegion: 'Sélectionnez votre région',
      connectedTo: 'Connecté sur',
      resync: 'Resynchroniser',
      resyncSuccess: 'Personnages synchronisés',
      resyncError: 'Échec de la synchronisation. Réessayez.',
      errorNoLicense: 'Licence WoW active requise. Vérifiez votre abonnement sur battle.net.',
      errorParentalControls: 'Accès bloqué par le contrôle parental. Vérifiez les paramètres de votre compte Battle.net.',
      errorTokenExpired: 'Session Battle.net expirée. Veuillez reconnecter votre compte.',
    },
    home: {
      title: 'Guildforce',
      subtitle: 'Préparez votre roster pour la prochaine extension',
      description: 'Collectez les préférences de classes et spécialisations de vos membres pour construire le roster parfait.',
      createGuild: 'Gérer ma guilde',
      joinGuild: 'Rejoindre ma guilde',
      features: {
        collect: {
          title: 'Collecte des vœux',
          description: 'Les membres soumettent jusqu\'à 3 choix de classes avec leurs spés préférées',
        },
        visualize: {
          title: 'Visualisation du roster',
          description: 'Voyez tous les vœux d\'un coup d\'œil avec filtres par rôle et classe',
        },
        export: {
          title: 'Export des données',
          description: 'Exportez en CSV pour tableurs ou analyse approfondie',
        },
      },
    },
    auth: {
      loginTitle: 'Connexion',
      signupTitle: 'Créez votre compte',
      loginDescription: 'Connectez-vous pour gérer les vœux de votre guilde',
      signupDescription: 'Inscrivez-vous pour collecter les vœux de classes',
      noAccount: 'Pas encore de compte ?',
      hasAccount: 'Déjà un compte ?',
      pseudo: 'Pseudo',
      pseudoPlaceholder: 'Votre pseudo',
      forgotPassword: 'Mot de passe oublié ?',
      invalidEmail: 'Veuillez entrer un email valide',
      passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
      passwordsDontMatch: 'Les mots de passe ne correspondent pas',
      userAlreadyExists: 'Un compte avec cet email existe déjà',
      invalidCredentials: 'Email ou mot de passe invalide',
      orContinueWith: 'Ou continuer avec',
      loginWithBattleNet: 'Continuer avec Battle.net',
      signupWithBattleNet: 'Continuer avec Battle.net',
      battlenetError: 'Échec de l\'authentification Battle.net',
      bnetRequired: 'Un compte Battle.net est requis pour utiliser Guildforce',
      bnetNote: 'Tes personnages et guildes seront automatiquement importés depuis Battle.net',
      accountCreated: 'Compte créé !',
      welcomeBack: 'Bon retour !',
      existingAccountsOnly: 'Connexion uniquement — la création de compte nécessite Battle.net',
    },
    guild: {
      create: 'Créer une guilde',
      join: 'Rejoindre une guilde',
      name: 'Nom de guilde',
      namePlaceholder: 'Entrez le nom de votre guilde',
      server: 'Serveur',
      serverPlaceholder: 'ex: Hyjal, Archimonde',
      faction: 'Faction',
      horde: 'Horde',
      alliance: 'Alliance',
      members: 'Membres',
      member: 'membre',
      memberPlural: 'membres',
      charactersShown: 'personnages',
      uniqueMember: 'membre unique sur Guildforce',
      uniqueMembers: 'membres uniques sur Guildforce',
      characters: 'personnages',
      charactersNotRegistered: 'personnages non inscrits',
      noMembers: 'Aucun membre pour l\'instant',
      leaveGuild: 'Quitter la guilde',
      deleteGuild: 'Supprimer la guilde',
      guildCreated: 'Guilde créée avec succès !',
      guildJoined: 'Vous avez rejoint la guilde !',
      alreadyMember: 'Vous êtes déjà membre de cette guilde',
      myGuilds: 'Mes Guildes WoW',
      guildMaster: 'Maître de guilde',
      yourCharacters: 'Tes personnages dans cette guilde',
      gmNote: 'Tu peux gérer cette guilde dans Guildforce',
      noGuilds: 'Aucune guilde trouvée. Lie ton compte Battle.net pour importer tes guildes.',
      rank0: 'GM',
      createInApp: 'Créer dans Guildforce',
      alreadyInApp: 'Déjà créée dans Guildforce',
      accessGuild: 'Gérer la guilde',
      pendingSync: 'Lie ton compte Battle.net pour accéder à cette guilde instantanément',
      awaitingGM: 'En attente du GM',
    },
    wishes: {
      title: 'Mes vœux de classe',
      wishesOf: 'Vœux de',
      subtitle: 'Sélectionnez jusqu\'à 3 classes que vous souhaitez jouer',
      choice: 'Choix',
      choiceNumber: 'Choix n°{{number}}',
      selectClass: 'Sélectionnez une classe',
      selectSpecs: 'Sélectionnez les spécialisations',
      comment: 'Commentaire',
      commentPlaceholder: 'Informations complémentaires',
      status: 'Engagement',
      confirmed: 'Confirmé pour la prochaine saison',
      potential: 'Potentiel / Incertain',
      noWishes: 'Aucun vœu soumis pour l\'instant',
      saveWishes: 'Enregistrer mes vœux',
      wishesSaved: 'Vos vœux ont été enregistrés !',
      clickToExpand: 'Cliquez pour voir les détails',
      clickToEdit: 'Cliquez pour modifier vos vœux',
      editMyWishes: 'Modifier mes vœux',
      specs: 'Spécialisations',
      preferredChoice: 'Ton choix préféré',
      secondChoice: 'Deuxième choix',
      thirdChoice: 'Troisième choix',
      addWish: 'Ajouter un vœu',
      removeWish: 'Supprimer',
      noRosterSelected: 'Aucun roster sélectionné. Veuillez d\'abord sélectionner un roster.',
      commitment: {
        title: 'Engagement pour le raid mythique',
        confirmed: 'Confirmé',
        confirmedDesc: 'Je serai disponible régulièrement pour les raids mythiques',
        undecided: 'Indécis',
        undecidedDesc: 'Ma disponibilité ou mon choix de classe peut changer',
        withdrawn: 'Retrait',
        withdrawnDesc: 'Je ne participerai pas cette saison',
      },
      validation: {
        pending: 'En attente',
        approved: 'Validé',
        rejected: 'Refusé',
        approve: 'Valider',
        reject: 'Refuser',
        reset: 'Réinitialiser',
        approvedBy: 'Validé par',
        rejectedBy: 'Refusé par',
      },
      specRequired: 'Spécialisation requise',
      specRequiredDesc: 'Veuillez sélectionner au moins une spécialisation pour {class}',
    },
    dashboard: {
      title: 'Tableau de bord du roster',
      overview: 'Aperçu',
      roster: 'Roster',
      filters: 'Filtres',
      allRoles: 'Tous les rôles',
      allClasses: 'Toutes les classes',
      tank: 'Tank',
      healer: 'Heal',
      dps: 'DPS',
      melee: 'Mêlée',
      ranged: 'Distance',
      player: 'Joueur',
      discord: 'Discord',
      firstChoice: '1er choix',
      secondChoice: '2ème choix',
      thirdChoice: '3ème choix',
      comments: 'Commentaires',
      exportCSV: 'Exporter CSV',
      exportSuccess: 'Export réussi',
      noData: 'Aucune donnée à afficher',
      totalPlayers: 'Total joueurs',
      confirmedPlayers: 'Confirmés',
      potentialPlayers: 'Potentiels',
      roleSummary: 'Par rôle',
      clear: 'Effacer',
      validation: 'Validation',
      classesCount: 'classes',
      // Extended filters
      commitment: 'Engagement',
      allCommitments: 'Tous engagements',
      minWishes: 'Vœux min.',
      minWishesPlaceholder: 'Nombre minimum de vœux',
      range: 'Portée',
      allRanges: 'Toutes portées',
      withComment: 'Avec commentaire',
      withoutComment: 'Sans commentaire',
      allComments: 'Tous commentaires',
      wishesMin: '≥{{count}} vœux',
      wishesCount: 'Vœux',
      additionalWishes: 'Vœux supplémentaires',
      addWish: 'Ajouter un vœu',
      // Analytics tabs and sections
      table: 'Tableau',
      analytics: 'Analytique',
      classDistribution: 'Distribution des classes',
      specDistribution: 'Distribution des specs',
      topSpecs: 'Popularité des spécialisations',
      rolesByPriority: 'Rôles',
      wish1: 'Vœu 1',
      otherWishes: 'Autres vœux',
      missingClasses: 'Classes manquantes',
      allClassesRepresented: 'Toutes les classes sont représentées',
      // Wish range filter
      wishRangeFilter: 'Vœux pris en compte',
      wishRange1: 'Vœu 1 uniquement',
      wishRangeN: 'Vœux 1-{{n}}',
      allWishes: 'Tous les vœux',
    },
    profile: {
      title: 'Mon profil',
      editProfile: 'Modifier le profil',
      battletag: 'BattleTag',
      battletagPlaceholder: 'VotreNom#1234',
      mainCharacter: 'Personnage principal',
      mainCharacterPlaceholder: 'Nom du personnage',
      language: 'Langue',
      characters: 'Mes personnages',
      addCharacter: 'Ajouter un personnage',
      noCharacters: 'Aucun personnage ajouté',
      characterName: 'Nom',
      characterClass: 'Classe',
      characterLevel: 'Niveau',
      isMain: 'Principal',
      connectedViaBnet: 'Connecté via Battle.net',
      avatar: 'Photo de profil',
      uploadAvatar: 'Modifier',
      removeAvatar: 'Supprimer',
      avatarHint: 'JPG, PNG ou GIF. Max 2Mo.',
      profileInfo: 'Informations du profil',
      accountConnection: 'Connexion du compte',
      deletion: {
        pending: 'Une demande de suppression est en cours de traitement.',
        cancelRequest: 'Annuler la demande',
        requestDeletion: 'Demander la suppression de mon compte',
        confirmTitle: 'Supprimer ton compte ?',
        confirmDescription: 'Cette action est irréversible. Toutes tes données seront définitivement supprimées :',
        dataList: {
          profile: 'Ton profil et avatar',
          characters: 'Tes personnages WoW',
          wishes: 'Tes vœux de classe',
          forumPosts: 'Tes messages sur le forum',
        },
        typeToConfirm: 'Tape "{{username}}" pour confirmer',
        confirmDeletion: 'Confirmer la suppression',
      },
      battletagVisibility: {
        label: 'Visibilité du BattleTag',
        everyone: 'Tout le monde',
        everyoneDesc: 'Visible sur ton profil public',
        guildOnly: 'Membres de guilde uniquement',
        guildOnlyDesc: 'Seuls les membres de tes guildes peuvent le voir',
        nobody: 'Personne',
        nobodyDesc: 'Masqué pour tous (sauf administrateurs de l\'app)',
        saved: 'Préférence de visibilité enregistrée',
      },
    },
    guildSettings: {
      title: 'Paramètres de guilde',
      avatar: 'Avatar de guilde',
      uploadAvatar: 'Modifier',
      removeAvatar: 'Supprimer',
      avatarHint: 'JPG, PNG ou GIF. Max 2Mo.',
      avatarUpdated: 'Avatar mis à jour',
      avatarRemoved: 'Avatar supprimé',
      uploadError: 'Échec de l\'upload',
      guildInfo: 'Informations de la guilde',
      syncedFromBnet: 'Ces informations sont synchronisées depuis Battle.net',
      comingSoon: 'À venir',
      gmOnly: 'Seuls les Guild Masters peuvent accéder à cette page',
      resyncBattlenet: 'Resynchroniser Battle.net',
      resyncDescription: 'Rafraîchir les personnages et appartenances depuis Battle.net',
      resyncSuccess: 'Données Battle.net synchronisées',
      resyncError: 'Échec de la synchronisation. Veuillez réessayer.',
      resyncTokenExpired: 'Session Battle.net expirée. Veuillez reconnecter votre compte Battle.net depuis votre profil.',
      syncing: 'Synchronisation...',
      officerRankUpdated: 'Rang officier mis à jour',
    },
    rosters: {
      title: 'Rosters',
      createRoster: 'Nouveau Roster',
      editRoster: 'Modifier le Roster',
      rosterName: 'Nom',
      rosterNamePlaceholder: 'ex: Roster Mythique',
      rosterDescription: 'Description',
      rosterDescriptionPlaceholder: 'Description optionnelle',
      rosterCreated: 'Roster créé',
      rosterUpdated: 'Roster mis à jour',
      rosterDeleted: 'Roster supprimé',
      selectRoster: 'Sélectionner un roster',
      default: 'Principal',
      ranks: 'Rangs',
      everyone: 'Tous les membres',
      noAccess: "Vous n'avez pas accès à ce roster",
      noAccessMessage: "Vous pouvez voir ce roster mais ne pouvez pas modifier vos vœux.",
      accessRules: 'Qui peut renseigner ses vœux',
      byRank: 'Par Rang',
      byUser: 'Utilisateur spécifique',
      selectUser: 'Sélectionner un utilisateur',
      addRankRule: 'Ajouter une règle de rang',
      addUserRule: 'Ajouter un utilisateur',
      noAccessWarning: 'Aucune règle d\'accès définie. Seuls les GM pourront renseigner des vœux.',
    },
    forum: {
      title: 'Forum',
      categories: 'Catégories',
      topics: 'Sujets',
      posts: 'Messages',
      newTopic: 'Nouveau sujet',
      reply: 'Répondre',
      quote: 'Citer',
      edit: 'Modifier',
      delete: 'Supprimer',
      pin: 'Épingler',
      unpin: 'Désépingler',
      lock: 'Verrouiller',
      unlock: 'Déverrouiller',
      pinned: 'Épinglé',
      locked: 'Verrouillé',
      views: 'vues',
      replies: 'réponses',
      lastReply: 'Dernière réponse',
      noTopics: 'Aucun sujet pour l\'instant',
      noPosts: 'Aucun message pour l\'instant',
      writeReply: 'Écrire une réponse...',
      preview: 'Aperçu',
      postReply: 'Publier la réponse',
      editPost: 'Modifier le message',
      deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ceci ?',
      topicCreated: 'Sujet créé !',
      postCreated: 'Réponse publiée !',
      postUpdated: 'Message modifié !',
      postDeleted: 'Message supprimé !',
      topicDeleted: 'Sujet supprimé !',
      backToForum: 'Retour au forum',
      backToCategory: 'Retour à la catégorie',
      globalForum: 'Forum Général',
      guildForum: 'Forum de Guilde',
      noCategory: 'Aucune catégorie disponible',
      noTopicYet: 'Aucun sujet',
      topicsCount: 'sujets',
      by: 'par',
      unknownUser: 'Utilisateur inconnu',
      categoryNames: {
        feedback: 'Suggestions & Idées',
        support: 'Aide & Support',
        general: 'Discussion Générale',
        bugs: 'Bugs & Problèmes',
      },
      categoryDescriptions: {
        feedback: 'Suggestions et retours pour améliorer Guildforce',
        support: 'Aide et support technique',
        general: 'Discussions générales sur Guildforce et le jeu',
        bugs: 'Signaler des bugs et problèmes techniques',
      },
      empty: {
        noCategories: 'Aucune catégorie',
        beingSetUp: 'Le forum est en cours de configuration.',
      },
      moderation: {
        sanction: 'Sanctionner',
        revokeSanction: 'Révoquer la sanction ?',
        revokeSanctionConfirm: 'Êtes-vous sûr de vouloir révoquer la sanction de {{username}} ?',
        revoke: 'Révoquer',
      },
      createTopic: 'Créer le sujet',
      contentPlaceholder: 'Contenu de votre message...',
      confirmDeleteTopic: 'Êtes-vous sûr de vouloir supprimer ce sujet ? Cette action est irréversible.',
      confirmDeletePost: 'Êtes-vous sûr de vouloir supprimer ce message ?',
      topicNotFound: 'Sujet non trouvé',
      topicLocked: 'Ce sujet est verrouillé',
      replyingTo: 'En réponse à',
      noReplies: 'Aucune réponse pour le moment',
      previous: 'Précédent',
      categoryNotFound: 'Catégorie non trouvée',
      viewProfile: 'Voir le profil',
      siteAdministrator: 'Administrateur du site',
      forumModerator: 'Modérateur du forum',
      edited: 'modifié',
      report: 'Signaler',
      quoteFrom: 'Citation de',
    },
    notifications: {
      title: 'Notifications',
      empty: 'Aucune notification',
      markAllRead: 'Tout marquer comme lu',
      mention: 'vous a mentionné',
      topicReply: 'a répondu à votre sujet',
      postReply: 'a répondu dans un sujet que vous suivez',
      subscribe: 'S\'abonner',
      subscribed: 'Abonné',
      subscribedNoNotif: 'Suivi (muet)',
      unsubscribe: 'Se désabonner',
      subscribeWithNotif: 'S\'abonner avec notifications',
      subscribeNoNotif: 'Suivre sans notifications',
      clickToSubscribe: 'Cliquer pour s\'abonner',
      clickToMute: 'Cliquer pour désactiver les notifications',
      clickToUnsubscribe: 'Cliquer pour se désabonner',
    },
    activityLog: {
      title: 'Journal d\'activité',
      all: 'Tout',
      validations: 'Validations',
      members: 'Membres',
      rostersCreated: 'Rosters créés',
      rostersUpdated: 'Rosters modifiés',
      rostersDeleted: 'Rosters supprimés',
      noActivity: 'Aucune activité',
      joinedGuild: 'a rejoint la guilde',
      newRoster: 'Nouveau roster :',
      updated: 'modifié',
      deleted: 'supprimé',
    },
    permissions: {
      title: 'Permissions',
      description: 'Déléguez des droits de gestion spécifiques aux membres en fonction de leur rang Battle.net ou individuellement. Les GMs ont toujours toutes les permissions.',
      noRules: 'Seuls les GMs ont cette permission',
      saved: 'Permissions enregistrées',
      addRankRule: 'Ajouter par rang',
      addUserRule: 'Ajouter un utilisateur',
      manageWishes: 'Gérer les vœux',
      manageWishesDesc: 'Approuver ou refuser les vœux des membres',
      managePolls: 'Gérer les sondages',
      managePollsDesc: 'Créer, modifier et publier des sondages',
      manageRosters: 'Gérer les rosters',
      manageRostersDesc: 'Créer et configurer les rosters',
      viewActivityLog: 'Voir le journal',
      viewActivityLogDesc: 'Accéder à l\'historique d\'activité de la guilde',
      manageMembers: 'Gérer les membres',
      manageMembersDesc: 'Modifier le statut d\'engagement des membres',
      delegated: 'déléguée(s)',
      users: 'utilisateur(s)',
      gmOnly: 'GM seul',
      resetToGmOnly: 'Permissions réinitialisées (GM seul)',
      resetTooltip: 'Retirer toutes les permissions déléguées',
      myPermissions: 'Mes permissions',
      guildMaster: 'Maître de Guilde',
      guildMasterDesc: 'Vous avez accès à toutes les fonctionnalités de gestion de la guilde.',
      noPermissions: 'Vous n\'avez pas de permissions spécifiques accordées par le GM.',
      grantedByGm: 'Ces permissions vous ont été accordées par le GM de la guilde.',
      officers: 'Officiers',
      allMembers: 'Tous les membres',
      custom: 'Personnalisé...',
      ranksRange: 'Rangs 0-{{max}}',
      maxRank: 'Rang maximum',
      sensitivePermission: 'Permission sensible',
      noIndividualAccess: 'Aucun accès individuel défini',
      addSpecificUsers: 'Ajoutez des utilisateurs spécifiques pour leur donner des permissions supplémentaires',
      individualAccess: 'Accès individuels',
      selectMember: 'Sélectionner un membre...',
    },
    guildNav: {
      dashboard: 'Tableau de bord',
      myWishes: 'Mes vœux',
      polls: 'Sondages',
      settings: 'Paramètres',
      activity: 'Activité',
      welcome: 'Bienvenue',
      myStatus: 'Mon statut',
      guildOverview: 'Aperçu guilde',
      quickAccess: 'Accès rapide',
      wishesTable: 'Table de vœux',
      noWishApproved: 'Aucun vœu validé',
      noWishesYet: "Vous n'avez pas encore défini vos vœux",
    },
    errors: {
      generic: 'Une erreur est survenue. Veuillez réessayer.',
      network: 'Erreur réseau. Vérifiez votre connexion.',
      unauthorized: 'Vous n\'êtes pas autorisé à effectuer cette action.',
      notFound: 'La ressource demandée est introuvable.',
    },
    legal: {
      legalNotice: 'Mentions légales',
      privacyPolicy: 'Confidentialité',
      termsOfService: 'CGU',
      lastUpdated: 'Dernière mise à jour',
      editLegalPages: 'Gérer les pages légales',
      editLegalPagesDesc: 'Modifier le contenu des pages légales obligatoires',
    },
    cookies: {
      title: 'Nous utilisons des cookies',
      description: 'Nous utilisons des cookies pour améliorer votre expérience et analyser le trafic. Vous pouvez choisir quels cookies accepter.',
      learnMore: 'En savoir plus sur notre politique de confidentialité',
      acceptAll: 'Tout accepter',
      rejectAll: 'Tout refuser',
      customize: 'Personnaliser',
      savePreferences: 'Enregistrer',
      preferencesTitle: 'Préférences des cookies',
      preferencesDescription: 'Gérez vos préférences de cookies. Les cookies essentiels sont toujours activés car ils sont nécessaires au fonctionnement du site.',
      essential: 'Cookies essentiels',
      essentialDesc: 'Nécessaires au bon fonctionnement du site. Ne peuvent pas être désactivés.',
      analytics: 'Cookies analytiques',
      analyticsDesc: 'Nous aident à comprendre comment les visiteurs interagissent avec le site.',
      marketing: 'Cookies marketing',
      marketingDesc: 'Utilisés pour afficher des publicités personnalisées selon vos centres d\'intérêt.',
      manageCookies: 'Gérer les cookies',
    },
    polls: {
      new: 'Nouveau sondage',
      edit: 'Modifier le sondage',
      confirmReset: 'Confirmer la réinitialisation',
      resetDescription: 'Cette action supprimera définitivement toutes les réponses existantes. Cette action est irréversible.',
      resetAndSave: 'Réinitialiser et enregistrer',
      settingsOnlyMode: 'Mode paramètres uniquement',
      settingsOnlyDesc: 'Les questions ne peuvent pas être modifiées. Les réponses existantes seront conservées.',
      fullEditMode: 'Mode édition complète',
      fullEditDesc: 'Attention : enregistrer réinitialisera toutes les réponses existantes.',
      alreadyResponded: 'Vous avez déjà répondu à ce sondage',
      updateResponses: 'Modifier mes réponses',
      submitResponses: 'Envoyer mes réponses',
      notFound: 'Sondage introuvable',
      anonymous: 'Anonyme',
      anonymousDesc: 'Ce sondage est anonyme. Vos réponses ne seront pas associées à votre nom.',
      respond: 'Répondre',
      viewResults: 'Voir résultats',
      hideResults: 'Masquer résultats',
      closed: 'Clôturé',
      endsOn: 'Termine le',
      responses: 'réponses',
      resultsRestricted: 'Les résultats de ce sondage sont réservés à certains membres.',
      unstableConnection: 'Connexion instable',
      unstableConnectionDesc: "Impossible de charger certaines données du sondage. Vérifie ta connexion et réessaie (la page ne te redirige plus automatiquement).",
      saved: 'Sondage enregistré',
      draftSaved: 'Brouillon enregistré',
      published: 'Sondage publié !',
      updated: 'Sondage mis à jour',
      error: 'Erreur',
      status: {
        draft: 'Brouillon',
        active: 'Actif',
        closed: 'Clôturé',
      },
      sectionTitle: 'Titre de la section...',
      sectionDescription: 'Description (optionnelle)...',
      addQuestionToSection: 'Ajouter une question à cette section',
      editActivePoll: 'Modifier un sondage actif',
      editActivePollDesc: 'Ce sondage a déjà reçu {{count}} réponse(s). Choisissez le type de modification.',
      editSettings: 'Modifier les paramètres',
      editSettingsDesc: 'Titre, description, date de fin, roster cible. Les réponses sont conservées.',
      editStructure: 'Modifier la structure',
      editStructureDesc: 'Questions et options. ⚠️ Cela réinitialisera toutes les réponses existantes.',
      dragToRank: 'Glissez-déposez pour classer les éléments (1 = meilleur)',
      activePoll: 'Sondage en cours',
      ends: 'Fin',
      view: 'Voir',
      allowOther: 'Permettre "Autre (préciser)"',
      otherSpecify: 'Autre (préciser)',
      otherPlaceholder: 'Veuillez préciser...',
      textResponsePlaceholder: 'Votre réponse...',
      addCondition: 'Ajouter une condition',
      conditionalQuestion: 'Question conditionnelle',
      showIf: 'Afficher si la question',
      conditionOperator: 'Opérateur',
      conditionValues: 'Valeurs',
      selectAtLeastOneValue: 'Sélectionnez au moins une valeur',
      conditionalBadge: 'Conditionnel',
      preview: 'Prévisualiser',
      previewNote: 'Ceci est une prévisualisation. Vos réponses ne seront pas enregistrées.',
      closePreview: 'Fermer la prévisualisation',
      duplicate: 'Dupliquer',
      duplicateSuccess: 'Sondage dupliqué en brouillon',
    },
    bugReport: {
      button: 'Signaler un bug',
      title: 'Signalement de bug',
      subtitle: 'Aidez-nous à améliorer en signalant les problèmes',
      titleField: 'Titre',
      titlePlaceholder: 'Description brève du problème',
      descriptionField: 'Description',
      descriptionPlaceholder: 'Expliquez ce qui s\'est passé et comment le reproduire',
      category: 'Catégorie',
      categories: {
        bug: 'Bug',
        ui: 'Interface',
        performance: 'Performance',
        feature: 'Suggestion',
        other: 'Autre',
      },
      priority: 'Priorité perçue',
      priorities: {
        low: 'Faible',
        medium: 'Moyenne',
        high: 'Haute',
        critical: 'Critique',
      },
      statuses: {
        open: 'Ouvert',
        investigating: 'En cours',
        resolved: 'Résolu',
        closed: 'Fermé',
        wontfix: 'Ne sera pas corrigé',
      },
      autoInfo: 'Informations automatiques',
      errorsDetected: 'erreurs détectées',
      browser: 'Navigateur',
      userStatus: 'Connecté',
      submit: 'Envoyer le rapport',
      success: 'Signalement envoyé, merci !',
      error: 'Erreur lors de l\'envoi',
      errorMissingFields: 'Veuillez remplir tous les champs requis',
      rateLimitError: 'Trop de signalements envoyés. Veuillez réessayer plus tard.',
      anonymous: 'Anonyme',
      admin: {
        title: 'Rapports de bugs',
        criticalPending: 'critiques en attente',
        noReports: 'Aucun rapport de bug',
        fetchError: 'Erreur lors du chargement',
        updateError: 'Erreur lors de la mise à jour',
        statusUpdated: 'Statut mis à jour',
        deleted: 'Rapport supprimé',
        deleteError: 'Erreur lors de la suppression',
        filterStatus: 'Filtrer par statut',
        filterPriority: 'Filtrer par priorité',
        reporter: 'Rapporteur',
        createdAt: 'Créé le',
        consoleLogs: 'Logs console',
        browserInfo: 'Infos navigateur',
        userContext: 'Contexte utilisateur',
        resolvedBy: 'Résolu par',
        resolutionNote: 'Note de résolution',
        resolutionNotePlaceholder: 'Ajoutez des notes sur la résolution...',
        markInvestigating: 'Marquer en cours',
        markResolved: 'Marquer résolu',
        markWontfix: 'Marquer ne sera pas corrigé',
        delete: 'Supprimer',
      },
    },
    admin: {
      forumAdmin: 'Administration du Forum',
      userManagement: 'Gestion des Utilisateurs',
      userManagementDesc: 'Attribuer des rôles (Admin, Modérateur) aux utilisateurs',
      guildManagement: 'Gestion des Guildes',
      guildManagementDesc: 'Rechercher, modifier et supprimer des guildes',
      legalPages: 'Pages légales',
      legalPagesDesc: 'Modifier le contenu des mentions légales, confidentialité et CGU',
      deletionRequests: 'Demandes de suppression',
      deletionRequestsDesc: 'Traiter les demandes de suppression de compte (RGPD)',
      bugReports: 'Rapports de bugs',
      bugReportsDesc: 'Consulter et gérer les signalements de bugs',
      quickAccess: 'Accès rapide',
      forumCategories: 'Catégories du forum',
      forumModerators: 'Modérateurs du forum',
      noCategories: 'Aucune catégorie',
      noModerators: 'Aucun modérateur',
      accessRestricted: 'Accès réservé aux administrateurs',
      // ForumAdmin specific
      loadingError: 'Erreur de chargement',
      backToForum: 'Retour au forum',
      reports: 'Signalements',
      categories: 'Catégories',
      moderators: 'Modérateurs',
      users: 'Utilisateurs',
      sanctions: 'Sanctions',
      nameAndSlugRequired: 'Nom et slug requis',
      categoryUpdated: 'Catégorie mise à jour',
      categoryCreated: 'Catégorie créée',
      categoryDeleted: 'Catégorie supprimée',
      orderUpdated: 'Ordre mis à jour',
      moderatorAdded: 'Modérateur ajouté',
      moderatorRemoved: 'Modérateur retiré',
      roleRemoved: 'Rôle retiré',
      roleAdded: 'Rôle ajouté',
      editCategory: 'Modifier la catégorie',
      newCategory: 'Nouvelle catégorie',
      addModerator: 'Ajouter un modérateur',
      selectUser: 'Sélectionner...',
      confirmDeletion: 'Confirmer la suppression',
      actionIrreversible: 'Cette action est irréversible.',
      you: 'Vous',
      user: 'Utilisateur',
      roleManagement: 'Gestion des rôles',
      adminRoleDesc: 'Accès total : gestion des catégories, modérateurs, et tous les rôles utilisateurs',
      modRoleDesc: 'Modération du forum : épingler, verrouiller et supprimer les sujets/messages',
      global: 'Global',
      // GuildManager specific
      searchGuilds: 'Rechercher une guilde...',
      syncBattlenet: 'Synchroniser Battle.net',
      syncComplete: 'Synchronisation terminée',
      syncError: 'Erreur lors de la synchronisation',
      noGuildsFound: 'Aucune guilde trouvée',
      totalGuilds: 'guildes au total',
      viewGuild: 'Voir la guilde',
      editGuild: 'Modifier la guilde',
      deleteGuild: 'Supprimer la guilde ?',
      guildUpdated: 'Guilde modifiée',
      guildUpdateError: 'Erreur lors de la modification',
      guildDeleted: 'Guilde supprimée',
      guildDeleteError: 'Erreur lors de la suppression',
      editGuildInfo: 'Modifiez les informations de la guilde.',
      confirmDeleteGuild: 'Êtes-vous sûr de vouloir supprimer',
      deleteGuildWarning: 'Cette action est irréversible et supprimera toutes les données associées (membres, vœux, sondages, etc.).',
      name: 'Nom',
      server: 'Serveur',
      region: 'Région',
      faction: 'Faction',
      order: 'Ordre',
      icon: 'Icône (emoji)',
      saving: 'Enregistrement...',
      deleting: 'Suppression...',
      // Admin dashboard
      administration: 'Administration',
      adminDashboard: 'Tableau de bord administrateur',
      moderatorDashboard: 'Tableau de bord modérateur',
      stats: {
        users: 'Utilisateurs',
        guilds: 'Guildes',
        pendingReports: 'Signalements en attente',
        activeSanctions: 'Sanctions actives',
        openBugs: 'Bugs ouverts',
        forumAdminDesc: 'Gérer les catégories, modérateurs, signalements et sanctions',
        uniqueWishUsers: 'Utilisateurs avec vœux',
        totalWishes: 'Total des vœux',
        guildsWithWishes: 'Guildes avec vœux',
        engagementRate: "Taux d'engagement",
      },
    },
    accessibility: {
      previousSlide: 'Diapositive précédente',
      nextSlide: 'Diapositive suivante',
      close: 'Fermer',
      toggleSidebar: 'Basculer la barre latérale',
      goToPreviousPage: 'Aller à la page précédente',
      goToNextPage: 'Aller à la page suivante',
      previous: 'Précédent',
      next: 'Suivant',
      morePages: 'Plus de pages',
    },
    patchnotes: {
      changelog: 'Historique des versions',
      changelogDesc: 'Toutes les mises à jour et améliorations de Guildforce',
      newVersion: 'Nouvelle version',
      version: 'Version',
      title: 'Titre',
      content: 'Contenu',
      draft: 'Brouillon',
      published: 'Publié',
      publishedAt: 'Publié le',
      noNotes: 'Aucune mise à jour',
      confirmDelete: 'Supprimer cette version ?',
      confirmDeleteDesc: 'Cette action est irréversible. Supprimer la version',
      versionFormat: 'Format : X.Y.Z (ex: 1.0.0)',
      versionExists: 'Cette version existe déjà',
      saved: 'Version enregistrée',
      deleted: 'Version supprimée',
      preview: 'Aperçu',
      status: 'Statut',
    },
    auto: {
      components_admin_AdminDocumentation_405: 'Documentation',
      components_admin_AdminDocumentation_408: 'Guide complet de l\'application Guildforce',
      components_admin_AdminDocumentation_419: 'Rechercher...',
      components_admin_AdminDocumentation_475: 'Aucun résultat trouvé pour votre recherche',
      components_admin_DeletionRequestsManager_100: 'Erreur',
      components_admin_DeletionRequestsManager_126: 'Demandes de suppression',
      components_admin_DeletionRequestsManager_131: 'en attente',
      components_admin_DeletionRequestsManager_140: 'En attente',
      components_admin_DeletionRequestsManager_157: 'Demandé le',
      components_admin_DeletionRequestsManager_176: 'Marquer traité',
      components_admin_DeletionRequestsManager_180: 'Supprimez manuellement le compte dans Supabase Auth avant de marquer comme traité',
      components_admin_DeletionRequestsManager_193: 'Traitées',
      components_admin_DeletionRequestsManager_211: 'Annulée',
      components_admin_DeletionRequestsManager_212: 'Traitée le',
      components_admin_DeletionRequestsManager_222: 'Annulée',
      components_admin_DeletionRequestsManager_223: 'Traitée',
      components_admin_DeletionRequestsManager_237: 'Aucune demande de suppression',
      components_admin_DeletionRequestsManager_60: 'Erreur',
      components_admin_DeletionRequestsManager_61: 'Impossible de charger les demandes',
      components_admin_DeletionRequestsManager_90: 'Demande traitée',
      components_admin_DeletionRequestsManager_91: 'La demande a été marquée comme traitée',
      components_admin_LegalPagesEditor_137: 'Éditer',
      components_admin_LegalPagesEditor_137_2: 'Aperçu',
      components_admin_LegalPagesEditor_217: 'Titre',
      components_admin_LegalPagesEditor_234: 'Contenu',
      components_admin_LegalPagesEditor_244: 'Contenu en Markdown...',
      components_admin_LegalPagesEditor_259: 'Gérez les pages légales obligatoires de votre site. Le contenu est affiché en Markdown.',
      components_admin_LegalPagesEditor_267: 'fr-FR',
      components_admin_LegalPagesEditor_287: 'Modifier',
      components_admin_LegalPagesEditor_93: 'Page enregistrée',
      components_admin_UserManager_198: 'Erreur lors du chargement des utilisateurs',
      components_admin_UserManager_223: 'Vous ne pouvez pas retirer votre propre rôle admin',
      components_admin_UserManager_277: 'Erreur lors de la modification du rôle',
      components_admin_UserManager_286: 'fr-FR',
      components_admin_UserManager_349: 'Rechercher par nom ou battletag',
      components_admin_UserManager_355: 'Rechercher par nom ou battletag...',
      components_admin_UserManager_375: 'Utilisateur',
      components_admin_UserManager_386: 'BattleTag',
      components_admin_UserManager_397: 'Région',
      components_admin_UserManager_408: 'Créé le',
      components_admin_UserManager_419: 'Dernière maj',
      components_admin_UserManager_430: 'Langue',
      components_admin_UserManager_441: 'Perso principal',
      components_admin_UserManager_452: 'Rôles',
      components_admin_UserManager_456: 'Actions',
      components_admin_UserManager_471: 'Aucun utilisateur trouvé',
      components_admin_UserManager_490: 'Vous',
      components_dashboard_ActivityLog_172: 'a ajouté un vœu',
      components_dashboard_ActivityLog_205: 'a modifié un vœu',
      components_dashboard_ActivityLog_250: 'a supprimé un vœu',
      components_dashboard_ActivityLog_274: 'a rejoint la guilde',
      components_dashboard_ActivityLog_284: 'Confirmé',
      components_dashboard_ActivityLog_285: 'Retrait',
      components_dashboard_ActivityLog_286: 'Indécis',
      components_dashboard_ActivityLog_300: 'a changé son engagement',
      components_dashboard_ActivityLog_316: 'Nouveau roster :',
      components_dashboard_ActivityLog_336: 'modifié',
      components_dashboard_ActivityLog_350: 'supprimé',
      components_dashboard_ActivityLog_376: 'a modifié les permissions',
      components_dashboard_ActivityLog_389: 'règle(s) active(s)',
      components_dashboard_ActivityLog_409: 'Journal d\'activité',
      components_dashboard_ActivityLog_419: 'Tout',
      components_dashboard_ActivityLog_422: 'Vœux créés',
      components_dashboard_ActivityLog_425: 'Vœux modifiés',
      components_dashboard_ActivityLog_428: 'Vœux supprimés',
      components_dashboard_ActivityLog_431: 'Validations',
      components_dashboard_ActivityLog_434: 'Membres',
      components_dashboard_ActivityLog_437: 'Engagements',
      components_dashboard_ActivityLog_440: 'Rosters créés',
      components_dashboard_ActivityLog_443: 'Rosters modifiés',
      components_dashboard_ActivityLog_446: 'Rosters supprimés',
      components_dashboard_ActivityLog_449: 'Permissions',
      components_dashboard_ActivityLog_481: 'Aucune activité',
      components_dashboard_RosterFilters_168: 'vœux',
      components_dashboard_RosterFilters_261: 'Joueurs',
      components_dashboard_RosterFilters_324: 'Vœux',
      components_dashboard_RosterFilters_484: 'Spécialités',
      components_dashboard_RosterFilters_497: 'Rôles',
      components_dashboard_RosterFilters_551: 'Classes',
      components_dashboard_RosterFilters_616: 'Actifs :',
      components_dashboard_RosterFilters_636: 'Tout effacer',
      components_dashboard_RosterTable_419: 'vœux au total',
      components_forum_MarkdownEditor_188: 'Écrire',
      components_forum_MarkdownEditor_192: 'Aperçu',
      components_forum_MarkdownEditor_297: 'Rien à prévisualiser',
      components_forum_MarkdownEditor_64: 'Titre 1',
      components_forum_MarkdownEditor_65: 'Titre 2',
      components_forum_MarkdownEditor_66: 'Titre 3',
      components_forum_MarkdownEditor_71: 'Gras',
      components_forum_MarkdownEditor_72: 'Italique',
      components_forum_MarkdownEditor_73: 'Barré',
      components_forum_MarkdownEditor_78: 'Liste à puces',
      components_forum_MarkdownEditor_79: 'Liste numérotée',
      components_forum_MarkdownEditor_80: 'Liste de tâches',
      components_forum_MarkdownEditor_85: 'Citation',
      components_forum_MarkdownEditor_86: 'Code inline',
      components_forum_MarkdownEditor_87: 'Séparateur',
      components_forum_MarkdownEditor_92: 'Lien',
      components_forum_MarkdownEditor_93: 'Image',
      components_forum_MarkdownEditor_94: 'Tableau',
      components_forum_MarkdownEditor_95: 'Mention',
      components_forum_ReportDialog_106: 'Détails (optionnel)',
      components_forum_ReportDialog_113: 'Décrivez le problème...',
      components_forum_ReportDialog_128: 'Annuler',
      components_forum_ReportDialog_138: 'Envoi...',
      components_forum_ReportDialog_143: 'Signaler',
      components_forum_ReportDialog_63: 'Signalement envoyé, merci !',
      components_forum_ReportDialog_71: 'Erreur lors du signalement',
      components_forum_ReportDialog_83: 'Signaler ce contenu',
      components_forum_ReportDialog_89: 'Raison du signalement',
      components_forum_ReportsManager_173: 'Erreur de chargement',
      components_forum_ReportsManager_218: 'Signalement résolu',
      components_forum_ReportsManager_219: 'Signalement rejeté',
      components_forum_ReportsManager_227: 'Erreur',
      components_forum_ReportsManager_251: 'En attente',
      components_forum_ReportsManager_255: 'Résolu',
      components_forum_ReportsManager_259: 'Rejeté',
      components_forum_ReportsManager_273: 'Signalements',
      components_forum_ReportsManager_285: 'Tous',
      components_forum_ReportsManager_286: 'En attente',
      components_forum_ReportsManager_287: 'Résolus',
      components_forum_ReportsManager_288: 'Rejetés',
      components_forum_ReportsManager_299: 'Aucun signalement',
      components_forum_ReportsManager_337: 'a signalé',
      components_forum_ReportsManager_347: 'Message de',
      components_forum_ReportsManager_356: 'Sujet de',
      components_forum_ReportsManager_364: 'Contenu supprimé',
      components_forum_ReportsManager_379: 'Traité par',
      components_forum_ReportsManager_395: 'Voir',
      components_forum_ReportsManager_404: 'Traiter',
      components_forum_ReportsManager_420: 'Traiter le signalement',
      components_forum_ReportsManager_428: 'Raison :',
      components_forum_ReportsManager_435: 'Détails :',
      components_forum_ReportsManager_443: 'Note de résolution (optionnel)',
      components_forum_ReportsManager_450: 'Action prise...',
      components_forum_ReportsManager_463: 'Rejeter',
      components_forum_ReportsManager_475: 'Résoudre',
      components_forum_SanctionDialog_117: 'Utilisateur ciblé',
      components_forum_SanctionDialog_124: 'Type de sanction',
      components_forum_SanctionDialog_133: 'Timeout (suspension temporaire)',
      components_forum_SanctionDialog_139: 'Bannissement',
      components_forum_SanctionDialog_148: 'Durée',
      components_forum_SanctionDialog_165: 'Raison',
      components_forum_SanctionDialog_171: 'Décrivez la raison de cette sanction...',
      components_forum_SanctionDialog_179: 'Annuler',
      components_forum_SanctionDialog_191: 'Appliquer',
      components_forum_SanctionDialog_62: 'Une raison est requise',
      components_forum_SanctionDialog_86: 'Erreur lors de l\'application de la sanction',
      components_forum_SanctionDialog_98: 'Appliquer une sanction',
      components_forum_SanctionsManager_128: 'Banni',
      components_forum_SanctionsManager_133: 'Timeout',
      components_forum_SanctionsManager_147: 'Par',
      components_forum_SanctionsManager_154: 'Expire',
      components_forum_SanctionsManager_158: 'Permanent',
      components_forum_SanctionsManager_177: 'Révoquer',
      components_forum_SanctionsManager_193: 'Révoquer la sanction ?',
      components_forum_SanctionsManager_196: 'Êtes-vous sûr de vouloir révoquer la sanction de {{username}} ?',
      components_forum_SanctionsManager_207: 'Révoquer',
      components_forum_SanctionsManager_40: 'Erreur de chargement',
      components_forum_SanctionsManager_57: 'Sanction révoquée',
      components_forum_SanctionsManager_63: 'Erreur',
      components_forum_SanctionsManager_86: 'Sanctions actives',
      components_forum_SanctionsManager_97: 'Aucune sanction active',
      components_polls_PollEditor_146: 'Titre de la section...',
      components_polls_PollEditor_152: 'Description (optionnelle)...',
      components_polls_PollEditor_527: 'Informations générales',
      components_polls_PollEditor_533: 'Titre du sondage',
      components_polls_PollEditor_539: 'Ex: Retour sur la saison 3',
      components_polls_PollEditor_546: 'Description (optionnelle)',
      components_polls_PollEditor_552: 'Expliquez le but du sondage...',
      components_polls_PollEditor_563: 'Roster ciblé',
      components_polls_PollEditor_577: 'Tous les membres',
      components_polls_PollEditor_590: 'Date de clôture (optionnelle)',
      components_polls_PollEditor_613: 'Réponses anonymes',
      components_polls_PollEditor_649: 'Questions',
      components_polls_PollEditor_655: 'Section',
      components_polls_PollEditor_659: 'Question',
      components_polls_PollEditor_667: 'Les questions ne peuvent pas être modifiées en mode paramètres.',
      components_polls_PollEditor_683: 'Ajoutez des questions ou des sections pour commencer',
      components_polls_PollEditor_699: 'Questions générales',
      components_polls_PollEditor_833: 'Ajouter une question',
      components_polls_PollEditor_852: 'Question...',
      components_polls_PollEditor_868: 'Remplis toutes les options de réponse (A, B, …) pour pouvoir publier.',
      components_polls_PollEditor_896: 'Enregistrer brouillon',
      components_polls_PollEditor_897: 'Enregistrer',
      components_polls_PollEditor_911: 'Publier le sondage',
      components_polls_PollEditor_section_label: 'S{{index}}',
      components_polls_PollQuestionEditor_125: 'Votre question...',
      components_polls_PollQuestionEditor_162: 'Éléments à classer',
      components_polls_PollQuestionEditor_163: 'Options de réponse',
      components_polls_PollQuestionEditor_173: 'Option',
      components_polls_PollQuestionEditor_195: 'Ajouter une option',
      components_polls_PollQuestionEditor_217: 'Configuration de l\'échelle',
      components_polls_PollQuestionEditor_239: 'Pas',
      components_polls_PollQuestionEditor_250: 'Label min',
      components_polls_PollQuestionEditor_254: 'Ex: Pas du tout',
      components_polls_PollQuestionEditor_259: 'Label max',
      components_polls_PollQuestionEditor_263: 'Ex: Totalement',
      components_polls_PollQuestionEditor_278: 'Réponse obligatoire',
      components_polls_PollQuestionEditor_33: 'Choix unique',
      components_polls_PollQuestionEditor_34: 'Choix multiples',
      components_polls_PollQuestionEditor_35: 'Texte libre',
      components_polls_PollQuestionEditor_36: 'Échelle (1-5)',
      components_polls_PollQuestionEditor_37: 'Date',
      components_polls_PollQuestionEditor_38: 'Heure',
      components_polls_PollQuestionEditor_39: 'Date et heure',
      components_polls_PollQuestionEditor_40: 'Classement',
      components_polls_PollQuestionEditor_41: 'Échelle personnalisée',
      components_polls_PollRespondentEditor_263: 'Ciblage des répondants',
      components_polls_PollRespondentEditor_274: 'Restreindre qui peut répondre',
      components_polls_PollRespondentEditor_280: 'Tous les membres de la guilde peuvent répondre au sondage.',
      components_polls_PollRespondentEditor_292: 'Par rang',
      components_polls_PollRespondentEditor_310: 'Utilisateur spécifique',
      components_polls_PollRespondentEditor_317: 'Sélectionner un utilisateur',
      components_polls_PollRespondentEditor_351: 'Ajouter un utilisateur',
      components_polls_PollRespondentEditor_355: 'Les utilisateurs ajoutés individuellement peuvent répondre même s\'ils sont hors de la plage de rangs.',
      components_polls_PollResultsAccessEditor_276: 'Visibilité des résultats',
      components_polls_PollResultsAccessEditor_287: 'Restreindre l\'accès aux résultats',
      components_polls_PollResultsAccessEditor_293: 'Tous les membres de la guilde peuvent voir les résultats.',
      components_polls_PollResultsAccessEditor_305: 'Par rang',
      components_polls_PollResultsAccessEditor_324: 'Utilisateur spécifique',
      components_polls_PollResultsAccessEditor_331: 'Sélectionner...',
      components_polls_PollResultsAccessEditor_364: 'Ajouter un utilisateur',
      components_polls_PollResultsAccessEditor_368: 'Les GMs et gestionnaires de sondages peuvent toujours voir les résultats.',
      components_polls_PollResultsAccessEditor_61: 'Officiers',
      components_polls_PollResults_224: 'Anonyme',
      components_polls_PollResults_330: 'Aucune réponse',
      components_polls_PollResults_383: 'Votes individuels',
      components_polls_PollResults_425: 'réponses',
      components_polls_PollResults_435: 'Aucune réponse',
      components_polls_PollResults_536: 'Votes individuels',
      components_polls_PollResults_574: 'réponses',
      components_polls_PollResults_584: 'Aucune réponse',
      components_polls_PollResults_614: 'Score',
      components_polls_PollSectionEditor_section_label: 'S{{index}}',
      components_polls_QuestionConditionEditor_126: 'Ajouter une condition',
      components_polls_QuestionConditionEditor_148: 'Question conditionnelle',
      components_polls_QuestionConditionEditor_163: 'Afficher si la question',
      components_polls_QuestionConditionEditor_186: 'Opérateur',
      components_polls_QuestionConditionEditor_206: 'Valeurs',
      components_polls_QuestionConditionEditor_224: 'Sélectionnez au moins une valeur',
      components_polls_QuestionConditionEditor_234: 'Valeur',
      components_polls_QuestionConditionEditor_250: 'Entrez une valeur',
      components_polls_QuestionConditionEditor_41: 'est égal à',
      components_polls_QuestionConditionEditor_42: 'est différent de',
      components_polls_QuestionConditionEditor_43: 'contient',
      components_polls_QuestionConditionEditor_44: 'ne contient pas',
      components_polls_QuestionConditionEditor_49: 'est égal à',
      components_polls_QuestionConditionEditor_50: 'est différent de',
      components_polls_QuestionConditionEditor_51: 'est supérieur à',
      components_polls_QuestionConditionEditor_52: 'est inférieur à',
      components_polls_QuestionConditionEditor_53: 'est supérieur ou égal à',
      components_polls_QuestionConditionEditor_54: 'est inférieur ou égal à',
      components_polls_SortableQuestion_155: 'Votre question...',
      components_polls_SortableQuestion_192: 'Éléments à classer',
      components_polls_SortableQuestion_193: 'Options de réponse',
      components_polls_SortableQuestion_203: 'Option',
      components_polls_SortableQuestion_225: 'Ajouter une option',
      components_polls_SortableQuestion_247: 'Configuration de l\'échelle',
      components_polls_SortableQuestion_269: 'Pas',
      components_polls_SortableQuestion_280: 'Label min',
      components_polls_SortableQuestion_284: 'Ex: Pas du tout',
      components_polls_SortableQuestion_289: 'Label max',
      components_polls_SortableQuestion_293: 'Ex: Totalement',
      components_polls_SortableQuestion_308: 'Réponse obligatoire',
      components_polls_SortableQuestion_55: 'Choix unique',
      components_polls_SortableQuestion_56: 'Choix multiples',
      components_polls_SortableQuestion_57: 'Texte libre',
      components_polls_SortableQuestion_58: 'Échelle (1-5)',
      components_polls_SortableQuestion_59: 'Date',
      components_polls_SortableQuestion_60: 'Heure',
      components_polls_SortableQuestion_61: 'Date et heure',
      components_polls_SortableQuestion_62: 'Classement',
      components_polls_SortableQuestion_63: 'Échelle personnalisée',
      pages_ForumNewTopic_112: 'Nouveau sujet',
      pages_ForumNewTopic_124: 'Titre',
      pages_ForumNewTopic_129: 'Titre du sujet',
      pages_ForumNewTopic_138: 'Contenu',
      pages_ForumNewTopic_143: 'Contenu de votre message...',
      pages_ForumNewTopic_160: 'Créer le sujet',
      pages_ForumNewTopic_34: 'Sujet créé !',
      pages_ForumNewTopic_37: 'Erreur lors de la création',
      pages_ForumNewTopic_50: 'Connectez-vous pour créer un sujet',
      pages_ForumNewTopic_53: 'Se connecter',
      pages_ForumNewTopic_75: 'Catégorie non trouvée',
      pages_ForumNewTopic_78: 'Retour au forum',
      pages_ForumNewTopic_97: 'Nouveau sujet',
      pages_ForumTopic_103: 'Sujet supprimé',
      pages_ForumTopic_107: 'Message supprimé',
      pages_ForumTopic_111: 'Erreur lors de la suppression',
      pages_ForumTopic_123: 'Sujet désépinglé',
      pages_ForumTopic_124: 'Sujet épinglé',
      pages_ForumTopic_128: 'Erreur',
      pages_ForumTopic_137: 'Sujet déverrouillé',
      pages_ForumTopic_138: 'Sujet verrouillé',
      pages_ForumTopic_142: 'Erreur',
      pages_ForumTopic_151: 'Erreur',
      pages_ForumTopic_70: 'Réponse publiée !',
      pages_ForumTopic_75: 'Erreur lors de la publication',
      pages_ForumTopic_90: 'Message modifié',
      pages_ForumTopic_93: 'Erreur lors de la modification',
      pages_Forum_42: 'Discussions et échanges avec la communauté',
      pages_Forum_72: 'Aucune catégorie',
      pages_Forum_75: 'Le forum est en cours de configuration.',
      pages_GuildMembers_385: 'Guildes',
      pages_GuildMembers_387: 'Membres',
      pages_GuildMembers_442: 'Mode lecture admin',
      pages_GuildMembers_452: 'Membres de la guilde',
      pages_GuildMembers_463: 'Synchro ',
      pages_GuildMembers_476: 'Sync Battle.net pour voir tous les membres',
      pages_GuildMembers_489: 'Rechercher un personnage ou joueur',
      pages_GuildMembers_495: 'Rechercher un personnage ou joueur...',
      pages_GuildMembers_530: 'classes',
      pages_GuildMembers_535: 'Toutes les classes',
      pages_GuildMembers_548: 'Effacer',
      pages_GuildMembers_589: 'Tous les rangs',
      pages_GuildMembers_602: 'Effacer',
      pages_GuildMembers_655: 'Non inscrit',
      pages_GuildMembers_672: 'Effacer',
      pages_GuildMembers_684: 'Sur Guildforce',
      pages_GuildMembers_695: 'Non inscrits',
      pages_GuildMembers_715: 'Mains',
      pages_GuildMembers_719: 'Alts',
      pages_GuildMembers_735: 'Effacer',
      pages_GuildMembers_747: 'Mains uniquement',
      pages_GuildMembers_757: 'Alts uniquement',
      pages_GuildMembers_789: 'Personnage',
      pages_GuildMembers_790: 'Classe',
      pages_GuildMembers_791: 'Joueur',
      pages_GuildMembers_792: 'Rang',
      pages_GuildMembers_800: 'Aucun membre trouvé',
      pages_GuildMembers_904: 'Page précédente',
      pages_GuildMembers_907: 'Précédent',
      pages_GuildMembers_911: 'Page',
      pages_GuildMembers_921: 'Page suivante',
      pages_GuildMembers_923: 'Suivant',
      pages_GuildPolls_124: 'Sondages',
      pages_GuildPolls_130: 'Nouveau sondage',
      pages_GuildPolls_141: 'Aucun sondage pour le moment.',
      pages_GuildPolls_147: 'Actifs',
      pages_GuildPolls_151: 'Brouillons',
      pages_GuildPolls_155: 'Clôturés',
      pages_GuildPolls_172: 'Aucun sondage actif',
      pages_GuildPolls_192: 'Aucun brouillon',
      pages_GuildPolls_211: 'Aucun sondage clôturé',
      pages_GuildPolls_89: 'Sondage dupliqué en brouillon',
      pages_Overview_243: 'Mode lecture admin',
      pages_Overview_more_wishes: '+{{count}} autres voeux',
      pages_Profile_149: 'Demande enregistrée',
      pages_Profile_150: 'Ta demande de suppression a été enregistrée. Un administrateur la traitera sous 30 jours.',
      pages_Profile_174: 'Demande annulée',
      pages_Profile_175: 'Ta demande de suppression a été annulée.',
      pages_Profile_239: 'Avatar mis à jour !',
      pages_Profile_267: 'Avatar supprimé',
      pages_Profile_368: 'Voir mon profil public',
      pages_Profile_442: 'Enregistrer le pseudo',
      pages_Profile_462: 'Préférences',
      pages_Profile_479: 'Sauvegardé automatiquement',
      pages_Profile_536: 'En savoir plus sur tes données',
      pages_Profile_541: 'Données publiques',
      pages_Profile_544: 'Pseudo et avatar visibles sur ton profil public.',
      pages_Profile_551: 'Données de guilde',
      pages_Profile_554: 'Personnages et vœux visibles par ta guilde uniquement.',
      pages_Profile_561: 'Données privées',
      pages_Profile_564: 'Email et tokens Battle.net jamais partagés.',
      pages_Profile_577: 'Zone de danger',
      pages_Profile_583: 'Une demande de suppression est en cours de traitement.',
      pages_Profile_593: 'Annuler la demande',
      pages_Profile_605: 'Demander la suppression de mon compte',
      pages_Profile_611: 'Supprimer ton compte ?',
      pages_Profile_615: 'Cette action est irréversible. Toutes tes données seront définitivement supprimées :',
      pages_Profile_620: 'Ton profil et avatar',
      pages_Profile_621: 'Tes personnages WoW',
      pages_Profile_622: 'Tes vœux de classe',
      pages_Profile_623: 'Tes messages sur le forum',
      pages_Profile_651: 'Confirmer la suppression',
      pages_PublicProfile_131: 'Membre depuis',
      pages_RosterWishes_636: 'Mode lecture admin',
      components_AvatarCropDialog_crop_preview_alt: 'Aper?u du recadrage',
      components_AvatarCropDialog_title: 'Recadrer l\\'avatar',
      components_BattleNetConnect_title: 'Battle.net',
      components_BugReportButton_url_label: 'URL:',
      components_Footer_brand: 'Guildforce',
      components_GlobalNav_auth_aria_label: 'Authentification',
      components_GlobalNav_home_aria_label: 'Accueil Guildforce',
      components_GlobalNav_menu_aria_label: 'Menu',
      components_GlobalNav_menu_label: 'Menu',
      components_GlobalNav_nav_aria_label: 'Navigation principale',
      components_admin_BugReportsManager_url_label: 'URL',
      components_admin_GuildManager_actions: 'Actions',
      components_admin_GuildManager_sync_job: 'Sync lanc?e (job {{jobId}}). Rafra?chis dans 1-2 min.',
      components_admin_GuildManager_sync_started: 'Sync lanc?e, ?a peut prendre quelques minutes (rafra?chis ensuite).',
      components_admin_PatchNotesEditor_content_en_placeholder: 'Describe the changes...',
      components_admin_PatchNotesEditor_content_fr_placeholder: 'D?crivez les changements...',
      components_admin_PatchNotesEditor_title_en_placeholder: 'Version title',
      components_admin_PatchNotesEditor_title_fr_placeholder: 'Titre de la version',
      components_admin_PatchNotesEditor_version_placeholder: '1.0.0',
      components_forum_ForumTopicList_reactions_title: 'R?actions',
      components_forum_NotificationBell_mention: '{{username}} vous a mentionn? dans "{{topicTitle}}"',
      components_forum_NotificationBell_post_reply: '{{username}} a r?pondu dans "{{topicTitle}}"',
      components_forum_NotificationBell_topic_reply: '{{username}} a r?pondu ? votre sujet "{{topicTitle}}"',
      components_forum_SanctionDialog_applied: 'Sanction appliqu?e ? {{username}}',
      components_polls_PollQuestionEditor_max_label: 'Max',
      components_polls_PollQuestionEditor_min_label: 'Min',
      components_polls_PollResults_response_plural: 'responses',
      components_polls_PollResults_response_single: 'response',
      components_polls_SortableQuestion_max_label: 'Max',
      components_polls_SortableQuestion_min_label: 'Min',
      components_settings_GuildBattleNetSection_title: 'Battle.net',
      components_ui_breadcrumb_label: 'Fil d\\'Ariane',
      components_ui_breadcrumb_more: 'Plus',
      components_ui_pagination_label: 'Pagination',
      hooks_useGuildPolls_close_error: 'Error closing the poll',
      hooks_useGuildPolls_close_success: 'Poll closed',
      hooks_useGuildPolls_create_error: 'Error creating the poll',
      hooks_useGuildPolls_delete_error: 'Error deleting the poll',
      hooks_useGuildPolls_delete_success: 'Poll deleted',
      hooks_useGuildPolls_duplicate_error: 'Error duplicating the poll',
      hooks_useGuildPolls_duplicate_suffix: '(copy)',
      hooks_useGuildPolls_publish_error: 'Error publishing the poll',
      hooks_useGuildPolls_publish_success: 'Poll published!',
      hooks_useGuildPolls_questions_update_error: 'Error updating questions',
      hooks_useGuildPolls_questions_updated: 'Questions updated',
      hooks_useGuildPolls_reset_error: 'Error resetting responses',
      hooks_useGuildPolls_reset_success: 'Responses reset',
      hooks_useGuildPolls_respondent_rules_error: 'Error saving targeting',
      hooks_useGuildPolls_results_rules_error: 'Error saving permissions',
      hooks_useGuildPolls_submit_all_error: 'Error submitting responses',
      hooks_useGuildPolls_submit_all_success: 'Responses saved!',
      hooks_useGuildPolls_submit_response_error: 'Error submitting response',
      hooks_useGuildPolls_update_error: 'Error updating the poll',
      pages_Auth_brand: 'Guildforce',
      pages_Auth_email_placeholder: 'ton@email.com',
      pages_Auth_password_placeholder: '????????',
      pages_ForumAdmin_category_description_placeholder: 'Description...',
      pages_ForumAdmin_category_icon_placeholder: '??',
      pages_ForumAdmin_category_name_placeholder: 'Discussion g?n?rale',
      pages_ForumAdmin_category_slug_placeholder: 'general',
      pages_ForumAdmin_description_label: 'Description',
      pages_ForumAdmin_slug_label: 'Slug',
      pages_ForumNewTopic_115: 'Dans {{categoryName}}',
      pages_PublicProfile_user_not_found: 'L\\'utilisateur "{{username}}" n\\'existe pas.',
      pages_Wishes_drag_reorder: 'Glisser pour r?organiser',
      pages_Wishes_move_down: 'Descendre',
      pages_Wishes_move_up: 'Monter',
      pages_Wishes_session_expired: 'Session expir?e',
    },
  },
};
