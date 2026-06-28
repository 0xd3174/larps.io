import { Game } from './Game';

export class UIManager {
    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.bindEvents();
    }

    private bindEvents() {
        document.getElementById('btnCreate')!.addEventListener('click', async () => {
            const roomId = await this.game.network.createRoom();
            if (roomId) this.joinLobby(roomId);
        });

        document.getElementById('btnJoin')!.addEventListener('click', () => {
            const roomId = (document.getElementById('roomId') as HTMLInputElement).value.trim();
            if (roomId) this.joinLobby(roomId);
        });

        document.getElementById('btnMyRoom')!.addEventListener('click', async () => {
            const roomId = await this.game.network.fetchMyRoom();
            if (roomId) this.joinLobby(roomId);
        });

        // If we want a startGameBtn, we should inject it or hook into an existing element
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                fetch(`/api/rooms/${this.game.roomId}/start`, { method: 'POST' });
            });
        }

        const chatInput = document.getElementById('chatInput') as HTMLInputElement;
        if (chatInput) {
            chatInput.addEventListener('focus', () => this.game.isChatFocused = true);
            chatInput.addEventListener('blur', () => this.game.isChatFocused = false);

            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const text = chatInput.value.trim();
                    if (text) {
                        this.game.network.sendChat(text);
                        chatInput.value = '';
                    }
                }
            });
        }
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
        document.getElementById('inGameUI')!.classList.add('hidden');
        if (errorMsg) {
            this.showError(errorMsg);
        }
    }

    public showError(msg: string) {
        const errDiv = document.getElementById('menuError')!;
        errDiv.innerText = msg;
        errDiv.classList.remove('hidden');
        setTimeout(() => errDiv.classList.add('hidden'), 3000);
    }

    public updateInGameUI(roomId: string, gameState: string = 'lobby', isHost: boolean = false) {
        document.getElementById('mainMenu')!.classList.add('hidden');
        document.getElementById('inGameUI')!.classList.remove('hidden');

        document.getElementById('roomInfo')!.innerText = `Room: ${roomId}`;
        
        // Dynamic Start Game Button
        let startBtn = document.getElementById('startGameBtn') as HTMLButtonElement;
        if (!startBtn) {
            startBtn = document.createElement('button');
            startBtn.id = 'startGameBtn';
            startBtn.className = 'btn primary-btn';
            startBtn.innerText = 'Start Game';
            startBtn.style.margin = '10px auto';
            startBtn.style.display = 'block';
            startBtn.addEventListener('click', () => {
                fetch(`/api/rooms/${this.game.roomId}/start`, { method: 'POST' });
            });
            document.getElementById('inGameUI')!.insertBefore(startBtn, document.getElementById('chatBox'));
        }

        if (gameState === 'lobby' && isHost) {
            startBtn.classList.remove('hidden');
        } else {
            startBtn.classList.add('hidden');
        }
    }

    public updateHUD(gameState: string, timeLeft: number) {
        const stateDiv = document.getElementById('gameState')!;
        if (gameState === 'playing') {
            stateDiv.innerText = `Time: ${Math.ceil(timeLeft)}s`;
        } else {
            stateDiv.innerText = `Lobby`;
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
