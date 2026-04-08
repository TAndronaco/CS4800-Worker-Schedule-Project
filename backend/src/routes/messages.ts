import pool from "../config/db";
import { Router, Request, Response } from "express";

const router = Router();

// Get all team members to chat with - MUST BE FIRST
router.get("/contacts/list", async (req: Request, res: Response) => {
  try {
    const currentUser = req.query.userId;
    if (!currentUser) {
      res.json([]);
      return;
    }
    const result = await pool.query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.role
       FROM users u
       JOIN team_members tm ON u.id = tm.user_id
       WHERE tm.team_id IN (
         SELECT team_id FROM team_members WHERE user_id = $1
         UNION
         SELECT id FROM teams WHERE manager_id = $1
       )
       AND u.id != $1`,
      [currentUser]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// Get messages between two users - MUST BE AFTER contacts
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUser = req.query.currentUserId;
    if (!currentUser) {
      res.json([]);
      return;
    }
    const result = await pool.query(
      `SELECT m.*, u.first_name, u.last_name 
       FROM messages m 
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
       OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [currentUser, userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a message
router.post("/", async (req: Request, res: Response) => {
  try {
    const { receiver_id, content, sender_id } = req.body;
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content) 
       VALUES ($1, $2, $3) RETURNING *`,
      [sender_id, receiver_id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
