import { me, roomData, stateContext } from './state';
import { Player } from './types';
import { appendChat, showMainMenu, showError, updateInGameUI } from './ui';

export async function createRoom() {
    try {
        const res = await fetch('/api/rooms', { method: 'POST' });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data.roomId;
    } catch (err: any) {
        showError(err.message);
        return null;
    }
}

export async function fetchMyRoom() {
    try {
        const res = await fetch('/api/my-rooms');
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!data.roomId) throw new Error("You don't have an active room.");
        return data.roomId;
    } catch (err: any) {
        showError(err.message);
        return null;
    }
}

export function joinRoom(roomId: string, nick: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?room=${roomId}&nickname=${encodeURIComponent(nick)}`;
    
    stateContext.ws = new WebSocket(wsUrl);

    stateContext.ws.onopen = () => {
        updateInGameUI(roomId);
        roomData.id = roomId;
        window.history.replaceState({}, '', `?room=${roomId}`);
        appendChat('SYSTEM', 'Connected to room. Share URL to invite friends.', true);
    };

    stateContext.ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        handleServerMessage(msg);
    };

    stateContext.ws.onclose = () => {
        showMainMenu('Connection lost. Please reconnect.');
    };
    
    stateContext.ws.onerror = () => {
        showMainMenu('WebSocket error.');
    };
}

function handleServerMessage(msg: any) {
    if (msg.type === 'state') {
        roomData.state = msg.roomState;
        roomData.timeLeft = msg.timeLeft || 0;
        roomData.players = msg.players;
        
        const myData = roomData.players.find((p: Player) => p.nickname === me.nickname); 
        if (myData) {
            me.id = myData.id;
            updateInGameUI(roomData.id as string, roomData.state, myData.isHost);

            // If the server teleports us (e.g. game start), sync the position
            const distSq = (me.x - myData.x)**2 + (me.y - myData.y)**2;
            if (distSq > 40000) { // 200 pixels
                me.x = myData.x;
                me.y = myData.y;
            }
        }
    } else if (msg.type === 'chat') {
        appendChat(msg.sender, msg.text, msg.sender === 'SERVER');
    } else if (msg.type === 'move') {
        const p = roomData.players.find((player: Player) => player.nickname === msg.nickname);
        if (p && p.nickname !== me.nickname) {
            p.x = msg.x;
            p.y = msg.y;
        }
    }
}

export function sendChat(text: string) {
    if (!stateContext.ws || stateContext.ws.readyState !== WebSocket.OPEN) return;
    stateContext.ws.send(JSON.stringify({
        type: 'chat',
        sender: me.nickname,
        text: text
    }));
}

export function sendMove(x: number, y: number) {
    if (!stateContext.ws || stateContext.ws.readyState !== WebSocket.OPEN) return;
    stateContext.ws.send(JSON.stringify({
        type: 'move',
        x: x,
        y: y
    }));
}
