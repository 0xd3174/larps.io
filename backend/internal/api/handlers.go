package api

import (
	"encoding/json"
	"net/http"
	"os"

	"game-backend/internal/app"
	"game-backend/internal/game"
	"game-backend/internal/models"
	"game-backend/internal/ws"
)

func SetupRoutes(mux *http.ServeMux, a *app.App) {
	mux.HandleFunc("/api/rooms", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var settings models.RoomSettings
		// Set defaults
		settings.InitialSeekers = 1
		settings.RoundDuration = 120
		
		if r.Body != nil {
			json.NewDecoder(r.Body).Decode(&settings)
		}

		ip := ws.GetIP(r)
		roomID, err := game.CreateRoom(a, ip, settings)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"roomId": roomID})
	})




	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		roomID := r.URL.Query().Get("room")
		nickname := r.URL.Query().Get("nickname")
		if roomID == "" || nickname == "" {
			http.Error(w, "Missing room or nickname", http.StatusBadRequest)
			return
		}

		ws.ServeWS(a, w, r, roomID, nickname)
	})

	mux.HandleFunc("/api/map", func(w http.ResponseWriter, r *http.Request) {
		mapPath := os.Getenv("MAP_PATH")
		if mapPath == "" {
			mapPath = "../shared/map.json"
		}
		w.Header().Set("Content-Type", "application/json")
		http.ServeFile(w, r, mapPath)
	})
}
