import { Game } from './Game';
import { ServerMessage } from './types';

export class NetworkManager {
    private game: Game;
    private ws: WebSocket | null = null;

    constructor(game: Game) {
        this.game = game;
    }

    async createRoom(seekers: number, duration: number): Promise<string | null> {
        try {
            const res = await fetch('/api/rooms', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seekers, duration })
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            return data.roomId;
        } catch (err: any) {
            this.game.ui.showError(err.message);
            return null;
        }
    }



    connect(roomId: string, nickname: string) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?room=${roomId}&nickname=${encodeURIComponent(nickname)}`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.game.roomId = roomId;
            this.game.ui.updateInGameUI(roomId);
            window.history.replaceState({}, '', `?room=${roomId}`);
            this.game.ui.appendChat('SYSTEM', 'Connected to room. Share URL to invite friends.', true);
        };

        this.ws.onmessage = (e) => {
            const msg = JSON.parse(e.data) as ServerMessage;
            this.game.handleServerMessage(msg);
        };

        this.ws.onclose = () => {
            window.location.href = '/';
        };
        
        this.ws.onerror = () => {
            window.location.href = '/';
        };
    }

    sendChat(text: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({
            type: 'chat',
            sender: this.game.localPlayer?.nickname,
            text: text
        }));
    }

    sendInput(up: boolean, down: boolean, left: boolean, right: boolean) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({
            type: 'input',
            up: up,
            down: down,
            left: left,
            right: right
        }));
    }
}
