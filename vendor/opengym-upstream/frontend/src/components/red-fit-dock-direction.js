// Browser-independent touch-direction hysteresis adapted from RED-Bit's dock rule.
// A change is emitted only while the same touch is active, after 13 CSS pixels.
export class RedFitDockDirectionTracker {
  constructor(threshold = 13) {
    this.threshold = threshold
    this.end()
  }

  begin(offset) {
    this.active = true
    this.previous = offset
    this.pending = null
    this.distance = 0
    this.lastEmitted = null
  }

  end() {
    this.active = false
    this.previous = null
    this.pending = null
    this.distance = 0
    this.lastEmitted = null
  }

  sample(offset) {
    if (!this.active || this.previous === null) return null
    const delta = offset - this.previous
    this.previous = offset
    if (Math.abs(delta) <= 0.75) return null
    const direction = delta > 0 ? 'down' : 'up'
    if (direction !== this.pending) {
      this.pending = direction
      this.distance = 0
    }
    this.distance += Math.abs(delta)
    if (this.distance < this.threshold || direction === this.lastEmitted) return null
    this.lastEmitted = direction
    this.distance = 0
    return direction
  }
}

// A reduced-motion preference keeps the original navigation permanently expanded.
// MediaQueryList instances are passed in to make this policy testable without a DOM.
export function canCompactRedFitDock(phoneQuery, reducedMotionQuery) {
  return Boolean(phoneQuery?.matches && !reducedMotionQuery?.matches)
}

// Recognise the initial gesture axis without blocking browser touch handling.
// Horizontal carousels must not make a fixed bottom dock collapse from scroll jitter.
export class RedFitDockGestureAxis {
  constructor(threshold = 8, ratio = 1.25) {
    this.threshold = threshold
    this.ratio = ratio
    this.end()
  }

  begin(x, y) {
    this.startX = x
    this.startY = y
    this.direction = null
  }

  sample(x, y) {
    if (this.direction || this.startX === null) return this.direction
    const dx = Math.abs(x - this.startX)
    const dy = Math.abs(y - this.startY)
    if (Math.max(dx, dy) < this.threshold) return null
    if (dx > dy * this.ratio) this.direction = 'horizontal'
    else if (dy > dx * this.ratio) this.direction = 'vertical'
    return this.direction
  }

  end() {
    this.startX = null
    this.startY = null
    this.direction = null
  }
}
