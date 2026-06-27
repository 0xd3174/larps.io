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
    
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fillStyle = isMe ? '#3b82f6' : '#10b981';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isMe ? '#60a5fa' : '#34d399';
    ctx.stroke();

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
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const t = Date.now() / 2000;
    for(let i=0; i<15; i++) {
        ctx.beginPath();
        ctx.arc(
            canvas.width/2 + Math.cos(t + i*0.5)*300, 
            canvas.height/2 + Math.sin(t*0.8 + i*0.5)*300, 
            30 + i*5, 0, Math.PI*2
        );
        ctx.fillStyle = `rgba(59, 130, 246, ${0.03 - i*0.001})`;
        ctx.fill();
    }
}
