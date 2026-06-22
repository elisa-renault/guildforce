// Internationalization translations
import type { Language } from './config';
import type { translationsDe } from './translations.de';
import { translationsEn } from './translations.en';
import type { translationsEs } from './translations.es';
import type { translationsFr } from './translations.fr';
import type { translationsIt } from './translations.it';
import type { translationsKo } from './translations.ko';
import type { translationsPtBr } from './translations.pt-BR';
import type { translationsRu } from './translations.ru';
import type { translationsZhTw } from './translations.zh-TW';
export type { Language } from './config';

export interface Translations {
  // Common
  common: {
    loading: string;
    open: string;
    actions: string;
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
    admin: string;
    legal: string;
    privacy: string;
    terms: string;
    changelog: string;
    guildOverview: string;
    guildRoster: string;
    guildWishes: string;
    guildVault: string;
    guildSettings: string;
    guildMemberWishes: string;
    guildPolls: string;
    guildPollNew: string;
    guildPollEdit: string;
    guildPollView: string;
    guildPollResults: string;
    guildMembers: string;
    guildAtlas: string;
    guildAtlasNew: string;
    guildAtlasEdit: string;
    notFound: string;
  };
  commandPalette: {
    title: string;
    open: string;
    placeholder: string;
    placeholderInGuild: string;
    loading: string;
    loadingHint: string;
    searchUnavailable: string;
    emptyTitle: string;
    emptyDescription: string;
    usedCount: string;
    groups: {
      recent: string;
      actions: string;
      pages: string;
      guilds: string;
      members: string;
      rosters: string;
      polls: string;
    };
    actions: {
      createPoll: string;
      openRoster: string;
      editWishes: string;
      openSettings: string;
      syncMembers: string;
      openProfile: string;
      openAdmin: string;
      createAtlasDoc: string;
    };
    actionSubtitles: {
      openProfile: string;
      openAdmin: string;
      syncMembers: string;
      createAtlasDoc: string;
    };
    pageSubtitles: {
      guilds: string;
      profile: string;
      admin: string;
      atlas: string;
    };
    badges: {
      main: string;
      linked: string;
      notLinked: string;
    };
    keyboard: {
      navigate: string;
      open: string;
      close: string;
    };
  };
  guildSwitcher: {
    allGuilds: string;
    empty: string;
    favorites: string;
    guilds: string;
    recent: string;
    search: string;
    loading: string;
    addFavorite: string;
    removeFavorite: string;
  };
  guildVault: {
    title: string;
    subtitle: string;
    empty: string;
    addSecret: string;
    create: {
      title: string;
      description: string;
      submit: string;
      submitting: string;
      cancel: string;
    };
    form: {
      label: string;
      url: string;
      urlHint: string;
      image: string;
      imageHint: string;
      imageAdd: string;
      imageRemove: string;
      imageAlt: string;
      kind: string;
      username: string;
      password: string;
      token: string;
      value: string;
      recoveryCodes: string;
      requiresReason: string;
    };
    types: {
      credential: string;
      token: string;
      note: string;
      recoveryCode: string;
    };
    actions: {
      reveal: string;
      copy: string;
      rotate: string;
      archive: string;
      openLink: string;
      editSecret: string;
      more: string;
      editAccess: string;
      hideAccess: string;
      saveAccess: string;
      savingAccess: string;
      copyUsername: string;
      copyPassword: string;
      copyValue: string;
    };
    state: {
      revealed: string;
      copied: string;
      updated: string;
      expiresIn: string;
      manageBadge: string;
      revealBadge: string;
    };
    feedback: {
      createSuccess: string;
      createError: string;
      updateSuccess: string;
      updateError: string;
      actionError: string;
      accessSaved: string;
      accessError: string;
      loadingAccess: string;
      loadAccessError: string;
      archived: string;
      rotated: string;
      imageUploadError: string;
    };
    confirm: {
      archive: string;
    };
    prompts: {
      reason: string;
      rotateValue: string;
      rotateCodes: string;
    };
    access: {
      title: string;
      accessTitle: string;
      accessHint: string;
      manageTitle: string;
      manageHint: string;
      byRank: string;
      officerRanks: string;
      memberRanks: string;
      noRanks: string;
      byUser: string;
      addUserRule: string;
      selectUser: string;
      empty: string;
      summaryAccess: string;
      summaryManage: string;
      summaryRanks: string;
      summaryMembers: string;
    };
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
    connectingHint: string;
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
    reorderSpecs: string;
    mainSpec: string;
    moveSpecUp: string;
    moveSpecDown: string;
    comment: string;
    commentPlaceholder: string;
    status: string;
    confirmed: string;
    potential: string;
    noWishes: string;
    saveWishes: string;
    wishesSaved: string;
    wishesSavedForMember: string;
    noChangesToSave: string;
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
    lockedTitle: string;
    lockedRosterDesc: string;
    lockedMemberDesc: string;
    lockScheduledTitle: string;
    lockScheduledDesc: string;
    memberLockedToast: string;
    memberUnlockedToast: string;
    lockMember: string;
    unlockMember: string;
    removeMember: string;
    rosterDecision: {
      title: string;
      summaryTitle: string;
      validationDetailsTitle: string;
      selected: string;
      bench: string;
      notSelected: string;
      undecided: string;
      hint: string;
    };
    memberDetail: {
      seasonSheet: string;
      seasonStatus: string;
      snapshotRank: string;
      firstWishGranted: string;
      seasonChange: string;
      yes: string;
      no: string;
      history: string;
      historyEmpty: string;
      historyEvent: {
        snapshot: string;
        materialized: string;
        syncDeltaApplied: string;
        externalMatched: string;
        memberLeftRoster: string;
        memberLeftGuild: string;
        selectionChanged: string;
        wishesChanged: string;
        wishCreated: string;
        wishUpdated: string;
        wishDeleted: string;
        wishValidation: string;
        actor: string;
        fallback: string;
      };
    };
  };
  seasons: {
    label: string;
    selectSeason: string;
    active: string;
    draft: string;
    archived: string;
    activeHint: string;
    draftHint: string;
    archivedHint: string;
    viewingArchived: string;
    viewingDraft: string;
    activeOpen: string;
    prepareNew: string;
    renameSeason: string;
    archiveSeason: string;
    activateDraft: string;
    dialogTitle: string;
    renameDialogTitle: string;
    name: string;
    namePlaceholder: string;
    renameNameLabel: string;
    startsAt: string;
    endsAt: string;
    prefillPrevious: string;
    prefillPreviousHint: string;
    resetCopied: string;
    resetCopiedHint: string;
    activateImmediately: string;
    activateImmediatelyHint: string;
    sourceSeason: string;
    createDraft: string;
    startSeason: string;
    renameConfirm: string;
    created: string;
    activated: string;
    renamed: string;
    archivedToast: string;
    confirmArchive: string;
    noSeason: string;
    legacyMode: string;
    legacyModeHint: string;
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
    rosterTable: {
      player: string;
      status: string;
      decision: string;
      total: string;
      choice1: string;
      choice2: string;
      choice3: string;
      sortLabel: string;
      sortAscending: string;
      sortDescending: string;
      statusTooltip: string;
      decisionTooltip: string;
      totalTooltip: string;
      manualEntryHelp: string;
    };
    additionalWishes: string;
    addWish: string;
    externalMember: {
      addButton: string;
      title: string;
      memberLabel: string;
      memberPlaceholder: string;
      firstWishClassLabel: string;
      classPlaceholder: string;
      commentOptional: string;
      commentPlaceholder: string;
    };
    // Analytics tabs and sections
    table: string;
    selectedValidatedView: string;
    selectedValidatedSubtitle: string;
    selectedValidatedSummary: string;
    selectedValidatedEmpty: string;
    selectedValidatedEmptyDescription: string;
    selectedValidatedMembersCount: string;
    selectedValidatedWishesTotal: string;
    selectedValidatedShowPrimary: string;
    selectedValidatedShowAll: string;
    selectedValidatedGroupTanks: string;
    selectedValidatedGroupHealers: string;
    selectedValidatedGroupMelee: string;
    selectedValidatedGroupRanged: string;
    approvedWishesCount: string;
    approvedWishSingular: string;
    approvedWishPlural: string;
    approvedChoices: string;
    viewFullTable: string;
    analytics: string;
    classDistribution: string;
    specDistribution: string;
    topSpecs: string;
    rolesByPriority: string;
    wish1: string;
    otherWishes: string;
    tokenDistribution: string;
    tokenCloth: string;
    tokenLeather: string;
    tokenMail: string;
    tokenPlate: string;
    tokenDistributionInfo: string;
    tokenDistributionSource: string;
    tokenDreadful: string;
    tokenMystic: string;
    tokenVenerated: string;
    tokenZenith: string;
    majorBuffsDebuffs: string;
    majorBuffs: string;
    majorDebuffs: string;
    allValidations: string;
    missingClasses: string;
    allClassesRepresented: string;
    // Wish range filter
    wishRangeFilter: string;
    wishRange1: string;
    wishRangeN: string;
    allWishes: string;
    firstApprovedWish: string;
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
        contentContributions: string;
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
    validation: {
      usernameMin: string;
      usernameMax: string;
    };
    ui: {
      setupSuccessTitle: string;
      setupSuccessDesc: string;
      updateSuccessDesc: string;
      requestDeletionTitle: string;
      requestDeletionDesc: string;
      cancelDeletionTitle: string;
      cancelDeletionDesc: string;
      selectImageError: string;
      imageSizeError: string;
      avatarUpdated: string;
      avatarRemoved: string;
      profileNotFound: string;
      reconnectHint: string;
      backToLogin: string;
      welcomeTitle: string;
      welcomeSubtitle: string;
      connectedAs: string;
      usernamePlaceholder: string;
      usernameHint: string;
      getStarted: string;
      viewPublicProfile: string;
      avatarAlt: string;
      saveUsername: string;
      preferencesTitle: string;
      privacyTitle: string;
      privacyPublicTitle: string;
      privacyPublicDesc: string;
      privacyGuildTitle: string;
      privacyGuildDesc: string;
      privacyPrivateTitle: string;
      privacyPrivateDesc: string;
      dangerZoneTitle: string;
      languageFr: string;
      languageEn: string;
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
    rankLabels: {
      title: string;
      description: string;
      currentRank: string;
      blizzardName: string;
      customLabel: string;
      placeholder: string;
      save: string;
      saving: string;
      saved: string;
      saveError: string;
      reset: string;
      emptyFallbackHint: string;
    };
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
    wishesLockTitle: string;
    wishesLockedStatus: string;
    wishesUnlockedStatus: string;
    lockWishes: string;
    unlockWishes: string;
    wishesLockAtLabel: string;
    wishesLockAtHint: string;
    wishesLockClear: string;
    wishesLockSchedule: string;
    wishesLockedToast: string;
    wishesUnlockedToast: string;
    wishesLockScheduledToast: string;
    wishesLockClearedToast: string;
  };
  // Admin
  admin: {
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
    accessRestricted: string;
    loadingError: string;
    reports: string;
    categories: string;
    moderators: string;
    users: string;
    sanctions: string;
    roleRemoved: string;
    roleAdded: string;
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
      activeUsers30d: string;
      activeGuilds30d: string;
      dauUsers: string;
      wauUsers: string;
      mauUsers: string;
      newSignups7d: string;
      activationRate7d: string;
      retentionD7: string;
      retentionD30: string;
      openBugs: string;
      pendingDeletions: string;
      criticalIssues: string;
      uniqueWishUsers: string;
      totalWishes: string;
      guildsWithWishes: string;
      engagementRate: string;
      guildEngagementRate: string;
      guildsWithTwoMembers: string;
      guildsWithTwoWishUsers: string;
      totalPolls: string;
      activePolls: string;
      closedPolls: string;
      pollVoters: string;
      groupCommunity: string;
      groupWishes: string;
      groupModeration: string;
      groupPolls: string;
      groupActivation: string;
      sectionExecutiveTitle: string;
      sectionExecutiveDesc: string;
      sectionAcquisitionTitle: string;
      sectionAcquisitionDesc: string;
      sectionEngagementTitle: string;
      sectionEngagementDesc: string;
      sectionCommunityTitle: string;
      sectionCommunityDesc: string;
      sectionOperationsTitle: string;
      sectionOperationsDesc: string;
      chartActivityTrendTitle: string;
      chartActivityTrendDesc: string;
      chartCriticalIssuesTitle: string;
      chartCriticalIssuesDesc: string;
      chartCriticalBacklogLegend: string;
      chartCriticalCreatedLegend: string;
      chartSignupActivationTitle: string;
      chartSignupActivationDesc: string;
      chartEngagementTrendTitle: string;
      chartEngagementTrendDesc: string;
      chartRetentionTitle: string;
      chartRetentionInsufficient: string;
      chartsInsufficientHistory: string;
      chartNoIncidentsPeriod: string;
      vsPreviousPeriod: string;
      deltaNoBaseline: string;
      usersTooltip: string;
      guildsTooltip: string;
      activeUsers30dTooltip: string;
      activeGuilds30dTooltip: string;
      dauUsersTooltip: string;
      wauUsersTooltip: string;
      mauUsersTooltip: string;
      newSignups7dTooltip: string;
      activationRate7dTooltip: string;
      retentionD7Tooltip: string;
      retentionD30Tooltip: string;
      openBugsTooltip: string;
      pendingDeletionsTooltip: string;
      criticalIssuesTooltip: string;
      uniqueWishUsersTooltip: string;
      totalWishesTooltip: string;
      guildsWithWishesTooltip: string;
      engagementRateTooltip: string;
      guildEngagementRateTooltip: string;
      guildsWithTwoMembersTooltip: string;
      guildsWithTwoWishUsersTooltip: string;
      totalPollsTooltip: string;
      activePollsTooltip: string;
      closedPollsTooltip: string;
      pollVotersTooltip: string;
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
    by: string;
    when: string;
    user: string;
    action: string;
    secret: string;
    details: string;
    vaultAuditTitle: string;
    vaultAuditEmpty: string;
    detailReasonGiven: string;
    detailSurface: string;
    detailVersion: string;
    auditSurfaces: Record<string, string>;
    vaultSecretCreated: string;
    vaultSecretRevealed: string;
    vaultSecretArchived: string;
    vaultSecretRotated: string;
    vaultAccessUpdated: string;
    memberRemoved: string;
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
    manageVault: string;
    manageVaultDesc: string;
    viewVaultAudit: string;
    viewVaultAuditDesc: string;
    manageAtlas: string;
    manageAtlasDesc: string;
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
    vaultAccess: string;
    vaultAccessDesc: string;
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
    vault: string;
    atlas: string;
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
    reviewMyResponses: string;
    // Other option
    allowOther: string;
    otherSpecify: string;
    otherPlaceholder: string;
    textResponsePlaceholder: string;
    scaleDisplay: string;
    scaleDisplayStars: string;
    scaleDisplaySlider: string;
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
    resultsUi: {
      anonymousBadge: string;
      rosterValue: string;
      createdByValue: string;
      endsAtValue: string;
      controls: string;
      percentages: string;
      counts: string;
      filterSection: string;
      filterType: string;
      allSections: string;
      allTypes: string;
      allTones: string;
      textOnly: string;
      sortBy: string;
      filterTone: string;
      lowConsensusOnly: string;
      collapseSections: string;
      expandSections: string;
      collapseText: string;
      expandText: string;
      quickNavigation: string;
      jumpToQuestion: string;
      questionNavigator: string;
      noVisibleQuestions: string;
      noTextResponses: string;
      showMore: string;
      showLess: string;
      unsectioned: string;
      sectionSummarySingular: string;
      sectionSummaryPlural: string;
      expandSection: string;
      collapseSection: string;
      cohortAnalysis: string;
      cohortAnalysisHint: string;
      cohortAddFilter: string;
      cohortReset: string;
      cohortEmpty: string;
      cohortLoading: string;
      cohortQuestion: string;
      cohortValue: string;
      cohortAnd: string;
      cohortActive: string;
      cohortRespondentsValue: string;
      cohortAnonymousGuarded: string;
      cohortHiddenForAnonymity: string;
      cohortMinimumSample: string;
      cohortTextHidden: string;
      cohortGlobalReference: string;
      cohortRedactedBadge: string;
      responsesValue: string;
      visibleQuestionsValue: string;
      yourResponse: string;
      yourRanking: string;
      marginPoints: string;
      noRunnerUp: string;
      scoreValue: string;
      strongConsensus: string;
      mixedSignal: string;
      needsReview: string;
      contextLabel: string;
      focusQuestion: string;
      noSummary: string;
      none: string;
      aiSummary: {
        headerTitle: string;
        headerHint: string;
        title: string;
        showDetails: string;
        hideDetails: string;
        themes: string;
        polarityClusters: string;
        keywords: string;
        rawComments: string;
        generate: string;
        regenerate: string;
        generating: string;
        generateSuccess: string;
        loading: string;
        notGenerated: string;
        unavailable: string;
        insufficientData: string;
        generatedAtValue: string;
      };
      kpis: {
        respondents: string;
        respondentsValue: string;
        questions: string;
        sections: string;
        strongestConsensus: string;
        mostDivisive: string;
      };
      sort: {
        original: string;
        consensus: string;
        divisive: string;
        responses: string;
      };
      dispersion: {
        aligned: string;
        mixed: string;
        split: string;
      };
      takeaways: {
        leader: string;
        selection: string;
        average: string;
        text: string;
      };
      questionTypes: {
        single_choice: string;
        multiple_choice: string;
        text: string;
        rating: string;
        date: string;
        time: string;
        datetime: string;
        ranking: string;
        scale: string;
      };
    };
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

type TranslationModule =
  | { translationsEn: typeof translationsEn }
  | { translationsFr: typeof translationsFr }
  | { translationsDe: typeof translationsDe }
  | { translationsEs: typeof translationsEs }
  | { translationsPtBr: typeof translationsPtBr }
  | { translationsIt: typeof translationsIt }
  | { translationsRu: typeof translationsRu }
  | { translationsZhTw: typeof translationsZhTw }
  | { translationsKo: typeof translationsKo };

const TRANSLATION_LOADERS: Record<Language, () => Promise<Translations>> = {
  en: async () => translationsEn,
  fr: async () => {
    const mod = (await import('./translations.fr')) as TranslationModule;
    return mod.translationsFr;
  },
  de: async () => {
    const mod = (await import('./translations.de')) as TranslationModule;
    return mod.translationsDe;
  },
  es: async () => {
    const mod = (await import('./translations.es')) as TranslationModule;
    return mod.translationsEs;
  },
  'pt-BR': async () => {
    const mod = (await import('./translations.pt-BR')) as TranslationModule;
    return mod.translationsPtBr;
  },
  it: async () => {
    const mod = (await import('./translations.it')) as TranslationModule;
    return mod.translationsIt;
  },
  ru: async () => {
    const mod = (await import('./translations.ru')) as TranslationModule;
    return mod.translationsRu;
  },
  'zh-TW': async () => {
    const mod = (await import('./translations.zh-TW')) as TranslationModule;
    return mod.translationsZhTw;
  },
  ko: async () => {
    const mod = (await import('./translations.ko')) as TranslationModule;
    return mod.translationsKo;
  },
};


export const loadTranslations = async (language: Language): Promise<Translations> => {
  return TRANSLATION_LOADERS[language]?.() ?? TRANSLATION_LOADERS.en();
};

const collectTranslationKeys = (value: unknown, prefix = '', keys = new Set<string>()) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) keys.add(prefix);
    return keys;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      collectTranslationKeys(child, nextPrefix, keys);
    } else {
      keys.add(nextPrefix);
    }
  }

  return keys;
};

