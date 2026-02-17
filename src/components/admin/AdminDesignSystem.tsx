import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Info,
  Lock,
  Search,
  Shield,
  Sparkles,
  TriangleAlert,
  User,
  Users,
  XCircle,
} from 'lucide-react';

import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { CommitmentToggle, type CommitmentStatus } from '@/components/CommitmentToggle';
import { RosterSelector } from '@/components/roster';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses } from '@/data/wowClasses';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Copy = { en: string; fr: string };

const copy = (language: string, value: Copy) => (language === 'fr' ? value.fr : value.en);

const COLORS = [
  { label: 'Primary', cls: 'bg-primary', token: '--primary', usage: { en: 'Main action', fr: 'Action principale' } },
  { label: 'Success', cls: 'bg-healer', token: '--healer', usage: { en: 'Validation states', fr: 'États valides' } },
  { label: 'Error', cls: 'bg-destructive', token: '--destructive', usage: { en: 'Blocking issues', fr: 'Erreurs bloquantes' } },
  { label: 'Warning', cls: 'bg-amber-500', token: '--warning', usage: { en: 'Risk or lock warning', fr: 'Risque ou verrou' } },
  { label: 'Info', cls: 'bg-sky-500', token: '--info', usage: { en: 'Contextual help', fr: 'Aide contextuelle' } },
];

const SECTION_LINKS = [
  { id: 'foundations', label: { en: 'Foundations', fr: 'Fondations' } },
  { id: 'coverage', label: { en: 'Coverage', fr: 'Couverture' } },
  { id: 'layouts', label: { en: 'Layout archetypes', fr: 'Archétypes de layout' } },
  { id: 'components', label: { en: 'Components', fr: 'Composants' } },
  { id: 'patterns', label: { en: 'Guildforce patterns', fr: 'Patterns Guildforce' } },
  { id: 'guidelines', label: { en: 'Guidelines', fr: 'Guidelines' } },
];

const CODE_EXAMPLES = {
  button: `<Button variant="destructive" size="sm" disabled={isLoading}>
  {isLoading ? 'Saving...' : 'Delete member'}
</Button>`,
  input: `<Label htmlFor="roster-name">Roster</Label>
<Input id="roster-name" placeholder="Mythic Team" />

<Select>
  <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
  <SelectContent><SelectItem value="healer">Healer</SelectItem></SelectContent>
</Select>`,
  nav: `<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="roster">Roster</TabsTrigger>
  </TabsList>
</Tabs>`,
  player: `<Card>
  <CardHeader>
    <CardTitle>Elisara</CardTitle>
    <Badge variant="outline">Main</Badge>
  </CardHeader>
  <CardContent>
    <Badge className="bg-healer/20 text-healer">Healer</Badge>
  </CardContent>
</Card>`,
  wishes: `<Table>
  <TableBody>
    <TableRow>
      <TableCell>#1 Holy Priest</TableCell>
      <TableCell><Badge>Approved</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>`,
  glow: `<GlowCard className="p-4">
  <h3>Guild Summary</h3>
  <p>Use GlowCard for primary glass surfaces in player/admin spaces.</p>
</GlowCard>`,
  overlays: `<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild><Button variant="ghost">Hint</Button></TooltipTrigger>
    <TooltipContent>Read-only helper</TooltipContent>
  </Tooltip>
</TooltipProvider>`,
};

