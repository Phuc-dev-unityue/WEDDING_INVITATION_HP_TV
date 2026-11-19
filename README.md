# Thiệp Cưới Online — Lê Hoàng Phúc & Nguyễn Thị Tường Vy

Trang web thiệp cưới online phong cách **Editorial Minimalist** (lấy cảm hứng từ mẫu `ngaychungdoi.com/w/thiepcuoixuanhieu-thanhhien`), thiết kế khung di động `450px` căn giữa trên nền trung tính với bảng màu **kem ấm (`#faf6ef`)** và **đỏ rượu vang (`#7d0000`)**.

---

## Tính năng chính

1. **Hero Editorial & Băng giấy đỏ rượu**: Ảnh studio của cặp đôi nổi bật trên các lớp ruy-băng đỏ rượu xếp góc, cùng tên thư pháp **Hoàng Phúc & Tường Vy**.
2. **Đếm ngược thời gian thực & Trình phát nhạc kiểu iOS**:
   - Đếm ngược từng giây tới ngày lễ cưới (`29.11.2026`).
   - Nút bật/tạm dừng nhạc nổi ở góc trên bên phải đồng bộ với thẻ phát nhạc (`Lỡ Thương Nhau (Bò Sữa Bay OST) - Mounter x Nguyễn Hùng` — hỗ trợ link MP3 tùy chỉnh, phát qua YouTube chính thức hoặc hòa tấu Web Audio API dự phòng).
3. **Câu chuyện tình yêu & Giới thiệu hai bên gia đình**:
   - Mục *"FROM FRIENDS TO FOREVER"* trình bày chữ viết tay Việt hóa thanh mảnh.
   - Bố cục 2 cột **Nhà trai — Nhà gái**, khung ảnh vòm cổ điển cho chú rể **Lê Hoàng Phúc** và cô dâu **Nguyễn Thị Tường Vy**, kèm nút gọi nhanh.
4. **Thông tin Lễ Nạp Tài & Lễ Thành Hôn + Lịch tháng có trái tim**:
   - Khối lịch tháng tự động dựng từ `weddingDateISO` và đánh dấu ngày cưới bằng biểu tượng trái tim.
   - Bản đồ Google Maps nhúng trực tiếp + Timeline 3 mốc thời gian trong ngày lễ.
5. **Thẻ R.S.V.P. dập sáp "囍" & Mừng cưới QR thông minh**:
   - Thẻ xác nhận tham dự dạng vé cắt góc cổ điển mở modal R.S.V.P.
   - Hai thẻ tài khoản ngân hàng xen kẽ cho Cô dâu & Chú rể kèm nút **Sao chép STK** 1 chạm và mã QR tự tạo offline (hoặc VietQR trực tiếp khi cấu hình `useLiveVietQR: true`).
6. **Album Ảnh Cưới "Sợi Chỉ Đỏ" & Lightbox**:
   - Bố cục collage nghệ thuật kết nối bằng đường chỉ đỏ, bấm vào ảnh bất kỳ để phóng to và chuyển ảnh bằng phím mũi tên.
7. **Dòng lời chúc bay trực tiếp (Live Wishes) & Sổ lưu bút**:
   - Bong bóng lời chúc chạy nổi ở cuối khung thiệp, modal **Viết lưu bút** hỗ trợ gửi lời chúc mới và xem toàn bộ sổ lưu bút (lưu trong `localStorage`).
8. **Tiện ích trên máy tính (QR mở điện thoại & Tùy chỉnh nhanh)**:
   - Widget mã QR ở góc dưới bên phải màn hình máy tính.
   - Nút **Tùy chỉnh thiệp** (hoặc mở URL kèm `?edit=1`) cho phép sửa tên, ngày giờ, địa điểm, số tài khoản trực tiếp trên trình duyệt và tải về file `config.js` mới.

---

## Cấu trúc thư mục

```
thiep-cuoi-hoang-phuc-tuong-vy/
├── index.html          # Cấu trúc toàn bộ các phần thiệp & modal
├── css/
│   └── style.css       # Giao diện #faf6ef & #7d0000, khung 450px, hiệu ứng
├── js/
│   ├── config.js       # Toàn bộ nội dung cặp đôi, ngày cưới, địa điểm, ảnh, STK
│   ├── qr.js           # Bộ sinh mã QR thuần JS (chạy tốt cả khi offline)
│   ├── audio.js        # Bộ phát nhạc nền (MP3 hoặc Piano Web Audio API)
│   └── main.js         # Logic đếm ngược, lịch, lời chúc bay, RSVP, Lightbox, Customizer
├── assets/
│   ├── images/         # Bộ ảnh cưới chất lượng cao cục bộ
│   └── music/          # Nhạc nền MP3 cục bộ (lo-thuong-nhau.mp3)
└── README.md
```

---

## Hướng dẫn mở xem & tùy chỉnh

### 1. Chạy xem thử trên máy
Bạn có thể mở trực tiếp [index.html](index.html) hoặc chạy web server cục bộ bằng Python để Google Maps, clipboard và mã QR hoạt động đầy đủ nhất:

```powershell
cd C:\Users\PC\.gemini\antigravity\scratch\thiep-cuoi-hoang-phuc-tuong-vy
python server.py 8080
```

Sau đó mở trình duyệt tại `http://localhost:8080`.

### 2. Thay đổi thông tin cá nhân
- **Cách 1 (Khuyên dùng)**: Mở [js/config.js](js/config.js) để chỉnh sửa tên phụ huynh, ngày cưới (`weddingDateISO`), địa chỉ, số điện thoại, link nhạc MP3 (`music.audioUrl`), và đặt `useLiveVietQR: true` sau khi điền mã ngân hàng + số tài khoản thật.
- **Cách 2**: Bấm nút **Tùy chỉnh thiệp** ở góc dưới bên phải màn hình máy tính (hoặc truy cập `http://localhost:8080/?edit=1`), điền thông tin và bấm **Tải file config.js** rồi chép đè vào thư mục `js/`.
