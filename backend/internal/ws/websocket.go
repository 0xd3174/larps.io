package ws

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	mrand "math/rand"
	"net"
	"net/http"
	"strings"
	"unicode"

	"github.com/gorilla/websocket"
	"game-backend/internal/app"
	"game-backend/internal/game"
	"game-backend/internal/models"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all for now
	},
}

const maxNicknameLen = 20

func SanitizeNickname(raw string) string {
	nick := strings.TrimSpace(raw)
	// Remove control characters
	nick = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, nick)
	if len([]rune(nick)) > maxNicknameLen {
		nick = string([]rune(nick)[:maxNicknameLen])
	}
	return nick
}

func ServeWS(a *app.App, w http.ResponseWriter, r *http.Request, roomID, nickname string) {
	nickname = SanitizeNickname(nickname)
	if nickname == "" {
		http.Error(w, "Invalid nickname", http.StatusBadRequest)
		return
	}
	a.Manager.Mu.RLock()
	room, exists := a.Manager.Rooms[roomID]
	a.Manager.Mu.RUnlock()

	if !exists {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	nickTaken := make(chan bool)
	room.Action <- func() {
		for c := range room.Clients {
			if c.Nickname == nickname {
				nickTaken <- true
				return
			}
		}
		nickTaken <- false
	}

	if <-nickTaken {
		http.Error(w, "Nickname already taken", http.StatusConflict)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	hiderSpawns := game.GetSpawnPoints(a.GameMap, "hider")
	var startX, startY float64
	if len(hiderSpawns) > 0 {
		spawn := hiderSpawns[mrand.Intn(len(hiderSpawns))]
		startX = spawn.X
		startY = spawn.Y
	} else {
		startX = float64(100 + mrand.Intn(100))
		startY = float64(100 + mrand.Intn(100))
	}

	client := &models.Client{
		ID:       generateID(),
		Room:     room,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		IP:       GetIP(r),
		Nickname: nickname,
		Role:     "lobby",
		Health:   100,
		X:        startX,
		Y:        startY,
	}

	client.Room.Register <- client

	go WritePump(client)
	go ReadPump(client)

	initMsg, _ := json.Marshal(map[string]interface{}{
		"type": "init",
		"id":   client.ID,
	})
	client.Send <- initMsg
}

func ReadPump(c *models.Client) {
	defer func() {
		c.Room.Unregister <- c
		c.Conn.Close()
	}()

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		var parsed map[string]interface{}
		if err := json.Unmarshal(message, &parsed); err == nil {
			parsed["_senderIP"] = c.IP
			parsed["_senderID"] = c.ID

			msgBytes, _ := json.Marshal(parsed)
			c.Room.Broadcast <- msgBytes
		}
	}
}

func WritePump(c *models.Client) {
	defer c.Conn.Close()
	for {
		message, ok := <-c.Send
		if !ok {
			c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}
		if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}

func generateID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func GetIP(r *http.Request) string {
	ip := r.Header.Get("X-Real-IP")
	if ip == "" {
		ip = r.Header.Get("X-Forwarded-For")
	}

	if ip != "" {
		if parts := strings.Split(ip, ","); len(parts) > 0 {
			ip = strings.TrimSpace(parts[0])
		}
		return ip
	}

	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}
