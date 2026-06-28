package game

import (
	"encoding/json"
	"time"

	"game-backend/internal/app"
	"game-backend/internal/models"
)

// HandleChatMessage processes chat messages and commands for a room.
func HandleChatMessage(r *models.Room, a *app.App, msg map[string]interface{}) {
	text, _ := msg["text"].(string)
	senderIP, _ := msg["_senderIP"].(string)
	senderID, _ := msg["_senderID"].(string)

	var senderClient *models.Client
	for c := range r.Clients {
		if c.ID == senderID {
			senderClient = c
			break
		}
	}

	// Remove internal fields before broadcasting
	delete(msg, "_senderIP")
	delete(msg, "_senderID")
	cleanMessage, _ := json.Marshal(msg)

	sendPrivate := func(client *models.Client, msgText string) {
		if client == nil {
			return
		}
		sysMsg, _ := json.Marshal(map[string]interface{}{
			"type":   "chat",
			"sender": "SERVER",
			"text":   msgText,
		})
		select {
		case client.Send <- sysMsg:
		default:
		}
	}

	if len(text) > 0 && text[0] == '/' {
		if text == "/help" {
			sendPrivate(senderClient, "Available commands: /help, /start")
		} else if text == "/start" {
			if senderIP != r.HostIP {
				sendPrivate(senderClient, "You don't have permission to use /start. Only the host can start the game.")
				return
			}
			
			r.Mu.Lock()
			if r.State != "lobby" {
				r.Mu.Unlock()
				sendPrivate(senderClient, "The game is already running.")
				return
			}
			if len(r.Clients) < 2 {
				r.Mu.Unlock()
				sendPrivate(senderClient, "Need at least 2 players to start the game.")
				return
			}
			if r.IsStarting {
				r.Mu.Unlock()
				sendPrivate(senderClient, "The game is already starting.")
				return
			}
			r.IsStarting = true
			r.Mu.Unlock()

			go func() {
				sendPublic := func(msgText string) {
					sysMsg, _ := json.Marshal(map[string]interface{}{
						"type":   "chat",
						"sender": "SERVER",
						"text":   msgText,
					})
					BroadcastRaw(r, sysMsg)
				}
				
				sendPublic("Starting in 3...")
				time.Sleep(1 * time.Second)
				sendPublic("2...")
				time.Sleep(1 * time.Second)
				sendPublic("1...")
				time.Sleep(1 * time.Second)
				
				r.Mu.Lock()
				r.IsStarting = false
				r.Mu.Unlock()
				
				StartGame(r, a.GameMap)
			}()
		} else {
			sendPrivate(senderClient, "Unknown command. Type /help for available commands.")
		}
		return
	}

	BroadcastRaw(r, cleanMessage)
}
