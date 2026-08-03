(function(){
  window.RolaTemplateEffects = window.RolaTemplateEffects || {};

  function $(s, r){ return (r || document).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function setupReveal(root){
    var items = $$('[data-reveal]', root);
    if(!items.length) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('show');
          io.unobserve(entry.target);
        }
      });
    }, {threshold:0.14});
    items.forEach(function(item){ io.observe(item); });
  }

  function setupMusic(root){
    var btn = $('.m05-music', root);
    if(btn && window.NhaYenMusicController) window.NhaYenMusicController.bind(root, btn);
  }

  function initLetterIntro(root){
    var intro = $('[data-letter-intro]', root);
    if(!intro || intro.dataset.ready === '1') return;
    intro.dataset.ready = '1';

    // Khung xem nhanh trong iframe nhỏ (trang chọn mẫu / designer) sẽ bị màn
    // lá thư phủ kín che mất phần nội dung xem trước — chỉ hiện màn lá thư
    // khi thiệp được mở trực tiếp, không hiện khi đang nhúng trong iframe.
    var inIframe = true;
    try{ inIframe = window.self !== window.top; }catch(error){ inIframe = true; }
    if(inIframe){
      intro.style.display = 'none';
      return;
    }

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    var btn = $('[data-letter-open]', intro);
    if(!btn) return;

    var badge = $('.m05-letter-badge', intro);
    var card = $('.m05-letter-card', intro);

    btn.addEventListener('click', function(){
      if(btn.disabled) return;
      btn.disabled = true;

      if(badge) badge.classList.add('is-opening');
      if(card) card.classList.add('is-opening');
      document.dispatchEvent(new CustomEvent('m05:letter-bursting', { detail:{ button:btn } }));

      var FALL_DELAY = 1300;
      var FALL_DURATION = 1300;
      var CLOSE_DURATION = 1100;

      window.setTimeout(function(){
        if(card) card.classList.add('is-falling');
      }, FALL_DELAY);

      window.setTimeout(function(){
        intro.classList.add('is-closing');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.dispatchEvent(new Event('m05:letter-opened'));
      }, FALL_DELAY + FALL_DURATION);

      window.setTimeout(function(){
        intro.style.display = 'none';
        if(intro.parentNode) intro.parentNode.removeChild(intro);
      }, FALL_DELAY + FALL_DURATION + CLOSE_DURATION);
    });
  }

  function initLetterPetals(root){
    var canvas = $('[data-letter-petals]', root);
    if(!canvas || canvas.dataset.ready === '1') return;
    canvas.dataset.ready = '1';

    var intro = canvas.closest('[data-letter-intro]');
    if(intro && getComputedStyle(intro).display === 'none') return;

    var ctx = canvas.getContext('2d');
    if(!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var petals = [];
    var bursts = [];
    var running = true;
    var rafId = null;

    function size(){
      var rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    }

    function makePetal(spreadY){
      var w = canvas.width, h = canvas.height;
      var s = (11 + Math.random() * 13) * dpr;
      return {
        x: Math.random() * w,
        y: spreadY ? Math.random() * h : -s * 2,
        size: s,
        speed: (7 + Math.random() * 8) * dpr / 60,
        drift: (Math.random() - 0.5) * 0.25 * dpr,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.008,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.005 + Math.random() * 0.009
      };
    }

    function drawPetal(p, sizeOverride, opacityOverride){
      var s = sizeOverride == null ? p.size : sizeOverride;
      if(s <= .6) return;
      ctx.save();
      ctx.globalAlpha = opacityOverride == null ? 1 : Math.max(0, opacityOverride);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      var grad = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
      grad.addColorStop(0, '#f5fff2');
      grad.addColorStop(.55, '#bfe6b8');
      grad.addColorStop(1, '#5fa473');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * .32, s * .5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    document.addEventListener('m05:letter-bursting', function(event){
      var btn = event.detail && event.detail.button;
      if(!btn) return;
      canvas.classList.add('is-bursting');

      var w = canvas.width, h = canvas.height;
      var burstCount = 200;
      for(var i = 0; i < burstCount; i++){
        bursts.push({
          x: Math.random() * w,
          y: -h * .12 + Math.random() * h * .78,
          vx: (Math.random() - .5) * .3 * dpr,
          vy: (6 + Math.random() * 9) * dpr / 60,
          size: (8 + Math.random() * 13) * dpr,
          rotation: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * .012,
          sway: Math.random() * Math.PI * 2,
          swaySpeed: 0.005 + Math.random() * 0.007,
          startedAt: performance.now(),
          life: 3600 + Math.random() * 2200
        });
      }
    });

    function frame(){
      if(!running) return;
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      petals.forEach(function(p){
        p.y += p.speed;
        p.sway += p.swaySpeed;
        p.x += p.drift + Math.sin(p.sway) * .25 * dpr;
        p.rotation += p.spin;
        if(p.y - p.size > h){ p.y = -p.size; p.x = Math.random() * w; }
        if(p.x < -p.size) p.x = w + p.size;
        if(p.x > w + p.size) p.x = -p.size;
        drawPetal(p);
      });

      if(bursts.length){
        var now = performance.now();
        bursts = bursts.filter(function(b){
          var age = now - b.startedAt;
          if(age >= b.life) return false;
          b.sway += b.swaySpeed;
          b.x += b.vx + Math.sin(b.sway) * .25 * dpr;
          b.y += b.vy;
          b.rotation += b.spin;
          var t = age / b.life;
          var alpha = t < .18 ? t / .18 : (t < .78 ? 1 : 1 - (t - .78) / .22);
          drawPetal(b, b.size, alpha);
          return true;
        });
      }

      rafId = window.requestAnimationFrame(frame);
    }

    size();
    var count = Math.max(24, Math.min(46, Math.round((canvas.width * canvas.height) / (52000 * dpr * dpr))));
    for(var i = 0; i < count; i++) petals.push(makePetal(true));

    window.addEventListener('resize', size);
    frame();

    if(intro){
      var stopWatcher = new MutationObserver(function(){
        if(getComputedStyle(intro).display === 'none'){
          running = false;
          if(rafId) window.cancelAnimationFrame(rafId);
          window.removeEventListener('resize', size);
          stopWatcher.disconnect();
        }
      });
      stopWatcher.observe(intro, { attributes:true, attributeFilter:['style'] });
    }
  }

  function setupCountdown(root){
    var dateText = root.getAttribute('data-wedding-date') || '';
    if(!dateText || dateText.indexOf('{{') !== -1) return;
    var timeText = root.getAttribute('data-wedding-time') || '18:00';
    var hh = 18, mm = 0;
    var match = String(timeText).match(/(\d{1,2})[:hH.](\d{1,2})/);
    if(match){ hh = parseInt(match[1],10) || 18; mm = parseInt(match[2],10) || 0; }
    var target = new Date(dateText + 'T' + String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0') + ':00');
    if(!isFinite(target.getTime())) return;
    var els = {
      days:$('[data-count="days"]', root),
      hours:$('[data-count="hours"]', root),
      minutes:$('[data-count="minutes"]', root),
      seconds:$('[data-count="seconds"]', root)
    };
    function draw(){
      var diff = Math.max(0, target.getTime() - Date.now());
      var sec = Math.floor(diff / 1000);
      var days = Math.floor(sec / 86400); sec -= days * 86400;
      var hours = Math.floor(sec / 3600); sec -= hours * 3600;
      var minutes = Math.floor(sec / 60); sec -= minutes * 60;
      if(els.days) els.days.textContent = String(days).padStart(2,'0');
      if(els.hours) els.hours.textContent = String(hours).padStart(2,'0');
      if(els.minutes) els.minutes.textContent = String(minutes).padStart(2,'0');
      if(els.seconds) els.seconds.textContent = String(sec).padStart(2,'0');
    }
    draw();
    setInterval(draw, 1000);
  }

  /* Ưu tiên dựng URL nhúng từ ĐỊA CHỈ CHỮ (m05-map-copy p) thay vì link
     data-map-url dán sẵn — link "Chia sẻ" copy từ Google Maps (kể cả link
     rút gọn maps.app.goo.gl) thường bị Google chặn nhúng iframe, nhét
     nguyên link đó vào q= sẽ ra trang báo "không xác định được vị trí"
     thay vì bản đồ. Địa chỉ chữ luôn dựng được URL nhúng hợp lệ, không cần
     API key (đã áp dụng ở mẫu 2). Chỉ dùng lại link dán sẵn khi không có
     địa chỉ chữ. */
  function buildEmbed(address, url){
    var query = String(address || '').trim();
    if(query && query.indexOf('{{') === -1){
      return 'https://www.google.com/maps?q=' + encodeURIComponent(query) + '&output=embed';
    }
    url = String(url || '').trim();
    if(!url || url === '#' || url.indexOf('{{') !== -1) return '';
    if(url.indexOf('/maps/embed') !== -1 || url.indexOf('output=embed') !== -1) return url;
    return 'https://www.google.com/maps?q=' + encodeURIComponent(url) + '&output=embed';
  }

  function setupMap(root){
    var frame = $('[data-map-frame]', root);
    var empty = $('[data-map-empty]', root);
    if(!frame) return;
    var addressEl = $('.m05-map-copy p', root);
    var embed = buildEmbed(addressEl && addressEl.textContent, root.getAttribute('data-map-url'));
    if(!embed){ if(empty) empty.hidden = false; return; }
    if(empty) empty.hidden = true;
    frame.src = embed;
    frame.addEventListener('error', function(){ if(empty) empty.hidden = false; }, {once:true});
  }

  function setupFlights(root){
    var section = $('[data-story-section]', root);
    var flights = $$('[data-flight]', root);
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

  function setupWishUI(root){
    $$('.m05-rsvp-icons button', root).forEach(function(btn){
      btn.addEventListener('click', function(){
        $$('.m05-rsvp-icons button', root).forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
    var form = $('[data-wish-form-public]', root);
    if(!form) return;
    $$('.m05-emoji-picker [data-emoji]', root).forEach(function(btn){
      btn.addEventListener('click', function(){
        $$('.m05-emoji-picker [data-emoji]', root).forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        var input = $('[data-emoji-value]', form);
        if(input) input.value = btn.getAttribute('data-emoji') || '💖';
      });
    });
  }

  window.RolaTemplateEffects.mau05 = function(root){
    if(!root || root.dataset.fxReady === '1') return;
    root.dataset.fxReady = '1';
    setupReveal(root);
    setupMusic(root);
    initLetterIntro(root);
    initLetterPetals(root);
    setupCountdown(root);
    setupMap(root);
    setupFlights(root);
    setupWishUI(root);
  };
})();
