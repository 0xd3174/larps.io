import { me, roomData, MAP_SIZE } from './state';
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
    const camX = canvas.width / 2 - me.x;
    const camY = canvas.height / 2 - me.y;
    ctx.translate(camX, camY);

    drawGrid();

    for (const p of roomData.players) {
        drawPlayer(p);
    }

    ctx.restore();
}

function drawGrid() {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 2;
    const step = 50;
    
    ctx.beginPath();
    for (let x = 0; x <= MAP_SIZE; x += step) {
        ctx.moveTo(x, 0); ctx.lineTo(x, MAP_SIZE);
    }
    for (let y = 0; y <= MAP_SIZE; y += step) {
        ctx.moveTo(0, y); ctx.lineTo(MAP_SIZE, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);
}

function drawPlayer(p: Player) {
    const isMe = p.nickname === me.nickname;
    const x = isMe ? me.x : p.x;
    const y = isMe ? me.y : p.y;
    
    let color = isMe ? '#3b82f6' : '#10b981';
    if (roomData.state === 'playing') {
        if (p.role === 'seeker') color = '#ef4444';
        if (p.role === 'hider') color = '#10b981';
    }

    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isMe ? '#fff' : (p.role === 'seeker' ? '#f87171' : '#34d399');
    ctx.stroke();

    if (roomData.state === 'playing' && p.role === 'hider' && p.health < 100) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - 20, y - 35, 40, 5);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(x - 20, y - 35, 40 * (p.health / 100), 5);
    }

    if (p.isHost) {
        ctx.fillStyle = '#fbbf24'; 
        ctx.beginPath();
        ctx.arc(x, y - 30, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#fff';
    ctx.font = '14px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(p.nickname, x, y + 40);
}

export function drawMenuBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
