package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all for now
	},
}

type Manager struct {
	rooms   map[string]*Room
	ipRooms map[string]string // IP -> RoomID
	mu      sync.RWMutex
}

func NewManager() *Manager {
	return &Manager{
		rooms:   make(map[string]*Room),
		ipRooms: make(map[string]string),
	}
}

func (m *Manager) CreateRoom(ip string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.ipRooms[ip]; exists {
		return "", errors.New("you already have an active room")
	}

	bytes := make([]byte, 3)
	rand.Read(bytes)
	roomID := hex.EncodeToString(bytes) // 6 char hex

	room := &Room{
		ID:         roomID,
		HostIP:     ip,
		State:      "lobby",
		Clients:    make(map[*Client]bool),
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		manager:    m,
	}

	m.rooms[roomID] = room
	m.ipRooms[ip] = roomID

	go room.Run()

	return roomID, nil
}

func (m *Manager) GetRoomByIP(ip string) string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.ipRooms[ip]
}

func (m *Manager) RemoveRoom(roomID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if room, exists := m.rooms[roomID]; exists {
		delete(m.ipRooms, room.HostIP)
		delete(m.rooms, roomID)
	}
}

func (m *Manager) ChangeHost(roomID, oldIP, newIP string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.ipRooms, oldIP)
	m.ipRooms[newIP] = roomID
}

func (m *Manager) ServeWS(w http.ResponseWriter, r *http.Request, roomID, nickname string) {
	m.mu.RLock()
	room, exists := m.rooms[roomID]
	m.mu.RUnlock()

	if !exists {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := &Client{
		ID:       generateID(),
		Room:     room,
		Conn:     conn,
		Send:     make(chan []byte, 256),
		IP:       getIP(r),
		Nickname: nickname,
		Role:     "lobby",
		Health:   100,
	}

	client.Room.Register <- client

	go client.WritePump()
	go client.ReadPump()
}

type Room struct {
	ID         string
	HostIP     string
	State      string // "lobby", "playing"
	TimeLeft   float64
	Clients    map[*Client]bool
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	manager    *Manager
}

func (r *Room) Run() {
	ticker := time.NewTicker(time.Second / 60)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if r.State == "playing" {
				r.TimeLeft -= 1.0 / 60.0
				
				hidersCount := 0
				seekersCount := 0

				for c := range r.Clients {
					if c.Role == "hider" {
						hidersCount++
					} else if c.Role == "seeker" {
						seekersCount++
					}
				}

				for c1 := range r.Clients {
					if c1.Role != "seeker" {
						continue
					}
					for c2 := range r.Clients {
						if c2.Role != "hider" {
							continue
						}
						dx := c1.X - c2.X
						dy := c1.Y - c2.Y
						distSq := dx*dx + dy*dy
						
						if distSq < 1600 {
							c2.Health -= 100.0 / 60.0
							if c2.Health <= 0 {
								c2.Role = "seeker"
								c2.Health = 100
								sysMsg, _ := json.Marshal(map[string]interface{}{
									"type": "chat",
									"sender": "SERVER",
									"text": c2.Nickname + " was captured and is now a seeker!",
								})
								r.broadcastRaw(sysMsg)
							}
						}
					}
				}

				if r.TimeLeft <= 0 {
					r.State = "lobby"
					sysMsg, _ := json.Marshal(map[string]interface{}{
						"type": "chat",
						"sender": "SERVER",
						"text": "Time's up! Hiders win!",
					})
					r.broadcastRaw(sysMsg)
				} else if hidersCount == 0 && seekersCount > 0 {
					r.State = "lobby"
					sysMsg, _ := json.Marshal(map[string]interface{}{
						"type": "chat",
						"sender": "SERVER",
						"text": "All hiders captured! Seekers win!",
					})
					r.broadcastRaw(sysMsg)
				}
				
				r.broadcastState()
			}

		case client := <-r.Register:
			r.Clients[client] = true
			r.broadcastState()

		case client := <-r.Unregister:
			if _, ok := r.Clients[client]; ok {
				delete(r.Clients, client)
				close(client.Send)

				if len(r.Clients) == 0 {
					r.manager.RemoveRoom(r.ID)
					return // Room dies
				}

				// If host leaves, pick new host
				if client.IP == r.HostIP {
					for c := range r.Clients {
						oldHostIP := r.HostIP
						r.HostIP = c.IP
						r.manager.ChangeHost(r.ID, oldHostIP, c.IP)
						
						// Notify new host
						msg, _ := json.Marshal(map[string]interface{}{
							"type": "chat",
							"sender": "SERVER",
							"text": "You are now the room host.",
						})
						c.Send <- msg
						break
					}
				}
				r.broadcastState()
			}

		case message := <-r.Broadcast:
			// Process incoming message
			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err == nil {
				// Intercept chat for /start command
				if msg["type"] == "chat" {
					text, _ := msg["text"].(string)
					senderIP, _ := msg["_senderIP"].(string)
					
					// Remove senderIP before broadcasting so we don't leak it to clients
					delete(msg, "_senderIP")
					cleanMessage, _ := json.Marshal(msg)

					if text == "/start" && senderIP == r.HostIP && r.State == "lobby" {
						var clients []*Client
						for c := range r.Clients {
							clients = append(clients, c)
						}
						
						if len(clients) < 2 {
							sysMsg, _ := json.Marshal(map[string]interface{}{
								"type": "chat",
								"sender": "SERVER",
								"text": "Need at least 2 players to start.",
							})
							r.broadcastRaw(sysMsg)
							continue
						}

						for _, c := range clients {
							c.Role = "hider"
							c.Health = 100
						}

						b := make([]byte, 1)
						rand.Read(b)
						seekerIdx := int(b[0]) % len(clients)
						clients[seekerIdx].Role = "seeker"

						r.State = "playing"
						r.TimeLeft = 120 // 2 minutes round

						sysMsg, _ := json.Marshal(map[string]interface{}{
							"type": "chat",
							"sender": "SERVER",
							"text": "Game Started! " + clients[seekerIdx].Nickname + " is the Seeker!",
						})
						r.broadcastRaw(sysMsg)
						r.broadcastState()
						continue
					}
					
					r.broadcastRaw(cleanMessage)
					continue
				}

				// Remove internal senderIP for other messages too
				delete(msg, "_senderIP")
				cleanMessage, _ := json.Marshal(msg)
				r.broadcastRaw(cleanMessage)
			}
		}
	}
}

