/**
 * Destiny-themed SVG icons.
 *
 * SVG path data sourced from DIM's custom icon set (MIT license).
 * Rendered as inline React SVGs for zero-request icon usage.
 */
import React from 'react';

// ============================================================================
// Icon component (generic SVG wrapper)
// ============================================================================

interface IconProps {
  className?: string;
  /** Icon size in pixels (applies to both width and height) */
  size?: number;
  /** SVG fill color — defaults to 'currentColor' */
  fill?: string;
  title?: string;
}

const SvgIcon: React.FC<IconProps & { viewBox: string; path: string }> = ({
  className,
  size = 16,
  fill = 'currentColor',
  viewBox,
  path,
  title,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={viewBox}
    width={size}
    height={size}
    fill={fill}
    className={className}
    role={title ? 'img' : 'presentation'}
    aria-label={title}
    aria-hidden={!title}
  >
    {title && <title>{title}</title>}
    <path d={path} />
  </svg>
);

// ============================================================================
// Class Icons (Titan / Hunter / Warlock)
// ============================================================================

const HUNTER_PATH =
  'm9.055 10.446 6.945-.023-6.948 10.451 6.948-.024-7.412 11.15h-7.045l7.036-10.428h-7.036l7.032-10.422h-7.032l7.507-11.126 6.95-.024zm13.89 0-6.945-10.446 6.95.024 7.507 11.126h-7.032l7.032 10.422h-7.036l7.036 10.428h-7.045l-7.412-11.15 6.948.024-6.948-10.451z';

const TITAN_PATH =
  'm14.839 15.979-13.178-7.609v15.218zm2.322 0 13.178 7.609v-15.218zm5.485-12.175-6.589-3.804-13.178 7.609 13.178 7.609 13.179-7.609zm0 16.784-6.589-3.805-13.178 7.609 13.178 7.608 13.179-7.608-6.59-3.805z';

const WARLOCK_PATH =
  'm5.442 23.986 7.255-11.65-2.71-4.322-9.987 15.972zm5.986 0 4.28-6.849-2.717-4.333-6.992 11.182zm7.83-11.611 7.316 11.611h5.426l-10.015-15.972zm-7.26 11.611h8.004l-4.008-6.392zm6.991-11.182-2.703 4.324 4.302 6.858h5.413zm-5.707-.459 2.71-4.331 2.71 4.331-2.703 4.326z';

export const HunterIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 32 32" path={HUNTER_PATH} />
);

export const TitanIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 32 32" path={TITAN_PATH} />
);

export const WarlockIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 32 32" path={WARLOCK_PATH} />
);

/** Render the correct class icon by classType number (0=Titan, 1=Hunter, 2=Warlock) */
export const ClassIcon: React.FC<IconProps & { classType: number }> = ({ classType, ...props }) => {
  switch (classType) {
    case 0:
      return <TitanIcon {...props} />;
    case 1:
      return <HunterIcon {...props} />;
    case 2:
      return <WarlockIcon {...props} />;
    default:
      return null;
  }
};

// ============================================================================
// Power Level Icon (diamond shape)
// ============================================================================

const POWER_PATH =
  'M16 32l-7.245-8.755-8.755-7.245 8.755-7.321 7.245-8.679 7.245 8.679 8.755 7.321-8.755 7.245zM9.811 16l3.396 2.792 2.792 3.396 2.792-3.396 3.396-2.792-3.396-2.868-2.792-3.321-2.792 3.321z';

export const PowerIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 32 32" path={POWER_PATH} />
);

// ============================================================================
// Engram Icon
// ============================================================================

const ENGRAM_PATH =
  'M33.62 23.176h32.76l9.412-13.48L50 1.316l-25.79 8.38 9.41 13.48zm37.985 3.742l10.14 31.202 15.052 4.37V35.317L80.96 13.52l-9.354 13.398zM50 77.984l25.436-18.48-9.715-29.902H34.28l-9.715 29.903L50 77.985zm3.214 5.61v15.088l25.71-8.353 15.8-21.75L79.83 64.25 53.21 83.59zm-6.427 0L20.172 64.256 5.278 68.58l15.8 21.75 25.71 8.352V83.594zm-18.39-56.676l-9.357-13.4-15.836 21.8V62.49l15.053-4.37 10.14-31.202z';

export const EngramIcon: React.FC<IconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 100 100" path={ENGRAM_PATH} />
);

// ============================================================================
// Pursuit Complete Badge (golden triangle — bottom-right corner overlay)
// ============================================================================

export const PursuitCompleteBadge: React.FC<{ size?: number; className?: string }> = ({
  size = 13,
  className,
}) => (
  <svg
    viewBox="0 0 13 13"
    width={size}
    height={size}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Complete"
  >
    <title>Complete</title>
    <path d="M0 13h13V0" fill="#b68943" fillRule="evenodd" />
    {/* Exclamation mark */}
    <g fill="#fff" transform="translate(4.8, 4.2) scale(0.45)">
      <rect x="0" y="0" width="1.98" height="1.2" rx="0.2" transform="rotate(45 1 0.6)" />
      <rect x="0" y="3.5" width="1.98" height="3.76" rx="0.2" transform="rotate(45 1 5.38) scale(1,-1) translate(0,-7)" />
    </g>
  </svg>
);

// ============================================================================
// Lookup helpers
// ============================================================================

export const CLASS_ICON_COMPONENTS: Record<number, React.FC<IconProps>> = {
  0: TitanIcon,
  1: HunterIcon,
  2: WarlockIcon,
};

export const CLASS_NAMES: Record<number, string> = {
  0: 'Titan',
  1: 'Hunter',
  2: 'Warlock',
};
