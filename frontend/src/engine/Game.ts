import { MapManager } from './MapManager';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { NetworkManager } from './NetworkManager';
import { UIManager } from './UIManager';
import { Player } from './Player';
import { ServerMessage } from './types';

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

    public handleServerMessage(msg: ServerMessage) {
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
        }
    }

    private lastSentUp = false;
    private lastSentDown = false;
    private lastSentLeft = false;
    private lastSentRight = false;

    private processInput() {
        if (!this.localPlayer) return;

        this.input.update(this.isChatFocused);

        const up = this.input.directions.up;
        const down = this.input.directions.down;
        const left = this.input.directions.left;
        const right = this.input.directions.right;

        if (up !== this.lastSentUp || down !== this.lastSentDown || left !== this.lastSentLeft || right !== this.lastSentRight) {
            this.network.sendInput(up, down, left, right);
            this.lastSentUp = up;
            this.lastSentDown = down;
            this.lastSentLeft = left;
            this.lastSentRight = right;
        }
    }

    private loop(time: number) {
        if (!this.lastTime) this.lastTime = time;
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (this.state !== 'lobby' || this.localPlayer) {
            this.processInput();
            this.renderer.draw(this.localPlayer, this.players, this.mapManager, this.state);
        } else {
            this.renderer.drawMenuBackground();
        }

        requestAnimationFrame((t) => this.loop(t));
    }
}
