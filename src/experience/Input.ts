const FORWARD_KEYS = ['KeyW', 'ArrowUp']
const BACK_KEYS = ['KeyS', 'ArrowDown']
const LEFT_KEYS = ['KeyA', 'ArrowLeft']
const RIGHT_KEYS = ['KeyD', 'ArrowRight']

export class Input {
  private keys = new Set<string>()
  private virtual = new Set<string>()

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
    this.virtual.clear()
  }

  setHeld(code: string, held: boolean) {
    if (held) this.virtual.add(code)
    else this.virtual.delete(code)
  }

  private held(codes: string[]) {
    return codes.some((code) => this.keys.has(code) || this.virtual.has(code))
  }

  get forward() {
    return (this.held(FORWARD_KEYS) ? 1 : 0) - (this.held(BACK_KEYS) ? 1 : 0)
  }

  get turn() {
    return (this.held(RIGHT_KEYS) ? 1 : 0) - (this.held(LEFT_KEYS) ? 1 : 0)
  }
}
