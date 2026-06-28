package main

import (
	"log"
	"net/http"
	"os"

	"game-backend/internal/api"
	"game-backend/internal/app"
	"game-backend/internal/game"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mapPath := os.Getenv("MAP_PATH")
	if mapPath == "" {
		mapPath = "../frontend/public/map.json"
	}

	gameMap, err := game.LoadMap(mapPath)
	if err != nil {
		log.Println("Warning: Could not load map.json. Collisions disabled.", err)
	}

	application := app.NewApp(gameMap)

	mux := http.NewServeMux()
	api.SetupRoutes(mux, application)

	// Serve Frontend
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../frontend/dist"
	}

	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		log.Printf("Warning: static directory %s does not exist. Only API served.", staticDir)
	} else {
		fs := http.FileServer(http.Dir(staticDir))
		mux.Handle("/", fs)
	}

	log.Printf("Server starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
