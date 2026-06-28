import { Game } from './Game';

export class UIManager {
    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.bindEvents();
    }

    private bindEvents() {
        document.getElementById('createRoomBtn')!.addEventListener('click', async () => {
            const roomId = await this.game.network.createRoom();
            if (roomId) this.joinLobby(roomId);
        });

        document.getElementById('joinRoomBtn')!.addEventListener('click', () => {
            const roomId = prompt("Enter room ID to join:");
            if (roomId) this.joinLobby(roomId);
        });

        document.getElementById('reconnectBtn')!.addEventListener('click', async () => {
            const roomId = await this.game.network.fetchMyRoom();
            if (roomId) this.joinLobby(roomId);
        });

        document.getElementById('startGameBtn')!.addEventListener('click', () => {
            fetch(`/api/rooms/${this.game.roomId}/start`, { method: 'POST' });
        });

        const chatInput = document.getElementById('chatInput') as HTMLInputElement;
        chatInput.addEventListener('focus', () => this.game.isChatFocused = true);
        chatInput.addEventListener('blur', () => this.game.isChatFocused = false);

        document.getElementById('chatForm')!.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (text) {
                this.game.network.sendChat(text);
                chatInput.value = '';
            }
        });
    }

    public joinLobby(roomId: string) {
        const inputNickname = document.getElementById('nickname') as HTMLInputElement;
        const nick = inputNickname.value.trim() || 'Player';
        localStorage.setItem('nickname', nick);
        
        this.game.startRoom(roomId, nick);
    }

    public init() {
        const savedNick = localStorage.getItem('nickname');
        if (savedNick) {
            (document.getElementById('nickname') as HTMLInputElement).value = savedNick;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const urlRoomId = urlParams.get('room');

        if (urlRoomId) {
            this.joinLobby(urlRoomId);
        } else {
            this.showMainMenu();
        }
    }

    public showMainMenu(errorMsg?: string) {
        document.getElementById('mainMenu')!.classList.remove('hidden');
        document.getElementById('inGame')!.classList.add('hidden');
        if (errorMsg) {
            this.showError(errorMsg);
        }
    }

    public showError(msg: string) {
        const errDiv = document.getElementById('errorMsg')!;
        errDiv.innerText = msg;
        errDiv.classList.remove('hidden');
        setTimeout(() => errDiv.classList.add('hidden'), 3000);
    }

    public updateInGameUI(roomId: string, gameState: string = 'lobby', isHost: boolean = false) {
        document.getElementById('mainMenu')!.classList.add('hidden');
        document.getElementById('inGame')!.classList.remove('hidden');

        document.getElementById('roomDisplay')!.innerText = `Room: ${roomId}`;
        
        const startBtn = document.getElementById('startGameBtn') as HTMLButtonElement;
        if (gameState === 'lobby' && isHost) {
            startBtn.classList.remove('hidden');
        } else {
            startBtn.classList.add('hidden');
        }
    }

    public updateHUD(gameState: string, timeLeft: number) {
        const overlay = document.getElementById('gameOverlay')!;
        if (gameState === 'playing') {
            overlay.classList.remove('hidden');
            document.getElementById('timeDisplay')!.innerText = `Time: ${Math.ceil(timeLeft)}s`;
        } else {
            overlay.classList.add('hidden');
        }
    }

    public appendChat(sender: string, text: string, isSystem: boolean = false) {
        const messages = document.getElementById('chatMessages')!;
        const el = document.createElement('div');
        el.className = 'mb-1';
        if (isSystem) {
            el.innerHTML = `<span class="text-yellow-400 font-bold">[${sender}]</span> <span class="text-yellow-200">${text}</span>`;
        } else {
            el.innerHTML = `<span class="text-blue-400 font-bold">${sender}:</span> <span class="text-white">${text}</span>`;
        }
        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
    }
}
