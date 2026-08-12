import React, { useState } from 'react';
import classNames from 'classnames';
import {
  Palette,
  Type,
  Ruler,
  Sparkles,
  MousePointerClick,
  Layout,
  FileText,
  LayoutGrid,
  Bell,
  MoreHorizontal,
  Wallet,
  LayoutDashboard,
  Menu,
  Sun,
  Moon,
  ArrowRight,
  Scale,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { Checkbox } from '../../components/ui/Checkbox';
import { Switch } from '../../components/ui/Switch';
import { SearchInput } from '../../components/ui/SearchInput';
import { WalletButton } from '../../components/ui/WalletButton';
import { ActionMenuPortal } from '../../components/ui/ActionMenuPortal';
import { useNotification } from '../../components/ui/NotificationSystem';
import { Modal } from '../../components/ui/Modal';
import { Logo } from '../../components/ui/Logo';

/* ─────────────────────────── Shared helpers ─────────────────────────── */

const Section: React.FC<{
  id: string;
  index: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  children: React.ReactNode;
}> = ({ id, index, title, subtitle, icon: Icon, children }) => (
  <section id={id} className="scroll-mt-44 mb-20">
    <div className="flex items-start gap-4 mb-8">
      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-md-secondary-container text-md-primary flex items-center justify-center shadow-sm">
        <Icon size={24} />
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-md-on-surface-variant/60 mb-1">
          Section {String(index).padStart(2, '0')}
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
        <p className="text-md-on-surface-variant mt-1 max-w-2xl">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
);

const DemoCard: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className,
}) => (
  <div className={classNames("bg-md-surface-container rounded-xl shadow-sm transition-shadow duration-300 hover:shadow-md", className)}>
    <div className="px-5 py-4 border-b border-md-outline/10">
      <div className="text-sm font-semibold">{label}</div>
      {hint && <div className="text-xs text-md-on-surface-variant mt-1">{hint}</div>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const PillDivider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-3 my-8">
    <div className="h-px flex-1 bg-md-outline/15" />
    <span className="text-xs font-semibold uppercase tracking-widest text-md-on-surface-variant/70">{children}</span>
    <div className="h-px flex-1 bg-md-outline/15" />
  </div>
);

/* ─────────────────────────── Token data ─────────────────────────── */

interface ColorToken {
  name: string;
  hex: string;
  dark: string;
  bgClass: string;
  fgClass: string;
  group: string;
}

const COLOR_TOKENS: ColorToken[] = [
  { name: 'md-background', hex: '#FFFBFE', dark: '#141218', bgClass: 'bg-[#FFFBFE]', fgClass: 'text-[#1C1B1F]', group: 'Surfaces' },
  { name: 'md-surface-container', hex: '#F3EDF7', dark: '#211F26', bgClass: 'bg-[#F3EDF7]', fgClass: 'text-[#1C1B1F]', group: 'Surfaces' },
  { name: 'md-surface-container-low', hex: '#E7E0EC', dark: '#1D1B20', bgClass: 'bg-[#E7E0EC]', fgClass: 'text-[#1C1B1F]', group: 'Surfaces' },
  { name: 'md-primary', hex: '#6750A4', dark: '#D0BCFF', bgClass: 'bg-[#6750A4]', fgClass: 'text-white', group: 'Primary' },
  { name: 'md-on-primary', hex: '#FFFFFF', dark: '#381E72', bgClass: 'bg-[#FFFFFF]', fgClass: 'text-[#1C1B1F]', group: 'Primary' },
  { name: 'md-secondary-container', hex: '#E8DEF8', dark: '#4A4458', bgClass: 'bg-[#E8DEF8]', fgClass: 'text-[#1D192B]', group: 'Primary' },
  { name: 'md-on-secondary-container', hex: '#1D192B', dark: '#E8DEF8', bgClass: 'bg-[#1D192B]', fgClass: 'text-white', group: 'Primary' },
  { name: 'md-tertiary', hex: '#7D5260', dark: '#EFB8C8', bgClass: 'bg-[#7D5260]', fgClass: 'text-white', group: 'Primary' },
  { name: 'md-outline', hex: '#79747E', dark: '#938F99', bgClass: 'bg-[#79747E]', fgClass: 'text-white', group: 'Neutrals' },
  { name: 'md-on-surface', hex: '#1C1B1F', dark: '#E6E0E9', bgClass: 'bg-[#1C1B1F]', fgClass: 'text-white', group: 'Neutrals' },
  { name: 'md-on-surface-variant', hex: '#49454F', dark: '#CAC4D0', bgClass: 'bg-[#49454F]', fgClass: 'text-white', group: 'Neutrals' },
  { name: 'md-success', hex: '#E4F4E5', dark: '#A3D9A5', bgClass: 'bg-[#E4F4E5]', fgClass: 'text-[#0D3A11]', group: 'State' },
  { name: 'md-on-success', hex: '#0D3A11', dark: '#0D3A11', bgClass: 'bg-[#0D3A11]', fgClass: 'text-white', group: 'State' },
  { name: 'md-error', hex: '#F9DEDC', dark: '#F2B8B5', bgClass: 'bg-[#F9DEDC]', fgClass: 'text-[#410E0B]', group: 'State' },
  { name: 'md-on-error', hex: '#410E0B', dark: '#8C1D18', bgClass: 'bg-[#410E0B]', fgClass: 'text-white', group: 'State' },
  { name: 'md-warning', hex: '#FFEFD6', dark: '#EFB008', bgClass: 'bg-[#FFEFD6]', fgClass: 'text-[#3C2900]', group: 'State' },
  { name: 'md-on-warning', hex: '#3C2900', dark: '#3C2900', bgClass: 'bg-[#3C2900]', fgClass: 'text-white', group: 'State' },
];

const RADIUS_TOKENS = [
  { name: 'xs', value: '8px', class: 'rounded-xs' },
  { name: 'sm', value: '12px', class: 'rounded-sm' },
  { name: 'md', value: '16px', class: 'rounded-md' },
  { name: 'lg', value: '28px', class: 'rounded-xl' },
  { name: 'xl', value: '28px', class: 'rounded-xl' },
  { name: '2xl', value: '32px', class: 'rounded-2xl' },
  { name: '3xl', value: '48px', class: 'rounded-3xl' },
  { name: 'full', value: '9999px', class: 'rounded-full' },
];

const ELEVATION_TOKENS = [
  { name: 'none', class: 'shadow-none' },
  { name: 'sm', class: 'shadow-sm' },
  { name: 'md', class: 'shadow-md' },
  { name: 'lg', class: 'shadow-lg' },
  { name: 'xl', class: 'shadow-xl' },
];

const BUTTON_VARIANTS = ['filled', 'animated-primary', 'tonal', 'secondary', 'combined', 'outlined', 'danger', 'text'] as const;

const STATUS_BADGES: { label: string; bg: string; fg: string; dot: string }[] = [
  { label: 'Registered', bg: 'bg-[#e3f2fd]', fg: 'text-[#0b5b8c]', dot: 'bg-[#0b5b8c]' },
  { label: 'Valuation', bg: 'bg-[#fff3e0]', fg: 'text-[#a8600b]', dot: 'bg-[#a8600b]' },
  { label: 'Approved', bg: 'bg-[#e6f4ea]', fg: 'text-[#1e7b4a]', dot: 'bg-[#1e7b4a]' },
  { label: 'Pending', bg: 'bg-[#fef7e0]', fg: 'text-[#8d6e00]', dot: 'bg-[#8d6e00]' },
  { label: 'Rejected', bg: 'bg-[#fce8e6]', fg: 'text-[#b3261e]', dot: 'bg-[#b3261e]' },
  { label: 'Offer', bg: 'bg-md-secondary-container', fg: 'text-[#4d3a7a]', dot: 'bg-[#4d3a7a]' },
  { label: 'Closed', bg: 'bg-[#e8e0ec]', fg: 'text-md-on-surface-variant', dot: 'bg-md-on-surface-variant' },
];

const NAV_SECTIONS = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'radius', label: 'Radius & Elevation' },
  { id: 'motion', label: 'Motion' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'cards', label: 'Cards' },
  { id: 'forms', label: 'Forms' },
  { id: 'overlay', label: 'Overlay & Modal' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'menu', label: 'Action Menu' },
  { id: 'wallet', label: 'Wallet Button' },
  { id: 'patterns', label: 'Dashboard Patterns' },
  { id: 'navbar', label: 'Navbar' },
];

