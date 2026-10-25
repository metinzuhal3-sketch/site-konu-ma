const socket = io();
let currentUser = null;
let currentChannel = 'genel';
let isAdmin = false;

// Kimlik Doğrulama
async function register() {
    const fullname = document.getElementById('auth-fullname').value;
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname, username, password })
    });
    const data = await res.json();
    if (data.success) loginSuccess(data.user);
    else showError(data.error);
}

async function login() {
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) loginSuccess(data.user);
    else showError(data.error);
}

function loginSuccess(user) {
    currentUser = user;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('user-fullname').innerText = user.fullname;
    document.getElementById('user-role').innerText = user.role;
    document.getElementById('user-avatar').src = user.avatar;

    socket.emit('join', { username: user.username });
    switchChannel('genel');
}

function showError(msg) {
    const errBox = document.getElementById('auth-error');
    errBox.innerText = msg;
    errBox.classList.remove('hidden');
}

// Kanal Değiştirme
function switchChannel(channel) {
    currentChannel = channel;
    document.getElementById('current-channel-title').innerText = channel;
    document.getElementById('messages-container').innerHTML = '';
    socket.emit('get_messages', channel);
}

// Mesaj Gönderme & Gizli `/admin` Komutu
function handleKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const val = input.value.trim();
    if (!val) return;

    // Gizli Tetikleyici
    if (val === '/admin') {
        input.value = '';
        openAdminAuthModal();
        return;
    }

    if (currentChannel === 'duyurular' && currentUser.role !== 'Admin') {
        alert('Duyurular kanalına yalnızca adminler mesaj yazabilir!');
        return;
    }

    socket.emit('send_message', { username: currentUser.username, channel: currentChannel, content: val });
    input.value = '';
}

// Socket Dinleyicileri
socket.on('load_messages', (messages) => {
    messages.forEach(appendMessage);
});

socket.on('new_message', (msg) => {
    if (msg.channel === currentChannel) appendMessage(msg);
});

socket.on('message_deleted', (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) el.remove();
});

socket.on('chat_cleared', () => {
    document.getElementById('messages-container').innerHTML = '';
});

socket.on('announcement_update', (text) => {
    const banner = document.getElementById('announcement-banner');
    if (text) {
        document.getElementById('announcement-text').innerText = `📢 ${text}`;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
});

socket.on('kicked', () => {
    alert('Admin tarafından gruptan atıldınız.');
    location.reload();
});

socket.on('banned', () => {
    alert('Hesabınız engellendi.');
    location.reload();
});

socket.on('error_msg', (msg) => alert(msg));

function appendMessage(msg) {
    const container = document.getElementById('messages-container');
    const isOwner = msg.username === currentUser.username;
    const html = `
        <div id="msg-${msg.id}" class="flex gap-3 group">
            <div class="flex-1">
                <div class="flex items-baseline gap-2">
                    <span class="font-bold text-sm text-indigo-300">${msg.username}</span>
                    <span class="text-[10px] text-gray-500">${msg.timestamp || ''}</span>
                    ${isOwner ? `<button onclick="deleteMsg(${msg.id})" class="opacity-0 group-hover:opacity-100 text-xs text-red-400 ml-auto"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
                <p class="text-sm text-gray-200 mt-1">${msg.content}</p>
            </div>
        </div>
    `;
    container.innerHTML += html;
    container.scrollTop = container.scrollHeight;
}

function deleteMsg(id) {
    socket.emit('delete_message', { msgId: id, username: currentUser.username });
}

// Admin Yetkilendirme Modalları
function openAdminAuthModal() {
    document.getElementById('admin-auth-modal').classList.remove('hidden');
}

function closeAdminAuthModal() {
    document.getElementById('admin-auth-modal').classList.add('hidden');
}

function submitAdminPass() {
    const pass = document.getElementById('admin-pass-input').value;
    socket.emit('verify_admin', pass);
}

socket.on('admin_granted', (success) => {
    closeAdminAuthModal();
    if (success) {
        isAdmin = true;
        currentUser.role = 'Admin';
        document.getElementById('user-role').innerText = 'Admin';
        document.getElementById('admin-btn').classList.remove('hidden');
        openAdminPanel();
    } else {
        alert('Hatalı Admin Şifresi!');
    }
});

function openAdminPanel() {
    document.getElementById('admin-panel-modal').classList.remove('hidden');
}

function closeAdminPanel() {
    document.getElementById('admin-panel-modal').classList.add('hidden');
}

// Admin İşlemleri
function adminAction(actionType) {
    const targetUser = document.getElementById('target-user-input').value;
    if (!targetUser) return alert('Lütfen hedef kullanıcı adını girin.');
    socket.emit('admin_action', { action: actionType, targetUser });
}

function adminSetRole() {
    const targetUser = document.getElementById('target-user-input').value;
    const newRole = document.getElementById('role-select').value;
    if (!targetUser) return alert('Lütfen hedef kullanıcı adını girin.');
    socket.emit('admin_action', { action: 'set_role', targetUser, newRole });
}

function adminClearChat() {
    if (confirm('Tüm sohbet geçmişi silinecektir. Emin misiniz?')) {
        socket.emit('admin_action', { action: 'clear_chat' });
    }
}

function adminSetAnnouncement() {
    const bannerText = document.getElementById('admin-banner-input').value;
    socket.emit('admin_action', { action: 'set_announcement', bannerText });
}
