/**
 * Design tokens for the Procastify UI kit.
 *
 * Everything visual should come from here (or from a component that uses it)
 * rather than from ad-hoc class strings, so the whole app stays consistent when
 * a surface colour or radius changes.
 */

/** Elevation ladder — background + border for each surface level. */
export const surface = {
  /** App background. */
  base: 'bg-[#151619]',
  /** Standard panel/card. */
  raised: 'bg-[#1e1f22] border border-white/[0.06]',
  /** Panel on top of a panel (inputs, inner tiles). */
  sunken: 'bg-black/20 border border-white/[0.06]',
  /** Floating layers: menus, toolbars, modals. */
  overlay: 'bg-[#1a1b1e]/95 border border-white/10 backdrop-blur-xl',
} as const;

export const radius = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
} as const;

export const shadow = {
  sm: 'shadow-sm shadow-black/20',
  md: 'shadow-lg shadow-black/25',
  lg: 'shadow-2xl shadow-black/50',
} as const;

export const text = {
  heading: 'text-white font-semibold tracking-tight',
  body: 'text-discord-text',
  muted: 'text-discord-textMuted',
  subtle: 'text-zinc-500',
} as const;

/** Consistent keyboard focus treatment for every interactive element. */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-discord-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151619]';

export const transition = 'transition-all duration-200';

/** Semantic accent colours, used by badges, stat tiles and status pills. */
export const accents = {
  indigo: {
    text: 'text-discord-accent',
    bg: 'bg-discord-accent/10',
    border: 'border-discord-accent/30',
    solid: 'bg-discord-accent',
  },
  green: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
    solid: 'bg-emerald-500',
  },
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
    solid: 'bg-amber-500',
  },
  red: {
    text: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
    solid: 'bg-red-500',
  },
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30',
    solid: 'bg-purple-500',
  },
  blue: {
    text: 'text-sky-400',
    bg: 'bg-sky-400/10',
    border: 'border-sky-400/30',
    solid: 'bg-sky-500',
  },
  slate: {
    text: 'text-zinc-400',
    bg: 'bg-white/5',
    border: 'border-white/10',
    solid: 'bg-zinc-600',
  },
} as const;

export type AccentColor = keyof typeof accents;
