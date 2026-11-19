/**
 * THE LOGO, drawn in code: a teal tile (the velvet chairs), a mustard plate
 * ring, and a crossed fork and knife in warm linen.
 *
 * It's plain SVG with fixed colours (no CSS variables, no Tailwind), so the
 * same component works everywhere:
 *  - in the app (sidebar, login header), and
 *  - inside Next.js's ImageResponse, which turns it into the PNG icons for the
 *    browser tab, the iPhone home screen and tablet installs (app/icon.tsx,
 *    app/apple-icon.tsx). One drawing, so they can never drift apart.
 */
export const LOGO_COLORS = {
  teal: "#0e6b6e",
  tealDark: "#0b5a5d",
  mustard: "#e9a93a",
  linen: "#f6f1e9",
} as const;

type LogoMarkProps = {
  size: number;
  /**
   * Rounded tile (default). Off for the iPhone icon: iOS rounds the corners
   * itself, and a pre-rounded tile would show dark corners.
   */
  rounded?: boolean;
  className?: string;
};

export function LogoMark({ size, rounded = true, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Tile, with a slightly darker bottom edge for depth */}
      <rect width="64" height="64" rx={rounded ? 15 : 0} fill={LOGO_COLORS.tealDark} />
      <rect width="64" height="60" rx={rounded ? 15 : 0} fill={LOGO_COLORS.teal} />
      {/* The plate */}
      <circle
        cx="32"
        cy="31"
        r="20"
        fill="none"
        stroke={LOGO_COLORS.mustard}
        strokeWidth="3.5"
      />
      {/* Fork and knife, crossed (drawn on a 24-unit grid, scaled to fit the plate) */}
      <g
        transform="translate(17 16) scale(1.25)"
        fill="none"
        stroke={LOGO_COLORS.linen}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* knife: blade from top-left down to the handle at bottom-right */}
        <path d="M4 3.5 L18.5 18 L20.5 20" />
        <path d="M4 3.5 C2.5 6.5 3.5 10 6.5 12.5 L9.5 15" />
        {/* fork: handle bottom-left, head top-right with three tines */}
        <path d="M3.5 20.5 L13 11" />
        <path d="M13 11 C11.8 9.2 12.3 7.3 14 5.6 L17.5 2.5" />
        <path d="M13 11 C14.8 12.2 16.7 11.7 18.4 10 L21.5 6.5" />
        <path d="M15.2 8.8 L19.6 4.4" />
      </g>
    </svg>
  );
}
