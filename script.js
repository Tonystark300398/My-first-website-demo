// Đợi trang tải xong
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Cập nhật thời gian hiện tại
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('vi-VN');
        document.getElementById('current-time').textContent = 
            `⏰ Thời gian hiện tại: ${timeString}`;
    }
    
    // Cập nhật thời gian mỗi giây
    updateTime();
    setInterval(updateTime, 1000);
    
    // 2. Xử lý nút Magic Button
    const magicButton = document.getElementById('magic-button');
    const messageDiv = document.getElementById('message');
    
    magicButton.addEventListener('click', function() {
        const messages = [
            "🎉 Chúc mừng! Bạn vừa deploy thành công!",
            "🚀 Website của bạn đang live trên Internet!",
            "🔒 Tự động có HTTPS miễn phí!",
            "⚡ Tốc độ cực nhanh với CDN của Vercel!",
            "🌍 Ai cũng có thể truy cập website của bạn!",
            "✨ Bạn là một Web Developer thực thụ!"
        ];
        
        // Chọn ngẫu nhiên một message
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        // Hiển thị message với hiệu ứng
        messageDiv.innerHTML = `
            <i class="fas fa-star"></i> 
            <strong>${randomMessage}</strong>
            <i class="fas fa-star"></i>
        `;
        messageDiv.style.display = 'block';
        
        // Đổi màu nút
        magicButton.style.background = 'linear-gradient(90deg, #ff6b6b, #ff8e53)';
        magicButton.innerHTML = '<i class="fas fa-sparkles"></i> Thành công!';
        
        // Reset sau 3 giây
        setTimeout(() => {
            magicButton.style.background = 'linear-gradient(90deg, #4f6df5, #3a56d5)';
            magicButton.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Thử lại lần nữa!';
        }, 3000);
    });
    
    // 3. Mô phỏng đếm số lượt truy cập
    let visitCount = localStorage.getItem('visitCount') || 0;
    visitCount++;
    localStorage.setItem('visitCount', visitCount);
    
    // Hiển thị số lượt truy cập
    document.getElementById('visit-count').innerHTML = 
        `<i class="fas fa-eye"></i> Số lượt xem: <strong>${visitCount}</strong>`;
    
    // 4. Hiệu ứng cho các badge
    const badges = document.querySelectorAll('.badge');
    badges.forEach((badge, index) => {
        badge.addEventListener('mouseover', () => {
            badge.style.transform = 'scale(1.1)';
            badge.style.transition = 'transform 0.2s';
        });
        
        badge.addEventListener('mouseout', () => {
            badge.style.transform = 'scale(1)';
        });
    });
    
    // 5. Chào mừng khi vào trang
    console.log('🎊 Website của bạn đã sẵn sàng!');
    console.log('👉 Mở file index.html trên trình duyệt để xem');
	// Thêm vào script.js
	fetch('/api/visitor')
  		.then(response => response.json())
  		.then(data => {
    		 document.getElementById('visit-count').innerHTML = 
      		  `<i class="fas fa-eye"></i> Số lượt xem: <strong>${data.visits}</strong>`;
  });
});