/**
 * Blackout WebSocket Chat Server
 *
 * Run separately from the Next.js app: npx ts-node server/chat.ts
 * Handles real-time messaging between matched users.
 */

import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { PrismaClient } from "../src/generated/prisma";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "blackout-dev-secret";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Track connected users: userId -> socketId
const connectedUsers = new Map<string, string>();

// Authentication middleware
io.use(async (socket: Socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const matchId = socket.handshake.auth.matchId;

    if (!token || !matchId) {
      return next(new Error("Authentication required"));
    }

    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
    };

    // Verify match exists and user is part of it
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        status: "ACTIVE",
        OR: [{ userAId: payload.userId }, { userBId: payload.userId }],
      },
    });

    if (!match) {
      return next(new Error("Invalid match"));
    }

    // Attach user data to socket
    (socket as any).userId = payload.userId;
    (socket as any).matchId = matchId;
    (socket as any).partnerId =
      match.userAId === payload.userId ? match.userBId : match.userAId;

    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket: Socket) => {
  const userId = (socket as any).userId as string;
  const matchId = (socket as any).matchId as string;
  const partnerId = (socket as any).partnerId as string;

  console.log(`User ${userId} connected to match ${matchId}`);

  // Track connection
  connectedUsers.set(userId, socket.id);

  // Join the match room
  socket.join(`match:${matchId}`);

  // Notify partner that user is online
  const partnerSocketId = connectedUsers.get(partnerId);
  if (partnerSocketId) {
    io.to(partnerSocketId).emit("partner_online", { userId });
  }

  // Handle sending messages
  socket.on("send_message", async (data: { content: string }) => {
    try {
      const { content } = data;

      if (!content || content.trim().length === 0) return;
      if (content.length > 2000) return; // Max message length

      // Save message to database
      const message = await prisma.message.create({
        data: {
          matchId,
          senderId: userId,
          content: content.trim(),
        },
      });

      // Broadcast to all users in the match room
      io.to(`match:${matchId}`).emit("new_message", {
        id: message.id,
        matchId: message.matchId,
        senderId: message.senderId,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Handle typing indicator
  socket.on("typing_start", () => {
    socket.to(`match:${matchId}`).emit("partner_typing", { userId });
  });

  socket.on("typing_stop", () => {
    socket.to(`match:${matchId}`).emit("partner_stopped_typing", { userId });
  });

  // Handle message read receipts
  socket.on("mark_read", async (data: { messageIds: string[] }) => {
    try {
      await prisma.message.updateMany({
        where: {
          id: { in: data.messageIds },
          matchId,
          senderId: partnerId, // Only mark partner's messages as read
        },
        data: { isRead: true },
      });

      socket.to(`match:${matchId}`).emit("messages_read", {
        messageIds: data.messageIds,
        readBy: userId,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Handle flagging a message
  socket.on("flag_message", async (data: { messageId: string }) => {
    try {
      await prisma.message.update({
        where: { id: data.messageId, matchId },
        data: { isFlagged: true },
      });
    } catch (error) {
      console.error("Error flagging message:", error);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected from match ${matchId}`);
    connectedUsers.delete(userId);

    // Notify partner
    const partnerSocket = connectedUsers.get(partnerId);
    if (partnerSocket) {
      io.to(partnerSocket).emit("partner_offline", { userId });
    }
  });
});

const PORT = process.env.WS_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Blackout Chat Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down chat server...");
  io.close();
  await prisma.$disconnect();
  process.exit(0);
});
