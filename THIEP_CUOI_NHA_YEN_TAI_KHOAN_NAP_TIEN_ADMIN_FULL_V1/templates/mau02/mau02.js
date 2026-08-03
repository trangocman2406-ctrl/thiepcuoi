(function(){
  window.RolaTemplateEffects = window.RolaTemplateEffects || {};

  function reveal(root){
    const items = root.querySelectorAll('[data-reveal]');
    root.classList.add('mau02-effect-ready');
    items.forEach(el => el.classList.remove('show'));
    if(!('IntersectionObserver' in window)){
      items.forEach(el => el.classList.add('show'));
      return;
    }
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('show');
          io.unobserve(e.target);
        }
      });
    }, {threshold:.11, rootMargin:'0px 0px -6% 0px'});
    items.forEach(x=>io.observe(x));
    setTimeout(()=>items.forEach(el=>{
      const r = el.getBoundingClientRect();
      if(r.top < window.innerHeight * .96 && r.bottom > 0) el.classList.add('show');
    }), 80);
  }

  /* Tên cô dâu chú rể hiện từng nét chữ, chạy sau khi lá thư đã mở
     (giống mẫu 1) — không chạy khi còn bị màn lá thư che mất. */
  function splitLetters(el){
    const text = el.textContent;
    el.textContent = '';
    Array.from(text).forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.transform = 'translateY(14px)';
      span.style.transition = 'opacity .5s ease,transform .5s ease';
      span.style.transitionDelay = (i * 45) + 'ms';
      el.appendChild(span);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.querySelectorAll('span').forEach(s => { s.style.opacity = '1'; s.style.transform = 'none'; });
    }));
  }

  function initNameReveal(root){
    const spans = root.querySelectorAll('.mau02-cover h1 span');
    if(!spans.length || root.dataset.mau02NameReady === '1') return;
    root.dataset.mau02NameReady = '1';
    function run(){ spans.forEach(splitLetters); }
    const intro = root.querySelector('[data-letter-intro]');
    if(intro && getComputedStyle(intro).display !== 'none'){
      document.addEventListener('mau02:letter-opened', run, {once:true});
    }else{
      run();
    }
  }

  /* Số ngày trong ô sự kiện đếm chạy lên tới đúng số khi cuộn tới. */
  function animateCountUp(el){
    if(el.dataset.mau02CountReady === '1') return;
    el.dataset.mau02CountReady = '1';
    const target = parseInt(el.textContent, 10);
    if(!Number.isFinite(target)) return;
    const digits = el.textContent.trim().length;
    const dur = 900;
    const start = performance.now();
    function tick(now){
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased)).padStart(digits, '0');
      if(t < 1) requestAnimationFrame(tick);
      else el.textContent = String(target);
    }
    requestAnimationFrame(tick);
  }

  function initDateCountUp(root){
    const els = root.querySelectorAll('.mau02-date-row b');
    if(!els.length) return;
    if(!('IntersectionObserver' in window)){
      els.forEach(animateCountUp);
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if(e.isIntersecting){
          animateCountUp(e.target);
          io.unobserve(e.target);
        }
      });
    }, {threshold:.4});
    els.forEach(el => io.observe(el));
  }

  /* Icon cảm xúc nổi nhẹ bay lên khi khách vừa gửi lời chúc. */
  function floatEmojiFrom(el, emoji){
    if(!el) return;
    const rect = el.getBoundingClientRect();
    const span = document.createElement('span');
    span.className = 'mau02-heart-burst';
    span.textContent = emoji || '💖';
    span.style.left = (rect.left + rect.width/2 - 11) + 'px';
    span.style.top = (rect.top - 6) + 'px';
    span.style.setProperty('--hx', ((Math.random()-0.5)*60).toFixed(0) + 'px');
    document.body.appendChild(span);
    span.addEventListener('animationend', () => span.remove());
  }

  function music(root){
    const btn = root.querySelector('[data-audio-src]');
    if(btn && window.NhaYenMusicController) window.NhaYenMusicController.bind(root, btn);
  }

  const SPARK_SYMBOLS = ['✦','✧','▲','•','·'];
  // Thỉnh thoảng điểm thêm 1 cánh hoa hoặc 1 trái tim nhỏ (rất ít, không
  // lấn át hạt sáng chính) — "tim nhỏ bay nhẹ, số lượng ít".
  const RARE_SYMBOLS = ['🌸','💕'];

  function fillSparkLayer(layer, count, seedOffset){
    for(let i=0;i<count;i++){
      const n = i + (seedOffset||0);
      const p = document.createElement('span');
      const isRare = n % 13 === 0;
      p.textContent = isRare ? RARE_SYMBOLS[(n / 13) % RARE_SYMBOLS.length | 0] : SPARK_SYMBOLS[n % SPARK_SYMBOLS.length];
      const size = 9 + (n % 13) * 1.4;
      const delay = -(n % 42) * .2;
      const dur = isRare ? 9 + (n % 17) * .4 : 5.2 + (n % 17) * .3;
      p.style.left = (-10 + (n * 29) % 118) + '%';
      p.style.top = ((n * 43) % 100) + '%';
      p.style.fontSize = (isRare ? size + 4 : size) + 'px';
      p.style.animationDuration = dur + 's';
      p.style.animationDelay = delay + 's';
      if(isRare) p.style.color = 'initial';
      layer.appendChild(p);
    }
  }

  function sparkField(root){
    root.querySelectorAll(':scope > .mau02-spark-layer').forEach(x => x.remove());
    const layer = document.createElement('div');
    layer.className = 'mau02-spark-layer';
    layer.setAttribute('aria-hidden','true');
    fillSparkLayer(layer, 160, 0);
    root.prepend(layer);
  }

  /* ============================================================
     Màn hình lá thư mở đầu — bấm "Mở thư": thẻ + huy hiệu rung một
     nhịp, hạt lấp lánh bung thêm một đợt, thẻ rơi xuống mờ dần và lộ
     thiệp chính ra.
     ============================================================ */
  function letterIntro(root){
    const intro = root.querySelector('[data-letter-intro]');
    if(!intro || intro.dataset.mau02LetterReady === '1') return;
    intro.dataset.mau02LetterReady = '1';

    let inIframe = true;
    try{ inIframe = window.self !== window.top; }catch(error){ inIframe = true; }
    if(inIframe){
      intro.style.display = 'none';
      return;
    }

    const btn = intro.querySelector('[data-letter-open]');
    if(!btn) return;

    const sparkLayer = document.createElement('div');
    sparkLayer.className = 'mau02-spark-layer';
    sparkLayer.setAttribute('aria-hidden', 'true');
    fillSparkLayer(sparkLayer, 70, 5);
    intro.prepend(sparkLayer);

    btn.addEventListener('click', function(){
      if(btn.disabled) return;
      btn.disabled = true;

      const badge = intro.querySelector('.mau02-letter-badge');
      const card = intro.querySelector('.mau02-letter-card');
      if(badge) badge.classList.add('is-opening');
      if(card) card.classList.add('is-opening');

      sparkLayer.classList.add('is-bursting');
      fillSparkLayer(sparkLayer, 100, 60);

      const FALL_DELAY = 1300;
      const FALL_DURATION = 1300;
      const CLOSE_DURATION = 1100;

      window.setTimeout(function(){
        if(card) card.classList.add('is-falling');
      }, FALL_DELAY);

      window.setTimeout(function(){
        intro.classList.add('is-closing');
        document.dispatchEvent(new Event('mau02:letter-opened'));
      }, FALL_DELAY + FALL_DURATION);

      window.setTimeout(function(){
        intro.style.display = 'none';
      }, FALL_DELAY + FALL_DURATION + CLOSE_DURATION);
    });
  }

  /* ============================================================
     Lời chúc + RSVP + bong bóng nổi — dùng chung API /api/public/*
     đã có, chỉ đổi tên lớp CSS cho khớp mẫu 2.
     ============================================================ */
  function publicSlugFromLocation(){
    const match = (window.location.pathname || '').match(/^\/i\/([^\/]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function escHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => (
      {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]
    ));
  }

  function makeGuestMessageCard(name, message, emoji){
    emoji = emoji || '💖';
    name = (name || '').trim();
    if(['khách','khach','khách mời','khach moi'].indexOf(name.toLowerCase()) !== -1) name = '';
    const nameHtml = name ? '<b>' + escHtml(name) + '</b>' : '';
    return '<div class="wish-pink-bar mau02-live-message">'
      + '<span class="wish-emoji">' + escHtml(emoji) + '</span>'
      + '<span class="wish-body">' + nameHtml
      + '<small>' + escHtml(message || '') + '</small></span>'
      + '</div>';
  }

  function showNewMessageInTemplate(root, name, message, emoji){
    const tpl = (root && root.closest ? root.closest('.tpl-mau02') : null) || document;

    const list = tpl.querySelector('[data-wish-list]');
    if(list){
      list.querySelectorAll('.empty,.wish-empty').forEach(el => el.remove());
      list.insertAdjacentHTML('afterbegin', makeGuestMessageCard(name, message, emoji));
    }
  }

  function saveDemoMessage(name, message){
    try{
      const key = 'mau02_demo_wishes';
      const old = JSON.parse(localStorage.getItem(key) || '[]');
      old.unshift({guest_name:name, message:message, created_at:new Date().toISOString()});
      localStorage.setItem(key, JSON.stringify(old.slice(0,30)));
    }catch(e){}
  }

  function postPublicMessage(slug, name, message, emoji){
    if(!slug){
      saveDemoMessage(name, message);
      return Promise.resolve({ok:true, demo:true});
    }
    return fetch('/api/public/' + encodeURIComponent(slug) + '/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({guest_name:name, message:message, emoji:emoji || '💖'})
    }).then(res => res.json().catch(()=>({})).then(data => {
      if(!res.ok || data.ok === false) throw new Error(data.error || 'Không gửi được lời chúc');
      return data;
    }));
  }

  function initWishForm(root){
    root.querySelectorAll('.tpl-mau02 [data-wish-form]').forEach(form => {
      if(form.dataset.mau02WishReady === '1') return;
      form.dataset.mau02WishReady = '1';
      const result = form.querySelector('.mau02-wish-result');
      const btn = form.querySelector('.mau02-wish-send');
      const emojiInput = form.querySelector('[data-emoji-value]');
      form.querySelectorAll('[data-emoji]').forEach(pickerBtn => {
        pickerBtn.addEventListener('click', () => {
          form.querySelectorAll('[data-emoji]').forEach(x => x.classList.remove('active'));
          pickerBtn.classList.add('active');
          if(emojiInput) emojiInput.value = pickerBtn.dataset.emoji || '💖';
        });
      });
      form.addEventListener('submit', event => {
        event.preventDefault();
        const nameInput = form.querySelector('[name="guest_name"]');
        const msgInput = form.querySelector('[name="message"]');
        const name = (nameInput && nameInput.value || '').trim();
        const message = (msgInput && msgInput.value || '').trim();
        const emoji = (emojiInput && emojiInput.value || '💖').trim();
        form.classList.remove('is-error','is-done');
        if(message.length < 2){
          form.classList.add('is-error');
          if(result) result.textContent = 'Bạn nhập lời chúc rõ hơn một chút rồi gửi lại nha.';
          return;
        }
        form.classList.add('is-sending');
        if(btn) btn.textContent = 'Đang gửi...';
        if(result) result.textContent = '';
        postPublicMessage(publicSlugFromLocation(), name, message, emoji).then(data => {
          form.classList.remove('is-sending');
          form.classList.add('is-done');
          if(btn) btn.textContent = 'Gửi lời chúc';
          if(result) result.textContent = data && data.demo ? 'Đã hiện lời chúc 💖' : 'Đã gửi lời chúc 💖';
          if(msgInput) msgInput.value = '';
          showNewMessageInTemplate(form, name, message, emoji);
          floatEmojiFrom(btn, emoji);
        }).catch(err => {
          form.classList.remove('is-sending');
          form.classList.add('is-error');
          if(btn) btn.textContent = 'Gửi lời chúc';
          if(result) result.textContent = err.message || 'Chưa gửi được lời chúc, vui lòng thử lại.';
        });
      });
    });
  }

  function initRsvp(root){
    root.querySelectorAll('.tpl-mau02 [data-rsvp-card]').forEach(form => {
      if(form.dataset.mau02RsvpReady === '1') return;
      form.dataset.mau02RsvpReady = '1';
      const btn = form.querySelector('.mau02-rsvp-submit');
      let result = form.querySelector('.rsvp-result');
      if(!result){
        result = document.createElement('div');
        result.className = 'rsvp-result';
        form.appendChild(result);
      }
      form.addEventListener('submit', event => {
        event.preventDefault();
        const nameInput = form.querySelector('[name="guest_name"]');
        const select = form.querySelector('[name="guest_count"]');
        const checked = form.querySelector('[name="attendance"]:checked');
        const name = (nameInput && nameInput.value || '').trim();
        const count = (select && select.value || '1 người').trim();
        const attend = !checked || checked.value !== 'no';
        const msg = attend ? ('[RSVP] ' + name + ' xác nhận tham dự - ' + count) : ('[RSVP] ' + name + ' báo bận, không thể tham dự');
        form.classList.add('rsvp-loading');
        result.textContent = 'Đang gửi xác nhận...';
        result.style.display = 'block';
        postPublicMessage(publicSlugFromLocation(), name, msg).then(data => {
          form.classList.remove('rsvp-loading');
          form.classList.add('rsvp-sent');
          result.textContent = data && data.demo
            ? 'Đã hiện xác nhận trên bản xem thử. Khi dùng link /i/... hệ thống sẽ lưu thật.'
            : (attend ? 'Đã nhận xác nhận tham dự của bạn. Cảm ơn bạn nhiều nha!' : 'Đã nhận phản hồi. Cảm ơn bạn đã báo lại nha!');
          if(btn) btn.textContent = 'Đã gửi xác nhận';
          showNewMessageInTemplate(form, name, msg);
        }).catch(err => {
          form.classList.remove('rsvp-loading');
          result.textContent = err.message || 'Chưa gửi được xác nhận, vui lòng thử lại.';
        });
      });
    });
  }

  /* Khung xem đường đi cụ thể ở khối Lễ thành hôn: dựng iframe Google
     Maps ngay trong thẻ sự kiện, lấy từ địa chỉ chữ (mau02-event-place)
     thay vì link đã dán — link chia sẻ thường hay bị Google chặn nhúng
     iframe, còn địa chỉ chữ luôn dựng được URL nhúng hợp lệ, không cần
     API key. */
  function initMapEmbeds(root){
    root.querySelectorAll('.tpl-mau02 [data-map-embed]').forEach(box => {
      if(box.dataset.mau02MapReady === '1') return;
      const card = box.closest('.mau02-event-card');
      const placeEl = card && card.querySelector('.mau02-event-place');
      const address = (placeEl && placeEl.textContent || '').trim();
      if(!address) return;
      box.dataset.mau02MapReady = '1';
      const iframe = document.createElement('iframe');
      iframe.className = 'mau02-map-frame';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.title = 'Bản đồ chỉ đường: ' + address;
      iframe.src = 'https://www.google.com/maps?q=' + encodeURIComponent(address) + '&output=embed';
      box.appendChild(iframe);
    });
  }

  function run(root){
    if(!root) return;
    root.dataset.mau02Ready = String(Date.now());
    reveal(root);
    music(root);
    sparkField(root);
    letterIntro(root);
    initNameReveal(root);
    initDateCountUp(root);
    initWishForm(root);
    initRsvp(root);
    initMapEmbeds(root);
  }

  window.RolaTemplateEffects.mau02 = run;
})();
