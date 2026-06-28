import { MapManager } from './MapManager';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { NetworkManager } from './NetworkManager';
import { UIManager } from './UIManager';
import { Player } from './Player';

export class Game {
    public mapManager: MapManager;
    public renderer: Renderer;
    public input: InputManager;
    public network: NetworkManager;
    public ui: UIManager;

    public players: Player[] = [];
    public localPlayer: Player | null = null;
    public roomId: string | null = null;
    public state: string = 'lobby';
    public timeLeft: number = 0;
    public isChatFocused: boolean = false;

    private lastTime: number = 0;

    constructor() {
        this.mapManager = new MapManager();
        this.renderer = new Renderer();
        this.input = new InputManager();
        this.network = new NetworkManager(this);
        this.ui = new UIManager(this);

        this.init();
    }

    private async init() {
        await this.mapManager.load();
        this.ui.init();
        requestAnimationFrame((time) => this.loop(time));
    }

    public startRoom(roomId: string, nickname: string) {
        this.localPlayer = new Player('', nickname, true);
        this.network.connect(roomId, nickname);
    }

    public handleServerMessage(msg: any) {
        if (msg.type === 'state') {
            this.state = msg.roomState;
            this.timeLeft = msg.timeLeft || 0;
            
            this.ui.updateHUD(this.state, this.timeLeft);

            // Sync players
            const updatedPlayers: Player[] = [];
            let myData = null;

            for (const pData of msg.players) {
                if (this.localPlayer && pData.nickname === this.localPlayer.nickname) {
                    this.localPlayer.updateFromServer(pData);
                    updatedPlayers.push(this.localPlayer);
                    myData = pData;
                } else {
                    let p = this.players.find(existing => existing.nickname === pData.nickname);
                    if (!p) {
                        p = new Player(pData.id, pData.nickname, false);
                    }
                    p.updateFromServer(pData);
                    updatedPlayers.push(p);
                }
            }
            this.players = updatedPlayers;

            if (myData && this.localPlayer) {
                this.ui.updateInGameUI(this.roomId as string, this.state, this.localPlayer.isHost);
            }

        } else if (msg.type === 'chat') {
            this.ui.appendChat(msg.sender, msg.text, msg.sender === 'SERVER');
        } else if (msg.type === 'move') {
            const p = this.players.find(player => player.nickname === msg.nickname);
            if (p && (!this.localPlayer || p.nickname !== this.localPlayer.nickname)) {
                p.x = msg.x;
                p.y = msg.y;
            }
        }
    }

    private updatePhysics(dt: number) {
        if (!this.localPlayer) return;

        this.input.update(this.isChatFocused);

        const vx = this.input.dx;
        const vy = this.input.dy;

        if (vx !== 0 || vy !== 0) {
            const newX = this.localPlayer.x + vx * dt;
            const newY = this.localPlayer.y + vy * dt;

            if (!this.mapManager.isWall(newX, this.localPlayer.y)) {
                this.localPlayer.x = newX;
            }
            if (!this.mapManager.isWall(this.localPlayer.x, newY)) {
                this.localPlayer.y = newY;
            }

            this.localPlayer.x = Math.max(0, Math.min(this.localPlayer.x, this.mapManager.width));
            this.localPlayer.y = Math.max(0, Math.min(this.localPlayer.y, this.mapManager.height));
            
            this.network.sendMove(this.localPlayer.x, this.localPlayer.y);
        }
    }

    private loop(time: number) {
        if (!this.lastTime) this.lastTime = time;
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (this.state !== 'lobby' || this.localPlayer) {
            this.updatePhysics(dt);
            this.renderer.draw(this.localPlayer, this.players, this.mapManager, this.state);
        } else {
            this.renderer.drawMenuBackground();
        }

        requestAnimationFrame((t) => this.loop(t));
    }
}
