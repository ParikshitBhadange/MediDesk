// Computes UTC start/end instants for a calendar day in a FIXED timezone
// (IST, UTC+5:30 — no DST). This matters because the server (Render, US
// region) has its own OS clock/timezone, which is NOT the hospital's
// timezone. Using `new Date(); setHours(0,0,0,0)` on the server computes
// "today" in the SERVER's timezone, which silently shifts day boundaries
// by several hours relative to India — patients added in the morning IST
// could land in "yesterday", and old patients could linger into "today".
// Doing the math in UTC with a fixed offset sidesteps the server's local
// clock entirely, so "today" always means the same thing regardless of
// where this code happens to be hosted.
const IST_OFFSET_MINUTES = 5 * 60 + 30; // +05:30, Asia/Kolkata has no DST

/**
 * @param {string|Date|undefined} dateInput - "YYYY-MM-DD" string, a Date, or
 *   omitted for "today". A plain date string is interpreted as that calendar
 *   date in IST, not UTC.
 * @param {number} offsetMinutes - timezone offset in minutes, default IST.
 * @returns {{ start: Date, end: Date }} UTC instants bounding that day
 *   (end is exclusive — the start of the next day).
 */
function getDayRange(dateInput, offsetMinutes = IST_OFFSET_MINUTES) {
  let year, month, day;

  if (typeof dateInput === "string" && dateInput.trim()) {
    const [y, m, d] = dateInput.split("-").map(Number);
    if (!y || !m || !d) throw new Error(`Invalid date string: ${dateInput}`);
    year = y;
    month = m - 1;
    day = d;
  } else {
    const reference = dateInput instanceof Date ? dateInput : new Date();
    // Shift the instant by the target offset, then read UTC fields — this
    // gives us the target timezone's wall-clock date without depending on
    // the server's own configured timezone at all.
    const shifted = new Date(reference.getTime() + offsetMinutes * 60_000);
    year = shifted.getUTCFullYear();
    month = shifted.getUTCMonth();
    day = shifted.getUTCDate();
  }

  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - offsetMinutes * 60_000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

module.exports = { getDayRange, IST_OFFSET_MINUTES };