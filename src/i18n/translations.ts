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
    main: string;
    mainSet: string;
    refresh: string;
    connecting: string;
    region: string;
    selectRegion: string;
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
    noData: string;
    totalPlayers: string;
    confirmedPlayers: string;
    potentialPlayers: string;
    roleSummary: string;
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
  };
  // Guild Navigation
  guildNav: {
    dashboard: string;
    myWishes: string;
    polls: string;
    settings: string;
    activity: string;
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
  };
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
    },
    battlenet: {
      connect: 'Link my Battle.net account',
      connected: 'Connected to Battle.net',
      disconnect: 'Unlink Battle.net',
      disconnected: 'Disconnected from Battle.net',
      connectDescription: 'Connect your Battle.net account to automatically import your WoW characters.',
      yourCharacters: 'Your characters',
      noCharacters: 'No characters found',
      main: 'Main',
      mainSet: 'Main character set',
      refresh: 'Refresh',
      connecting: 'Connecting with Battle.net...',
      region: 'Region',
      selectRegion: 'Select your region',
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
      noData: 'No data to display',
      totalPlayers: 'Total players',
      confirmedPlayers: 'Confirmed',
      potentialPlayers: 'Potential',
      roleSummary: 'By role',
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
      // New keys for GuildPermissionsEditor and MyPermissionsCard
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
    },
    guildNav: {
      dashboard: 'Dashboard',
      myWishes: 'My Wishes',
      polls: 'Polls',
      settings: 'Settings',
      activity: 'Activity',
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
    },
    battlenet: {
      connect: 'Lier mon compte Battle.net',
      connected: 'Connecté à Battle.net',
      disconnect: 'Délier Battle.net',
      disconnected: 'Déconnecté de Battle.net',
      connectDescription: 'Connectez votre compte Battle.net pour importer automatiquement vos personnages WoW.',
      yourCharacters: 'Vos personnages',
      noCharacters: 'Aucun personnage trouvé',
      main: 'Principal',
      mainSet: 'Personnage principal défini',
      refresh: 'Actualiser',
      connecting: 'Connexion avec Battle.net...',
      region: 'Région',
      selectRegion: 'Sélectionnez votre région',
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
      noMembers: 'Aucun membre pour l\'instant',
      leaveGuild: 'Quitter la guilde',
      deleteGuild: 'Supprimer la guilde',
      guildCreated: 'Guilde créée avec succès !',
      guildJoined: 'Vous avez rejoint la guilde !',
      alreadyMember: 'Vous êtes déjà membre de cette guilde',
      myGuilds: 'Mes Guildes WoW',
      guildMaster: 'Guild Master',
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
      noData: 'Aucune donnée à afficher',
      totalPlayers: 'Total joueurs',
      confirmedPlayers: 'Confirmés',
      potentialPlayers: 'Potentiels',
      roleSummary: 'Par rôle',
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
      resyncBattlenet: 'Resync Battle.net',
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
    },
    guildNav: {
      dashboard: 'Tableau de bord',
      myWishes: 'Mes vœux',
      polls: 'Sondages',
      settings: 'Paramètres',
      activity: 'Activité',
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
      syncBattlenet: 'Sync Battle.net',
      syncComplete: 'Sync terminée',
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
  },
};
