import { CONFIG } from '../config';
import { Player } from './Player';
import { MapManager } from './MapManager';
import * as R from './RenderConstants';

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

        this.drawLayers(mapManager, false, camX, camY);

        for (const p of players) {
            this.drawPlayer(p, gameState);
        }

        this.drawLayers(mapManager, true, camX, camY);

        this.ctx.restore();
    }

    private drawLayers(mapManager: MapManager, drawFront: boolean, camX: number = 0, camY: number = 0) {
        const { mapData, tilesetImage } = mapManager;

        if (mapData && tilesetImage && tilesetImage.complete && tilesetImage.naturalWidth > 0) {
            const tw = mapData.tilewidth;
            const th = mapData.tileheight;
            const ts = mapData.tilesets[0];
            const columns = ts.columns || Math.floor(ts.imagewidth / tw);
            const firstgid = ts.firstgid || 1;

            const padding = 2;

            for (const layer of mapData.layers) {
                if (layer.type !== 'tilelayer' || !layer.data) continue;
                
                const isFront = layer.name.toLowerCase().includes('_front');
                if (drawFront && !isFront) continue;
                if (!drawFront && isFront) continue;

                const layerWidth = layer.width || mapData.width;
                const layerHeight = layer.height || mapData.height;
                const lxTiles = layer.x || 0;
                const lyTiles = layer.y || 0;
                const lOffsetX = layer.offsetx || 0;
                const lOffsetY = layer.offsety || 0;

                const layerOriginWorldX = lxTiles * tw + lOffsetX;
                const layerOriginWorldY = lyTiles * th + lOffsetY;

                const viewLeft = -camX;
                const viewRight = -camX + this.canvas.width;
                const viewTop = -camY;
                const viewBottom = -camY + this.canvas.height;

                const startCol = Math.max(0, Math.floor((viewLeft - layerOriginWorldX) / tw) - padding);
                const endCol = Math.min(layerWidth - 1, Math.floor((viewRight - layerOriginWorldX) / tw) + padding);
                const startRow = Math.max(0, Math.floor((viewTop - layerOriginWorldY) / th) - padding);
                const endRow = Math.min(layerHeight - 1, Math.floor((viewBottom - layerOriginWorldY) / th) + padding);

                if (startCol > endCol || startRow > endRow) continue;

                for (let r = startRow; r <= endRow; r++) {
                    for (let c = startCol; c <= endCol; c++) {
                        const i = r * layerWidth + c;
                        const gid = layer.data[i];
                        const trueGid = gid & 0x0FFFFFFF;
                        if (trueGid === 0 || trueGid < firstgid) continue;
                        
                        const tileId = trueGid - firstgid;
                        const sx = (tileId % columns) * tw;
                        const sy = Math.floor(tileId / columns) * th;
                        
                        const dstX = layerOriginWorldX + c * tw;
                        const dstY = layerOriginWorldY + r * th;

                        const flipH = (gid & 0x80000000) !== 0;
                        const flipV = (gid & 0x40000000) !== 0;
                        const flipD = (gid & 0x20000000) !== 0;

                        if (flipH || flipV || flipD) {
                            this.ctx.save();
                            this.ctx.translate(dstX + tw / 2, dstY + th / 2);
                            if (flipD) {
                                this.ctx.transform(0, 1, 1, 0, 0, 0);
                            }
                            this.ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                            this.ctx.drawImage(
                                tilesetImage,
                                sx, sy, tw, th,
                                -tw / 2, -th / 2,
                                tw, th
                            );
                            this.ctx.restore();
                        } else {
                            this.ctx.drawImage(
                                tilesetImage,
                                sx, sy, tw, th,
                                dstX, dstY,
                                tw, th
                            );
                        }
                    }
                }
            }

            if (!drawFront) {
                this.ctx.strokeStyle = CONFIG.COLORS.MAP_BORDER;
                this.ctx.lineWidth = 4;
                this.ctx.strokeRect(0, 0, mapData.width * tw, mapData.height * th);
            }
        } else if (!drawFront) {
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
            this.ctx.fillRect(x - CONFIG.PLAYER_RADIUS, y + R.HEALTH_BAR_OFFSET_Y, R.HEALTH_BAR_WIDTH, R.HEALTH_BAR_HEIGHT);
            this.ctx.fillStyle = CONFIG.COLORS.HIDER;
            this.ctx.fillRect(x - CONFIG.PLAYER_RADIUS, y + R.HEALTH_BAR_OFFSET_Y, R.HEALTH_BAR_WIDTH * (p.health / 100), R.HEALTH_BAR_HEIGHT);
        }

        if (p.isHost) {
            this.ctx.fillStyle = CONFIG.COLORS.HOST_INDICATOR;
            this.ctx.beginPath();

            let hostX = x;
            let hostY = y + R.HOST_INDICATOR_DEFAULT_OFFSET_Y; // Default center top

            if (hpVisible) {
                hostX = x + R.HOST_INDICATOR_OFFSET_X;
                hostY = y + R.HOST_INDICATOR_OFFSET_Y;
            }

            this.ctx.arc(hostX, hostY, R.HOST_INDICATOR_RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.fillStyle = CONFIG.COLORS.TEXT;
        this.ctx.font = CONFIG.FONTS.PLAYER_NAME;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(p.nickname, x, y + R.PLAYER_NAME_OFFSET_Y);
    }
}
