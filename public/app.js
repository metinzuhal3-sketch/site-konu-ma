const socket = io();

function register() {
    alert("Kayıt olma özelliği yakında aktif olacak! Şimdilik giriş yapabilirsin.");
}

function login() {
    const username = document.getElementById('username').value;
    
    if (!username) {
        alert("Lütfen kullanıcı adınızı girin!");
        return;
    }
    
    // Giriş ekranını gizle, sohbet ekranını göster
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';
}

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value;
    
    if (!message) return;
    
    // Mesajı ekrana ekle (Geçici)
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML += `<p><b>Sen:</b> ${message}</p>`;
    
    messageInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
