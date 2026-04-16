import { Router, Request, Response } from "express";
import { messageService } from "../services/messageService";
import { getSingleValue } from "../utils/getSingleValue";
import { handleRouteError } from "../utils/handleRouteError";

const router = Router();

// Get all team members to chat with - MUST BE FIRST
router.get("/contacts/list", async (req: Request, res: Response) => {
  try {
    const currentUser = req.query.userId;
    if (!currentUser || typeof currentUser !== "string") {
      res.json([]);
      return;
    }

    const contacts = await messageService.getContacts(currentUser);
    res.json(contacts);
  } catch (error) {
    handleRouteError(res, error, "Get contacts error:", "Failed to fetch contacts");
  }
});

// Get messages between two users - MUST BE AFTER contacts
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const userId = getSingleValue(req.params.userId);
    const currentUser = req.query.currentUserId;
    if (!currentUser || typeof currentUser !== "string" || !userId) {
      res.json([]);
      return;
    }

    const messages = await messageService.getConversation(currentUser, userId);
    res.json(messages);
  } catch (error) {
    handleRouteError(res, error, "Get conversation error:", "Failed to fetch messages");
  }
});

// Send a message
router.post("/", async (req: Request, res: Response) => {
  try {
    const message = await messageService.sendMessage(req.body);
    res.status(201).json(message);
  } catch (error) {
    handleRouteError(res, error, "Send message error:", "Failed to send message");
  }
});

export default router;