const SAMPLE_ROWS = [
  { id: 'CASE-1023', title: 'Kelantan Longhouse Plot 4', owner: 'Ahmad bin Osman', status: 'Approved', amount: 'RM 84,200' },
  { id: 'CASE-1045', title: 'Kelantan Rice Field Lot 7', owner: 'Nurul Aisyah', status: 'Pending', amount: 'RM 132,500' },
  { id: 'CASE-1071', title: 'Terengganu Residential Unit 2', owner: 'Mohd Faizal', status: 'Rejected', amount: 'RM 58,900' },
  { id: 'CASE-1088', title: 'Perak Commercial Lot 12', owner: 'Siti Aminah', status: 'Registered', amount: 'RM 96,300' },
];

/* ─────────────────────────── Page ─────────────────────────── */

export const DesignSystem: React.FC = () => {
  const { notify } = useNotification();
  const [isDark, setIsDark] = useState<boolean>(() => document.documentElement.classList.contains('dark'));
  const [modalOpen, setModalOpen] = useState(false);
  const [scrollModalOpen, setScrollModalOpen] = useState(false);
  const [modalInput, setModalInput] = useState('Persistent draft content');
  const [menuOpen, setMenuOpen] = useState(false);

  // Controlled form demo state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    message: '',
    status: 'active',
    state: 'selangor',
    method: 'email',
    subscribe: true,
    notify: true,
  });

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('admin_theme', next ? 'dark' : 'light');
    setIsDark(next);
  };

  const colorGroups = ['Surfaces', 'Primary', 'Neutrals', 'State'];

  return (
    <div className="relative overflow-x-hidden">
      {/* === Hero Banner === */}
      <section className="relative px-4 md:px-8 pb-4">
        <div className="relative bg-md-surface-container rounded-3xl p-8 md:p-16 overflow-hidden shadow-sm">
          <div className="md-blur-shape w-[450px] h-[450px] bg-md-primary/30 top-0 left-0 -translate-x-1/3 -translate-y-1/3"></div>
          <div className="md-blur-shape w-[400px] h-[400px] bg-md-secondary-container/80 bottom-0 right-0 translate-x-1/4 translate-y-1/4"></div>
          <div className="md-blur-shape w-[350px] h-[350px] bg-md-tertiary/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-md-secondary-container text-md-on-secondary-container text-sm font-medium mb-6">
              <Sparkles size={16} />
              Material You · Material Design 3
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Smart Contract Resettlement Design&nbsp;System
            </h1>
            <p className="text-lg md:text-xl text-md-on-surface-variant mb-10 max-w-2xl">
              A live, read-only showcase of current interface standards — 28px rounded-xl controls and cards,
              universal GSAP shimmer buttons, dark-mode adapted surfaces, and clean dashboard primitives.
            </p>
            <div className="flex flex-wrap gap-4 hero-actions">
              <Button size="lg" className="gap-2">
                Explore Standards <ArrowRight size={20} />
              </Button>
              <Button variant="tonal" size="lg" onClick={() =>
                window.scrollTo({ top: document.getElementById('colors')?.offsetTop ?? 0, behavior: 'smooth' })}>
                Jump to Colors
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* === Sticky in-page navigation === */}
      <div className="sticky top-20 z-40 px-4 md:px-8 py-4 bg-md-background/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 rounded-full">
          {NAV_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium text-md-on-surface-variant hover:text-md-primary hover:bg-md-secondary-container/60 transition-colors duration-200"
            >
              {s.label}
            </a>
          ))}
          <button
            type="button"
            onClick={toggleTheme}
            className="ml-auto flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-md-secondary-container text-md-on-secondary-container text-sm font-medium hover:scale-105 active:scale-95 transition-transform duration-300 ease-md-bouncy"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10">
        {/* === Colors === */}
        <Section id="colors" index={1} title="Color Tokens" subtitle="The MD3 palette. Seeds from #6750A4 (purple). Defined as CSS variables in index.css and mapped in tailwind.config.js. All surfaces are tinted — never pure white." icon={Palette}>
          {colorGroups.map((group) => (
            <div key={group} className="mb-8">
              <div className="text-xs font-bold uppercase tracking-widest text-md-on-surface-variant/70 mb-3">{group}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {COLOR_TOKENS.filter((t) => t.group === group).map((t) => (
                  <div key={t.name} className="bg-md-background rounded-xl border border-md-outline/15 overflow-hidden shadow-sm">
                    <div className={classNames("h-20 flex items-end px-3 py-2", t.bgClass)}>
                      <span className={classNames("text-[11px] font-mono font-medium opacity-90", t.fgClass)}>{t.hex}</span>
                    </div>
                    <div className="p-3">
                      <div className="font-mono text-xs font-semibold">{t.name}</div>
                      <div className="text-[11px] text-md-on-surface-variant mt-1">
                        light <span className="font-mono">{t.hex}</span> · dark <span className="font-mono">{t.dark}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {/* === Typography === */}
        <Section id="typography" index={2} title="Typography" subtitle="Roboto, imported via Google Fonts. Medium (500) and bold (700) heads, regular (400) body. Tight leading, generous weight contrast." icon={Type}>
          <DemoCard label="Type Scale" hint="Toggle dark mode above to see the tonal surfaces adapt.">
            <div className="space-y-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 mb-1 font-semibold">Display · text-5xl md:text-6xl · font-bold</div>
                <div className="text-5xl md:text-6xl font-bold leading-tight">Fair Compensation</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 mb-1 font-semibold">Heading 1 · text-4xl · font-bold</div>
                <div className="text-4xl font-bold">Resettlement Smart Contract</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 mb-1 font-semibold">Heading 2 · text-3xl · font-bold</div>
                <div className="text-3xl font-bold">Core System Modules</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 mb-1 font-semibold">Heading 3 · text-2xl · font-bold</div>
                <div className="text-2xl font-bold">Case Registration</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 mb-1 font-semibold">Heading 4 · text-lg · font-semibold</div>
                <div className="text-lg font-semibold">The Resettlement Process</div>
              </div>
              <div className="pt-4 border-t border-md-outline/10">
                <div className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 mb-1 font-semibold">Body Large · text-lg</div>
                <p className="text-lg text-md-on-surface-variant">A transparent, secure, and AI-driven smart contract system designed to support equitable land acquisition.</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 mb-1 font-semibold">Body · text-base</div>
                <p className="text-base text-md-on-surface-variant">All pages are rendered within the global Layout wrapper, which provides the auto-hiding navbar and global footer.</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 mb-1 font-semibold">Caption · text-sm</div>
                <p className="text-sm text-md-on-surface-variant">Uses md-on-surface-variant for secondary text and metadata.</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 mb-1 font-semibold">Overline / Label · text-xs · uppercase</div>
                <div className="text-xs font-semibold uppercase tracking-widest text-md-on-surface-variant">Core System Modules</div>
              </div>
              <div className="pt-4 border-t border-md-outline/10">
                <div className="text-xs uppercase tracking-widest text-md-on-surface-variant/60 mb-1 font-semibold">Code / Mono · font-mono · text-sm</div>
                <div className="font-mono text-sm bg-md-surface-container-low rounded px-2 py-1 inline-block">0x71C7656EC7ab88b098defB751B7401B5f6d8976F</div>
              </div>
            </div>
          </DemoCard>
        </Section>

        {/* === Radius & Elevation === */}
        <Section id="radius" index={3} title="Border Radius & Elevation" subtitle="Standard card & container radius is rounded-xl (28px). Elevation provides depth across surface tiers." icon={Ruler}>
          <div className="grid md:grid-cols-2 gap-6">
            <DemoCard label="Radius Ladder" hint="Standard cards, inputs, and modals use rounded-xl (28px).">
              <div className="flex items-end gap-4 flex-wrap">
                {RADIUS_TOKENS.map((r) => (
                  <div key={r.name} className="flex flex-col items-center gap-2">
                    <div className={classNames("w-16 h-16 bg-md-secondary-container border border-md-outline/20", r.class)} />
                    <div className="text-center">
                      <div className="font-mono text-xs font-semibold">{r.name}</div>
                      <div className="text-[11px] text-md-on-surface-variant">{r.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </DemoCard>
            <DemoCard label="Elevation Shadows" hint="Hover any surface to feel the shadow-sm → shadow-md reveal.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {ELEVATION_TOKENS.map((e) => (
                  <div key={e.name} className={classNames("bg-md-surface-container rounded-xl p-6 flex items-center justify-center transition-shadow duration-300 hover:shadow-md", e.class)}>
                    <span className="text-xs font-mono font-semibold text-md-on-surface-variant">{e.name}</span>
                  </div>
                ))}
              </div>
            </DemoCard>
          </div>
        </Section>

        {/* === Motion === */}
        <Section id="motion" index={4} title="Motion & Easing" subtitle="Micro-interaction motion standard is md-bouncy (cubic-bezier(0.34, 1.56, 0.64, 1))." icon={Sparkles}>
          <DemoCard label="md-bouncy" hint="cubic-bezier(0.34, 1.56, 0.64, 1) · the standard for hover, press, and loading.">
            <div className="w-full h-32 bg-md-secondary-container rounded-xl flex items-center justify-center transition-transform duration-300 ease-md-bouncy hover:scale-105 active:scale-95 cursor-pointer">
              <span className="font-medium text-md-on-secondary-container">Hover / press me to feel md-bouncy scale</span>
            </div>
          </DemoCard>
        </Section>

        {/* === Buttons === */}
        <Section id="buttons" index={5} title="Buttons" subtitle="Pill-shaped across variants with universal continuous GSAP shimmer sweep bar and bouncy hover scale. FAB is rounded-2xl." icon={MousePointerClick}>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {BUTTON_VARIANTS.map((v) => (
              <DemoCard key={v} label={v} hint={BUTTON_VARIANT_HINTS[v]}>
                <div className="flex flex-col items-start gap-3 flex-wrap">
                  <Button variant={v} size="sm">Small ({v})</Button>
                  <Button variant={v} size="md">Medium ({v})</Button>
                  <Button variant={v} size="lg">Large ({v})</Button>
                </div>
              </DemoCard>
            ))}
          </div>

          <DemoCard label="Loading & FAB" hint="isLoading swaps the label for a spinner and locks the cursor to wait.">
            <div className="flex flex-wrap items-center gap-6">
              <Button variant="filled" isLoading size="md">Loading</Button>
              <Button variant="danger" size="md">Danger CTA</Button>
              <div className="flex items-center gap-3">
                <Button variant="fab" title="Floating Action Button"><Scale size={24} /></Button>
                <span className="text-xs text-md-on-surface-variant">FAB · rounded-2xl · md-tertiary</span>
              </div>
            </div>
          </DemoCard>

          <DemoCard
            label="Disabled — same skin, colour drained"
            hint="Disabled keeps each variant's own fill, border, elevation and ghosting, then applies grayscale + 60% opacity. Outlined keeps its border; text stays a ghost with no grey box. No hover tint, no shimmer, no bounce — only cursor-not-allowed."
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
              {([
                ['filled', 'Filled'],
                ['tonal', 'Tonal'],
                ['outlined', 'Outlined'],
                ['danger', 'Danger'],
                ['text', 'Text'],
              ] as const).map(([variant, name]) => (
                <div key={variant} className="flex flex-col gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-md-on-surface-variant">{name}</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button variant={variant} size="md">Enabled</Button>
                    <Button variant={variant} size="md" disabled>Disabled</Button>
                  </div>
                </div>
              ))}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-wide text-md-on-surface-variant">FAB</span>
                <div className="flex items-center gap-3">
                  <Button variant="fab" title="Enabled FAB"><Scale size={24} /></Button>
                  <Button variant="fab" disabled title="Disabled FAB"><Scale size={24} /></Button>
                </div>
              </div>
            </div>
          </DemoCard>
        </Section>

        {/* === Cards === */}
        <Section id="cards" index={6} title="Cards" subtitle="Rounded-xl (28px) radius, md-surface-container fill. Interactive cards elevate and tint on hover. Pointer cursor applies only when clickable or onClick is present." icon={Layout}>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card elevation="sm">
              <h4 className="text-lg font-bold mb-2">Default Card</h4>
              <p className="text-sm text-md-on-surface-variant">Interactive by default (lifts & tints on hover), normal cursor (non-clickable).</p>
            </Card>
            <Card clickable elevation="sm" onClick={() => notify({ type: 'general', title: 'Clickable Card', message: 'Card clicked!' })}>
              <h4 className="text-lg font-bold mb-2">Clickable Card</h4>
              <p className="text-sm text-md-on-surface-variant">Clickable card with explicit onClick handler — shows pointer cursor on hover.</p>
            </Card>
            <Card elevation="md">
              <h4 className="text-lg font-bold mb-2">Elevation md</h4>
              <p className="text-sm text-md-on-surface-variant">Use elevated cards for elements that need to read as raised above the canvas.</p>
            </Card>
            <Card elevation="lg">
              <h4 className="text-lg font-bold mb-2">Elevation lg</h4>
              <p className="text-sm text-md-on-surface-variant">Stronger shadow for emphasis within denser layouts.</p>
            </Card>
            <Card elevation="xl">
              <h4 className="text-lg font-bold mb-2">Elevation xl</h4>
              <p className="text-sm text-md-on-surface-variant">Highest shadow tier — reserved for overlays and hero surfaces.</p>
            </Card>
            <Card elevation="none">
              <h4 className="text-lg font-bold mb-2">Elevation none</h4>
              <p className="text-sm text-md-on-surface-variant">Flat card that relies on the tonal surface for separation.</p>
            </Card>
          </div>
        </Section>

        {/* === Forms === */}
        <Section id="forms" index={7} title="Form Controls" subtitle="Inputs and textareas keep all 4 corners rounded-xl (28px); dropdowns square off their bottom corners while open so the list joins the field. px-5 padding sitting inside the pill, border md-outline/30 focus md-primary." icon={FileText}>
          <div className="grid lg:grid-cols-2 gap-6">
            <DemoCard label="Inputs & Select (rounded-xl 28px)">
              <div className="space-y-5">
                <Input
                  label="Full Name"
                  placeholder="e.g. Ahmad bin Osman"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(status) => setForm({ ...form, status })}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'closed', label: 'Closed' },
                  ]}
                />
              </div>
            </DemoCard>

            <div className="space-y-6">
              <DemoCard label="Textarea">
                <Textarea
                  label="Message"
                  placeholder="Add a note…"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </DemoCard>

              <DemoCard label="Search Input" hint="Pill-shaped with a bouncy GSAP expand on focus; the icon turns md-primary.">
                <SearchInput
                  placeholder="Search cases, payments, reports…"
                  containerClassName="max-w-sm"
                />
              </DemoCard>
            </div>
          </div>

          <DemoCard
            label="Dropdown — squared bottom corners"
            hint="Open one: the field's bottom corners square off and the MD3 panel hangs seamlessly off it, square on all four corners. Closed, the field returns to a full 28px pill. Flips above the field near the viewport bottom; long lists scroll at 280px. Keyboard: ↑↓, Home/End, Enter, Esc, type-ahead."
            className="mt-6"
          >
            <div className="grid sm:grid-cols-3 gap-6">
              <Select
                label="State"
                value={form.state}
                onChange={(state) => setForm({ ...form, state })}
                options={[
                  { value: 'johor', label: 'Johor' },
                  { value: 'kedah', label: 'Kedah' },
                  { value: 'kelantan', label: 'Kelantan' },
                  { value: 'melaka', label: 'Melaka' },
                  { value: 'nsembilan', label: 'Negeri Sembilan' },
                  { value: 'pahang', label: 'Pahang' },
                  { value: 'penang', label: 'Penang' },
                  { value: 'perak', label: 'Perak' },
                  { value: 'perlis', label: 'Perlis' },
                  { value: 'sabah', label: 'Sabah' },
                  { value: 'sarawak', label: 'Sarawak' },
                  { value: 'selangor', label: 'Selangor' },
                  { value: 'terengganu', label: 'Terengganu' },
                ]}
              />
              <Select
                label="Unselected"
                value=""
                onChange={() => {}}
                placeholder="Choose a project type…"
                options={[
                  { value: 'highway', label: 'Highway' },
                  { value: 'rail', label: 'Rail' },
                  { value: 'utility', label: 'Utility' },
                ]}
              />
              <Select
                label="Disabled"
                value="locked"
                disabled
                options={[{ value: 'locked', label: 'Locked by workflow' }]}
              />
            </div>
          </DemoCard>

          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <DemoCard label="Selection Controls">
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-medium mb-3 text-md-on-surface-variant">Radio Group — horizontal</div>
                  <RadioGroup
                    name="contactMethod"
                    orientation="horizontal"
                    value={form.method}
                    onChange={(val) => setForm({ ...form, method: val })}
                    options={[
                      { value: 'email', label: 'Email' },
                      { value: 'phone', label: 'Phone' },
                      { value: 'post', label: 'Post' },
                    ]}
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-3 text-md-on-surface-variant">Radio Group — vertical</div>
                  <RadioGroup
                    name="priority"
                    value="high"
                    options={[
                      { value: 'low', label: 'Low priority' },
                      { value: 'medium', label: 'Medium priority' },
                      { value: 'high', label: 'High priority' },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <Checkbox
                    label="I consent to the processing of my data."
                    checked={form.subscribe}
                    onChange={(e) => setForm({ ...form, subscribe: e.target.checked })}
                  />
                  <Checkbox checked={false} label="Unchecked example" />
                  <Checkbox checked disabled label="Disabled" />
                </div>
              </div>
            </DemoCard>

            <DemoCard label="Switches & Standard Form Submit Row">
              <div className="space-y-5">
                <div className="flex flex-col gap-3 pt-1">
                  <Switch
                    label="Push notifications"
                    checked={form.notify}
                    onChange={(e) => setForm({ ...form, notify: e.target.checked })}
                  />
                  <Switch checked={false} label="Optional setting" />
                  <Switch checked disabled label="Disabled" />
                </div>
                <PillDivider>Form Submit Row</PillDivider>
                <div className="flex justify-end gap-3">
                  <Button variant="text" type="button">Cancel</Button>
                  <Button variant="filled" type="button">Submit</Button>
                </div>
                <p className="text-xs text-md-on-surface-variant">Standard submit row: [ Cancel (text) ] on left, [ Submit (filled) ] on right.</p>
              </div>
            </DemoCard>
          </div>
        </Section>

        {/* === Overlay & Modal === */}
        <Section id="overlay" index={8} title="Overlay & Modal" subtitle="Portal to document.body, GSAP pop-in (~0.28s back.out), persistent mounted content across close/reopen. The body is the only scroller, so headers and footers stay pinned no matter how tall the content gets." icon={LayoutGrid}>
          <div className="grid md:grid-cols-2 gap-6">
            <DemoCard label="Overlay / Backdrop" hint="rgba(0,0,0,0.6) + backdrop-blur(4px), covering 100vw/100vh.">
              <div className="relative rounded-xl overflow-hidden border border-md-outline/20 h-56">
                <div className="absolute inset-0 grid grid-cols-2 gap-2 p-3 pointer-events-none">
                  <div className="rounded-xl bg-md-secondary-container/50" />
                  <div className="rounded-xl bg-md-primary/20" />
                  <div className="rounded-xl bg-md-tertiary/20" />
                  <div className="rounded-xl bg-md-success/60" />
                </div>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="w-full max-w-[240px] bg-md-surface-container rounded-xl p-4 shadow-2xl">
                    <div className="font-semibold text-sm mb-1">GSAP Pop-In Modal</div>
                    <div className="text-xs text-md-on-surface-variant">z-index 99999 · 28px rounded-xl · persistent content.</div>
                  </div>
                </div>
              </div>
            </DemoCard>

            <DemoCard label="Live Standard Modal Demo" hint="Try typing into the modal input, closing via overlay, and reopening — data persists!">
              <div className="flex flex-col items-start gap-4 h-56 justify-center">
                <Button variant="filled" size="md" onClick={() => setModalOpen(true)}>
                  Open Standard Modal
                </Button>
                <p className="text-xs text-md-on-surface-variant">Uses new ui/Modal with GSAP pop-in and persistent state.</p>
              </div>
            </DemoCard>
          </div>

          <DemoCard
            label="Scrollable Modal — content taller than the panel"
            hint="Header and footer stay pinned while only the body scrolls. A hairline plus a 24px fade arms under the header once you scroll down, and above the footer while content remains below — both disappear at the ends. Short content renders with no dividers at all."
            className="mt-6"
          >
            <div className="flex flex-col items-start gap-4">
              <Button variant="filled" size="md" onClick={() => setScrollModalOpen(true)}>
                Open Scrollable Modal
              </Button>
              <p className="text-xs text-md-on-surface-variant">
                Panel is capped at 85vh · body is the only scroller · 8px tonal scrollbar tracks the panel edge.
              </p>
            </div>
          </DemoCard>
        </Section>

        {/* === Notifications === */}
        <Section id="notifications" index={9} title="Notifications" subtitle="Stacked toasts slide in from the right with a bounce, auto-dismiss after 3s. Soft pastel state colors avoid harsh contrast." icon={Bell}>
          <DemoCard label="Trigger Toasts" hint="Powered by the global NotificationProvider in main.tsx.">
            <div className="flex flex-wrap gap-4">
              <Button variant="tonal" onClick={() =>
                notify({ type: 'success', title: 'Success', message: 'Payment authorised and recorded on the ledger.' })}>
                Success Toast
              </Button>
              <Button variant="outlined" onClick={() =>
                notify({ type: 'error', title: 'Error', message: 'This case does not match the required status.' })}>
                Error Toast
              </Button>
              <Button variant="text" onClick={() =>
                notify({ type: 'general', title: 'General notice', message: 'You have 12 pending items awaiting review.' })}>
                General Toast
              </Button>
            </div>
          </DemoCard>
        </Section>

        {/* === Action Menu === */}
        <Section id="menu" index={10} title="Action Menu" subtitle="Overflow menu portal anchored to trigger, with dimmer border (md-outline/30) and divider (md-surface-container-low/60)." icon={MoreHorizontal}>
          <DemoCard label="ActionMenuPortal" hint="min-width 160px, 16px radius, dimmer border opacity.">
            <div className="flex items-center gap-8 p-4 rounded-xl bg-md-surface-container-low/60 border border-md-outline/10 w-fit">
              <span className="text-sm text-md-on-surface-variant">Row #CASE-1023</span>
              <ActionMenuPortal
                isOpen={menuOpen}
                onToggle={() => setMenuOpen((o) => !o)}
                onClose={() => setMenuOpen(false)}
                actions={[
                  { label: 'View Details', onClick: () => notify({ type: 'general', title: 'View Details' }) },
                  { label: 'Initiate Transfer', onClick: () => notify({ type: 'general', title: 'Initiate Transfer' }) },
                  { label: 'Mark as Failed', onClick: () => notify({ type: 'error', title: 'Marked as Failed' }) },
                ]}
              />
            </div>
          </DemoCard>
        </Section>

        {/* === Wallet Button === */}
        <Section id="wallet" index={11} title="Wallet Button" subtitle="3D flip on hover reveals auto-truncated wallet address (first6...last4); clicking copies full address to clipboard." icon={Wallet}>
          <DemoCard label="WalletButton" hint="Accepts full address, displays truncated address on back, copies full address.">
            <div className="flex items-center gap-8 flex-wrap">
              <WalletButton adminId="Admin" walletAddress="0x71C7656EC7ab88b098defB751B7401B5f6d8976F" />
              <span className="text-xs text-md-on-surface-variant">Hover to flip · click to copy full address</span>
            </div>
          </DemoCard>
        </Section>

        {/* === Dashboard Patterns === */}
        <Section id="patterns" index={12} title="Dashboard Patterns" subtitle="Recurring admin module primitives: stat cards, status badges, filtered tables, steppers and pagination." icon={LayoutDashboard}>
          <div className="space-y-6">
            <DemoCard label="Stat Cards" hint="sm shadow, hover lifts to md. Positive/negative deltas use soft state color chips.">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Pending Authorisations', value: '128', change: '+12%' },
                  { label: 'Failed Transfers', value: '7', change: '-3%', negative: true },
                  { label: 'Total Payment Cases', value: '1,942', change: '+8%' },
                ].map((s) => (
                  <div key={s.label} className="bg-md-surface-container rounded-xl p-5 shadow-sm transition-all duration-300 ease-md-bouncy hover:shadow-md hover:scale-[1.01]">
                    <div className="text-[13px] font-medium text-md-on-surface-variant tracking-wide">{s.label}</div>
                    <div className="text-3xl font-bold mt-1 tracking-tight">{s.value}</div>
                    <span className={classNames(
                      "inline-flex items-center gap-1 text-xs font-semibold mt-2 pl-1.5 pr-2.5 py-0.5 rounded-full",
                      s.negative ? "bg-md-error text-md-on-error" : "bg-md-success text-md-on-success"
                    )}>
                      <ArrowRight size={12} className={s.negative ? "rotate-180" : ""} />
                      {s.change}
                    </span>
                  </div>
                ))}
              </div>
            </DemoCard>

            <DemoCard label="Status Badges" hint="Pill badges with a colored dot — from case_management.css.">
              <div className="flex flex-wrap gap-3">
                {STATUS_BADGES.map((b) => (
                  <span key={b.label} className={classNames("inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-3.5 text-xs font-semibold", b.bg, b.fg)}>
                    <span className={classNames("w-2 h-2 rounded-full", b.dot)} />
                    {b.label}
                  </span>
                ))}
              </div>
            </DemoCard>

            <DemoCard label="Data Table" hint="Surface-container wrap, uppercase micro-labels, tinted header row.">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Case</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Beneficiary</th>
                      <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-md-on-surface-variant">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_ROWS.map((r) => {
                      const badge = STATUS_BADGES.find((b) => b.label === r.status)!;
                      return (
                        <tr key={r.id} className="border-t border-md-outline/10 hover:bg-md-primary/5 transition-colors">
                          <td className="px-4 py-3 font-semibold text-md-primary text-[13px]">{r.id}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{r.title}</div>
                            <div className="text-xs text-md-on-surface-variant">{r.owner}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={classNames("inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2 pr-3 text-xs font-semibold", badge.bg, badge.fg)}>
                              <span className={classNames("w-2 h-2 rounded-full", badge.dot)} />
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{r.amount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </DemoCard>

            <DemoCard label="Stepper & Pagination" hint="Stepper for multi-step registration; circular page buttons with an md-primary active page.">
              <div className="mb-10">
                <div className="relative flex justify-between">
                  <div className="absolute top-5 left-0 right-0 h-[3px] bg-md-outline opacity-20" />
                  {[
                    { label: 'Owner Info', state: 'complete' },
                    { label: 'Asset Valuation', state: 'active' },
                    { label: 'Compensation', state: 'pending' },
                    { label: 'Payment', state: 'pending' },
                  ].map((step) => (
                    <div key={step.label} className="flex flex-col items-center flex-1 relative">
                      <div className={classNames(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 border-[3px] mb-2",
                        step.state === 'active' && "bg-md-primary text-md-on-primary border-md-primary shadow-[0_0_0_4px_rgba(103,80,164,0.2)]",
                        step.state === 'complete' && "bg-md-primary text-md-on-primary border-md-primary",
                        step.state === 'pending' && "bg-md-surface-container-low text-md-on-surface-variant border-md-outline"
                      )}>
                        {step.state === 'complete' ? <Check size={14} strokeWidth={3} /> : step.state === 'active' ? '2' : '·'}
                      </div>
                      <div className={classNames("text-xs font-medium text-center", step.state === 'active' ? "text-md-primary font-semibold" : "text-md-on-surface-variant")}>
                        {step.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-[13px] text-md-on-surface-variant">Page 2 of 12</span>
                <div className="flex gap-1">
                  <button type="button" className="w-9 h-9 rounded-full text-sm font-medium text-md-on-surface-variant hover:bg-md-primary/10 transition-colors">1</button>
                  <button type="button" className="w-9 h-9 rounded-full text-sm font-semibold bg-md-primary text-md-on-primary shadow-sm">2</button>
                  <button type="button" className="w-9 h-9 rounded-full text-sm font-medium text-md-on-surface-variant hover:bg-md-primary/10 transition-colors">3</button>
                  <span className="w-9 h-9 flex items-center justify-center text-md-on-surface-variant">…</span>
                  <button type="button" className="w-9 h-9 rounded-full text-sm font-medium text-md-on-surface-variant hover:bg-md-primary/10 transition-colors">12</button>
                </div>
              </div>
            </DemoCard>
          </div>
        </Section>

        {/* === Navbar === */}
        <Section id="navbar" index={13} title="Navbar" subtitle="Fixed top, backdrop-blur over md-background/90 with SVG mark and wordmark 'Smart Contract Resettlement'." icon={Menu}>
          <DemoCard label="Navbar Mockup" hint="SVG logo mark, wordmark 'Smart Contract Resettlement', pill action buttons on right.">
            <div className="bg-md-background/90 backdrop-blur-md border border-md-outline/10 rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Logo className="w-9 h-9 text-md-primary" />
                <span className="font-bold text-xl tracking-tight">Smart Contract Resettlement</span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                {['Submit Bank Details', 'Track Payment', 'Verify Certificate'].map((l) => (
                  <a key={l} href="#" className="text-sm text-md-on-surface hover:text-md-primary transition-colors">{l}</a>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outlined" size="sm">Login</Button>
                <Button variant="filled" size="sm">Register</Button>
              </div>
            </div>
          </DemoCard>
        </Section>
      </div>

      {/* Live standard Modal instance */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Persistent Content Modal"
        subtitle="This modal uses portal mounting with keepMounted=true so typed values persist."
        cancelText="Cancel"
        confirmText="Save & Close"
        onConfirm={() => {
          setModalOpen(false);
          notify({ type: 'success', title: 'Content Saved', message: `Saved draft: "${modalInput}"` });
        }}
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Persistent Input Field"
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
          />
          <p className="text-xs text-md-on-surface-variant">
            Close this modal using the overlay backdrop or Cancel button, then reopen it — notice your input is preserved!
          </p>
        </div>
      </Modal>

      {/* Scrollable Modal instance — body overflows, header and footer stay pinned */}
      <Modal
        isOpen={scrollModalOpen}
        onClose={() => setScrollModalOpen(false)}
        title="Objection Review"
        subtitle="Case CASE-1045 · Kelantan Rice Field Lot 7"
        cancelText="Cancel"
        confirmText="Approve Objection"
        onConfirm={() => {
          setScrollModalOpen(false);
          notify({ type: 'success', title: 'Objection Approved', message: 'CASE-1045 moved to revaluation.' });
        }}
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-md-on-surface-variant">
            Scroll this body: the title above and the action row below never move, and the hairline plus
            fade at each end appears only while there is more content in that direction.
          </p>

          {[
            ['Claimant', 'Nurul Aisyah binti Rahman'],
            ['Lot Number', 'PT 4471, Mukim Kuala Krai'],
            ['Land Area', '1.82 hectares'],
            ['Land Category', 'Agricultural — paddy'],
            ['Acquisition Purpose', 'East Coast Rail Link alignment'],
            ['Gazette Reference', 'JPT/KEL/2026/0182'],
            ['Section 4 Notice', '14 January 2026'],
            ['Section 8 Declaration', '27 February 2026'],
            ['Initial Valuation', 'RM 132,500.00'],
            ['Claimed Valuation', 'RM 188,000.00'],
            ['Variance', 'RM 55,500.00 (41.9%)'],
            ['Objection Ground', 'Comparable sales evidence understated'],
            ['Valuer Assigned', 'Ir. Tan Wei Ming (VR-2291)'],
            ['Site Inspection', '11 March 2026'],
            ['Objection Filed', '3 March 2026'],
            ['Statutory Deadline', '2 May 2026'],
          ].map(([field, detail]) => (
            <div
              key={field}
              className="flex items-baseline justify-between gap-6 py-3 border-b border-md-outline/10 last:border-b-0"
            >
              <span className="text-xs uppercase tracking-wide text-md-on-surface-variant shrink-0">{field}</span>
              <span className="text-sm text-md-on-surface text-right">{detail}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

const BUTTON_VARIANT_HINTS: Record<(typeof BUTTON_VARIANTS)[number], string> = {
  filled: 'Solid md-primary CTA button with continuous GSAP shimmer sweep.',
  'animated-primary': 'Alias of filled — primary CTA button with GSAP shimmer sweep.',
  tonal: 'Secondary container surface, dark secondary text.',
  secondary: 'Alias of tonal — secondary container surface.',
  combined: 'Outlined 3rd button variant (border md-outline).',
  outlined: 'Transparent with md-outline border; tints on hover.',
  danger: 'Solid bg-md-error with text-md-on-error for delete/cancel/reject actions.',
  text: 'Ghost button; only a hover state layer.',
};

export default DesignSystem;