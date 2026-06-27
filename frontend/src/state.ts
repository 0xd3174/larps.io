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

export const MAP_SIZE = 2000;
