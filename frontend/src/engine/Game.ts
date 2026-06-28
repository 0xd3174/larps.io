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
        if (msg.type === 'init') {
            if (this.localPlayer) {
                this.localPlayer.id = msg.id;
                this.localPlayer.networkId = msg.networkId;
            }
        } else if (msg.type === 'state') {
            this.state = msg.roomState;
            this.timeLeft = msg.timeLeft || 0;
            
            this.ui.updateHUD(this.state, this.timeLeft);

            // Sync players
            const updatedPlayers: Player[] = [];
            let myData = null;

            for (const pData of msg.players) {
                if (this.localPlayer && pData.id === this.localPlayer.id) {
                    this.localPlayer.updateFromServer(pData);
                    updatedPlayers.push(this.localPlayer);
                    myData = pData;
                } else {
                    let p = this.players.find(existing => existing.id === pData.id);
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

    public handleBinaryMessage(buffer: ArrayBuffer) {
        const view = new DataView(buffer);
        if (view.byteLength < 4) return;

        const type = view.getUint8(0);
        if (type === 1) { // Delta update
            this.timeLeft = view.getUint16(1, true);
            this.ui.updateHUD(this.state, this.timeLeft);

            const playerCount = view.getUint8(3);
            let offset = 4;

            for (let i = 0; i < playerCount; i++) {
                const netId = view.getUint32(offset, true);
                const x = view.getFloat32(offset + 4, true);
                const y = view.getFloat32(offset + 8, true);
                const health = view.getUint8(offset + 12);
                const roleVal = view.getUint8(offset + 13);
                const role = roleVal === 1 ? 'hider' : (roleVal === 2 ? 'seeker' : 'lobby');

                const player = this.players.find(p => p.networkId === netId);
                if (player) {
                    player.x = x;
                    player.y = y;
                    player.health = health;
                    player.role = role;
                }
                offset += 14;
            }
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
