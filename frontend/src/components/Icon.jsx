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

  // daily quests — a flag
  quest: (
    <>
      <path d="M6 21V4" />
      <path
        d="M6 4c2.5-1.4 5-1.4 7.5 0S18 5.4 19 4.8V13c-1 .6-3 .6-5.5-.8S8.5 11.6 6 13V4Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
    </>
  ),

  /* ---- RPS gameplay gestures ---- */
  rock: (
    <path
      d="M7 11a5 4 0 0 1 10 0v3.5a3.5 3.5 0 0 1-3.5 3.5h-3A3.5 3.5 0 0 1 7 14.5V11Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  ),
  paper: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="2.2" />
      <path d="M9 9h6M9 12.5h6M9 16h4" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6.5" cy="17" r="2.4" />
      <circle cx="17.5" cy="17" r="2.4" />
      <path d="M8.7 15.3 19 5M15.3 15.3 5 5" />
    </>
  ),

  /* ---- Slot reel symbols (bold, filled) ---- */
  seven: (
    <path d="M7 6h10l-5.5 12" stroke="currentColor" strokeWidth="2.6" fill="none" />
  ),
  bar: <rect x="4.5" y="9.5" width="15" height="5" rx="2.2" fill="currentColor" stroke="none" />,
  star: (
    <path
      d="M12 3.5l2.5 5.2 5.7.6-4.3 3.8 1.3 5.6L12 15.9 6.8 18.7l1.3-5.6L3.8 9.3l5.7-.6L12 3.5Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  gem: <path d="M12 3.5 20 11l-8 9.5L4 11l8-7.5Z" fill="currentColor" stroke="none" />,
  bell: (
    <>
      <path d="M12 4a5 5 0 0 0-5 5v3l-1.8 3h13.6L17 12V9a5 5 0 0 0-5-5Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
      <path d="M10.3 18a1.8 1.8 0 0 0 3.4 0" />
    </>
  ),
  cherry: (
    <>
      <circle cx="8" cy="16.5" r="3" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16.5" r="3" fill="currentColor" stroke="none" />
      <path d="M8 13.5C8.5 8 13 6 19 6M16 13.5c0-3 1-5 3-7" fill="none" />
    </>
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
