import { CONFIG } from '../config';

// Basic render offsets and sizes
export const HEALTH_BAR_HEIGHT = 5;
export const HEALTH_BAR_OFFSET_Y = -35;
export const HOST_INDICATOR_RADIUS = 5;

// Replaced magic numbers for rendering positions
export const HOST_INDICATOR_DEFAULT_OFFSET_Y = -36;
export const PLAYER_NAME_OFFSET_Y = 36;

// Computed render constants
export const HEALTH_BAR_WIDTH = CONFIG.PLAYER_RADIUS * 2;
export const HOST_INDICATOR_OFFSET_X = CONFIG.PLAYER_RADIUS + 10;
export const HOST_INDICATOR_OFFSET_Y = HEALTH_BAR_OFFSET_Y + HEALTH_BAR_HEIGHT / 2;