const SectionTitle = ({ id, title, description }: { id: string; title: string; description: string }) => (
  <div id={id} className="scroll-mt-24 space-y-1">
    <h2 className="text-xl md:text-2xl font-display text-foreground">{title}</h2>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

const CodePreview = ({ code }: { code: string }) => (
  <pre className="rounded-md border border-border/60 bg-background/70 p-3 text-xs overflow-x-auto">
    <code>{code}</code>
  </pre>
);

const DoDont = ({ doText, dontText }: { doText: string; dontText: string }) => (
  <div className="grid gap-2 md:grid-cols-2 text-xs">
    <div className="rounded-md border border-healer/30 bg-healer/10 p-2 text-healer">Do: {doText}</div>
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-destructive">Don't: {dontText}</div>
  </div>
);

export const AdminDesignSystem = () => {
  const { language } = useLanguage();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [attendance, setAttendance] = useState<CommitmentStatus>('undecided');
  const [rosterId, setRosterId] = useState('main');

  const rosterItems = useMemo(
    () => [
      { id: 'main', name: 'Mythic Core', is_default: true, hasAccess: true, wishes_locked: false, wishes_lock_at: null },
      { id: 'alt', name: 'Heroic Alt Run', is_default: false, hasAccess: true, wishes_locked: true, wishes_lock_at: null },
      { id: 'bench', name: 'Bench Pool', is_default: false, hasAccess: false, wishes_locked: false, wishes_lock_at: null },
    ],
    [],
  );

  const t = (value: Copy) => copy(language, value);

  return (
    <div className="space-y-6">
      <GlowCard className="p-4 md:p-6">
        <div className="flex flex-col gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/admin?section=docs">Admin docs</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3 w-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Design System Global</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-display text-foreground">{t({ en: 'Guildforce Design System', fr: 'Design System Guildforce' })}</h1>
              <p className="text-sm text-muted-foreground">{t({ en: 'Single source of truth for public pages, player app, and admin.', fr: 'Source unique pour pages publiques, espace joueur et admin.' })}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin?section=docs">{t({ en: 'Back to docs', fr: 'Retour docs' })}</Link>
            </Button>
          </div>
        </div>
      </GlowCard>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="h-fit lg:sticky lg:top-24 bg-card/60 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t({ en: 'On this page', fr: 'Sommaire' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {SECTION_LINKS.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="block rounded px-2 py-1 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                {t(section.label)}
              </a>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-8">
          <section className="space-y-4">
            <SectionTitle
              id="foundations"
              title={t({ en: 'Foundations', fr: 'Fondations' })}
              description={t({ en: 'Visual primitives shared by landing, in-guild pages, and admin tooling.', fr: 'Primitives visuelles communes au site public, pages guilde et admin.' })}
            />

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">{t({ en: 'Color semantics', fr: 'Sémantique couleur' })}</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Use semantic intent first, then visual style.', fr: 'Partir de l’intention sémantique avant le style.' })}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {COLORS.map((item) => (
                  <div key={item.label} className="rounded-md border border-border/50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={cn('h-4 w-4 rounded-full', item.cls)} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t(item.usage)}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">{item.token}</p>
                  </div>
                ))}
              </div>
              <DoDont
                doText={t({ en: 'Use success or error for data status only.', fr: 'Utiliser success/error pour des statuts de données.' })}
                dontText={t({ en: 'Do not use warning color for primary actions.', fr: 'Ne pas utiliser warning comme action primaire.' })}
              />
            </GlowCard>

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">{t({ en: 'Typography, spacing and recurring iconography', fr: 'Typographie, espacement et iconographie' })}</h3>
              <div className="space-y-3">
                <h1 className="text-2xl font-display">Display / Section title</h1>
                <h2 className="text-lg font-semibold">Card title</h2>
                <p className="text-sm">Body copy for context and guidance.</p>
                <p className="text-xs text-muted-foreground">Caption / helper text / metadata</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge className="bg-tank/20 text-tank">Tank</Badge>
                  <Badge className="bg-healer/20 text-healer">Healer</Badge>
                  <Badge className="bg-dps/20 text-dps">DPS</Badge>
                  <Badge variant="outline">Alliance</Badge>
                  <Badge variant="outline">Horde</Badge>
                </div>
              </div>
              <DoDont
                doText={t({ en: 'Keep one display heading per section.', fr: 'Un seul gros titre par section.' })}
                dontText={t({ en: 'Avoid caption size for body paragraphs.', fr: 'Éviter les captions pour le corps de texte.' })}
              />
            </GlowCard>
            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">{t({ en: 'WoW color tokens: classes, roles, factions', fr: 'Tokens couleurs WoW : classes, rôles, factions' })}</h3>
              <p className="text-sm text-muted-foreground">
                {t({ en: 'Canonical palette for class tags, role indicators and faction visuals.', fr: 'Palette canonique pour les tags de classes, indicateurs de rôles et visuels de faction.' })}
              </p>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Role tokens</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-border/50 p-2 text-xs flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-tank" /> Tank (`--tank`)</div>
                  <div className="rounded-md border border-border/50 p-2 text-xs flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-healer" /> Healer (`--healer`)</div>
                  <div className="rounded-md border border-border/50 p-2 text-xs flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-dps" /> DPS (`--dps`)</div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Faction tokens</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-border/50 p-2 text-xs flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(var(--alliance))' }} /> Alliance (`--alliance`)</div>
                  <div className="rounded-md border border-border/50 p-2 text-xs flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(var(--horde))' }} /> Horde (`--horde`)</div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Class tokens</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {wowClasses.map((wowClass) => (
                    <div key={wowClass.id} className="rounded-md border border-border/50 p-2 text-xs flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: `hsl(var(--class-${wowClass.id}))` }} />
                      <span>{language === 'fr' ? wowClass.name.fr : wowClass.name.en}</span>
                    </div>
                  ))}
                </div>
              </div>

              <DoDont
                doText={t({ en: 'Always map class labels to `--class-*` tokens.', fr: 'Toujours mapper les labels de classe aux tokens `--class-*`.' })}
                dontText={t({ en: 'Do not hardcode random class colors in components.', fr: 'Ne pas hardcoder des couleurs de classe arbitraires dans les composants.' })}
              />
            </GlowCard>
          </section>

          <section className="space-y-4">
            <SectionTitle
              id="coverage"
              title={t({ en: 'Coverage matrix', fr: 'Matrice de couverture' })}
              description={t({ en: 'Quick audit of what is documented and what remains to factorize.', fr: 'Audit rapide de ce qui est documenté et de ce qui reste à factoriser.' })}
            />
            <GlowCard className="space-y-4 p-4">
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="font-medium mb-2">Covered</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Foundations</Badge>
                    <Badge>Buttons</Badge>
                    <Badge>Inputs</Badge>
                    <Badge>Navigation</Badge>
                    <Badge>Layout</Badge>
                    <Badge>Feedback</Badge>
                    <Badge>Avatar</Badge>
                    <Badge>Popover</Badge>
                    <Badge>Tooltip</Badge>
                    <Badge>AlertDialog</Badge>
                    <Badge>Collapsible</Badge>
                    <Badge>Wishes</Badge>
                    <Badge>Rosters</Badge>
                    <Badge>Events</Badge>
                  </div>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="font-medium mb-2">Partial / needs factorization</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Multi-select</Badge>
                    <Badge variant="secondary">Chips</Badge>
                    <Badge variant="secondary">Event card reusable</Badge>
                    <Badge variant="secondary">MarkdownEditor docs</Badge>
                    <Badge variant="secondary">React Hook Form wrapper docs</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t({ en: 'These patterns exist in pages but are not yet centralized as reusable components.', fr: 'Ces patterns existent dans les pages mais ne sont pas encore centralisés en composants réutilisables.' })}
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="mb-2 text-sm font-medium">{t({ en: 'Page-family audit', fr: 'Audit par famille de pages' })}</p>
                <div className="grid gap-2 text-xs md:grid-cols-2">
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>Public: Index/Auth/Legal/Changelog</span><Badge variant="secondary">Covered</Badge></div>
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>Guild app: Overview/Wishes/Roster/Members</span><Badge variant="secondary">Covered</Badge></div>
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>Polls: list/view/results/new</span><Badge variant="outline">Mostly covered</Badge></div>
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>Forum: list/topic/admin/new topic</span><Badge variant="outline">Mostly covered</Badge></div>
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>Admin modules</span><Badge variant="secondary">Covered</Badge></div>
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>NotFound / edge states</span><Badge variant="secondary">Covered</Badge></div>
                </div>
              </div>
            </GlowCard>
          </section>

          <section className="space-y-4">
            <SectionTitle
              id="layouts"
              title={t({ en: 'Layout archetypes', fr: 'Archétypes de layout' })}
              description={t({ en: 'Choose page width and navigation structure from content density and task depth.', fr: 'Choisir la largeur de page et la navigation selon la densité du contenu et la profondeur des tâches.' })}
            />
            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Width strategy</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="font-medium text-sm mb-2">Contained (`max-w-*`)</p>
                  <p className="text-xs text-muted-foreground mb-2">Best for forms, detail pages, docs, and legal content.</p>
                  <div className="rounded border border-dashed border-border/60 p-2">
                    <div className="mx-auto max-w-lg rounded bg-muted/40 p-2 text-xs text-muted-foreground text-center">
                      Centered readable column
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="font-medium text-sm mb-2">Wide / full width</p>
                  <p className="text-xs text-muted-foreground mb-2">Best for tables, roster management, analytics, and dense admin tools.</p>
                  <div className="rounded border border-dashed border-border/60 p-2">
                    <div className="w-full rounded bg-muted/40 p-2 text-xs text-muted-foreground text-center">
                      Full-width operational surface
                    </div>
                  </div>
                </div>
              </div>
              <DoDont
                doText={t({ en: 'Use contained width for reading and decision screens.', fr: 'Utiliser une largeur contenue pour les écrans de lecture et décision.' })}
                dontText={t({ en: 'Avoid full width for long-form text pages.', fr: 'Éviter le full width pour les pages de texte long.' })}
              />
            </GlowCard>

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Navigation strategy</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="font-medium text-sm mb-2">Top navigation</p>
                  <p className="text-xs text-muted-foreground mb-2">Use for cross-app destinations: guilds, forum, profile, admin.</p>
                  <div className="flex items-center gap-2 rounded bg-muted/40 p-2 text-xs">
                    <Badge variant="outline">Guilds</Badge>
                    <Badge variant="outline">Forum</Badge>
                    <Badge variant="outline">Profile</Badge>
                    <Badge variant="outline">Admin</Badge>
                  </div>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="font-medium text-sm mb-2">Top + sidebar</p>
                  <p className="text-xs text-muted-foreground mb-2">Use when one domain has many sub-tools (admin, settings, forum moderation).</p>
                  <div className="grid grid-cols-[90px_1fr] gap-2 rounded bg-muted/40 p-2 text-xs">
                    <div className="rounded bg-background/70 p-2">Sidebar</div>
                    <div className="rounded bg-background/70 p-2">Main section</div>
                  </div>
                </div>
              </div>
              <DoDont
                doText={t({ en: 'Use sidebar only when section switching is frequent.', fr: 'Utiliser la sidebar quand les changements de section sont fréquents.' })}
                dontText={t({ en: 'Do not add deep sidebars for pages with 1-2 actions only.', fr: 'Ne pas ajouter de sidebar profonde pour les pages avec 1 à 2 actions.' })}
              />
              <CodePreview
                code={`<main className="mx-auto w-full p-4 md:p-6 md:max-w-6xl lg:max-w-7xl">
  {/* contained docs/forms */}
</main>

<main className="w-full p-4 md:p-6">
  {/* full-width tables/operations */}
</main>`}
              />
            </GlowCard>
          </section>

          <section className="space-y-4">
            <SectionTitle
              id="components"
              title={t({ en: 'Components', fr: 'Composants' })}
              description={t({ en: 'Reusable building blocks and recommended variants.', fr: 'Blocs réutilisables et variantes recommandées.' })}
            />

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Buttons</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Primary confirms, secondary supports, ghost is low emphasis, danger is destructive only.', fr: 'Primary confirme, secondary supporte, ghost discret, danger destructif uniquement.' })}</p>
              <div className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Danger</Button>
                <Button size="sm" disabled>Disabled</Button>
                <Button size="sm" onClick={() => { setButtonLoading(true); setTimeout(() => setButtonLoading(false), 900); }}>
                  {buttonLoading ? 'Loading...' : 'Trigger loading'}
                </Button>
                <CosmicButton size="sm" variant="outline" icon={<Sparkles className="h-4 w-4" />}>Cosmic</CosmicButton>
              </div>
              <DoDont
                doText={t({ en: 'Keep a single primary action per block.', fr: 'Garder une seule action primaire par bloc.' })}
                dontText={t({ en: 'Do not style a non-destructive action as danger.', fr: 'Ne pas utiliser danger pour une action non destructive.' })}
              />
              <CodePreview code={CODE_EXAMPLES.button} />
            </GlowCard>

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Guildforce custom surfaces</h3>
              <p className="text-sm text-muted-foreground">
                {t({ en: 'GlowCard and CosmicButton are first-class UI primitives used across landing, player, and admin pages.', fr: 'GlowCard et CosmicButton sont des primitives UI de premier plan utilisées sur les pages publiques, joueur et admin.' })}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <GlowCard className="p-4" hoverable={false}>
                  <h4 className="text-sm font-medium">GlowCard</h4>
                  <p className="text-xs text-muted-foreground mt-1">Glass surface for grouped content and actions.</p>
                </GlowCard>
                <div className="rounded-md border border-border/50 p-4 flex flex-col gap-3">
                  <h4 className="text-sm font-medium">CosmicButton</h4>
                  <div className="flex gap-2">
                    <CosmicButton size="sm">Primary cosmic</CosmicButton>
                    <CosmicButton size="sm" variant="outline">Outline cosmic</CosmicButton>
                  </div>
                </div>
              </div>
              <CodePreview code={CODE_EXAMPLES.glow} />
            </GlowCard>

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Form inputs</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Text, select, search, checkbox or radio and textarea follow the same spacing and labels.', fr: 'Text, select, recherche, checkbox/radio et textarea gardent le même schéma.' })}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guild-search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="guild-search" className="pl-9" placeholder="Search player" value={search} onChange={(event) => setSearch(event.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-date">Date/Time</Label>
                  <Input id="event-date" type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label>Role select</Label>
                  <Select defaultValue="healer">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tank">Tank</SelectItem>
                      <SelectItem value="healer">Healer</SelectItem>
                      <SelectItem value="dps">DPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Roster intent</Label>
                  <RadioGroup defaultValue="core" className="flex flex-col gap-2">
                    <div className="flex items-center gap-2"><RadioGroupItem value="core" id="intent-core" /><Label htmlFor="intent-core">Core</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="backup" id="intent-backup" /><Label htmlFor="intent-backup">Backup</Label></div>
                  </RadioGroup>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Textarea notes</Label>
                  <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Context for officers" />
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <Checkbox id="discord" />
                  <Label htmlFor="discord">Discord available for raid calls</Label>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/50 p-3 md:col-span-2">
                  <Label htmlFor="notif-toggle">Enable event reminders</Label>
                  <Switch
                    id="notif-toggle"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
              </div>
              <CodePreview code={CODE_EXAMPLES.input} />
            </GlowCard>

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Navigation and layout</h3>
              <div className="space-y-4">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="roster">Roster</TabsTrigger>
                    <TabsTrigger value="events">Events</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="text-sm text-muted-foreground">Guild high-level summary.</TabsContent>
                  <TabsContent value="roster" className="text-sm text-muted-foreground">Roster lists and assignment tables.</TabsContent>
                  <TabsContent value="events" className="text-sm text-muted-foreground">Attendance management views.</TabsContent>
                </Tabs>

                <div className="grid gap-3 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Panel card</CardTitle>
                      <CardDescription>Use cards to group one intent per block.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Keep actions close to affected content.</p>
                    </CardContent>
                  </Card>

                  <div className="space-y-2 rounded-lg border border-border/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Drawer and modal samples</span>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild><Button size="sm" variant="outline">Modal</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm roster unlock</DialogTitle>
                              <DialogDescription>Use dialogs for blocking confirmations.</DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                        <Sheet>
                          <SheetTrigger asChild><Button size="sm" variant="outline">Drawer</Button></SheetTrigger>
                          <SheetContent>
                            <SheetHeader>
                              <SheetTitle>Member details</SheetTitle>
                              <SheetDescription>Use drawers for side context edits.</SheetDescription>
                            </SheetHeader>
                          </SheetContent>
                        </Sheet>
                      </div>
                    </div>
                  </div>
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
                    <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
                    <PaginationItem><PaginationLink href="#">2</PaginationLink></PaginationItem>
                    <PaginationItem><PaginationEllipsis /></PaginationItem>
                    <PaginationItem><PaginationNext href="#" /></PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
              <CodePreview code={CODE_EXAMPLES.nav} />
            </GlowCard>

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Feedback and states</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md border border-healer/30 bg-healer/10 p-2 text-sm text-healer"><CheckCircle2 className="h-4 w-4" /> Success state</div>
                  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive"><XCircle className="h-4 w-4" /> Error state</div>
                  <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-400"><TriangleAlert className="h-4 w-4" /> Warning state</div>
                  <div className="flex items-center gap-2 rounded-md border border-sky-500/30 bg-sky-500/10 p-2 text-sm text-sky-300"><Info className="h-4 w-4" /> Informational state</div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Alert component</AlertTitle>
                    <AlertDescription>Use this for inline persistent feedback inside pages.</AlertDescription>
                  </Alert>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success('Roster updated successfully')}
                  >
                    Trigger toast
                  </Button>
                </div>
                <div className="space-y-2 rounded-md border border-border/50 p-3">
                  <div className="flex gap-2">
                    <Badge>Active</Badge>
                    <Badge variant="secondary">Draft</Badge>
                    <Badge variant="outline">Locked</Badge>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                    <Skeleton className="h-4 w-[60%]" />
                  </div>
                  <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">Empty state: no applicants yet.</div>
                </div>
              </div>
            </GlowCard>

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Overlays and disclosure primitives</h3>
              <p className="text-sm text-muted-foreground">
                {t({ en: 'Used in guild members, forum moderation, profile and auth pages for contextual help and confirmations.', fr: 'Utilisés dans les pages membres, modération forum, profil et auth pour l’aide contextuelle et les confirmations.' })}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border/50 p-3 space-y-3">
                  <p className="text-sm font-medium">Avatar + Tooltip + Popover</p>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src="https://wow.zamimg.com/images/wow/icons/large/classicon_priest.jpg" alt="Elisara" />
                      <AvatarFallback>EL</AvatarFallback>
                    </Avatar>
                    <TooltipProvider delayDuration={120}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="ghost">Role hint</Button>
                        </TooltipTrigger>
                        <TooltipContent>Main healer assignment</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="outline">Filters</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48">
                        <p className="text-xs text-muted-foreground">Popover content for quick filters and contextual actions.</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="rounded-md border border-border/50 p-3 space-y-3">
                  <p className="text-sm font-medium">AlertDialog + Collapsible</p>
                  <div className="flex flex-wrap gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">Delete topic</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete forum topic?</AlertDialogTitle>
                          <AlertDialogDescription>This action is irreversible and removes all associated posts.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction>Confirm delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger asChild>
                      <Button size="sm" variant="outline">Technical details</Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 text-xs text-muted-foreground">
                      Collapsible is used to progressively reveal optional forms and advanced settings.
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
              <CodePreview code={CODE_EXAMPLES.overlays} />
            </GlowCard>
          </section>

          <section className="space-y-4">
            <SectionTitle
              id="patterns"
              title={t({ en: 'Guildforce patterns', fr: 'Patterns Guildforce' })}
              description={t({ en: 'Domain-specific UI for player cards, wishes, rosters, and events.', fr: 'UI métier pour fiches joueur, vœux, rosters et événements.' })}
            />

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Player profile card</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Structure: identity, main or alt badge, role tags, ilvl and recruitment tags.', fr: 'Structure: identité, badges main/alt, rôles, ilvl et tags recrutement.' })}</p>
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-primary/20 grid place-items-center"><User className="h-5 w-5 text-primary" /></div>
                      <div>
                        <CardTitle className="text-base">Elisara - Tarren Mill</CardTitle>
                        <CardDescription>Holy Priest</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Badge>Main</Badge>
                      <Badge variant="outline">iLvl 642</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge className="bg-healer/20 text-healer">Healer</Badge>
                  <Badge variant="outline">Raid core</Badge>
                  <Badge variant="secondary">Mythic ready</Badge>
                </CardContent>
              </Card>
              <CodePreview code={CODE_EXAMPLES.player} />
            </GlowCard>

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Wish priority and lock flow</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Show rank order, validation, and lock visibility at row level.', fr: 'Montrer ordre, validation et verrouillage au niveau ligne.' })}</p>
              <div className="rounded-md border border-border/50 p-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Priority</TableHead>
                      <TableHead>Class/spec</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>#1</TableCell>
                      <TableCell>Holy Priest</TableCell>
                      <TableCell><Badge className="bg-healer/20 text-healer">Approved</Badge></TableCell>
                      <TableCell><Lock className="h-4 w-4 text-amber-400" /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>#2</TableCell>
                      <TableCell>Mistweaver Monk</TableCell>
                      <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                      <TableCell><Clock3 className="h-4 w-4 text-sky-300" /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <CodePreview code={CODE_EXAMPLES.wishes} />
            </GlowCard>

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Roster management panel</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Combine roster selector, filters, and bulk actions in one horizontal control area.', fr: 'Combiner sélection roster, filtres et actions de masse.' })}</p>
              <div className="space-y-3 rounded-md border border-border/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <RosterSelector rosters={rosterItems} selectedRosterId={rosterId} onSelect={setRosterId} showAccessIndicator showWishesLockIndicator />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Export CSV</Button>
                    <Button size="sm">Approve selected</Button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Input placeholder="Search players" />
                  <Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem><SelectItem value="healer">Healer</SelectItem></SelectContent></Select>
                  <Select defaultValue="pending"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem></SelectContent></Select>
                </div>
              </div>
            </GlowCard>

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Event attendance workflow</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Attendance cards should expose status, role demand and confirmation controls.', fr: 'Les pages event montrent statut, besoin de rôles et contrôles de confirmation.' })}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border-border/50 bg-card/60">
                  <CardHeader>
                    <CardTitle className="text-base">Mythic Raid - Wednesday</CardTitle>
                    <CardDescription>20:30 - 23:30 CET</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-healer/20 text-healer">2 healers needed</Badge>
                      <Badge className="bg-tank/20 text-tank">1 tank needed</Badge>
                    </div>
                    <CommitmentToggle status={attendance} onChange={setAttendance} compact />
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/60">
                  <CardHeader>
                    <CardTitle className="text-base">Signup summary</CardTitle>
                    <CardDescription>Realtime status per role</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="inline-flex items-center gap-1"><Shield className="h-4 w-4 text-tank" /> Tanks</span><span>2 / 2</span></div>
                    <div className="flex items-center justify-between"><span className="inline-flex items-center gap-1"><Sparkles className="h-4 w-4 text-healer" /> Healers</span><span>3 / 4</span></div>
                    <div className="flex items-center justify-between"><span className="inline-flex items-center gap-1"><Users className="h-4 w-4 text-dps" /> DPS</span><span>11 / 14</span></div>
                  </CardContent>
                </Card>
              </div>
            </GlowCard>
          </section>

          <section className="space-y-4">
            <SectionTitle
              id="guidelines"
              title={t({ en: 'Guidelines', fr: 'Guidelines' })}
              description={t({ en: 'Decision rules for consistency and baseline accessibility.', fr: 'Règles de décision pour cohérence et accessibilité.' })}
            />

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Core do/don't</h3>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div className="rounded-md border border-border/60 p-3">
                  <p className="font-medium">Do</p>
                  <ul className="mt-2 list-disc pl-4 text-muted-foreground space-y-1">
                    <li>Use semantic badges for status (approved, pending, rejected).</li>
                    <li>Keep primary CTA unique within a card or panel.</li>
                    <li>Pair every input with a visible label.</li>
                    <li>Use skeletons for loading lists and tables, not generic spinners everywhere.</li>
                  </ul>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <p className="font-medium">Don't</p>
                  <ul className="mt-2 list-disc pl-4 text-muted-foreground space-y-1">
                    <li>Do not use color alone to convey validation outcome.</li>
                    <li>Do not place destructive actions next to non-destructive primaries.</li>
                    <li>Do not hide key actions behind hover-only affordances on mobile.</li>
                    <li>Do not introduce custom spacing scales outside shared tokens.</li>
                  </ul>
                </div>
              </div>
            </GlowCard>

            <GlowCard className="space-y-4 p-4">
              <h3 className="text-base font-semibold">Accessibility baseline</h3>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div className="rounded-md border border-border/60 p-3 space-y-2">
                  <p className="font-medium">Contrast and focus</p>
                  <p className="text-muted-foreground">Use readable text over glass backgrounds and preserve visible focus ring.</p>
                  <Button variant="outline">Keyboard focus sample</Button>
                </div>
                <div className="rounded-md border border-border/60 p-3 space-y-2">
                  <p className="font-medium">Labels and state copy</p>
                  <Label htmlFor="a11y-sample">Raid note</Label>
                  <Input id="a11y-sample" placeholder="Explain assignment" />
                  <p className="text-xs text-muted-foreground">Error and success states should include text, not icon-only feedback.</p>
                </div>
              </div>
              <div className="rounded-md border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-sky-200">
                <div className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Maintenance note</div>
                <p className="mt-1 text-sky-100/90">When new components or patterns are introduced, update this page in the same PR to keep design and implementation aligned.</p>
              </div>
            </GlowCard>
          </section>

          <GlowCard className="p-4">
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-medium">{t({ en: 'Documentation shortcut in admin', fr: 'Raccourci documentation admin' })}</p>
              <p className="text-muted-foreground">{t({ en: 'Use this entry inside Admin Documentation to access the global design system route.', fr: 'Utiliser cette entrée dans la documentation admin pour ouvrir la route globale.' })}</p>
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link to="/admin/design-system">
                  <BookOpen className="mr-2 h-4 w-4" />
                  {t({ en: 'Open /admin/design-system', fr: 'Ouvrir /admin/design-system' })}
                </Link>
              </Button>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
};

