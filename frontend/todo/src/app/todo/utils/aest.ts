// AEST all year; Australia/Sydney would switch to AEDT (UTC+11) in summer.
const aestFormat = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Brisbane',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

export function formatAest(iso: string): string {
  return aestFormat.format(new Date(iso));
}
