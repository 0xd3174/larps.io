package game

import (
	"encoding/json"
	"fmt"
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
			
			if r.State != "lobby" {
				sendPrivate(senderClient, "The game is already running.")
				return
			}
			if len(r.Clients) < 2 {
				sendPrivate(senderClient, "Need at least 2 players to start the game.")
				return
			}
			if r.IsStarting {
				sendPrivate(senderClient, "The game is already starting.")
				return
			}
			r.IsStarting = true

			go func() {
				sendPublic := func(msgText string) {
					sysMsg, _ := json.Marshal(map[string]interface{}{
						"type":   "chat",
						"sender": "SERVER",
						"text":   msgText,
					})
					r.Action <- func() {
						BroadcastRaw(r, sysMsg)
					}
				}
				
				for i := 3; i > 0; i-- {
					sendPublic(fmt.Sprintf("%d...", i))
					select {
					case <-r.Stop:
						return
					case <-time.After(1 * time.Second):
					}
				}
				
				r.Action <- func() {
					r.IsStarting = false
				}
				
				StartGame(r, a.GameMap)
			}()
		} else {
			sendPrivate(senderClient, "Unknown command. Type /help for available commands.")
		}
		return
	}

	BroadcastRaw(r, cleanMessage)
}
