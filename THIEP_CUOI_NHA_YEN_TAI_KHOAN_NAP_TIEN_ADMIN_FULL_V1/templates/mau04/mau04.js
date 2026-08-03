
(function(){
  window.RolaTemplateEffects = window.RolaTemplateEffects || {};
  function reveal(root){
    const items = root.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('show'); io.unobserve(e.target); } });
    }, {threshold:.16});
    items.forEach(x=>io.observe(x));
  }
  function music(root){
    const btn = root.querySelector('[data-audio-src]');
    if(btn && window.NhaYenMusicController) window.NhaYenMusicController.bind(root, btn);
  }

  function spark(root, cls, char, count){
    if(root.querySelector('.tpl-fx-'+cls)) return;
    const layer = document.createElement('div'); layer.className = 'tpl-fx-layer tpl-fx-'+cls;
    layer.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:4';
    for(let i=0;i<count;i++){
      const s=document.createElement('span'); s.textContent=char;
      s.style.cssText=`position:absolute;left:${(i*37)%100}%;top:${(i*23)%100}%;font-size:${12+(i%8)*3}px;opacity:.0;animation:tplTwinkle ${2+(i%5)*.5}s ease-in-out ${-(i%9)}s infinite;color:var(--fx-color,#fff);text-shadow:0 0 12px currentColor;`;
      layer.appendChild(s);
    }
    root.appendChild(layer);
    if(!document.getElementById('tplCommonFxStyle')){
      const st=document.createElement('style'); st.id='tplCommonFxStyle'; st.textContent='@keyframes tplTwinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:.9;transform:scale(1.2) rotate(25deg)}} @keyframes tplFloatUp{0%{opacity:0;transform:translateY(20px)}20%{opacity:.9}100%{opacity:0;transform:translateY(-120vh)}} .playing{animation:tplMusic 1.6s ease-in-out infinite}@keyframes tplMusic{50%{transform:scale(1.1)}}'; document.head.appendChild(st);
    }
  }
  function scrollFlash(root, color){
    if(root.dataset.scrollFlash==='1') return; root.dataset.scrollFlash='1';
    let lock=false;
    window.addEventListener('scroll',()=>{
      if(lock || !document.body.contains(root)) return; lock=true;
      const layer=document.createElement('span'); layer.textContent='✦'; layer.style.cssText=`position:fixed;left:${20+Math.random()*65}vw;top:${20+Math.random()*60}vh;z-index:999;pointer-events:none;color:${color};font-size:${18+Math.random()*18}px;text-shadow:0 0 14px ${color};animation:tplScrollPop .9s ease-out forwards`;
      document.body.appendChild(layer); setTimeout(()=>layer.remove(),900); setTimeout(()=>lock=false,180);
    },{passive:true});
    if(!document.getElementById('tplScrollPopStyle')){const st=document.createElement('style'); st.id='tplScrollPopStyle'; st.textContent='@keyframes tplScrollPop{0%{opacity:0;transform:scale(.4) rotate(0deg)}35%{opacity:1}100%{opacity:0;transform:scale(1.8) rotate(80deg)}}'; document.head.appendChild(st);}
  }

  /* Rải chữ "囍" ẩn hiện lấp lánh bên ngoài thẻ thư trong màn intro —
     dùng đúng ký tự + màu (--fx-color) như hiệu ứng lấp lánh sẵn có
     của mẫu 4 (xem spark() ở trên), chỉ giới hạn trong màn lá thư
     thay vì rải khắp trang, và không phụ thuộc lớp spark() dùng chung. */
  function initLetterSparkle(root){
    var intro = root.querySelector('[data-letter-intro]');
    var layer = root.querySelector('[data-letter-sparkle]');
    if(!intro || !layer) return;
    if(getComputedStyle(intro).display === 'none') return;
    if(layer.dataset.ready === '1') return;
    layer.dataset.ready = '1';

    var count = 18;
    for(var i = 0; i < count; i++){
      var s = document.createElement('span');
      s.className = 'mau04-letter-sparkle';
      s.textContent = '囍';
      s.style.left = ((i * 37) % 100) + '%';
      s.style.top = ((i * 23) % 100) + '%';
      s.style.fontSize = (10 + (i % 8) * 3) + 'px';
      s.style.animationDuration = (2 + (i % 5) * .5) + 's';
      s.style.animationDelay = (-(i % 9)) + 's';
      layer.appendChild(s);
    }
  }

  /* Màn lá thư mở đầu — bố cục + nhịp hiệu ứng lấy từ mẫu 1 (huy hiệu
     phong bì rung, thẻ thư rơi xuống), tách khỏi phong bì "囍" lấp
     lánh của mẫu 4 dùng làm nền thay cho cánh hoa rơi của mẫu 1. */
  function initLetterIntro(root){
    var intro = root.querySelector('[data-letter-intro]');
    var body = root.querySelector('.mau04-body');
    var btn = intro && intro.querySelector('[data-letter-open]');

    // Khung xem nhanh ở trang chọn mẫu nhúng thiệp trong iframe nhỏ — màn
    // lá thư phủ kín sẽ chặn mất phần kéo xem nội dung thật bên trong.
    // Chỉ hiện màn lá thư khi thiệp được mở trực tiếp, không hiện khi
    // đang nhúng trong iframe xem nhanh.
    var inIframe = true;
    try { inIframe = window.self !== window.top; } catch (error) { inIframe = true; }

    if(!intro || !btn || inIframe){
      if(intro) intro.style.display = 'none';
      root.classList.add('mau04-content-visible');
      if(body) body.removeAttribute('aria-hidden');
      return;
    }

    if(intro.dataset.ready === '1') return;
    intro.dataset.ready = '1';

    var badge = intro.querySelector('.mau04-letter-badge');
    var card = intro.querySelector('.mau04-letter-card');

    btn.addEventListener('click', function(){
      if(btn.disabled) return;
      btn.disabled = true;

      if(badge) badge.classList.add('is-opening');
      if(card) card.classList.add('is-opening');

      var FALL_DELAY = 1300;
      var FALL_DURATION = 1300;
      var CLOSE_DURATION = 1100;

      window.setTimeout(function(){
        if(card) card.classList.add('is-falling');
      }, FALL_DELAY);

      window.setTimeout(function(){
        intro.classList.add('is-closing');
        root.classList.add('mau04-content-visible');
        if(body) body.removeAttribute('aria-hidden');
      }, FALL_DELAY + FALL_DURATION);

      window.setTimeout(function(){
        intro.style.display = 'none';
      }, FALL_DELAY + FALL_DURATION + CLOSE_DURATION);
    });
  }

  /* Đếm ngược tới giờ lễ và giờ tiệc — tách riêng 2 đồng hồ (mỗi thẻ sự
     kiện một đồng hồ), đọc data-wedding-date + data-ceremony-time /
     data-party-time trên root article. */
  function parseTarget(dateText, timeText){
    if(!dateText || dateText.indexOf('{{') !== -1) return null;
    var hh = 18, mm = 0;
    var match = String(timeText || '').match(/(\d{1,2})[:hH.](\d{1,2})/);
    if(match){ hh = parseInt(match[1],10) || 18; mm = parseInt(match[2],10) || 0; }
    var target = new Date(dateText + 'T' + String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0') + ':00');
    return isFinite(target.getTime()) ? target : null;
  }
  function initCountdown(root){
    var dateText = root.getAttribute('data-wedding-date') || '';
    var boxes = [
      { el: root.querySelector('[data-count-target="ceremony"]'), target: parseTarget(dateText, root.getAttribute('data-ceremony-time')) },
      { el: root.querySelector('[data-count-target="party"]'), target: parseTarget(dateText, root.getAttribute('data-party-time')) }
    ].filter(function(item){ return item.el && item.target; });
    if(!boxes.length) return;
    function draw(){
      boxes.forEach(function(item){
        var diff = Math.max(0, item.target.getTime() - Date.now());
        var sec = Math.floor(diff / 1000);
        var days = Math.floor(sec / 86400); sec -= days * 86400;
        var hours = Math.floor(sec / 3600); sec -= hours * 3600;
        var minutes = Math.floor(sec / 60); sec -= minutes * 60;
        var dEl = item.el.querySelector('[data-count="days"]');
        var hEl = item.el.querySelector('[data-count="hours"]');
        var mEl = item.el.querySelector('[data-count="minutes"]');
        var sEl = item.el.querySelector('[data-count="seconds"]');
        if(dEl) dEl.textContent = String(days).padStart(2,'0');
        if(hEl) hEl.textContent = String(hours).padStart(2,'0');
        if(mEl) mEl.textContent = String(minutes).padStart(2,'0');
        if(sEl) sEl.textContent = String(sec).padStart(2,'0');
      });
    }
    draw();
    setInterval(draw, 1000);
  }

  /* Nhúng Google Maps. Ưu tiên dựng URL nhúng từ ĐỊA CHỈ CHỮ
     (mau04-map-copy p) thay vì link data-map-url dán sẵn — link "Chia sẻ"
     copy từ Google Maps (kể cả link rút gọn maps.app.goo.gl) thường bị
     Google chặn nhúng iframe, nhét nguyên link đó vào q= sẽ ra trang báo
     "không xác định được vị trí/liên kết" thay vì bản đồ. Địa chỉ dạng chữ
     luôn dựng được URL nhúng hợp lệ, không cần API key (đã áp dụng ở mẫu
     2, xem initMapEmbeds). Chỉ dùng lại link dán sẵn khi không có địa chỉ
     chữ, để không ai lùi lại đúng lỗi cũ. */
  function buildMapEmbed(address, url){
    var query = String(address || '').trim();
    if(query && query.indexOf('{{') === -1){
      return 'https://www.google.com/maps?q=' + encodeURIComponent(query) + '&output=embed';
    }
    url = String(url || '').trim();
    if(!url || url === '#' || url.indexOf('{{') !== -1) return '';
    if(url.indexOf('/maps/embed') !== -1 || url.indexOf('output=embed') !== -1) return url;
    return 'https://www.google.com/maps?q=' + encodeURIComponent(url) + '&output=embed';
  }
  function initMap(root){
    var frame = root.querySelector('[data-map-frame]');
    var empty = root.querySelector('[data-map-empty]');
    if(!frame) return;
    var addressEl = root.querySelector('.mau04-map-copy p');
    var embed = buildMapEmbed(addressEl && addressEl.textContent, root.getAttribute('data-map-url'));
    if(!embed){ if(empty) empty.hidden = false; return; }
    if(empty) empty.hidden = true;
    frame.src = embed;
    frame.addEventListener('error', function(){ if(empty) empty.hidden = false; }, {once:true});
  }

  /* Đường bay "囍" trôi theo cuộn trang ở mục Love story. */
  function initStoryFlights(root){
    var section = root.querySelector('[data-story-section]');
    var flights = Array.prototype.slice.call(root.querySelectorAll('[data-flight]'));
    if(!section || !flights.length || section.dataset.flightReady === '1') return;
    section.dataset.flightReady = '1';
    var lastY = window.scrollY || 0;
    function move(){
      var y = window.scrollY || 0;
      var dirUp = y < lastY;
      lastY = y;
      var rect = section.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      var progress = Math.max(0, Math.min(1.15, (vh - rect.top) / (rect.height + vh)));
      flights.forEach(function(item, index){
        var offset = progress * (28 + index * 16);
        item.style.transform = 'translateY(' + offset + 'px)';
        item.classList.toggle('is-up', dirUp);
      });
    }
    move();
    window.addEventListener('scroll', move, {passive:true});
    window.addEventListener('resize', move);
  }

  /* Nút cảm xúc tham dự (☺/☹) ở mục Lời chúc — nút emoji + gửi form
     đã được xử lý chung ở static/js/invitation.js, ở đây chỉ cần bật
     trạng thái active cho 2 nút RSVP. */
  function initRsvpIcons(root){
    var buttons = root.querySelectorAll('[data-rsvp-state]');
    buttons.forEach(function(btn){
      btn.addEventListener('click', function(){
        buttons.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
  }

  window.RolaTemplateEffects.mau04 = function(root){
    if(root.dataset.fxReady==='1') return;
    root.dataset.fxReady='1';
    root.style.setProperty('--fx-color','#f6d7bc');
    root.classList.add('mau04-js');
    reveal(root);
    music(root);
    spark(root,'mau04','囍',18);
    scrollFlash(root,'#f6d7bc');
    initLetterIntro(root);
    initLetterSparkle(root);
    initCountdown(root);
    initMap(root);
    initStoryFlights(root);
    initRsvpIcons(root);
  };
})();
