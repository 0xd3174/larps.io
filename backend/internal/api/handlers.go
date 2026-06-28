package api

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"game-backend/internal/app"
	"game-backend/internal/game"
	"game-backend/internal/ws"
)

func SetupRoutes(mux *http.ServeMux, a *app.App) {
	mux.HandleFunc("/api/rooms", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		ip := ws.GetIP(r)
		roomID, err := game.CreateRoom(a, ip)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"roomId": roomID})
	})

	mux.HandleFunc("/api/my-rooms", func(w http.ResponseWriter, r *http.Request) {
		ip := ws.GetIP(r)
		roomID := game.GetRoomByIP(a, ip)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"roomId": roomID})
	})

	mux.HandleFunc("/api/rooms/", func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) == 5 && parts[4] == "start" && r.Method == http.MethodPost {
			roomID := parts[3]
			a.Manager.Mu.RLock()
			room, exists := a.Manager.Rooms[roomID]
			a.Manager.Mu.RUnlock()

			if exists && room.State == "lobby" && ws.GetIP(r) == room.HostIP {
				game.StartGame(room, a.GameMap)
				w.WriteHeader(http.StatusOK)
				return
			}
		}
		http.Error(w, "Not found or unauthorized", http.StatusNotFound)
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
