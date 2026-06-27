import './style.css';

// DOM Elements
const mainMenu = document.getElementById('mainMenu');
const inGameUI = document.getElementById('inGameUI');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const inputNickname = document.getElementById('nickname');
const inputRoomId = document.getElementById('roomId');
const menuError = document.getElementById('menuError');

const btnJoin = document.getElementById('btnJoin');
const btnCreate = document.getElementById('btnCreate');
const btnMyRoom = document.getElementById('btnMyRoom');

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');

const roomInfo = document.getElementById('roomInfo');
const gameStateUI = document.getElementById('gameState');
const playerRoleUI = document.getElementById('playerRole');

// Game State
let ws = null;
let roomData = {
    id: null,
    state: 'lobby',
    players: [] // Array of {id, nickname, isHost, x, y}
};
let me = {
    id: null,
    nickname: '',
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    speed: 250 // pixels per sec
};

// Input State
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

// Initialization
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Parse URL params for invite
    const urlParams = new URLSearchParams(window.location.search);
    const inviteRoom = urlParams.get('room');
    if (inviteRoom) {
        inputRoomId.value = inviteRoom;
    }

    // Try to get nickname from local storage
    const savedNick = localStorage.getItem('nickname');
    if (savedNick) inputNickname.value = savedNick;

    // Events
    btnJoin.addEventListener('click', () => joinRoom(inputRoomId.value));
    btnCreate.addEventListener('click', createRoom);
    btnMyRoom.addEventListener('click', fetchMyRoom);

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        if (document.activeElement === chatInput) {
            if (e.key === 'Escape') chatInput.blur();
            return;
        }
        if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
        
        if (e.key === 'Enter' && mainMenu.classList.contains('hidden')) {
            e.preventDefault();
            chatInput.focus();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            sendChat(chatInput.value.trim());
            chatInput.value = '';
            chatInput.blur(); // unfocus to allow movement again
        }
    });

    // Start Game Loop
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// API Calls
async function createRoom() {
    const nick = inputNickname.value.trim();
    if (!nick) return showError('Please enter a nickname');
    localStorage.setItem('nickname', nick);
    me.nickname = nick;

    try {
        const res = await fetch('/api/rooms', { method: 'POST' });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        joinRoom(data.roomId);
    } catch (err) {
        showError(err.message);
    }
}

async function fetchMyRoom() {
    const nick = inputNickname.value.trim();
    if (!nick) return showError('Please enter a nickname');
    localStorage.setItem('nickname', nick);
    me.nickname = nick;

    try {
        const res = await fetch('/api/my-rooms');
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (data.roomId) {
            joinRoom(data.roomId);
        } else {
            showError("You don't have an active room.");
        }
    } catch (err) {
        showError(err.message);
    }
}

function joinRoom(roomId) {
    const nick = inputNickname.value.trim();
    if (!nick) return showError('Please enter a nickname');
    if (!roomId) return showError('Please enter a Room ID');
    localStorage.setItem('nickname', nick);
    me.nickname = nick;

    // Connect WS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?room=${roomId}&nickname=${encodeURIComponent(nick)}`;
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        mainMenu.classList.add('hidden');
        inGameUI.classList.remove('hidden');
        roomData.id = roomId;
        roomInfo.innerText = `Room: ${roomId}`;
        
        // Update URL for easy sharing without reloading
        window.history.replaceState({}, '', `?room=${roomId}`);
        
        appendChat('SYSTEM', 'Connected to room. Share URL to invite friends.', true);
    };

    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        handleServerMessage(msg);
    };

    ws.onclose = () => {
        showMainMenu('Connection lost. Please reconnect.');
    };
    
    ws.onerror = () => {
        showMainMenu('WebSocket error.');
    };
}

function handleServerMessage(msg) {
    if (msg.type === 'state') {
        roomData.state = msg.roomState;
        roomData.players = msg.players;
        
        // Find me and update my info if needed
        const myData = roomData.players.find(p => p.nickname === me.nickname); 
        if (myData) {
            me.id = myData.id;
            gameStateUI.innerText = `Status: ${roomData.state}`;
            playerRoleUI.innerText = myData.isHost ? `Role: Host` : `Role: Player`;
        }
    } else if (msg.type === 'chat') {
        appendChat(msg.sender, msg.text, msg.sender === 'SERVER');
    }
}

