const express = require("express");
const fs = require('fs');
const { Server } = require("socket.io");

const http = require("http");
const path = require('path');
const crypto = require("crypto");

const app = express();

const port = process.env.PORT || 9000;

//initialize a http server
const server = http.createServer(app);
app.use(express.static(path.join(__dirname)));

//initialize the WebSocket server instance
const io = new Server(server);


io.on("connection", (socket) => {
    let currentRoom = ''
    socket.on('join', async (roomName) => {
        socket.to(currentRoom).emit('leaving', socket.id)
        socket.leave(currentRoom)
        const sockets = await io.in(roomName).fetchSockets();
        socket.join(roomName)
        socket.to(roomName).emit('joining', socket.id)
        if (sockets.length === 0) {
            let data = fs.readFileSync(path.join(__dirname, 'files', roomName + '.txt'), 'utf8');
            socket.emit('init', data.toString(), 1, roomName)
        }
        else {
            io.to(sockets[0].id).emit('requestInit', socket.id)
        }
        currentRoom = roomName

    })
    socket.on('onChange', e => {
        socket.to(currentRoom).emit('change', e)
    })
    socket.on('answerInit', (id, data, initCount) =>
        io.to(id).emit('init', data, initCount, currentRoom)
    )
    socket.on('save', (value, fileID) => {
        let file;
        if (fileID)
            file = fileID;
        else {
            file = crypto.randomBytes(16).toString("hex");
            socket.join(file);
            currentRoom = file;
        }
        fs.writeFileSync(path.join(__dirname, 'files', file + '.txt'), value)
        io.to(currentRoom).emit('share', file)
    })
    socket.on("disconnecting", (reason) => {
        socket.to(currentRoom).emit("leaving", socket.id);

    });
});
//start our server

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index_copy.html');
});

server.listen(port, () => {
    console.log(`Signaling Server running on port: ${port}`);
});