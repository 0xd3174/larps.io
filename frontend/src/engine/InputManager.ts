import { CONFIG } from '../config';

export class InputManager {
    public up: boolean = false;
    public down: boolean = false;
    public left: boolean = false;
    public right: boolean = false;
    private keys: Record<string, boolean> = {};

    constructor() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    update(isChatFocused: boolean) {
        if (isChatFocused) {
            this.up = false;
            this.down = false;
            this.left = false;
            this.right = false;
            return;
        }

        this.up = !!(this.keys['w'] || this.keys['arrowup']);
        this.down = !!(this.keys['s'] || this.keys['arrowdown']);
        this.left = !!(this.keys['a'] || this.keys['arrowleft']);
        this.right = !!(this.keys['d'] || this.keys['arrowright']);
    }
}
