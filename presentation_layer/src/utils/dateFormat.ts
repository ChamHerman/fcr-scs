/**
 * Canonical Date & Time Formatter (DESIGN.md locked standard)
 * Format: DD MMM YYYY, hh:mm A (12-hour display)
 * Example: 13 Sep 2026, 05:41 PM
 */
export function formatDateTime(d?: string | number | Date | null): string {
  if (!d) return '—';
  const ms = typeof d === 'number' ? (d < 1e11 ? d * 1000 : d) : d;
  const date = typeof ms === 'string' || typeof ms === 'number' ? new Date(ms) : ms;
  if (isNaN(date.getTime())) return '—';

  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');

  return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
}

export function formatDateOnly(d?: string | number | Date | null): string {
  if (!d) return '—';
  const ms = typeof d === 'number' ? (d < 1e11 ? d * 1000 : d) : d;
  const date = typeof ms === 'string' || typeof ms === 'number' ? new Date(ms) : ms;
  if (isNaN(date.getTime())) return '—';

  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}
