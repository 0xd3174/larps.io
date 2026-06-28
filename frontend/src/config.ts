import SharedConfig from '../../shared/config.json';

export const CONFIG = {
    PLAYER_RADIUS: SharedConfig.PLAYER_RADIUS,
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
