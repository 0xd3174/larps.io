export class InputManager {
    public directions = {
        up: false,
        down: false,
        left: false,
        right: false,
        shift: false
    };
    private keys: Record<string, boolean> = {};

    constructor() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    update(isChatFocused: boolean) {
      if (isChatFocused) {
            this.directions.up = false;
            this.directions.down = false;
            this.directions.left = false;
            this.directions.right = false;
            this.directions.shift = false;
            return;
        }

        this.directions.up = !!(this.keys['w'] || this.keys['ц'] || this.keys['arrowup']);
        this.directions.down = !!(this.keys['s'] || this.keys['ы'] || this.keys['arrowdown']);
        this.directions.left = !!(this.keys['a'] || this.keys['ф'] || this.keys['arrowleft']);
        this.directions.right = !!(this.keys['d'] || this.keys['в'] || this.keys['arrowright']);
        this.directions.shift = !!(this.keys['shift']);
    }
}