func (r *Room) broadcastState() {
	players := make([]map[string]interface{}, 0)
	for c := range r.Clients {
		players = append(players, map[string]interface{}{
			"id": c.ID,
			"nickname": c.Nickname,
			"isHost": c.IP == r.HostIP,
			"x": c.X,
			"y": c.Y,
			"role": c.Role,
			"health": c.Health,
		})
	}

	stateMsg, _ := json.Marshal(map[string]interface{}{
		"type": "state",
		"roomState": r.State,
		"timeLeft": r.TimeLeft,
		"players": players,
	})
	r.broadcastRaw(stateMsg)
}

func (r *Room) broadcastRaw(msg []byte) {
	for client := range r.Clients {
		select {
		case client.Send <- msg:
		default:
			close(client.Send)
			delete(r.Clients, client)
		}
	}
}

type Client struct {
	ID       string
	Room     *Room
	Conn     *websocket.Conn
	Send     chan []byte
	IP       string
	Nickname string
	Role     string
	Health   float64
	X, Y     float64
}

func (c *Client) ReadPump() {
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
			// Update position if movement message
			if parsed["type"] == "move" {
				if x, ok := parsed["x"].(float64); ok { c.X = x }
				if y, ok := parsed["y"].(float64); ok { c.Y = y }
			}
			
			// Inject sender IP for server logic
			parsed["_senderIP"] = c.IP
			
			// Re-marshal and pass to room
			msgBytes, _ := json.Marshal(parsed)
			c.Room.Broadcast <- msgBytes
		}
	}
}

func (c *Client) WritePump() {
	defer c.Conn.Close()
	for {
		message, ok := <-c.Send
		if !ok {
			c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}
		c.Conn.WriteMessage(websocket.TextMessage, message)
	}
}

func generateID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}
