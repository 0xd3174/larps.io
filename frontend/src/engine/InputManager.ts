import { CONFIG } from '../config';

export class InputManager {
    public dx: number = 0;
    public dy: number = 0;
    private keys: Record<string, boolean> = {};

    constructor() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    update(isChatFocused: boolean) {
        if (isChatFocused) {
            this.dx = 0;
            this.dy = 0;
            return;
        }

        let dx = 0; 
        let dy = 0;
        
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;

        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx*dx + dy*dy);
            dx /= length;
            dy /= length;
        }

        this.dx = dx * CONFIG.PLAYER_SPEED;
        this.dy = dy * CONFIG.PLAYER_SPEED;
    }
}
