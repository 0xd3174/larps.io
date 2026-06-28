import { me, roomData, MAP_WIDTH, MAP_HEIGHT } from './state';
import { mapData, tilesetImage } from './map';
import { Player } from './types';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

export function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.imageSmoothingEnabled = false; // Prevent tile bleeding
    
    // Round camera position to fix sub-pixel black gaps between tiles
    const camX = Math.round(canvas.width / 2) - Math.round(me.x);
    const camY = Math.round(canvas.height / 2) - Math.round(me.y);
    ctx.translate(camX, camY);

    drawGrid();

    for (const p of roomData.players) {
        drawPlayer(p);
    }

    ctx.restore();
}

function drawGrid() {
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

                ctx.drawImage(tilesetImage, sx, sy, tw, th, layer.x * tw + dx, layer.y * th + dy, tw, th);
            }
        }

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, mapData.width * tw, mapData.height * th);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 2;
        const step = 50;

        ctx.beginPath();
        for (let x = 0; x <= MAP_WIDTH; x += step) {
            ctx.moveTo(x, 0); ctx.lineTo(x, MAP_HEIGHT);
        }
        for (let y = 0; y <= MAP_HEIGHT; y += step) {
            ctx.moveTo(0, y); ctx.lineTo(MAP_WIDTH, y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    }
}

function drawPlayer(p: Player) {
    const isMe = p.nickname === me.nickname;
    const x = isMe ? Math.round(me.x) : Math.round(p.x);
    const y = isMe ? Math.round(me.y) : Math.round(p.y);

    let strokeColor = '#aaa';
    if (roomData.state === 'playing') {
        if (p.role === 'seeker') strokeColor = '#ef4444'; // Red
        if (p.role === 'hider') strokeColor = '#3b82f6'; // Blue
    } else {
        strokeColor = isMe ? '#3b82f6' : '#aaa';
    }

    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();

    if (roomData.state === 'playing' && p.role === 'hider' && p.health < 100) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - 20, y - 35, 40, 5);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(x - 20, y - 35, 40 * (p.health / 100), 5);
    }

    if (p.isHost) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x, y - 30, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.nickname, x, y + 40);
}

export function drawMenuBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
