const cors = require("cors");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = app.listen(3000, () => {
	console.log("Server is running on port 3000");
});

const io = new Server(server, {
	cors: {
		origin: "*", // or '*' for all origins
		methods: ["GET", "POST"],
	},
});

// Or allow all origins (not recommended for production)
let users = {}; // Keeps track of users in rooms

io.on("connection", (socket) => {
	console.log("User connected:", socket.id);

	// Join a room
	socket.on("join", (roomId) => {
		socket.join(roomId);
		const users = Array.from(io.sockets.adapter.rooms.get(roomId) || []).filter(
			(id) => id !== socket.id
		);
		socket.emit("existing-users", users);
		socket.to(roomId).emit("user-connected", socket.id);

		socket.on("disconnect", () => {
			socket.to(roomId).emit("user-disconnected", socket.id);
		});
	});

	// Handle offer
	socket.on("offer", (offer, to) => {
		socket.to(to).emit("offer", offer, socket.id); // Send offer to specific user
	});

	// Handle answer
	socket.on("answer", (answer, to) => {
		socket.to(to).emit("answer", answer, socket.id); // Send answer to specific user
	});

	// Handle ICE candidates
	socket.on("ice-candidate", (candidate, to) => {
		socket.to(to).emit("ice-candidate", candidate, socket.id); // Send ICE candidate
	});

	// Notify when a user disconnects
	socket.on("disconnect", () => {
		console.log("User disconnected:", socket.id);
		const roomId = users[socket.id];
		if (roomId) {
			socket.to(roomId).emit("user-disconnected", socket.id); // Notify others
			delete users[socket.id];
		}
	});
});
