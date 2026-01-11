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
  // Errors
  errors: {
    generic: string;
    network: string;
    unauthorized: string;
    notFound: string;
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
    errors: {
      generic: 'Something went wrong. Please try again.',
      network: 'Network error. Please check your connection.',
      unauthorized: 'You are not authorized to perform this action.',
      notFound: 'The requested resource was not found.',
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
    errors: {
      generic: 'Une erreur est survenue. Veuillez réessayer.',
      network: 'Erreur réseau. Vérifiez votre connexion.',
      unauthorized: 'Vous n\'êtes pas autorisé à effectuer cette action.',
      notFound: 'La ressource demandée est introuvable.',
    },
  },
};
