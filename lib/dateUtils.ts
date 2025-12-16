/**
 * Formats a date string to a human-readable format in server time (London timezone)
 * @param dateString ISO date string or Date object
 * @returns Formatted date string in the format "14 Dec 2025 at 11:32 pm"
 */
export function formatServerTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'Unknown time';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) return 'Invalid date';
  
  // Format: 14 Dec 2025 at 11:32 pm
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'Europe/London' });
  const year = date.getFullYear();
  const time = date.toLocaleString('en-GB', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true, 
    timeZone: 'Europe/London' 
  }).toLowerCase();
  
  return `${day} ${month} ${year} at ${time}`;
}
