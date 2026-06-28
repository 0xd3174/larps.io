package game

import (
	"encoding/json"
	"math/rand"
	"time"

	"game-backend/internal/app"
	"game-backend/internal/models"
)

func StartGame(r *models.Room, gameMap *models.MapData) {
	r.Mu.Lock()
	defer r.Mu.Unlock()

	if r.State != "lobby" {
		return
	}

	var clients []*models.Client
	for c := range r.Clients {
		clients = append(clients, c)
	}

	if len(clients) < 2 {
		sysMsg, _ := json.Marshal(map[string]interface{}{
			"type":   "chat",
			"sender": "SERVER",
			"text":   "Need at least 2 players to start.",
		})
		BroadcastRaw(r, sysMsg)
		return
	}

	seekerIdx := rand.Intn(len(clients))

	hiderSpawns := GetSpawnPoints(gameMap, "Hider")
	seekerSpawns := GetSpawnPoints(gameMap, "Seeker")

	for i, c := range clients {
		c.Health = 100
		if i == seekerIdx {
			c.Role = "seeker"
			if len(seekerSpawns) > 0 {
				spawn := seekerSpawns[rand.Intn(len(seekerSpawns))]
				c.X = spawn.X
				c.Y = spawn.Y
			} else {
				c.X = float64(100 + rand.Intn(100))
				c.Y = float64(100 + rand.Intn(100))
			}
		} else {
			c.Role = "hider"
			if len(hiderSpawns) > 0 {
				spawn := hiderSpawns[rand.Intn(len(hiderSpawns))]
				c.X = spawn.X
				c.Y = spawn.Y
			} else {
				c.X = float64(100 + rand.Intn(100))
				c.Y = float64(100 + rand.Intn(100))
			}
		}
	}

	r.State = "playing"
	r.TimeLeft = 120 // 2 minutes round

	sysMsg, _ := json.Marshal(map[string]interface{}{
		"type":   "chat",
		"sender": "SERVER",
		"text":   "Game Started! " + clients[seekerIdx].Nickname + " is the Seeker!",
	})
	BroadcastRaw(r, sysMsg)
	BroadcastState(r)
}

func RunRoom(r *models.Room, a *app.App) {
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
									"type":   "chat",
									"sender": "SERVER",
									"text":   c2.Nickname + " was captured and is now a seeker!",
								})
								BroadcastRaw(r, sysMsg)
							}
						}
					}
				}

				if r.TimeLeft <= 0 {
					r.State = "lobby"
					sysMsg, _ := json.Marshal(map[string]interface{}{
						"type":   "chat",
						"sender": "SERVER",
						"text":   "Time's up! Hiders win!",
					})
					BroadcastRaw(r, sysMsg)
				} else if hidersCount == 0 && seekersCount > 0 {
					r.State = "lobby"
					sysMsg, _ := json.Marshal(map[string]interface{}{
						"type":   "chat",
						"sender": "SERVER",
						"text":   "All hiders captured! Seekers win!",
					})
					BroadcastRaw(r, sysMsg)
				}
			}

			BroadcastState(r)

		case client := <-r.Register:
			r.Clients[client] = true
			BroadcastState(r)

		case client := <-r.Unregister:
			if _, ok := r.Clients[client]; ok {
				delete(r.Clients, client)
				close(client.Send)

				if len(r.Clients) == 0 {
					RemoveRoom(a, r.ID)
					return // Room dies
				}

				// If host leaves, pick new host
				if client.IP == r.HostIP {
					for c := range r.Clients {
						oldHostIP := r.HostIP
						r.HostIP = c.IP
						ChangeHost(a, r.ID, oldHostIP, c.IP)

						// Notify new host
						msg, _ := json.Marshal(map[string]interface{}{
							"type":   "chat",
							"sender": "SERVER",
							"text":   "You are now the room host.",
						})
						c.Send <- msg
						break
					}
				}
				BroadcastState(r)
			}

		case message := <-r.Broadcast:
			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err == nil {
				if msg["type"] == "chat" {
					text, _ := msg["text"].(string)
					senderIP, _ := msg["_senderIP"].(string)

					delete(msg, "_senderIP")
					delete(msg, "_senderID")
					cleanMessage, _ := json.Marshal(msg)

					if text == "/start" && senderIP == r.HostIP && r.State == "lobby" {
						StartGame(r, a.GameMap)
						continue
					}

					BroadcastRaw(r, cleanMessage)
					continue
				}

				if msg["type"] == "move" {
					senderID, _ := msg["_senderID"].(string)
					var senderClient *models.Client
					for c := range r.Clients {
						if c.ID == senderID {
							senderClient = c
							break
						}
					}

					if senderClient != nil {
						var newX, newY float64
						if x, ok := msg["x"].(float64); ok {
							newX = x
						} else {
							newX = senderClient.X
						}
						if y, ok := msg["y"].(float64); ok {
							newY = y
						} else {
							newY = senderClient.Y
						}

						if !IsWall(a.GameMap, newX, newY) {
							senderClient.X = newX
							senderClient.Y = newY
						} else {
							if !IsWall(a.GameMap, newX, senderClient.Y) {
								senderClient.X = newX
							} else if !IsWall(a.GameMap, senderClient.X, newY) {
								senderClient.Y = newY
							}
						}

						if tx, ty, ok := CheckTeleport(a.GameMap, senderClient.X, senderClient.Y); ok {
							senderClient.X = tx
							senderClient.Y = ty
						}
					}
					// We don't broadcast move explicitly, state broadcast will handle it
					continue
				}

				delete(msg, "_senderIP")
				delete(msg, "_senderID")
				cleanMessage, _ := json.Marshal(msg)
				BroadcastRaw(r, cleanMessage)
			}
		}
	}
}

func BroadcastState(r *models.Room) {
	players := make([]map[string]interface{}, 0)
	for c := range r.Clients {
		players = append(players, map[string]interface{}{
			"id":       c.ID,
			"nickname": c.Nickname,
			"isHost":   c.IP == r.HostIP,
			"x":        c.X,
			"y":        c.Y,
			"role":     c.Role,
			"health":   c.Health,
		})
	}

	stateMsg, _ := json.Marshal(map[string]interface{}{
		"type":      "state",
		"roomState": r.State,
		"timeLeft":  r.TimeLeft,
		"players":   players,
	})
	BroadcastRaw(r, stateMsg)
}

func BroadcastRaw(r *models.Room, msg []byte) {
	for client := range r.Clients {
		select {
		case client.Send <- msg:
		default:
			close(client.Send)
			delete(r.Clients, client)
		}
	}
}