const checkTranslationCompleteness = <Lang extends string>(map: Record<Lang, Translations>) => {
  const languages = Object.keys(map) as Lang[];
  if (languages.length < 2) return;

  const baseLanguage = languages[0];
  const baseKeys = collectTranslationKeys(map[baseLanguage]);

  for (const language of languages.slice(1)) {
    const languageKeys = collectTranslationKeys(map[language]);
    const missing = [...baseKeys].filter((key) => !languageKeys.has(key));
    const extra = [...languageKeys].filter((key) => !baseKeys.has(key));

    if (missing.length || extra.length) {
      const missingPreview = missing.slice(0, 20).join(', ');
      const extraPreview = extra.slice(0, 20).join(', ');
      const missingSuffix = missing.length > 20 ? ` and ${missing.length - 20} more` : '';
      const extraSuffix = extra.length > 20 ? ` and ${extra.length - 20} more` : '';

      console.warn(
        `[i18n] Translation key mismatch for "${language}" compared to "${baseLanguage}".` +
          (missing.length ? ` Missing: ${missingPreview}${missingSuffix}.` : '') +
          (extra.length ? ` Extra: ${extraPreview}${extraSuffix}.` : '')
      );
    }
  }
};

if (import.meta.env?.DEV && !import.meta.env?.VITEST) {
  Promise.all([
    loadTranslations('en'),
    loadTranslations('fr'),
    loadTranslations('de'),
    loadTranslations('es'),
    loadTranslations('pt-BR'),
    loadTranslations('it'),
    loadTranslations('ru'),
    loadTranslations('zh-TW'),
    loadTranslations('ko'),
  ]).then(([en, fr, de, es, ptBr, it, ru, zhTw, ko]) => {
    checkTranslationCompleteness({ en, fr, de, es, 'pt-BR': ptBr, it, ru, 'zh-TW': zhTw, ko });
  });
}
