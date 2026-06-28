package main

import (
	"encoding/json"
	"math/rand"
)

func (r *Room) StartGame() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.State != "lobby" {
		return
	}

	var clients []*Client
	for c := range r.Clients {
		clients = append(clients, c)
	}

	if len(clients) < 2 {
		sysMsg, _ := json.Marshal(map[string]interface{}{
			"type":   "chat",
			"sender": "SERVER",
			"text":   "Need at least 2 players to start.",
		})
		r.broadcastRaw(sysMsg)
		return
	}

	for _, c := range clients {
		c.Role = "hider"
		c.Health = 100
		c.X = float64(100 + rand.Intn(100))
		c.Y = float64(100 + rand.Intn(100))
	}

	// Pick a random seeker
	seekerIdx := rand.Intn(len(clients))
	clients[seekerIdx].Role = "seeker"

	r.State = "playing"
	r.TimeLeft = 120 // 2 minutes round

	sysMsg, _ := json.Marshal(map[string]interface{}{
		"type":   "chat",
		"sender": "SERVER",
		"text":   "Game Started! " + clients[seekerIdx].Nickname + " is the Seeker!",
	})
	r.broadcastRaw(sysMsg)
	r.broadcastState()
}
