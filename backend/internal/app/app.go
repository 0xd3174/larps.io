package app

import (
	"game-backend/internal/models"
)

type App struct {
	Manager *models.Manager
	GameMap *models.MapData
}

func NewApp(gameMap *models.MapData) *App {
	return &App{
		Manager: &models.Manager{
			Rooms:   make(map[string]*models.Room),
			IpRooms: make(map[string]string),
		},
		GameMap: gameMap,
	}
}
