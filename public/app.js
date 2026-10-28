const socket = io();

// Kayıt Ol butonuna tıklandığında çalışacak fonksiyon
function register() {
    alert("Kayıt olma özelliği yakında aktif olacak! Şimdilik giriş yapabilirsin.");
}

// Giriş Yap butonuna tıklandığında çalışacak fonksiyon
function login() {
    const username = document.getElementById('username').value;
    
    if (!username) {
        alert("Lütfen kullanıcı adınızı girin!");
        return;
    }
    
    // Ekranın kararmasını veya kaybolmasını önlemek için sadece uyarı veriyoruz
    alert("Tebrikler " + username + ", başarıyla giriş yaptın!");
}
