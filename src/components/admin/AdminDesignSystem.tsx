import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Info,
  LayoutDashboard,
  Lock,
  Search,
  Shield,
  Sparkles,
  Table as TableIcon,
  TriangleAlert,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import { BattleNetIcon } from '@/components/BattleNetIcon';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CommitmentToggle, type CommitmentStatus } from '@/components/CommitmentToggle';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { GlowCard } from '@/components/GlowCard';
import { ContextualToolbar } from '@/components/layout/ContextualToolbar';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { RosterSelector } from '@/components/roster';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { DataListSkeleton } from '@/components/ui/data-list-skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FilterBar, FilterSearchField } from '@/components/ui/filter-controls';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingScreen } from '@/components/ui/loading-screen';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/sonner';
import { StarRating } from '@/components/ui/star-rating';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { wowClasses } from '@/data/wowClasses';
import { toneCalloutClass, toneTextClass } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

type Copy = { en: string };

const copy = (value: Copy) => value.en;

const COLORS = [
  { label: 'Primary', cls: 'bg-primary', token: '--primary', usage: { en: 'Main action' } },
  { label: 'Success', cls: 'bg-status-success', token: '--status-success', usage: { en: 'Validation states' } },
  { label: 'Error', cls: 'bg-status-error', token: '--status-error', usage: { en: 'Blocking issues' } },
  { label: 'Warning', cls: 'bg-status-warning', token: '--status-warning', usage: { en: 'Risk or lock warning' } },
  { label: 'Info', cls: 'bg-status-info', token: '--status-info', usage: { en: 'Contextual help' } },
];

const SECTION_LINKS = [
  { id: 'foundations', label: { en: 'Foundations' } },
  { id: 'coverage', label: { en: 'Coverage' } },
  { id: 'layouts', label: { en: 'Layout archetypes' } },
  { id: 'components', label: { en: 'Components' } },
  { id: 'patterns', label: { en: 'Guildforce patterns' } },
  { id: 'guidelines', label: { en: 'Guidelines' } },
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
  glow: `<GlowCard surface="section">
  <h3>Guild Summary</h3>
  <p>Use one framed surface per functional group.</p>
</GlowCard>`,
  overlays: `<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild><Button variant="ghost">Hint</Button></TooltipTrigger>
    <TooltipContent>Read-only helper</TooltipContent>
  </Tooltip>
</TooltipProvider>`,
  advanced: `<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Sync roster</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

<Slider value={[65]} max={100} />
<Progress value={68} />
<StarRating value={3.5} onChange={setValue} />`,
  pageHeader: `<PageHeader
  icon={Users}
  title="Guild members"
  description="Roster cache, linked players, ranks, and mains."
  bordered={false}
  actions={<Button size="sm">Sync</Button>}
/>`,
  toolbar: `<ContextualToolbar
  leading={<Input placeholder="Search players" />}
  trailing={<Button size="sm">Export CSV</Button>}
>
  <Select><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger></Select>
</ContextualToolbar>`,
  workspace: `<GuildWorkspaceShell
  guild={guild}
  guildId={guild.id}
  basePath={basePath}
  activeTab="roster"
  isGM={isGM}
  hasSettingsPermission={hasSettingsPermission}
  hasVaultAccess={hasVaultAccess}
  toolbar={<RosterSeasonToolbar />}
>
  <PageContainer as="main" width="workspace">...</PageContainer>
</GuildWorkspaceShell>`,
  commandPalette: `<Command shouldFilter={false} loop>
  <CommandInput placeholder="Search pages, guilds, members..." />
  <CommandList>
    <CommandGroup heading="Actions">
      <CommandItem>Create poll</CommandItem>
    </CommandGroup>
    <CommandGroup heading="Members">
      <CommandItem>Elisara - Holy Priest</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>`,
  emptyState: `<EmptyState
  icon={BookOpen}
  title="No active polls"
  description="Published polls appear here when your guild needs input."
  action={<Button size="sm">Create poll</Button>}
/>`,
};

const SectionTitle = ({ id, title, description }: { id: string; title: string; description: string }) => (
  <div id={id} className="scroll-mt-24 space-y-1">
    <h2 className="text-xl md:text-2xl font-sans font-medium text-foreground">{title}</h2>
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
    <div className="rounded-md border border-status-success/30 bg-status-success/10 p-2 text-status-success">Do: {doText}</div>
    <div className="rounded-md border border-status-error/30 bg-status-error/10 p-2 text-status-error">Don't: {dontText}</div>
  </div>
);

