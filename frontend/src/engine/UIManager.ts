import { Game } from './Game';

export class UIManager {
    private game: Game;

    constructor(game: Game) {
        this.game = game;
        this.bindEvents();
    }

    private bindEvents() {
        document.getElementById('btnCreate')!.addEventListener('click', async () => {
            const initialSeekersInput = document.getElementById('initialSeekers') as HTMLInputElement;
            const roundDurationInput = document.getElementById('roundDuration') as HTMLInputElement;
            const seekers = parseInt(initialSeekersInput?.value) || 1;
            const duration = parseInt(roundDurationInput?.value) || 120;
            const roomId = await this.game.network.createRoom(seekers, duration);
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

        // No startGameBtn as requested by user

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
                    chatInput.blur();
                } else if (e.key === 'Escape') {
                    chatInput.blur();
                }
            });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && document.activeElement !== chatInput) {
                    const inGameUI = document.getElementById('inGameUI');
                    if (inGameUI && !inGameUI.classList.contains('hidden')) {
                        chatInput.focus();
                        e.preventDefault();
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
        el.className = isSystem ? 'chat-msg server' : 'chat-msg';

        const senderSpan = document.createElement('strong');
        senderSpan.textContent = isSystem ? `[${sender}]` : `${sender}:`;

        const textNode = document.createTextNode(' ' + text);

        el.appendChild(senderSpan);
        el.appendChild(textNode);
        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
    }
}
