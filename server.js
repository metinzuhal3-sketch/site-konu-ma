const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public klasörünü dış dünyaya açan sihirli satır burası:
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io bağlantı dinleyicisi
io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
