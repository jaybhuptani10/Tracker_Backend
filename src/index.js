import dotenv from "dotenv"; // Restart trigger

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

    app.set("io", io);

    io.on("connection", (socket) => {
      socket.on("join", ({ userId, partnerId }) => {
        socket.join(userId);
        socket.userId = userId;
        socket.partnerId = partnerId;

        // Notify partner I am online
        if (partnerId) {
          io.to(partnerId).emit("user_online", { userId });

          // Check if partner is already online
          const partnerSockets = io.sockets.adapter.rooms.get(partnerId);

          if (partnerSockets && partnerSockets.size > 0) {
            socket.emit("user_online", { userId: partnerId });
          }
        }
      });

      socket.on("typing", ({ recipientId }) => {
        io.to(recipientId).emit("partner_typing");
      });

      socket.on("stop_typing", ({ recipientId }) => {
        io.to(recipientId).emit("partner_stop_typing");
      });

      socket.on("timer_update", ({ partnerId, totalSeconds, isRunning }) => {
        if (partnerId) {
          io.to(partnerId).emit("partner_timer_update", {
            totalSeconds,
            isRunning,
          });
        }
      });

      socket.on("send_interaction", ({ partnerId, type, message }) => {
        if (partnerId) {
          io.to(partnerId).emit("receive_interaction", {
            type,
            message,
            from: "Partner", // In a real app we'd fetch the name, but simplistic for now
          });
        }
      });

      socket.on("disconnect", () => {
        if (socket.partnerId) {
          io.to(socket.partnerId).emit("user_offline", {
            userId: socket.userId,
          });
        }
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
