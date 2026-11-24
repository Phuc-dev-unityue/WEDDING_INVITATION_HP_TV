/**
 * ============================================================================
 * CẤU HÌNH THIỆP CƯỚI ONLINE — LÊ HOÀNG PHÚC & NGUYỄN THỊ TƯỜNG VY
 * Thiết kế theo phong cách NgayChungDoi (#faf6ef & #7d0000)
 * ============================================================================
 */

window.WEDDING_CONFIG = {
  // 1. THÔNG TIN CẶP ĐÔI & GIA ĐÌNH HAI HỌ
  groom: {
    fullName: "Lê Hoàng Phúc",
    shortName: "Hoàng Phúc",
    titleRole: "Quý Nam",
    photo: "assets/images/groom-anh2.jpg",
    parents: {
      father: "Ông Lê Đức",
      mother: "Bà Bùi Thị Bé",
      hometown: "P. Hội An Tây - TP Đà Nẵng"
    }
  },
  bride: {
    fullName: "Nguyễn Thị Tường Vy",
    shortName: "Tường Vy",
    titleRole: "Trưởng Nữ",
    photo: "assets/images/bride-anh3.jpg",
    parents: {
      father: "Ông Nguyễn Phước Cư",
      mother: "Bà Đinh Thị Phúc",
      hometown: "P. Điện Bàn Đông - TP Đà Nẵng"
    }
  },

  // 2. THÔNG TIN CHUNG & PHẦN MỞ ĐẦU (HERO)
  weddingDateISO: "2026-11-29T11:00:00+07:00",
  locationBadge: "From DaNang with love ❤️",
  heroDateDisplay: "29.11.2026, 11:00",
  heroSubtitle: "WEDDING INVITATION",
  heroTitleOrder: "groom-first", // "groom-first" => Hoàng Phúc & Tường Vy, hoặc "bride-first"
  heroPhoto: "assets/images/hero-anhnen.jpg",
  archWelcomePhoto: "assets/images/welcome-anh4.jpg",
  calendarPhoto: "assets/images/calendar-anh5.jpg",
  watermarkText: "Thiệp Cưới Hoàng Phúc ♥ Tường Vy",

  // 3. CÂU CHUYỆN TÌNH YÊU (LOVE STORY)
  storyHeading: "FROM FRIENDS TO FOREVER",
  storyParagraphs: [
    "Từ những người bạn, trở thành người thương và rồi là người đồng hành. Chúng mình đã có những năm tháng thanh xuân rực rỡ bên nhau, và sau tất cả những tháng ngày cùng nhau trưởng thành, chúng mình quyết định viết tiếp câu chuyện ấy bằng một lời hẹn ước trọn đời.",
    "Từ những ngày tháng có nhau đến những dự định chung cho tương lai, hành trình ấy luôn có sự yêu thương, đồng hành và vun vén của gia đình hai bên. Và giờ đây, chúng mình đã sẵn sàng để bắt đầu một chương mới, nơi hai người không chỉ là người yêu mà còn là gia đình của nhau."
  ],
  storyPhoto: "assets/images/story-anh1.jpg",

  // 4. NGHI LỄ & SỰ KIỆN
  ceremonies: {
    ceremony1: {
      title: "Lễ Nạp Tài",
      timeText: "Vào Lúc 08:00 Chủ nhật",
      monthLabel: "THÁNG 11",
      dayNumber: "29",
      yearLabel: "NĂM 2026",
      lunarText: "(Tức ngày 21 tháng 10 năm Bính Ngọ)",
      locationButtonText: "TẠI TƯ GIA NHÀ GÁI",
      address: "KP. Hà My Đông B - P. Điện Bàn Đông - TP. Đà Nẵng",
      mapUrl: "https://maps.google.com/?q=Ha+My+Dong+B+Dien+Ban+Dong+Da+Nang"
    },
    ceremony2: {
      title: "Lễ Thành Hôn",
      timeDateText: "11:00 CHỦ NHẬT - NGÀY 29.11.2026",
      lunarText: "(Tức ngày 21 tháng 10 năm Bính Ngọ)",
      venueTag: "ĐỊA ĐIỂM TỔ CHỨC",
      venueName: "542 - Đ. Hai Bà Trưng - P. Hội An Tây - TP. Đà Nẵng",
      mapUrl: "https://maps.app.goo.gl/HwzsXEsBa6aCvUHg7",
      mapEmbedUrl: "https://maps.google.com/maps?q=15.8870714,108.3272523&t=&z=16&ie=UTF8&iwloc=&output=embed"
    }
  },

  // 5. THÔNG TIN MỪNG CƯỚI (TÀI KHOẢN & QR)
  gifts: [
    {
      roleLabel: "Cô dâu",
      ownerUpper: "NGUYỄN THỊ TƯỜNG VY",
      bankName: "BIDV",
      bankId: "BIDV",
      accountNumber: "8854770939",
      avatar: "assets/images/bride-anh3-avatar.jpg",
      qrImage: "assets/images/qr-girl.png",
      useLiveVietQR: true
    },
    {
      roleLabel: "Chú rể",
      ownerUpper: "LÊ HOÀNG PHÚC",
      bankName: "VietinBank",
      bankId: "ICB",
      accountNumber: "106881436362",
      avatar: "assets/images/groom-anh2-avatar.jpg",
      qrImage: "assets/images/qr-man.png",
      useLiveVietQR: true
    }
  ],

  // 7. ALBUM ẢNH CƯỚI (COLLAGE + LIGHTBOX)
  albumTitle: "Album Ảnh Cưới",
  gallery: [
    { src: "assets/images/album-wide-1.jpg", caption: "Save Our Date · Hoàng Phúc & Tường Vy", layout: "wide" },
    { src: "assets/images/album-p1.jpg", caption: "Khoảnh khắc bên nhau", layout: "left" },
    { src: "assets/images/album-p2.jpg", caption: "Nụ cười ngày chung đôi", layout: "right" },
    { src: "assets/images/album-wide-2.jpg", caption: "Hạnh phúc trọn vẹn", layout: "wide" }
  ],

  // 8. LỜI NHẮN NHỦ "BẠN THÂN MẾN..."
  friendlyTitle: "Bạn thân mến...",
  friendlyNotes: [
    "Nếu bạn đang ở một thành phố khác hoặc bận rộn công việc không thể đến dự, đừng lo, chúng mình đã nhận được lời chúc của bạn rồi nhé",
    "Nếu bạn có thời gian, hãy chuẩn bị một tâm trạng vui vẻ và một chiếc bụng đói, rồi thoải mái đến chung vui cùng chúng mình nha",
    "Chúng mình đã chuẩn bị một chút nhạc nhẹ cho buổi lễ, kèm theo vài món bánh ngọt và đồ uống. Rất mong bạn ghé qua thưởng thức",
    "Sẽ có những góc chụp ảnh cực đẹp tại buổi lễ, mong chờ những bức hình lung linh của bạn đó",
    "Hôm đó tụi mình sẽ khá bận rộn, nếu có gì sơ suất mong bạn thông cảm nha"
  ],

  // 9. NHẠC NỀN & iOS MUSIC PLAYER
  music: {
    title: "Lỡ Thương Nhau (Bò Sữa Bay OST)",
    artist: "Mounter x Nguyễn Hùng",
    cover: "assets/images/hero-anhnen.jpg",
    durationLabel: "03:53",
    youtubeId: "gEDpsS7p6Co",
    audioUrl: "assets/music/lo-thuong-nhau.mp3"
  },

  // 10. LỜI CHÚC KHỞI TẠO (HIỂN THỊ DÒNG CHÚC BAY & SỔ LƯU BÚT)
  initialWishes: [
    { name: "Minh Anh", message: "Chúc mừng đám cưới Hoàng Phúc và Tường Vy nhaaa ❤️ Chúc hai bạn mãi mãi hạnh phúc, yêu thương nhau trọn đời!" },
    { name: "Đức Loan", message: "Chúc vợ chồng bạn trăm năm hạnh phúc 😍😍😍" },
    { name: "Chị Thảo", message: "Mừng hạnh phúc em gái Tường Vy nhé ❤️ Em luôn thật rạng rỡ, bình an bên anh Phúc nha!" },
    { name: "Gia đình Bác Tư", message: "Chúc hai cháu thuận vợ thuận chồng, trăm năm tình viên mãn, sớm sinh quý tử!" }
  ],

  // 11. GOOGLE SHEETS APPS SCRIPT WEB APP (ĐỒNG BỘ LƯU BÚT & RSVP CHO MỌI THIẾT BỊ)
  wishesApiUrl: "https://script.google.com/macros/s/AKfycbzBmzXwQsmrd8ChGFbTbgxOco9sPd7rsU6NB_a1aqkr3WMm02a4Q8V8qANtVaUA-tKvmA/exec",
  rsvpWebhookUrl: "https://script.google.com/macros/s/AKfycbzBmzXwQsmrd8ChGFbTbgxOco9sPd7rsU6NB_a1aqkr3WMm02a4Q8V8qANtVaUA-tKvmA/exec"
};
