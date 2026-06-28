import SharedConfig from '../../shared.json';

const PLAYER_RADIUS = SharedConfig.PLAYER_RADIUS;
const HEALTH_BAR_HEIGHT = 5;
const HEALTH_BAR_OFFSET_Y = -35;
export const CONFIG = {
    PLAYER_RADIUS,
    HOST_INDICATOR_RADIUS: 5,
    HEALTH_BAR_HEIGHT,
    HEALTH_BAR_OFFSET_Y,
    TILE_SIZE: 64,
    COLORS: {
        BACKGROUND: '#0f172a',
        GRID_LINE: 'rgba(255, 255, 255, 0.03)',
        MAP_BORDER: '#ef4444',
        SEEKER: '#ef4444',
        HIDER: '#3b82f6',
        LOBBY_OTHER: '#aaa',
        HOST_INDICATOR: '#fbbf24',
        TEXT: '#d1d1d1'
    },
    FONTS: {
        PLAYER_NAME: '12px sans-serif'
    }
};