function sendChat(text) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
        type: 'chat',
        sender: me.nickname,
        text: text
    }));
}

function sendMove(x, y) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
        type: 'move',
        x: x,
        y: y
    }));
}

function appendChat(sender, text, isSystem = false) {
    const div = document.createElement('div');
    div.className = `chat-msg ${isSystem ? 'server' : ''}`;
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showMainMenu(errorText = '') {
    mainMenu.classList.remove('hidden');
    inGameUI.classList.add('hidden');
    if (ws) {
        ws.close();
        ws = null;
    }
    window.history.replaceState({}, '', window.location.pathname); 
    if (errorText) showError(errorText);
}

function showError(msg) {
    menuError.innerText = msg;
    setTimeout(() => { menuError.innerText = ''; }, 3000);
}

// Render & Update Loop
let lastTime = 0;
const MAP_SIZE = 2000;

function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000; // delta time in seconds
    lastTime = timestamp;

    if (ws && ws.readyState === WebSocket.OPEN && roomData.players) {
        update(dt);
        draw();
    } else if (mainMenu.classList.contains('hidden') === false) {
        // Draw background for menu
        drawMenuBackground();
    }

    requestAnimationFrame(gameLoop);
}

function update(dt) {
    if (document.activeElement === chatInput) {
        me.vx = 0; me.vy = 0;
    } else {
        // Input logic
        let dx = 0; let dy = 0;
        if (keys.w || keys.ArrowUp) dy -= 1;
        if (keys.s || keys.ArrowDown) dy += 1;
        if (keys.a || keys.ArrowLeft) dx -= 1;
        if (keys.d || keys.ArrowRight) dx += 1;

        // Normalize
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx*dx + dy*dy);
            dx /= length;
            dy /= length;
        }

        me.vx = dx * me.speed;
        me.vy = dy * me.speed;
    }

    if (me.vx !== 0 || me.vy !== 0) {
        me.x += me.vx * dt;
        me.y += me.vy * dt;
        // Clamp to map boundaries
        me.x = Math.max(0, Math.min(me.x, MAP_SIZE));
        me.y = Math.max(0, Math.min(me.y, MAP_SIZE));
        
        sendMove(me.x, me.y);
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#0f172a'; // Background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Camera setup - center on "me"
    ctx.save();
    const camX = canvas.width / 2 - me.x;
    const camY = canvas.height / 2 - me.y;
    ctx.translate(camX, camY);

    // Draw Grid (Placeholder map)
    drawGrid();

    // Draw players
    for (const p of roomData.players) {
        drawPlayer(p);
    }

    ctx.restore();
}

function drawGrid() {
    // Map ground
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Grid lines
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

    // Map boundaries
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);
}

function drawPlayer(p) {
    // Use the player's own reported position if it's them, or our local 'me' object if it's us 
    // to prevent jittering due to latency.
    const isMe = p.nickname === me.nickname;
    const x = isMe ? me.x : p.x;
    const y = isMe ? me.y : p.y;
    
    // Circle
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fillStyle = isMe ? '#3b82f6' : '#10b981'; // Blue for me, Green for others
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isMe ? '#60a5fa' : '#34d399';
    ctx.stroke();

    // Host indicator
    if (p.isHost) {
        ctx.fillStyle = '#fbbf24'; 
        ctx.beginPath();
        ctx.arc(x, y - 30, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Name tag
    ctx.fillStyle = '#fff';
    ctx.font = '14px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(p.nickname, x, y + 40);
}

function drawMenuBackground() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Decorative moving background
    const t = Date.now() / 2000;
    for(let i=0; i<15; i++) {
        ctx.beginPath();
        ctx.arc(
            canvas.width/2 + Math.cos(t + i*0.5)*300, 
            canvas.height/2 + Math.sin(t*0.8 + i*0.5)*300, 
            30 + i*5, 0, Math.PI*2
        );
        ctx.fillStyle = \`rgba(59, 130, 246, \${0.03 - i*0.001})\`;
        ctx.fill();
    }
}

init();
