// A week-dot is visual; reuse its priority for a localized VoiceOver label.
// Source strings are existing RED Fit i18n keys, not a second translation table.
export function homeWeekStatus({ done, noted, overridden, planned }) {
  if (done) return { dot: ' done', label: 'Completed' }
  if (noted) return { dot: ' noted', label: 'Note' }
  if (overridden && planned) return { dot: ' ovr', label: 'Rescheduled' }
  if (planned) return { dot: ' plan', label: 'Planned' }
  return { dot: '', label: null }
}

export function homeWeekAccessibleLabel(date, locale, status, translate) {
  const fullDate = date.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  return status.label ? `${fullDate}, ${translate(status.label)}` : fullDate
}
