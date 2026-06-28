package game

import (
	"encoding/json"
	"log"
	"math"
	"encoding/binary"
	"math/rand"
	"time"

	"game-backend/internal/app"
	"game-backend/internal/models"
)

func StartGame(r *models.Room, gameMap *models.MapData) {
	r.Action <- func() {
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

	numSeekers := r.Settings.InitialSeekers
	if numSeekers < 1 {
		numSeekers = 1
	}
	if numSeekers >= len(clients) {
		numSeekers = len(clients) - 1
		if numSeekers < 1 {
			numSeekers = 1
		}
	}

	rand.Shuffle(len(clients), func(i, j int) {
		clients[i], clients[j] = clients[j], clients[i]
	})

	hiderSpawns := GetSpawnPoints(gameMap, "hider")
	seekerSpawns := GetSpawnPoints(gameMap, "seeker")

	var seekerNames string

	for i, c := range clients {
		c.Health = 100
		if i < numSeekers {
			c.Role = "seeker"
			seekerNames += c.Nickname + ", "
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
	r.TimeLeft = float64(r.Settings.RoundDuration)
	if r.TimeLeft <= 0 {
		r.TimeLeft = 120 // fallback
	}
	r.SeekersLockedTime = 30.0

	if len(seekerNames) > 2 {
		seekerNames = seekerNames[:len(seekerNames)-2]
	}

	sysMsg, _ := json.Marshal(map[string]interface{}{
		"type":   "chat",
		"sender": "SERVER",
		"text":   "Game Started! Seekers: " + seekerNames + ". Seekers are frozen for 30 seconds!",
	})
	BroadcastRaw(r, sysMsg)
	BroadcastState(r)
	}
}

func RunRoom(r *models.Room, a *app.App) {
	ticker := time.NewTicker(time.Second / 60)
	defer ticker.Stop()

	lastTime := time.Now()
	var ticks int
	var tickTimer float64
	var networkTimer float64

	type clientState struct {
		X, Y   float64
		Health float64
		Role   string
	}
	prevStates := make(map[uint32]clientState)
	var lastTimeLeft uint16

	for {
		select {
		case <-r.Stop:
			for client := range r.Clients {
				close(client.Send)
			}
			return
		case fn := <-r.Action:
			fn()
		case t := <-ticker.C:
			dt := t.Sub(lastTime).Seconds()
			lastTime = t

			ticks++
			tickTimer += dt
			networkTimer += dt
			if tickTimer >= 1.0 {
				if ticks < 55 {
					log.Printf("[Room %s] Performance Warning: TPS dropped to %d (Expected: 60)", r.ID, ticks)
				}
				ticks = 0
				tickTimer -= 1.0
			}
			
			// Cap dt to prevent massive jumps if the server hangs briefly
			if dt > 0.1 {
				dt = 0.1
			}

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
					if c.Role == "seeker" && r.SeekersLockedTime > 0 {
						continue
					}
					length := math.Sqrt(dx*dx + dy*dy)
					dx /= length
					dy /= length

					newX := c.X + dx*Config.PlayerSpeed*dt
					newY := c.Y + dy*Config.PlayerSpeed*dt

					c.X, c.Y = ResolveMapCollision(a.GameMap, newX, newY, float64(Config.PlayerRadius))

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
				if r.SeekersLockedTime > 0 {
					r.SeekersLockedTime -= dt
					if r.SeekersLockedTime <= 0 {
						sysMsg, _ := json.Marshal(map[string]interface{}{
							"type":   "chat",
							"sender": "SERVER",
							"text":   "30 seconds have passed! Seekers are unleashed!",
						})
						BroadcastRaw(r, sysMsg)
					}
				}

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
							c2.Health -= 100.0 * dt
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
					r.SeekersLockedTime = 0
					sysMsg, _ := json.Marshal(map[string]interface{}{
						"type":   "chat",
						"sender": "SERVER",
						"text":   "Time's up! Hiders win!",
					})
					BroadcastRaw(r, sysMsg)
					BroadcastState(r)
				} else if hidersCount == 0 && seekersCount > 0 {
					r.State = "lobby"
					r.SeekersLockedTime = 0
					sysMsg, _ := json.Marshal(map[string]interface{}{
						"type":   "chat",
						"sender": "SERVER",
						"text":   "All hiders captured! Seekers win!",
					})
					BroadcastRaw(r, sysMsg)
					BroadcastState(r)
				}
			}

			if networkTimer >= 1.0/60.0 {
				networkTimer -= 1.0 / 60.0

				currentTimeLeft := uint16(r.TimeLeft)
				if r.TimeLeft < 0 {
					currentTimeLeft = 0
				}

				var deltas []byte
				for c := range r.Clients {
					prev, ok := prevStates[c.NetworkID]
					if !ok || math.Abs(c.X-prev.X) > 0.1 || math.Abs(c.Y-prev.Y) > 0.1 || c.Health != prev.Health || c.Role != prev.Role {
						var roleByte uint8 = 0
						if c.Role == "hider" {
							roleByte = 1
						} else if c.Role == "seeker" {
							roleByte = 2
						}

						buf := make([]byte, 14)
						binary.LittleEndian.PutUint32(buf[0:4], c.NetworkID)
						binary.LittleEndian.PutUint32(buf[4:8], math.Float32bits(float32(c.X)))
						binary.LittleEndian.PutUint32(buf[8:12], math.Float32bits(float32(c.Y)))
						buf[12] = uint8(c.Health)
						buf[13] = roleByte

						deltas = append(deltas, buf...)
						prevStates[c.NetworkID] = clientState{X: c.X, Y: c.Y, Health: c.Health, Role: c.Role}
					}
				}

				if len(deltas) > 0 || currentTimeLeft != lastTimeLeft {
					lastTimeLeft = currentTimeLeft
					header := make([]byte, 4)
					header[0] = 0x01
					binary.LittleEndian.PutUint16(header[1:3], currentTimeLeft)
					header[3] = uint8(len(deltas) / 14)
					BroadcastRaw(r, append(header, deltas...))
				}
			}

		case client := <-r.Register:
			r.Clients[client] = true
			BroadcastState(r)

		case client := <-r.Unregister:
			_, ok := r.Clients[client]
			if ok {
				delete(r.Clients, client)
			}
			if ok {
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
					HandleChatMessage(r, a, msg)
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
			"networkId": c.NetworkID,
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
