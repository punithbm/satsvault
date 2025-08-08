import express from "express";
import http from "http";
import { Server } from "socket.io";
import EventEmitter from "events";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:3001",
            "http://localhost:3000",
            "https://satsvault.com"
        ], // Allow all origins for WebSocket connections
        methods: ["GET"]
    }
});

class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();

myEmitter.setMaxListeners(1000);

const PORT = process.env.PORT || 4000;

// Listen for connections
io.on("connection", (socket) => {
    console.log("New client connected");
    myEmitter.on("depositCompleted", (data) => {
        socket.emit("depositCompleted", data);
    });
    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export { myEmitter };
