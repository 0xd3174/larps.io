import './style.css';
import { setupUI, isMainMenuVisible, isChatFocused } from './ui';
import { resizeCanvas, draw, drawMenuBackground } from './renderer';
import { updateInput } from './input';
import { roomData, stateContext } from './state';
import { loadMap } from './map';

let lastTime = 0;

function init() {
    loadMap().then(() => {
        setupUI();
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        requestAnimationFrame(gameLoop);
    });
}

function gameLoop(timestamp: number) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (stateContext.ws && stateContext.ws.readyState === WebSocket.OPEN && roomData.players) {
        updateInput(dt, isChatFocused());
        draw();
    } else if (isMainMenuVisible()) {
        drawMenuBackground();
    }

    requestAnimationFrame(gameLoop);
}

init();
