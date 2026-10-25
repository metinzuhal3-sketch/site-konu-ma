const socket = io();

// Kayıt Ol butonuna tıklandığında çalışacak fonksiyon
function register() {
    alert("Kayıt olma özelliği yakında aktif olacak! (Şimdilik giriş yapabilirsin)");
    // Buraya kayıt form verilerini gönderme kodlarını ekleyebilirsin
}

// Giriş Yap butonuna tıklandığında çalışacak fonksiyon
function login() {
    const username = document.querySelector('input[type="text"]').value;
    if (!username) {
        alert("Lütfen kullanıcı adınızı girin!");
        return;
    }
    
    // Giriş başarılıysa sohbet ekranına yönlendirme veya arayüz değiştirme
    console.log(username, "giriş yaptı.");
    alert("Giriş başarılı! Sohbet odasına yönlendiriliyorsunuz...");
    
    // Örnek olarak sayfayı gizleyip sohbet ekranını açabilirsin
    document.querySelector('.container').style.display = 'none';
    // Sohbet arayüzünü burada aktif edebilirsin
}
