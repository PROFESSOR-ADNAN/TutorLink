// Ethiopia (and the wider Horn of Africa) traditionally counts the day
// starting from sunrise rather than midnight: Western 7:00 AM is Ethiopian
// 1:00 in the morning ("ጠዋት"), and Western 7:00 PM is Ethiopian 1:00 at
// night ("ማታ"). The offset is a consistent 6-hour, 12-hour-wraparound shift:
//
//   Western 06:00 → Ethiopian 12:00 ጠዋት (day begins)
//   Western 12:00 → Ethiopian  6:00 ጠዋት (midday)
//   Western 18:00 → Ethiopian 12:00 ማታ  (night begins)
//   Western 00:00 → Ethiopian  6:00 ማታ  (midnight)

const DAY_LABEL = 'ጠዋት';
const NIGHT_LABEL = 'ማታ';

/** "14:30" (24-hour Western time) -> "8:30 ጠዋት" (Ethiopian time) */
export function toEthiopianTime(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const isDay = h >= 6 && h < 18;
  let ethHour = (h - 6 + 24) % 12;
  if (ethHour === 0) ethHour = 12;
  return `${ethHour}:${String(m).padStart(2, '0')} ${isDay ? DAY_LABEL : NIGHT_LABEL}`;
}

/** Same conversion, but starting from a Date object (uses its local hour/minute) */
export function toEthiopianTimeFromDate(date) {
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return toEthiopianTime(`${hh}:${mm}`);
}
