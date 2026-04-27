import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { messageService } from "../services/messageService";
import { getSingleValue } from "../utils/getSingleValue";
import { handleRouteError } from "../utils/handleRouteError";

const router = Router();

// GET /api/messages/contacts/list - Get teammates to chat with
router.get("/contacts/list", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contacts = await messageService.getContacts(String(req.user!.userId));
    res.json(contacts);
  } catch (error) {
    handleRouteError(res, error, "Get contacts error:", "Failed to fetch contacts");
  }
});

// GET /api/messages/conversations - Get all conversations for the current user
router.get("/conversations", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversations = await messageService.getConversations(req.user!.userId);
    res.json(conversations);
  } catch (error) {
    handleRouteError(res, error, "Get conversations error:", "Failed to fetch conversations");
  }
});

// POST /api/messages/conversations/dm - Get or create a DM conversation
router.post("/conversations/dm", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { other_user_id } = req.body;
    if (!other_user_id) {
      res.status(400).json({ error: "other_user_id is required." });
      return;
    }
    const conversationId = await messageService.getOrCreateDm(req.user!.userId, Number(other_user_id));
    res.json({ conversation_id: conversationId });
  } catch (error) {
    handleRouteError(res, error, "Create DM error:", "Failed to create conversation");
  }
});

// POST /api/messages/conversations/group - Create a group chat (manager only)
router.post("/conversations/group", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, member_ids, team_id } = req.body;
    const conversation = await messageService.createGroupChat(
      req.user!.userId,
      name,
      member_ids || [],
      team_id
    );
    res.status(201).json(conversation);
  } catch (error) {
    handleRouteError(res, error, "Create group error:", "Failed to create group chat");
  }
});

// GET /api/messages/conversations/:id/messages - Get messages for a conversation
router.get("/conversations/:id/messages", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const convId = getSingleValue(req.params.id);
    if (!convId) {
      res.status(400).json({ error: "Conversation id is required." });
      return;
    }
    const messages = await messageService.getMessages(Number(convId), req.user!.userId);
    res.json(messages);
  } catch (error) {
    handleRouteError(res, error, "Get messages error:", "Failed to fetch messages");
  }
});

// POST /api/messages/conversations/:id/messages - Send a message to a conversation
router.post("/conversations/:id/messages", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const convId = getSingleValue(req.params.id);
    if (!convId) {
      res.status(400).json({ error: "Conversation id is required." });
      return;
    }
    const message = await messageService.sendMessage(
      Number(convId),
      req.user!.userId,
      req.body.content
    );
    res.status(201).json(message);
  } catch (error) {
    handleRouteError(res, error, "Send message error:", "Failed to send message");
  }
});

// GET /api/messages/conversations/:id/members - Get members of a conversation
router.get("/conversations/:id/members", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const convId = getSingleValue(req.params.id);
    if (!convId) {
      res.status(400).json({ error: "Conversation id is required." });
      return;
    }
    const members = await messageService.getConversationMembers(Number(convId));
    res.json(members);
  } catch (error) {
    handleRouteError(res, error, "Get members error:", "Failed to fetch members");
  }
});

// Legacy: POST /api/messages - Send a DM (backward compat for sidebar panels)
router.post("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { receiver_id, content } = req.body;
    if (!receiver_id || !content) {
      res.status(400).json({ error: "receiver_id and content are required." });
      return;
    }
    const message = await messageService.sendDirectMessage(
      req.user!.userId,
      Number(receiver_id),
      content
    );
    res.status(201).json(message);
  } catch (error) {
    handleRouteError(res, error, "Send message error:", "Failed to send message");
  }
});

// Legacy: GET /api/messages/:userId - Get DM conversation (backward compat)
router.get("/:userId", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getSingleValue(req.params.userId);
    if (!userId) {
      res.json([]);
      return;
    }
    const messages = await messageService.getDirectMessages(req.user!.userId, Number(userId));
    res.json(messages);
  } catch (error) {
    handleRouteError(res, error, "Get conversation error:", "Failed to fetch messages");
  }
});

export default router;
