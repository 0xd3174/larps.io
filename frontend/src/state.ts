import { RoomData, Me } from './types';

export const roomData: RoomData = {
    id: null,
    state: 'lobby',
    timeLeft: 0,
    players: []
};

export const me: Me = {
    id: null,
    nickname: '',
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    speed: 250
};

export const stateContext = {
    ws: null as WebSocket | null
};

export let MAP_WIDTH = 2000;
export let MAP_HEIGHT = 2000;

export function setMapSize(w: number, h: number) {
    MAP_WIDTH = w;
    MAP_HEIGHT = h;
}