export const AdminDesignSystem = () => {
  const [buttonLoading, setButtonLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [attendance, setAttendance] = useState<CommitmentStatus>('undecided');
  const [rosterId, setRosterId] = useState('main');
  const [sliderValue, setSliderValue] = useState([65]);
  const [ratingValue, setRatingValue] = useState(3.5);
  const [progressValue, setProgressValue] = useState(68);
  const [showLoadingPreview, setShowLoadingPreview] = useState(false);
  const [menuPinned, setMenuPinned] = useState(true);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date(2026, 5, 20));

  const dsForm = useForm<{ raidNote: string }>({
    defaultValues: { raidNote: '' },
    mode: 'onSubmit',
  });

  const rosterItems = useMemo(
    () => [
      { id: 'main', name: 'Mythic Core', is_default: true, hasAccess: true, wishes_locked: false, wishes_lock_at: null },
      { id: 'alt', name: 'Heroic Alt Run', is_default: false, hasAccess: true, wishes_locked: true, wishes_lock_at: null },
      { id: 'bench', name: 'Bench Pool', is_default: false, hasAccess: false, wishes_locked: false, wishes_lock_at: null },
    ],
    [],
  );

  const t = (value: Copy) => copy(value);

  return (
    <div className="space-y-6">
      <CosmicBackground />
      <GlowCard surface="section" className="p-4 md:p-6">
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
              <h1 className="text-2xl md:text-3xl font-sans font-medium text-foreground">{t({ en: 'Guildforce Design System' })}</h1>
              <p className="text-sm text-muted-foreground">{t({ en: 'Single source of truth for public pages, player app, and admin.' })}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin?section=docs">{t({ en: 'Back to docs' })}</Link>
            </Button>
          </div>
        </div>
      </GlowCard>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="h-fit lg:sticky lg:top-24 bg-card/60 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t({ en: 'On this page' })}</CardTitle>
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
              title={t({ en: 'Foundations' })}
              description={t({ en: 'Visual primitives shared by landing, in-guild pages, and admin tooling.' })}
            />

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">{t({ en: 'Color semantics' })}</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Use semantic intent first, then visual style.' })}</p>
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
                doText={t({ en: 'Use success or error for data status only.' })}
                dontText={t({ en: 'Do not use warning color for primary actions.' })}
              />
            </GlowCard>

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">{t({ en: 'Typography, spacing and recurring iconography' })}</h3>
              <div className="space-y-3">
                <h1 className="text-2xl font-sans font-medium">App section title</h1>
                <h2 className="text-lg font-medium">Operational section title</h2>
                <p className="text-sm">Body copy for context and guidance.</p>
                <p className="text-xs text-muted-foreground">Caption / helper text / metadata</p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge className="border-tank/30 bg-tank/20 text-foreground">Tank</Badge>
                  <Badge className="bg-healer/20 text-healer">Healer</Badge>
                  <Badge className="border-dps/30 bg-dps/20 text-foreground">DPS</Badge>
                  <Badge variant="outline">Alliance</Badge>
                  <Badge variant="outline">Horde</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><BattleNetIcon className="h-4 w-4 text-primary" /> Battle.net</span>
                  <span className="inline-flex items-center gap-1.5"><Shield className="h-4 w-4 text-tank" /> Tank marker</span>
                  <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-healer" /> Healer marker</span>
                  <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-dps" /> DPS marker</span>
                </div>
              </div>
              <DoDont
                doText={t({ en: 'Use sans/medium headers for operational UI; reserve display type for brand, landing, setup, and editorial states.' })}
                dontText={t({ en: 'Do not use display type or heavy weight on repeated app section headers.' })}
              />
            </GlowCard>
            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">{t({ en: 'WoW color tokens: classes, roles, factions' })}</h3>
              <p className="text-sm text-muted-foreground">
                {t({ en: 'Canonical palette for class tags, role indicators and faction visuals.' })}
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
                      <span>{wowClass.name.en}</span>
                    </div>
                  ))}
                </div>
              </div>

              <DoDont
                doText={t({ en: 'Always map class labels to `--class-*` tokens.' })}
                dontText={t({ en: 'Do not hardcode random class colors in components.' })}
              />
            </GlowCard>
          </section>

          <section className="space-y-4">
            <SectionTitle
              id="coverage"
              title={t({ en: 'Coverage matrix' })}
              description={t({ en: 'Quick audit of what is documented and what remains to factorize.' })}
            />
            <GlowCard surface="section" className="space-y-4 p-4">
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
                    <Badge>Calendar</Badge>
                    <Badge>Popover</Badge>
                    <Badge>Tooltip</Badge>
                    <Badge>AlertDialog</Badge>
                    <Badge>Collapsible</Badge>
                    <Badge>Accordion</Badge>
                    <Badge>DropdownMenu</Badge>
                    <Badge>ScrollArea</Badge>
                    <Badge>Separator</Badge>
                    <Badge>Slider</Badge>
                    <Badge>StarRating</Badge>
                    <Badge>Progress</Badge>
                    <Badge>Toggle</Badge>
                    <Badge>Form</Badge>
                    <Badge>LoadingScreen</Badge>
                    <Badge>Sonner</Badge>
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
                    {t({ en: 'These patterns exist in pages but are not yet centralized as reusable components.' })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/80">
                    {t({ en: 'Coverage data can be refreshed with `npm run ds:audit:coverage`.' })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/80">
                    {t({ en: 'Governance rule: review `unscopedSharedCandidates` in `tmp/design-system-coverage.json` and either document/factorize them, or explicitly keep them out of scope.' })}
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-border/50 p-3">
                <p className="mb-2 text-sm font-medium">{t({ en: 'Page-family audit' })}</p>
                <div className="grid gap-2 text-xs md:grid-cols-2">
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>Public: Index/Auth/Legal/Changelog</span><Badge variant="secondary">Covered</Badge></div>
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>Guild app: Overview/Wishes/Roster/Members</span><Badge variant="secondary">Covered</Badge></div>
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>Polls: list/view/results/new</span><Badge variant="outline">Mostly covered</Badge></div>
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>Admin: dashboard/users/legal/patch notes</span><Badge variant="outline">Mostly covered</Badge></div>
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>Admin modules</span><Badge variant="secondary">Covered</Badge></div>
                  <div className="rounded border border-border/40 p-2 flex items-center justify-between"><span>NotFound / edge states</span><Badge variant="secondary">Covered</Badge></div>
                </div>
              </div>
            </GlowCard>
          </section>

          <section className="space-y-4">
            <SectionTitle
              id="layouts"
              title={t({ en: 'Layout archetypes' })}
              description={t({ en: 'Choose page width and navigation structure from content density and task depth.' })}
            />
            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Width strategy</h3>
              <p className="text-sm text-muted-foreground">
                {t({ en: 'Use `PageContainer` as the default wrapper and choose width by content density and shell ownership.' })}
              </p>
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
                  <p className="font-medium text-sm mb-2">App / workspace (`app`, `workspace`)</p>
                  <p className="text-xs text-muted-foreground mb-2">Authenticated app surfaces stay fluid and align to the shell grid. Use local max widths only for forms or compact headers.</p>
                  <div className="rounded border border-dashed border-border/60 p-2">
                    <div className="w-full rounded bg-muted/40 p-2 text-xs text-muted-foreground text-center">
                      Fluid shell-aligned operational surface
                    </div>
                  </div>
                </div>
              </div>
              <DoDont
                doText={t({ en: 'Use contained width for reading and decision screens, and fluid app or workspace width for authenticated operational pages.' })}
                dontText={t({ en: 'Do not center authenticated workspace pages like landing-page heroes.' })}
              />
            </GlowCard>

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Navigation strategy</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="font-medium text-sm mb-2">App topbar</p>
                  <p className="text-xs text-muted-foreground mb-2">Compose the app chrome as four groups: brand, global navigation, command search, and user zone.</p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded bg-muted/30 p-2 text-xs">
                    <Badge variant="outline" className="border-border/40 bg-background/35 text-muted-foreground">Brand</Badge>
                    <Badge variant="outline" className="border-primary/25 bg-primary/10 text-foreground">Guild switcher</Badge>
                    <Badge variant="outline">Admin</Badge>
                    <Badge variant="outline" className="border-border/35 bg-background/30 text-muted-foreground">Search</Badge>
                    <Badge variant="outline" className="border-border/35 bg-card/20">User zone</Badge>
                  </div>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="font-medium text-sm mb-2">Topbar spacing</p>
                  <p className="text-xs text-muted-foreground mb-2">Separate groups with spacing and weight before adding borders. Search stays useful but visually secondary, and topbar plus page content share the same horizontal gutters.</p>
                  <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-3 rounded bg-muted/30 p-2 text-xs">
                    <div className="rounded bg-background/60 p-2">Navigation</div>
                    <div className="rounded bg-background/35 p-2 text-muted-foreground">Command</div>
                    <div className="rounded bg-card/25 p-2">User</div>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border/50 p-3 space-y-3">
                <p className="font-medium text-sm">Canonical layout primitives</p>
                <div className="rounded border border-border/40 bg-background/50 p-2">
                  <PageContainer width="contained" spacing="sm" className="rounded border border-dashed border-border/50 bg-muted/30">
                    <div className="text-xs text-muted-foreground text-center">PageContainer width=&quot;contained&quot;</div>
                  </PageContainer>
                  <PageContainer width="workspace" spacing="sm" className="mt-2 rounded border border-dashed border-border/50 bg-muted/30">
                    <div className="text-xs text-muted-foreground text-center">PageContainer width=&quot;workspace&quot;</div>
                  </PageContainer>
                </div>
                <div className="rounded border border-border/40 bg-background/50 p-3">
                  <SectionHeader
                    title="Roster operations"
                    description="Use SectionHeader for major page-level headings."
                    icon={Users}
                  />
                </div>
                <div className="rounded border border-border/40 bg-background/50 p-3">
                  <Breadcrumbs
                    items={[
                      { label: 'Guilds', href: '/guilds' },
                      { label: 'Midnight', href: '/guild/123' },
                      { label: 'Roster' },
                    ]}
                  />
                </div>
                <div className="rounded border border-border/40 bg-background/50 p-2">
                  <div className="grid overflow-hidden rounded border border-border/40 bg-background/70 md:grid-cols-[160px_1fr]">
                    <div className="border-r border-border/40 bg-card/20 p-3">
                      <div className="mb-3 rounded-md border border-border/50 bg-muted/20 p-2">
                        <p className="truncate text-xs font-medium">Midnight</p>
                        <p className="truncate text-[11px] text-muted-foreground">Tarren Mill - EU</p>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="rounded bg-primary/20 px-2 py-1.5 text-foreground">Roster</div>
                        <div className="rounded px-2 py-1.5 text-muted-foreground">Polls</div>
                        <div className="rounded px-2 py-1.5 text-muted-foreground">Members</div>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="mb-2 rounded-md border border-border/40 bg-card/20 p-2 text-xs text-muted-foreground">
                        Context toolbar: roster, season, export, lock
                      </div>
                      <div className="rounded-md border border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground">
                        Page content
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">GuildWorkspaceShell preview: sidebar width changes the content track, page content stays on the same shell grid, and the page owns the main scroll.</p>
                </div>
              </div>

              <DoDont
                doText={t({ en: 'Use sidebar only when section switching is frequent.' })}
                dontText={t({ en: 'Do not add deep sidebars for pages with 1-2 actions only.' })}
              />
              <CodePreview
                code={`<PageContainer as="main" width="contained" spacing="md">
  {/* forms, docs, legal pages */}
</PageContainer>

<PageContainer as="main" width="app" spacing="md">
  {/* profile, admin */}
</PageContainer>

<PageContainer as="main" width="workspace" spacing="md">
  {/* guild workspace pages */}
</PageContainer>`}
              />
            </GlowCard>
          </section>

          <section className="space-y-4">
            <SectionTitle
              id="components"
              title={t({ en: 'Components' })}
              description={t({ en: 'Reusable building blocks and recommended variants.' })}
            />

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Buttons</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Primary confirms, secondary supports, ghost is low emphasis, danger is destructive only.' })}</p>
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
                doText={t({ en: 'Keep a single primary action per block.' })}
                dontText={t({ en: 'Do not style a non-destructive action as danger.' })}
              />
              <CodePreview code={CODE_EXAMPLES.button} />
            </GlowCard>

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Guildforce custom surfaces</h3>
              <p className="text-sm text-muted-foreground">
                {t({ en: 'GlowCard and CosmicButton are first-class UI primitives. Prefer flat or section surfaces for app screens, and use plum or gold accents only when they carry emphasis.' })}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <GlowCard surface="section" className="p-4" hoverable={false}>
                  <h4 className="text-sm font-medium">GlowCard</h4>
                  <p className="text-xs text-muted-foreground mt-1">Flat-first surface for grouped content and actions.</p>
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

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Form inputs</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Text, select, search, checkbox or radio and textarea follow the same spacing and labels.' })}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guild-search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="guild-search" className="pl-9" placeholder="Search player" value={search} onChange={(event) => setSearch(event.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-search">Filter bar</Label>
                  <FilterBar className="mb-0">
                    <FilterSearchField
                      id="filter-search"
                      placeholder="Search roster"
                      containerClassName="min-w-0 flex-1"
                    />
                    <Button size="sm" variant="outline" className="h-8">All classes</Button>
                  </FilterBar>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-date">Date/Time</Label>
                  <Input id="event-date" type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label>Calendar picker</Label>
                  <div className="rounded-md border border-border/50 bg-background/60 p-2">
                    <Calendar
                      mode="single"
                      selected={calendarDate}
                      onSelect={setCalendarDate}
                      defaultMonth={calendarDate}
                      className="mx-auto"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ds-role-select">Role select</Label>
                  <Select defaultValue="healer">
                    <SelectTrigger id="ds-role-select" aria-label="Role select">
                      <SelectValue placeholder="Select a role" />
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

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Navigation and layout</h3>
              <div className="grid gap-2 text-xs md:grid-cols-2">
                <div className="rounded border border-border/40 bg-background/35 p-3">
                  <p className="font-medium text-foreground">Header budget</p>
                  <p className="mt-1 text-muted-foreground">Skip page headers when sidebar, subnav, or toolbar already carries the context. Use `bordered=false` when a header is still useful.</p>
                </div>
                <div className="rounded border border-border/40 bg-background/35 p-3">
                  <p className="font-medium text-foreground">Profile-style grouping</p>
                  <p className="mt-1 text-muted-foreground">Group object, actions, and read-only facts in one flat section when they describe the same thing.</p>
                </div>
              </div>
              <div className="space-y-4">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="roster">Roster</TabsTrigger>
                    <TabsTrigger value="events">Events</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="text-sm text-muted-foreground">Guild high-level summary.</TabsContent>
                  <TabsContent value="roster" className="text-sm text-muted-foreground">Roster lists and planning tables.</TabsContent>
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

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Feedback and states</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md border border-status-success/30 bg-status-success/10 p-2 text-sm text-status-success"><CheckCircle2 className="h-4 w-4" /> Success state</div>
                  <div className="flex items-center gap-2 rounded-md border border-status-error/30 bg-status-error/10 p-2 text-sm text-status-error"><XCircle className="h-4 w-4" /> Error state</div>
                  <div className={cn("flex items-center gap-2 rounded-md border p-2 text-sm", toneCalloutClass('warning'))}><TriangleAlert className={cn("h-4 w-4", toneTextClass('warning'))} /> Warning state</div>
                  <div className={cn("flex items-center gap-2 rounded-md border p-2 text-sm", toneCalloutClass('info'))}><Info className={cn("h-4 w-4", toneTextClass('info'))} /> Informational state</div>
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
                  <DataListSkeleton
                    rows={2}
                    showToolbar={false}
                    showMeta={false}
                    variant="table"
                    className="max-w-full"
                  />
                </div>
              </div>
            </GlowCard>

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Overlays and disclosure primitives</h3>
              <p className="text-sm text-muted-foreground">
                {t({ en: 'Used in guild members, profile and auth pages for contextual help and confirmations.' })}
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
                        <TooltipContent>Main healer planning note</TooltipContent>
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
                          <AlertDialogTitle>Delete content item?</AlertDialogTitle>
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

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Extended primitives</h3>
              <p className="text-sm text-muted-foreground">
                {t({ en: 'Advanced primitives used in markdown editors, polls, and operational dashboards.' })}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border/50 p-3 space-y-3">
                  <p className="text-sm font-medium">ScrollArea + Separator + Accordion</p>
                  <ScrollArea className="h-28 rounded-md border border-border/50 p-2">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Recent guild activity feed</p>
                      <Separator />
                      <p className="text-sm">Recruitment post updated</p>
                      <p className="text-sm">Roster lock scheduled</p>
                      <p className="text-sm">Moderation action applied</p>
                    </div>
                  </ScrollArea>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="a11y">
                      <AccordionTrigger className="py-2 text-sm">Implementation notes</AccordionTrigger>
                      <AccordionContent className="text-xs text-muted-foreground">
                        Keep advanced controls collapsed by default on dense pages.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div className="rounded-md border border-border/50 p-3 space-y-3">
                  <p className="text-sm font-medium">Dropdown + Toggle + Slider + Progress + Rating</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Quick actions</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Roster ops</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Sync now</DropdownMenuItem>
                        <DropdownMenuCheckboxItem checked={menuPinned} onCheckedChange={(checked) => setMenuPinned(Boolean(checked))}>
                          Pin panel
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Toggle aria-label="Compact mode" variant="outline" size="sm">Compact mode</Toggle>
                  </div>
                  <div className="space-y-2">
                    <Slider aria-label="Threshold slider" value={sliderValue} onValueChange={setSliderValue} max={100} step={5} />
                    <Progress aria-label="Progress preview" value={progressValue} />
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Threshold {sliderValue[0]}%</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setProgressValue((previous) => (previous >= 95 ? 20 : previous + 15))}
                      >
                        Simulate progress
                      </Button>
                    </div>
                    <StarRating value={ratingValue} onChange={setRatingValue} size="sm" />
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border/50 p-3 space-y-3">
                <p className="text-sm font-medium">Form + LoadingScreen + Sonner toast</p>
                <Form {...dsForm}>
                  <form
                    onSubmit={dsForm.handleSubmit(() => {
                      setShowLoadingPreview(true);
                      toast.success('Note saved in design-system example');
                      setTimeout(() => setShowLoadingPreview(false), 900);
                    })}
                    className="space-y-2"
                  >
                    <FormField
                      control={dsForm.control}
                      name="raidNote"
                      rules={{
                        required: 'Raid note is required.',
                        minLength: { value: 5, message: 'Minimum 5 characters.' },
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Raid note</FormLabel>
                          <FormControl>
                            <Input placeholder="Healers rotate externals on phase 2." {...field} />
                          </FormControl>
                          <FormDescription>Use form wrappers to align labels, hints, and errors.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button size="sm" type="submit" variant="outline">Submit note</Button>
                  </form>
                </Form>
                {showLoadingPreview && <LoadingScreen className="min-h-[120px] py-4" message="Syncing roster..." />}
              </div>

              <div className="rounded-md border border-border/50 p-3 space-y-3">
                <p className="text-sm font-medium">Chart primitives</p>
                <p className="text-xs text-muted-foreground">
                  Use `ui/chart` wrappers for dashboard trends and KPI visualizations.
                </p>
                <ChartContainer
                  className="h-36 w-full"
                  config={{
                    signups: { label: 'Signups', color: 'hsl(var(--chart-1))' },
                  }}
                >
                  <BarChart data={[{ day: 'Mon', signups: 4 }, { day: 'Tue', signups: 6 }, { day: 'Wed', signups: 5 }, { day: 'Thu', signups: 8 }, { day: 'Fri', signups: 7 }]}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="signups" name="signups" fill="var(--color-signups)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>

              <CodePreview code={CODE_EXAMPLES.advanced} />
            </GlowCard>
          </section>

          <section className="space-y-4">
            <SectionTitle
              id="patterns"
              title={t({ en: 'Guildforce patterns' })}
              description={t({ en: 'Domain-specific UI for player cards, wishes, rosters, and events.' })}
            />

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Page header</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Use PageHeader at the top of product pages to separate context, metadata, and primary actions from page content.' })}</p>
              <PageHeader
                icon={Users}
                title="Guild members"
                description="Roster cache, linked Guildforce profiles, ranks, and mains."
                meta={(
                  <>
                    <Badge variant="secondary">221 members</Badge>
                    <Badge variant="outline" className="border-healer/30 bg-healer/10 text-healer">83 linked players</Badge>
                  </>
                )}
                actions={<Button size="sm" variant="outline">Sync roster</Button>}
              />
              <CodePreview code={CODE_EXAMPLES.pageHeader} />
            </GlowCard>

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Contextual toolbar</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Use ContextualToolbar for filters, selectors, and secondary actions tied to the current page or roster. Keep navigation outside this area.' })}</p>
              <ContextualToolbar
                leading={<Input className="md:w-64" placeholder="Search players" />}
                trailing={<Button size="sm" variant="outline">Export CSV</Button>}
              >
                <Select defaultValue="all">
                  <SelectTrigger className="w-36" aria-label="Class filter"><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All classes</SelectItem><SelectItem value="healer">Healers</SelectItem></SelectContent>
                </Select>
                <Select defaultValue="linked">
                  <SelectTrigger className="w-40" aria-label="Profile filter"><SelectValue placeholder="Profiles" /></SelectTrigger>
                  <SelectContent><SelectItem value="linked">Linked profiles</SelectItem><SelectItem value="all">All players</SelectItem></SelectContent>
                </Select>
              </ContextualToolbar>
              <CodePreview code={CODE_EXAMPLES.toolbar} />
            </GlowCard>

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Guild workspace layout</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Authenticated pages use a minimal app topbar for app scope. GuildWorkspaceShell owns guild scope; PageHeader states page context; ContextualToolbar carries current-page actions. The page surface owns vertical scroll.' })}</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-border/50 bg-card/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">App shell</p>
                  <p className="mt-1 text-sm">The topbar is grouped: Brand, global navigation, compact command search, and user zone. GuildSwitcher is the strongest item because it anchors workspace context, but it stays inside the app chrome rather than the guild sidebar.</p>
                </div>
                <div className="rounded-md border border-border/50 bg-card/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Guild scope</p>
                  <p className="mt-1 text-sm">GuildWorkspaceShell uses two dedicated states: an expanded contextual sidebar at 272px, and a collapsed navigation rail at 72px. Expanded keeps the labeled reduce control at the bottom of the sidebar rhythm; rail mode gives the reclaimed width back to content immediately.</p>
                </div>
                <div className="rounded-md border border-border/50 bg-card/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rail rules</p>
                  <p className="mt-1 text-sm">Collapsed mode shows only the guild emblem, navigation icons, active indicators, and tooltips. Do not render guild names, GM badges, roster, season, status, or visible labels in the rail.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[272px_72px_minmax(0,1fr)]">
                <div className="rounded-md border border-border/50 bg-card/30 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Expanded</p>
                  <div className="mt-3 rounded-lg border border-border/50 bg-background/50 p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-primary/20" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">Guild identity</p>
                        <p className="truncate text-xs text-muted-foreground">Server - region</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="rounded bg-primary/15 px-2 py-1.5 text-foreground">Overview</div>
                      <div className="rounded px-2 py-1.5 text-muted-foreground">Roster</div>
                    </div>
                    <div className="mt-3 border-t border-border/40 pt-2 text-xs text-muted-foreground">Reduce</div>
                  </div>
                </div>
                <div className="rounded-md border border-border/50 bg-card/30 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rail</p>
                  <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-background/50 py-3">
                    <div className="h-11 w-11 rounded-2xl border border-border/50 bg-primary/10" />
                    <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/35">
                      <span className="absolute left-0 top-2 h-7 w-0.5 rounded-full bg-primary" />
                      <LayoutDashboard className="h-4 w-4" />
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-xl text-muted-foreground">
                      <TableIcon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-border/50 bg-card/30 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tooltip navigation</p>
                  <p className="mt-2 text-sm text-muted-foreground">Every rail icon must have a right-side tooltip. Active state uses a subtle glow, a primary ring, and a vertical indicator so the current section remains clear without labels.</p>
                </div>
              </div>
              <DoDont
                doText="Treat expanded and collapsed as separate layouts. Keep the expanded reduce control labeled at the bottom of the sidebar, and keep all rail labels in tooltips."
                dontText="Do not compress the expanded sidebar into the rail, render text in collapsed mode, or leave dead space after sidebar collapse."
              />
              <CodePreview code={CODE_EXAMPLES.workspace} />
            </GlowCard>

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Command palette</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Use the command palette as the primary global accelerator for navigation, contextual search, recents, and safe quick actions.' })}</p>
              <div className="rounded-md border border-border/50 bg-background/70 p-3">
                <Command shouldFilter={false} loop className="mx-auto max-w-xl overflow-hidden rounded-lg border border-border/60 bg-background/95 shadow-lg">
                  <div className="flex items-center gap-2 border-b border-border/45 pr-3">
                    <CommandInput aria-label="Design system command palette search" placeholder="Search Guildforce..." className="h-11" />
                    <kbd className="hidden rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">Ctrl K</kbd>
                  </div>
                  <CommandList className="max-h-none space-y-1 p-2">
                    <CommandGroup heading="Actions" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
                      <CommandItem value="create-poll" className="gap-3 rounded-md bg-primary/15 px-2.5 py-2 data-[selected=true]:bg-primary/15">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">Create poll</p>
                          <p className="truncate text-xs text-muted-foreground">Midnight - Tarren Mill</p>
                        </div>
                      </CommandItem>
                    </CommandGroup>
                    <CommandGroup heading="Members" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
                      <CommandItem value="elisara" className="gap-3 rounded-md px-2.5 py-2">
                        <div className="grid h-8 w-8 place-items-center rounded-lg border border-border/45 bg-card/35">
                          <User className="h-4 w-4 text-status-info" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">Elisara</p>
                          <p className="truncate text-xs text-muted-foreground">Holy Priest - Officer - Linked</p>
                        </div>
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Main</Badge>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                  <div className="flex items-center justify-between border-t border-border/45 px-3 py-2 text-[11px] text-muted-foreground">
                    <span>Up/Down navigate</span>
                    <span>Enter open</span>
                    <span>Esc close</span>
                  </div>
                </Command>
                <Drawer open={false} onOpenChange={() => undefined}>
                  <DrawerContent>
                    <DrawerTitle>Mobile command palette</DrawerTitle>
                  </DrawerContent>
                </Drawer>
              </div>
              <DoDont
                doText="Group results by intent, keep server ranking controlled with shouldFilter=false, and use a fullscreen or near-fullscreen drawer on mobile."
                dontText="Do not ship a flat decorative search box or actions that mutate data directly from the palette."
              />
              <CodePreview code={CODE_EXAMPLES.commandPalette} />
            </GlowCard>

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Empty state</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Empty states should explain the local state and expose the next valid action when one exists.' })}</p>
              <EmptyState
                icon={BookOpen}
                title="No active polls"
                description="Published polls appear here when your guild needs input."
                action={<Button size="sm">Create poll</Button>}
              />
              <CodePreview code={CODE_EXAMPLES.emptyState} />
            </GlowCard>

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Player profile card</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Structure: identity, main or alt badge, role tags, ilvl and recruitment tags.' })}</p>
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

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Wish priority and lock flow</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Show rank order, validation, and lock visibility at row level.' })}</p>
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
                      <TableCell><Badge className="bg-status-success/20 text-status-success">Approved</Badge></TableCell>
                      <TableCell><Lock className={cn("h-4 w-4", toneTextClass('warning'))} /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>#2</TableCell>
                      <TableCell>Mistweaver Monk</TableCell>
                      <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                      <TableCell><Clock3 className={cn("h-4 w-4", toneTextClass('info'))} /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <CodePreview code={CODE_EXAMPLES.wishes} />
            </GlowCard>

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Roster management panel</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Combine roster selector, filters, and bulk actions in one horizontal control area.' })}</p>
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
                  <Select defaultValue="all"><SelectTrigger aria-label="Filter by role"><SelectValue placeholder="All roles" /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem><SelectItem value="healer">Healer</SelectItem></SelectContent></Select>
                  <Select defaultValue="pending"><SelectTrigger aria-label="Filter by status"><SelectValue placeholder="Pending" /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem></SelectContent></Select>
                </div>
              </div>
            </GlowCard>

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Event attendance workflow</h3>
              <p className="text-sm text-muted-foreground">{t({ en: 'Attendance cards should expose status, role demand and confirmation controls.' })}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border-border/50 bg-card/60">
                  <CardHeader>
                    <CardTitle className="text-base">Mythic Raid - Wednesday</CardTitle>
                    <CardDescription>20:30 - 23:30 CET</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-healer/20 text-healer">2 healers needed</Badge>
                      <Badge className="border-tank/30 bg-tank/20 text-foreground">1 tank needed</Badge>
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
              title={t({ en: 'Guidelines' })}
              description={t({ en: 'Decision rules for consistency and baseline accessibility.' })}
            />

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Core do/don't</h3>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div className="rounded-md border border-border/60 p-3">
                  <p className="font-medium">Do</p>
                  <ul className="mt-2 list-disc pl-4 text-muted-foreground space-y-1">
                    <li>Use semantic badges for status (approved, pending, rejected).</li>
                    <li>Keep primary CTA unique within a card or panel.</li>
                    <li>Use one framed surface per functional group; keep nested frames for dialogs, list items, or tables only.</li>
                    <li>Spend page headers deliberately: skip them when sidebar, subnav, or toolbar already carries the context.</li>
                    <li>Use the full workspace width by default for guild overview, tables, polls, vault, and member operations.</li>
                    <li>Use plum for active or primary emphasis and gold for GM, premium, or high-importance accents.</li>
                    <li>Use full callout panels only for blocking alerts; prefer icon, tooltip, and screen-reader copy for contextual state.</li>
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

            <GlowCard surface="section" className="space-y-4 p-4">
              <h3 className="text-base font-medium">Accessibility baseline</h3>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div className="rounded-md border border-border/60 p-3 space-y-2">
                  <p className="font-medium">Contrast and focus</p>
                  <p className="text-muted-foreground">Use readable text over glass backgrounds and preserve visible focus ring.</p>
                  <Button variant="outline">Keyboard focus sample</Button>
                </div>
                <div className="rounded-md border border-border/60 p-3 space-y-2">
                  <p className="font-medium">Labels and state copy</p>
                  <Label htmlFor="a11y-sample">Raid note</Label>
                  <Input id="a11y-sample" placeholder="Explain the decision" />
                  <p className="text-xs text-muted-foreground">Error and success states should include text, not icon-only feedback.</p>
                </div>
              </div>
              <div className={cn("rounded-md border p-3 text-sm", toneCalloutClass('info'))}>
                <div className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Maintenance note</div>
                <p className={cn("mt-1 opacity-90", toneTextClass('info'))}>When new components or patterns are introduced, update this page in the same PR to keep design and implementation aligned.</p>
              </div>
            </GlowCard>
          </section>

          <GlowCard surface="section" className="p-4">
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-medium">{t({ en: 'Documentation shortcut in admin' })}</p>
              <p className="text-muted-foreground">{t({ en: 'Use this entry inside Admin Documentation to access the global design system route.' })}</p>
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link to="/admin/design-system">
                  <BookOpen className="mr-2 h-4 w-4" />
                  {t({ en: 'Open /admin/design-system' })}
                </Link>
              </Button>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
};
