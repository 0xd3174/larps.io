import { me, MAP_WIDTH, MAP_HEIGHT } from './state';
import { sendMove } from './network';
import { isWall } from './map';

export const keys: Record<string, boolean> = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

export function updateInput(dt: number, isChatFocused: boolean) {
    if (isChatFocused) {
        me.vx = 0; me.vy = 0;
    } else {
        let dx = 0; let dy = 0;
        if (keys.w || keys.ArrowUp) dy -= 1;
        if (keys.s || keys.ArrowDown) dy += 1;
        if (keys.a || keys.ArrowLeft) dx -= 1;
        if (keys.d || keys.ArrowRight) dx += 1;

        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx*dx + dy*dy);
            dx /= length;
            dy /= length;
        }

        me.vx = dx * me.speed;
        me.vy = dy * me.speed;
    }

    if (me.vx !== 0 || me.vy !== 0) {
        const newX = me.x + me.vx * dt;
        const newY = me.y + me.vy * dt;

        if (!isWall(newX, me.y)) {
            me.x = newX;
        }
        if (!isWall(me.x, newY)) {
            me.y = newY;
        }

        me.x = Math.max(0, Math.min(me.x, MAP_WIDTH));
        me.y = Math.max(0, Math.min(me.y, MAP_HEIGHT));
        
        sendMove(me.x, me.y);
    }
}
