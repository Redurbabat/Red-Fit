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
