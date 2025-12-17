/**
 * Formats a date string to a human-readable format in server time (London timezone)
 * @param dateString ISO date string or Date object
 * @returns Formatted date string in the format "14 Dec 2025 at 11:32 pm"
 */
export function formatServerTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'Unknown time';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString);
  
  if (isNaN(date.getTime())) return 'Invalid date';
  
  // Convert to London timezone
  const londonDate = new Date(
    date.toLocaleString('en-US', { timeZone: 'Europe/London' })
  );
  
  // Get the timezone offset in minutes and convert to milliseconds
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  // Apply the offset to get the correct London time
  const localDate = new Date(londonDate.getTime() - timezoneOffset);
  
  // Format: 14 Dec 2025 at 11:32 pm
  const day = londonDate.getDate();
  const month = londonDate.toLocaleString('en-GB', { month: 'short' });
  const year = londonDate.getFullYear();
  const time = londonDate.toLocaleString('en-GB', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true
  }).toLowerCase();
  
  return `${day} ${month} ${year} at ${time}`;
}
