import { CONFIG } from '../config';
import { Player } from './Player';
import { MapManager } from './MapManager';

export class Renderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    private resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    public drawMenuBackground() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public draw(
        localPlayer: Player | null,
        players: Player[],
        mapManager: MapManager,
        gameState: string
    ) {
        this.ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!localPlayer) return;

        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false;

        const camX = Math.round(this.canvas.width / 2) - Math.round(localPlayer.x);
        const camY = Math.round(this.canvas.height / 2) - Math.round(localPlayer.y);
        this.ctx.translate(camX, camY);

        this.drawGrid(mapManager);

        for (const p of players) {
            this.drawPlayer(p, gameState);
        }

        this.ctx.restore();
    }

    private drawGrid(mapManager: MapManager) {
        const { mapData, tilesetImage } = mapManager;

        if (mapData && tilesetImage && tilesetImage.complete && tilesetImage.naturalWidth > 0) {
            const tw = mapData.tilewidth;
            const th = mapData.tileheight;
            const ts = mapData.tilesets[0];
            const columns = ts.columns || Math.floor(ts.imagewidth / tw);
            const firstgid = ts.firstgid || 1;

            for (const layer of mapData.layers) {
                if (layer.type !== 'tilelayer') continue;
                for (let i = 0; i < layer.data.length; i++) {
                    const gid = layer.data[i];
                    if (gid === 0 || gid < firstgid) continue;
                    const tileId = gid - firstgid;

                    const sx = (tileId % columns) * tw;
                    const sy = Math.floor(tileId / columns) * th;
                    const dx = (i % layer.width) * tw;
                    const dy = Math.floor(i / layer.width) * th;

                    this.ctx.drawImage(
                        tilesetImage,
                        sx, sy, tw, th,
                        layer.x * tw + dx, layer.y * th + dy,
                        tw, th
                    );
                }
            }

            this.ctx.strokeStyle = CONFIG.COLORS.MAP_BORDER;
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(0, 0, mapData.width * tw, mapData.height * th);
        } else {
            this.ctx.fillStyle = '#1e293b';
            this.ctx.fillRect(0, 0, mapManager.width, mapManager.height);

            this.ctx.strokeStyle = CONFIG.COLORS.GRID_LINE;
            this.ctx.lineWidth = 2;
            const step = 50;

            this.ctx.beginPath();
            for (let x = 0; x <= mapManager.width; x += step) {
                this.ctx.moveTo(x, 0); this.ctx.lineTo(x, mapManager.height);
            }
            for (let y = 0; y <= mapManager.height; y += step) {
                this.ctx.moveTo(0, y); this.ctx.lineTo(mapManager.width, y);
            }
            this.ctx.stroke();

            this.ctx.strokeStyle = CONFIG.COLORS.MAP_BORDER;
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(0, 0, mapManager.width, mapManager.height);
        }
    }

    private drawPlayer(p: Player, gameState: string) {
        const x = Math.round(p.x);
        const y = Math.round(p.y);

        let strokeColor = CONFIG.COLORS.LOBBY_OTHER;
        if (gameState === 'playing') {
            if (p.role === 'seeker') strokeColor = CONFIG.COLORS.SEEKER;
            if (p.role === 'hider') strokeColor = CONFIG.COLORS.HIDER;
        } else {
            strokeColor = p.isLocal ? CONFIG.COLORS.HIDER : CONFIG.COLORS.LOBBY_OTHER;
        }

        this.ctx.beginPath();
        this.ctx.arc(x, y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = strokeColor;
        this.ctx.stroke();

        let hpVisible = false;
        if (gameState === 'playing' && p.role === 'hider' && p.health < 100) {
            hpVisible = true;
            this.ctx.fillStyle = CONFIG.COLORS.SEEKER;
            this.ctx.fillRect(x - CONFIG.PLAYER_RADIUS, y + CONFIG.HEALTH_BAR_OFFSET_Y, CONFIG.HEALTH_BAR_WIDTH, CONFIG.HEALTH_BAR_HEIGHT);
            this.ctx.fillStyle = CONFIG.COLORS.HIDER;
            this.ctx.fillRect(x - CONFIG.PLAYER_RADIUS, y + CONFIG.HEALTH_BAR_OFFSET_Y, CONFIG.HEALTH_BAR_WIDTH * (p.health / 100), CONFIG.HEALTH_BAR_HEIGHT);
        }

        if (p.isHost) {
            this.ctx.fillStyle = CONFIG.COLORS.HOST_INDICATOR;
            this.ctx.beginPath();

            let hostX = x;
            let hostY = y - 36; // Default center top

            if (hpVisible) {
                hostX = x + CONFIG.HOST_INDICATOR_OFFSET_X;
                hostY = y + CONFIG.HOST_INDICATOR_OFFSET_Y;
            }

            this.ctx.arc(hostX, hostY, CONFIG.HOST_INDICATOR_RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.fillStyle = CONFIG.COLORS.TEXT;
        this.ctx.font = CONFIG.FONTS.PLAYER_NAME;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(p.nickname, x, y + 36);
    }
}
