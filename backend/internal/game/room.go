package game

import (
	"encoding/json"
	"math"
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
			dt := 1.0 / 60.0
			for c := range r.Clients {
				var dx, dy float64
				if c.Up {
					dy -= 1
				}
				if c.Down {
					dy += 1
				}
				if c.Left {
					dx -= 1
				}
				if c.Right {
					dx += 1
				}

				if dx != 0 || dy != 0 {
					length := math.Sqrt(dx*dx + dy*dy)
					dx /= length
					dy /= length

					newX := c.X + dx*Config.PlayerSpeed*dt
					newY := c.Y + dy*Config.PlayerSpeed*dt

					if !IsWall(a.GameMap, newX, newY) {
						c.X = newX
						c.Y = newY
					} else {
						if !IsWall(a.GameMap, newX, c.Y) {
							c.X = newX
						} else if !IsWall(a.GameMap, c.X, newY) {
							c.Y = newY
						}
					}

					if a.GameMap != nil {
						if c.X < 0 { c.X = 0 }
						if c.Y < 0 { c.Y = 0 }
						if c.X > float64(a.GameMap.Width*a.GameMap.TileWidth) { c.X = float64(a.GameMap.Width * a.GameMap.TileWidth) }
						if c.Y > float64(a.GameMap.Height*a.GameMap.TileHeight) { c.Y = float64(a.GameMap.Height * a.GameMap.TileHeight) }
					}

					if tx, ty, ok := CheckTeleport(a.GameMap, c.X, c.Y); ok {
						c.X = tx
						c.Y = ty
					}
				}
			}

			if r.State == "playing" {
				r.TimeLeft -= dt

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

				if msg["type"] == "input" {
					senderID, _ := msg["_senderID"].(string)
					var senderClient *models.Client
					for c := range r.Clients {
						if c.ID == senderID {
							senderClient = c
							break
						}
					}

					if senderClient != nil {
						if up, ok := msg["up"].(bool); ok {
							senderClient.Up = up
						}
						if down, ok := msg["down"].(bool); ok {
							senderClient.Down = down
						}
						if left, ok := msg["left"].(bool); ok {
							senderClient.Left = left
						}
						if right, ok := msg["right"].(bool); ok {
							senderClient.Right = right
						}
					}
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
