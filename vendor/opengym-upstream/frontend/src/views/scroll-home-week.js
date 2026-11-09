// Reveal today's existing weekday without scrolling the surrounding Home page.
// Works with CSS scroll snapping in both LTR and RTL; never changes focus.
export function revealHomeToday(week) {
  const today = week?.querySelector('.wday.today')
  if (!today) return false
  const viewport = week.getBoundingClientRect()
  const cell = today.getBoundingClientRect()
  if (cell.left < viewport.left) {
    week.scrollLeft += cell.left - viewport.left
    return true
  }
  if (cell.right > viewport.right) {
    week.scrollLeft += cell.right - viewport.right
    return true
  }
  return false
}

// Switching to a different week must not preserve the scroll offset from today.
// In RTL, zero is the logical start edge as well as in LTR.
export function syncHomeWeekScroll(week, isCurrentWeek) {
  if (!week) return false
  if (isCurrentWeek) return revealHomeToday(week)
  if (week.scrollLeft === 0) return false
  week.scrollLeft = 0
  return true
}
