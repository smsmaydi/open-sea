const FORWARD_KEYS = ['KeyW', 'ArrowUp']
const BACK_KEYS = ['KeyS', 'ArrowDown']
const LEFT_KEYS = ['KeyA', 'ArrowLeft']
const RIGHT_KEYS = ['KeyD', 'ArrowRight']

export class Input {
  private keys = new Set<string>()
  /** Analog stick. X is right, Y is forward. Each axis stays in -1..1. */
  private stickX = 0
  private stickY = 0

  constructor() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.clear)
  }

  private onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.code)
  }

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code)
  }

  private clear = () => {
    this.keys.clear()
    this.stickX = 0
    this.stickY = 0
  }

  /**
   * Sets the on-screen stick. Keyboard input is added on top and the result stays in -1..1.
   * @param x - Right is positive.
   * @param y - Forward is positive.
   */
  setStick(x: number, y: number) {
    this.stickX = clampAxis(x)
    this.stickY = clampAxis(y)
  }

  private held(codes: string[]) {
    return codes.some((code) => this.keys.has(code))
  }

  get forward() {
    const keys = (this.held(FORWARD_KEYS) ? 1 : 0) - (this.held(BACK_KEYS) ? 1 : 0)
    return clampAxis(keys + this.stickY)
  }

  get turn() {
    const keys = (this.held(RIGHT_KEYS) ? 1 : 0) - (this.held(LEFT_KEYS) ? 1 : 0)
    return clampAxis(keys + this.stickX)
  }
}

/** @param value - Any number. @returns The value pulled into -1..1. */
function clampAxis(value: number) {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(-1, value))
}
