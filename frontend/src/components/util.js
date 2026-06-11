export const short = (a) => (a ? `${a.slice(0, 5)}…${a.slice(-4)}` : "—");

export function readableError(e, gameLabel) {
  const msg = e?.message || String(e);
  if (/failed to fetch|networkerror|load failed|429|too many/i.test(msg))
    return "The network is busy right now — data will refresh automatically in a moment.";
  if (/NoSuchContract|could not find|not found|404/i.test(msg))
    return `${gameLabel || "This game"} isn't live yet — deploy its contract to enable it.`;
  if (/rejected|cancel/i.test(msg)) return "Request cancelled.";
  if (/no.*address|connect/i.test(msg)) return "Connect a Stacks wallet first.";
  return msg;
}
