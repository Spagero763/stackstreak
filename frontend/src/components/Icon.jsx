// A small custom icon set — replaces decorative emoji with line/geometric
// marks in the brand style. All icons inherit `currentColor` and a shared
// stroke weight so they read as one designed family, not clip-art.
const P = {
  // navigation
  home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />,
  // daily streak — a lightning bolt (filled)
  streak: (
    <path
      d="M13 3 5.5 13H11l-1 8 8.5-11H13l1-7Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  // tic-tac-toe — a 3x3 grid
  ttt: <path d="M9 4v16M15 4v16M4 9h16M4 15h16" />,
  // coin flip — a coin
  coinflip: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8.5v7M10 10.5h2.5a1.5 1.5 0 0 1 0 3H10" />
    </>
  ),
  // rock-paper-scissors — scissors
  rps: (
    <>
      <circle cx="6.5" cy="17" r="2.4" />
      <circle cx="17.5" cy="17" r="2.4" />
      <path d="M8.7 15.3 19 5M15.3 15.3 5 5" />
    </>
  ),
  // higher / lower — opposing chevrons
  hilo: <path d="M8 10l4-4 4 4M8 14l4 4 4-4" />,
  // connect four — a grid of discs
  c4: (
    <>
      <circle cx="8.5" cy="8.5" r="2.2" />
      <circle cx="15.5" cy="8.5" r="2.2" />
      <circle cx="8.5" cy="15.5" r="2.2" />
      <circle cx="15.5" cy="15.5" r="2.2" />
    </>
  ),
  // lucky reels — three slot reels
  reels: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M9.5 5v14M14.5 5v14" />
    </>
  ),
  // champion mark — a crown
  crown: (
    <path
      d="M4 18h16M4.5 8.5 8 12l4-6 4 6 3.5-3.5L18 18H6L4.5 8.5Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.4"
      strokelinejoin="round"
    />
  ),
};

export default function Icon({ name, size = 22, className = "", strokeWidth = 1.9 }) {
  const inner = P[name];
  if (!inner) return null;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {inner}
    </svg>
  );
}
