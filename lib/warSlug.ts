export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function slugifySegment(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatYearMonth(dateInput: string | Date) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${year}${month}`
}

export function createWarSlug(enemyFaction: string, startedAt: string | Date) {
  return `${slugifySegment(enemyFaction)}-${formatYearMonth(startedAt)}`
}
