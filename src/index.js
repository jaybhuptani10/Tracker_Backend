import dotenv from "dotenv";

import connectDB from "./db/index.js";
import app from "./app.js";
dotenv.config({ path: "./.env" });
import { createServer } from "http";
import { Server } from "socket.io";

const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 8000;

    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: true, // Allow all origins matching app.js
        credentials: true,
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);

      socket.on("join", ({ userId, partnerId }) => {
        console.log(
          `User ${userId} joined via socket ${socket.id}. Partner: ${partnerId}`,
        );
        socket.join(userId);
        socket.userId = userId;
        socket.partnerId = partnerId;

        // Notify partner I am online
        if (partnerId) {
          io.to(partnerId).emit("user_online", { userId });
          console.log(`Emitted user_online to room ${partnerId}`);

          // Check if partner is already online
          const partnerSockets = io.sockets.adapter.rooms.get(partnerId);
          console.log(
            `Checking if partner ${partnerId} is online. Room size: ${partnerSockets?.size || 0}`,
          );

          if (partnerSockets && partnerSockets.size > 0) {
            socket.emit("user_online", { userId: partnerId });
            console.log(`Partner ${partnerId} is online, notifying ${userId}`);
          }
        }
      });

      socket.on("typing", ({ recipientId }) => {
        io.to(recipientId).emit("partner_typing");
      });

      socket.on("stop_typing", ({ recipientId }) => {
        io.to(recipientId).emit("partner_stop_typing");
      });

      socket.on("disconnect", () => {
        if (socket.partnerId) {
          io.to(socket.partnerId).emit("user_offline", {
            userId: socket.userId,
          });
        }
        console.log("Client disconnected:", socket.id);
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server: ", error);
    process.exit(1);
  }
};

startServer();
