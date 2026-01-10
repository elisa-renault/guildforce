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
    discordPseudo: string;
    discordPseudoPlaceholder: string;
    forgotPassword: string;
    invalidEmail: string;
    passwordTooShort: string;
    passwordsDontMatch: string;
    userAlreadyExists: string;
    invalidCredentials: string;
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
    inviteKey: string;
    inviteKeyPlaceholder: string;
    inviteLink: string;
    copyInvite: string;
    shareInvite: string;
    members: string;
    noMembers: string;
    leaveGuild: string;
    deleteGuild: string;
    guildCreated: string;
    guildJoined: string;
    invalidKey: string;
    alreadyMember: string;
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
      discordPseudo: 'Discord username',
      discordPseudoPlaceholder: 'YourName#1234',
      forgotPassword: 'Forgot password?',
      invalidEmail: 'Please enter a valid email',
      passwordTooShort: 'Password must be at least 6 characters',
      passwordsDontMatch: 'Passwords do not match',
      userAlreadyExists: 'An account with this email already exists',
      invalidCredentials: 'Invalid email or password',
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
      inviteKey: 'Invite key',
      inviteKeyPlaceholder: 'Paste the invite key here',
      inviteLink: 'Invite link',
      copyInvite: 'Copy invite link',
      shareInvite: 'Share this link with your guild members',
      members: 'Members',
      noMembers: 'No members yet',
      leaveGuild: 'Leave guild',
      deleteGuild: 'Delete guild',
      guildCreated: 'Guild created successfully!',
      guildJoined: 'You joined the guild!',
      invalidKey: 'Invalid invite key',
      alreadyMember: 'You are already a member of this guild',
    },
    wishes: {
      title: 'My Class Wishes',
      subtitle: 'Select up to 3 classes you want to play next expansion',
      choice: 'Choice',
      choiceNumber: 'Choice #{{number}}',
      selectClass: 'Select a class',
      selectSpecs: 'Select specializations',
      comment: 'Comment',
      commentPlaceholder: 'Any additional information (reroll, availability, preferences...)',
      status: 'Status',
      confirmed: 'Confirmed for next season',
      potential: 'Potential / Uncertain',
      noWishes: 'No wishes submitted yet',
      saveWishes: 'Save my wishes',
      wishesSaved: 'Your wishes have been saved!',
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
      discordPseudo: 'Pseudo Discord',
      discordPseudoPlaceholder: 'VotreNom#1234',
      forgotPassword: 'Mot de passe oublié ?',
      invalidEmail: 'Veuillez entrer un email valide',
      passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
      passwordsDontMatch: 'Les mots de passe ne correspondent pas',
      userAlreadyExists: 'Un compte avec cet email existe déjà',
      invalidCredentials: 'Email ou mot de passe invalide',
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
      inviteKey: 'Clé d\'invitation',
      inviteKeyPlaceholder: 'Collez la clé d\'invitation ici',
      inviteLink: 'Lien d\'invitation',
      copyInvite: 'Copier le lien d\'invitation',
      shareInvite: 'Partagez ce lien avec les membres de votre guilde',
      members: 'Membres',
      noMembers: 'Aucun membre pour l\'instant',
      leaveGuild: 'Quitter la guilde',
      deleteGuild: 'Supprimer la guilde',
      guildCreated: 'Guilde créée avec succès !',
      guildJoined: 'Vous avez rejoint la guilde !',
      invalidKey: 'Clé d\'invitation invalide',
      alreadyMember: 'Vous êtes déjà membre de cette guilde',
    },
    wishes: {
      title: 'Mes vœux de classe',
      subtitle: 'Sélectionnez jusqu\'à 3 classes que vous souhaitez jouer',
      choice: 'Choix',
      choiceNumber: 'Choix n°{{number}}',
      selectClass: 'Sélectionnez une classe',
      selectSpecs: 'Sélectionnez les spécialisations',
      comment: 'Commentaire',
      commentPlaceholder: 'Informations complémentaires (reroll, disponibilité, préférences...)',
      status: 'Statut',
      confirmed: 'Confirmé pour la prochaine saison',
      potential: 'Potentiel / Incertain',
      noWishes: 'Aucun vœu soumis pour l\'instant',
      saveWishes: 'Enregistrer mes vœux',
      wishesSaved: 'Vos vœux ont été enregistrés !',
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
    },
    errors: {
      generic: 'Une erreur est survenue. Veuillez réessayer.',
      network: 'Erreur réseau. Vérifiez votre connexion.',
      unauthorized: 'Vous n\'êtes pas autorisé à effectuer cette action.',
      notFound: 'La ressource demandée est introuvable.',
    },
  },
};
