package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	err := LoadMap("../frontend/public/map.json")
	if err != nil {
		log.Println("Warning: Could not load map.json. Collisions disabled.", err)
	}

	manager := NewManager()

	// API Endpoints
	http.HandleFunc("/api/rooms", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		ip := getIP(r)
		roomID, err := manager.CreateRoom(ip)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"roomId": roomID})
	})

	http.HandleFunc("/api/my-rooms", func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)
		roomID := manager.GetRoomByIP(ip)
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"roomId": roomID})
	})

	// WebSocket Endpoint
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		roomID := r.URL.Query().Get("room")
		nickname := r.URL.Query().Get("nickname")
		if roomID == "" || nickname == "" {
			http.Error(w, "Missing room or nickname", http.StatusBadRequest)
			return
		}

		manager.ServeWS(w, r, roomID, nickname)
	})

	// Serve Frontend
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../frontend/dist"
	}

	if _, err := os.Stat(staticDir); os.IsNotExist(err) {
		log.Printf("Warning: static directory %s does not exist. Only API served.", staticDir)
	} else {
		fs := http.FileServer(http.Dir(staticDir))
		http.Handle("/", fs)
	}

	log.Printf("Server starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func getIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	// RemoteAddr includes port, split it
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}
	return ip
}
