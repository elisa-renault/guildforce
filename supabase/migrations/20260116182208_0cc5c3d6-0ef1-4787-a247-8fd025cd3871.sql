-- Create legal_pages table for storing editable legal content
CREATE TABLE public.legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_fr text NOT NULL,
  title_en text NOT NULL,
  content_fr text NOT NULL,
  content_en text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

-- Public read access (legal pages must be accessible to everyone, including anonymous users)
CREATE POLICY "Legal pages are publicly readable"
ON public.legal_pages
FOR SELECT
USING (true);

-- Only admins can update legal pages
CREATE POLICY "Admins can update legal pages"
ON public.legal_pages
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default legal pages with template content
INSERT INTO public.legal_pages (slug, title_fr, title_en, content_fr, content_en) VALUES
(
  'legal-notice',
  'Mentions légales',
  'Legal Notice',
  '## Éditeur du site

**Guildforce**
[Nom / Raison sociale à compléter]
[Adresse à compléter]
[Email de contact à compléter]

## Hébergement

Ce site est hébergé par :
**Lovable** (infrastructure cloud)
https://lovable.dev

## Propriété intellectuelle

L''ensemble du contenu de ce site (textes, images, logos) est protégé par le droit d''auteur. Toute reproduction est interdite sans autorisation préalable.

World of Warcraft® et Blizzard Entertainment® sont des marques déposées de Blizzard Entertainment, Inc. Ce site n''est pas affilié à Blizzard Entertainment.

## Contact

Pour toute question concernant ce site, vous pouvez nous contacter à : [email à compléter]',
  '## Site Publisher

**Guildforce**
[Name / Company to be completed]
[Address to be completed]
[Contact email to be completed]

## Hosting

This site is hosted by:
**Lovable** (cloud infrastructure)
https://lovable.dev

## Intellectual Property

All content on this site (texts, images, logos) is protected by copyright. Any reproduction is prohibited without prior authorization.

World of Warcraft® and Blizzard Entertainment® are registered trademarks of Blizzard Entertainment, Inc. This site is not affiliated with Blizzard Entertainment.

## Contact

For any questions regarding this site, you can contact us at: [email to be completed]'
),
(
  'privacy-policy',
  'Politique de confidentialité',
  'Privacy Policy',
  '## Introduction

Guildforce s''engage à protéger la vie privée de ses utilisateurs. Cette politique décrit les données que nous collectons et comment nous les utilisons.

## Données collectées

- **Compte Battle.net** : Identifiant Battle.net, liste des personnages WoW, appartenance aux guildes
- **Profil utilisateur** : Nom d''utilisateur, avatar, préférences
- **Données d''utilisation** : Vœux de classes, participation aux sondages

## Finalités du traitement

- Fournir les fonctionnalités de l''application (gestion de guilde, vœux, sondages)
- Authentification via Battle.net OAuth
- Amélioration du service

## Base légale (RGPD)

- **Exécution du contrat** : Fourniture du service
- **Consentement** : Connexion Battle.net

## Durée de conservation

Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la suppression à tout moment.

## Vos droits

Conformément au RGPD, vous disposez des droits suivants :
- **Accès** : Obtenir une copie de vos données
- **Rectification** : Corriger vos données
- **Effacement** : Supprimer votre compte et vos données
- **Portabilité** : Récupérer vos données dans un format lisible

Pour exercer ces droits : [email à compléter]

## Cookies

Ce site utilise des cookies techniques essentiels au fonctionnement (authentification, préférences de langue). Aucun cookie publicitaire n''est utilisé.

## Sécurité

Vos données sont protégées par des mesures de sécurité appropriées (chiffrement, contrôle d''accès).',
  '## Introduction

Guildforce is committed to protecting the privacy of its users. This policy describes the data we collect and how we use it.

## Data Collected

- **Battle.net Account**: Battle.net ID, WoW character list, guild membership
- **User Profile**: Username, avatar, preferences
- **Usage Data**: Class wishes, poll participation

## Processing Purposes

- Provide application features (guild management, wishes, polls)
- Authentication via Battle.net OAuth
- Service improvement

## Legal Basis (GDPR)

- **Contract Performance**: Service provision
- **Consent**: Battle.net connection

## Data Retention

Your data is kept as long as your account is active. You can request deletion at any time.

## Your Rights

Under GDPR, you have the following rights:
- **Access**: Obtain a copy of your data
- **Rectification**: Correct your data
- **Erasure**: Delete your account and data
- **Portability**: Retrieve your data in a readable format

To exercise these rights: [email to be completed]

## Cookies

This site uses essential technical cookies (authentication, language preferences). No advertising cookies are used.

## Security

Your data is protected by appropriate security measures (encryption, access control).'
),
(
  'terms-of-service',
  'Conditions Générales d''Utilisation',
  'Terms of Service',
  '## Article 1 - Objet

Les présentes Conditions Générales d''Utilisation (CGU) régissent l''utilisation du service Guildforce, une application de gestion de guildes pour World of Warcraft.

## Article 2 - Acceptation

L''utilisation du service implique l''acceptation pleine et entière des présentes CGU.

## Article 3 - Accès au service

Le service est accessible gratuitement à tout utilisateur disposant d''un compte Battle.net. L''accès peut être suspendu pour maintenance ou en cas de violation des CGU.

## Article 4 - Inscription

L''inscription s''effectue via Battle.net OAuth. L''utilisateur garantit l''exactitude des informations fournies.

## Article 5 - Utilisation du service

L''utilisateur s''engage à :
- Respecter les autres utilisateurs
- Ne pas utiliser le service à des fins illégales
- Ne pas tenter de compromettre la sécurité du service

## Article 6 - Modération

Les administrateurs et modérateurs peuvent :
- Supprimer du contenu inapproprié
- Suspendre temporairement ou définitivement un compte
- Émettre des avertissements

## Article 7 - Propriété intellectuelle

Le code et le design de Guildforce sont protégés. World of Warcraft® est une marque de Blizzard Entertainment.

## Article 8 - Limitation de responsabilité

Guildforce est fourni "tel quel". Nous ne garantissons pas la disponibilité permanente du service.

## Article 9 - Modification des CGU

Ces CGU peuvent être modifiées à tout moment. Les utilisateurs seront informés des changements significatifs.

## Article 10 - Droit applicable

Ces CGU sont soumises au droit français. Tout litige relève des tribunaux compétents.',
  '## Article 1 - Purpose

These Terms of Service (ToS) govern the use of the Guildforce service, a guild management application for World of Warcraft.

## Article 2 - Acceptance

Using the service implies full acceptance of these ToS.

## Article 3 - Access to Service

The service is freely accessible to any user with a Battle.net account. Access may be suspended for maintenance or in case of ToS violation.

## Article 4 - Registration

Registration is done via Battle.net OAuth. Users guarantee the accuracy of provided information.

## Article 5 - Use of Service

Users agree to:
- Respect other users
- Not use the service for illegal purposes
- Not attempt to compromise service security

## Article 6 - Moderation

Administrators and moderators may:
- Remove inappropriate content
- Temporarily or permanently suspend accounts
- Issue warnings

## Article 7 - Intellectual Property

Guildforce code and design are protected. World of Warcraft® is a trademark of Blizzard Entertainment.

## Article 8 - Limitation of Liability

Guildforce is provided "as is". We do not guarantee permanent service availability.

## Article 9 - ToS Modifications

These ToS may be modified at any time. Users will be notified of significant changes.

## Article 10 - Applicable Law

These ToS are governed by French law. Any dispute falls under the jurisdiction of competent courts.'
);