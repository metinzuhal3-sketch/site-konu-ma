const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SQLite Veritabanı Kurulumu
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('SQLite veritabanı bağlandı.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        fullname TEXT,
        password TEXT,
        role TEXT DEFAULT 'Öğrenci',
        avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/bottts/svg?seed=default'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        channel TEXT,
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bans (
        username TEXT UNIQUE
    )`);
});

// Global Sistem Durumu
let currentAnnouncement = "";
let mutedUsers = new Set();
let onlineUsers = {}; 

// API Endpoints: Kayıt ve Giriş
app.post('/api/register', async (req, res) => {
    const { username, fullname, password, avatar } = req.body;
    if (!username || !fullname || !password) {
        return res.status(400).json({ error: 'Tüm alanları doldurunuz.' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    db.run(
        `INSERT INTO users (username, fullname, password, avatar) VALUES (?, ?, ?, ?)`,
        [username, fullname, hashedPassword, userAvatar],
        function(err) {
            if (err) return res.status(400).json({ error: 'Kullanıcı adı zaten alınmış.' });
            res.json({ success: true, user: { username, fullname, role: 'Öğrenci', avatar: userAvatar } });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM bans WHERE username = ?`, [username], (err, banned) => {
        if (banned) return res.status(403).json({ error: 'Bu hesaba erişim engellenmiştir (Banned).' });

        db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
            if (!user) return res.status(400).json({ error: 'Kullanıcı bulunamadı.' });
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) return res.status(400).json({ error: 'Hatalı şifre.' });

            res.json({
                success: true,
                user: { username: user.username, fullname: user.fullname, role: user.role, avatar: user.avatar }
            });
        });
    });
});

// Socket.io İşlemleri
io.on('connection', (socket) => {

    socket.on('join', ({ username }) => {
        db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
            if (user) {
                onlineUsers[socket.id] = { ...user, socketId: socket.id };
                io.emit('update_online_list', Object.values(onlineUsers));
                socket.emit('announcement_update', currentAnnouncement);
            }
        });
    });

    socket.on('get_messages', (channel) => {
        db.all(`SELECT * FROM messages WHERE channel = ? ORDER BY id ASC LIMIT 100`, [channel], (err, rows) => {
            socket.emit('load_messages', rows || []);
        });
    });

    socket.on('send_message', ({ username, channel, content }) => {
        if (mutedUsers.has(username)) {
            socket.emit('error_msg', 'Susturulduğunuz için mesaj gönderemezsiniz!');
            return;
        }

        db.run(`INSERT INTO messages (username, channel, content) VALUES (?, ?, ?)`, [username, channel, content], function(err) {
            if (!err) {
                const msgData = { id: this.lastID, username, channel, content, timestamp: new Date().toLocaleTimeString() };
                io.emit('new_message', msgData);
            }
        });
    });

    socket.on('delete_message', ({ msgId, username }) => {
        db.run(`DELETE FROM messages WHERE id = ? AND username = ?`, [msgId, username], (err) => {
            if (!err) io.emit('message_deleted', msgId);
        });
    });

    // --- ADMIN İŞLEMLERİ ---
    socket.on('verify_admin', (pass) => {
        if (pass === 'baba') {
            socket.emit('admin_granted', true);
        } else {
            socket.emit('admin_granted', false);
        }
    });

    socket.on('admin_action', ({ action, targetUser, newRole, bannerText }) => {
        if (action === 'mute') {
            mutedUsers.add(targetUser);
            io.emit('user_muted_status', { username: targetUser, isMuted: true });
        } else if (action === 'unmute') {
            mutedUsers.delete(targetUser);
            io.emit('user_muted_status', { username: targetUser, isMuted: false });
        } else if (action === 'kick') {
            const targetSocketId = Object.keys(onlineUsers).find(key => onlineUsers[key].username === targetUser);
            if (targetSocketId) {
                io.to(targetSocketId).emit('kicked');
            }
        } else if (action === 'ban') {
            db.run(`INSERT OR IGNORE INTO bans (username) VALUES (?)`, [targetUser], () => {
                const targetSocketId = Object.keys(onlineUsers).find(key => onlineUsers[key].username === targetUser);
                if (targetSocketId) {
                    io.to(targetSocketId).emit('banned');
                }
            });
        } else if (action === 'set_role') {
            db.run(`UPDATE users SET role = ? WHERE username = ?`, [newRole, targetUser], () => {
                // Güncellenen kullanıcıyı bul ve online listesini yenile
                Object.values(onlineUsers).forEach(u => {
                    if (u.username === targetUser) u.role = newRole;
                });
                io.emit('update_online_list', Object.values(onlineUsers));
            });
        } else if (action === 'clear_chat') {
            db.run(`DELETE FROM messages`, () => {
                io.emit('chat_cleared');
            });
        } else if (action === 'set_announcement') {
            currentAnnouncement = bannerText;
            io.emit('announcement_update', currentAnnouncement);
        }
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('update_online_list', Object.values(onlineUsers));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu http://localhost:${PORT} üzerinde çalışıyor.`));