import { me, stateContext } from './state';
import { createRoom, fetchMyRoom, joinRoom, sendChat } from './network';
import { keys } from './input';

// DOM Elements
const mainMenu = document.getElementById('mainMenu') as HTMLDivElement;
const inGameUI = document.getElementById('inGameUI') as HTMLDivElement;
export const chatInput = document.getElementById('chatInput') as HTMLInputElement;

const inputNickname = document.getElementById('nickname') as HTMLInputElement;
const inputRoomId = document.getElementById('roomId') as HTMLInputElement;
const menuError = document.getElementById('menuError') as HTMLParagraphElement;
const chatMessages = document.getElementById('chatMessages') as HTMLDivElement;

const roomInfo = document.getElementById('roomInfo') as HTMLSpanElement;
const gameStateUI = document.getElementById('gameState') as HTMLSpanElement;
const playerRoleUI = document.getElementById('playerRole') as HTMLSpanElement;

export function setupUI() {
    const btnJoin = document.getElementById('btnJoin') as HTMLButtonElement;
    const btnCreate = document.getElementById('btnCreate') as HTMLButtonElement;
    const btnMyRoom = document.getElementById('btnMyRoom') as HTMLButtonElement;

    const urlParams = new URLSearchParams(window.location.search);
    const inviteRoom = urlParams.get('room');
    if (inviteRoom) {
        inputRoomId.value = inviteRoom;
    }

    const savedNick = localStorage.getItem('nickname');
    if (savedNick) inputNickname.value = savedNick;

    btnJoin.addEventListener('click', () => {
        const nick = inputNickname.value.trim();
        const roomId = inputRoomId.value.trim();
        if (!nick) return showError('Please enter a nickname');
        if (!roomId) return showError('Please enter a Room ID');
        localStorage.setItem('nickname', nick);
        me.nickname = nick;
        joinRoom(roomId, nick);
    });

    btnCreate.addEventListener('click', async () => {
        const nick = inputNickname.value.trim();
        if (!nick) return showError('Please enter a nickname');
        localStorage.setItem('nickname', nick);
        me.nickname = nick;
        const roomId = await createRoom();
        if (roomId) joinRoom(roomId, nick);
    });

    btnMyRoom.addEventListener('click', async () => {
        const nick = inputNickname.value.trim();
        if (!nick) return showError('Please enter a nickname');
        localStorage.setItem('nickname', nick);
        me.nickname = nick;
        const roomId = await fetchMyRoom();
        if (roomId) joinRoom(roomId, nick);
    });

    setupKeyboardEvents();
}

function setupKeyboardEvents() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
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

    window.addEventListener('keyup', (e: KeyboardEvent) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    });

    chatInput.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            sendChat(chatInput.value.trim());
            chatInput.value = '';
            chatInput.blur();
        }
    });
}

export function updateInGameUI(roomId: string, state: string = 'lobby', isHost: boolean = false) {
    mainMenu.classList.add('hidden');
    inGameUI.classList.remove('hidden');
    roomInfo.innerText = `Room: ${roomId}`;
    gameStateUI.innerText = `Status: ${state}`;
    playerRoleUI.innerText = isHost ? `Role: Host` : `Role: Player`;
}

export function showMainMenu(errorText = '') {
    mainMenu.classList.remove('hidden');
    inGameUI.classList.add('hidden');
    if (stateContext.ws) {
        stateContext.ws.close();
        stateContext.ws = null;
    }
    window.history.replaceState({}, '', window.location.pathname); 
    if (errorText) showError(errorText);
}

export function showError(msg: string) {
    menuError.innerText = msg;
    setTimeout(() => { menuError.innerText = ''; }, 3000);
}

export function appendChat(sender: string, text: string, isSystem = false) {
    const div = document.createElement('div');
    div.className = `chat-msg ${isSystem ? 'server' : ''}`;
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function isMainMenuVisible() {
    return !mainMenu.classList.contains('hidden');
}

export function isChatFocused() {
    return document.activeElement === chatInput;
}
