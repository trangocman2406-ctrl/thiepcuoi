(function(){
  'use strict';

  window.RolaTemplateEffects = window.RolaTemplateEffects || {};

  var INLINE_HEART_TOTAL = 96; // Số tim khi mở thư
  var DESIGN_SELECTOR = '.design-mode,.template-editor,.canvas-editor,.design-canvas,[data-mode="design"]';

  function rand(min, max){
    return min + Math.random() * (max - min);
  }

  function scopeOf(root){
    return root && root.querySelectorAll ? root : document;
  }

  function qsa(root, selector){
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function cssEscape(value){
    if(window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/#/g, '\\#');
  }

  function getTpls(root){
    var scope = scopeOf(root);
    var list = qsa(scope, '.tpl-mau01');
    // querySelectorAll chỉ tìm trong các phần tử con, không tính chính scope.
    // Trong thực tế effect được gọi với root là chính thẻ .tpl-mau01 (từ
    // invitation.js), nên phải tự thêm scope vào nếu nó khớp .tpl-mau01,
    // nếu không mọi lớp fx-ready/is-designing sẽ không bao giờ được gắn.
    if(scope.matches && scope.matches('.tpl-mau01') && list.indexOf(scope) === -1){
      list.unshift(scope);
    }
    return list;
  }

  function isDesignMode(el){
    if(!el) return false;
    return !!(
      el.matches && el.matches(DESIGN_SELECTOR)
      || el.closest && el.closest(DESIGN_SELECTOR)
      || document.body && document.body.matches && document.body.matches(DESIGN_SELECTOR)
      || el.classList && (el.classList.contains('design-mode') || el.classList.contains('editor-mode') || el.classList.contains('is-designing'))
    );
  }

  function getEnvelopeInput(envelope){
    if(!envelope) return null;

    var id = envelope.getAttribute('for');
    if(id){
      var byId = document.getElementById(id);
      if(byId) return byId;
    }

    var prev = envelope.previousElementSibling;
    if(prev && prev.classList && prev.classList.contains('env-state')) return prev;

    var holder = envelope.parentElement || document;
    return holder.querySelector ? holder.querySelector('.env-state') : null;
  }

  function getEnvelopeFromInput(input){
    if(!input) return null;

    if(input.id){
      var byFor = document.querySelector('[data-envelope][for="' + cssEscape(input.id) + '"]');
      if(byFor) return byFor;
    }

    var next = input.nextElementSibling;
    if(next && next.matches && next.matches('[data-envelope]')) return next;

    var holder = input.parentElement || document;
    return holder.querySelector ? holder.querySelector('[data-envelope]') : null;
  }

  function ensureInlineHearts(envelope){
    var layer = envelope ? envelope.querySelector('.env-pop-hearts') : null;
    if(!layer) return;

    if(layer.dataset.heartTotal === String(INLINE_HEART_TOTAL) && layer.children.length >= INLINE_HEART_TOTAL) return;

    layer.innerHTML = '';
    layer.dataset.heartTotal = String(INLINE_HEART_TOTAL);

    for(var i = 0; i < INLINE_HEART_TOTAL; i++){
      // Vẽ tim bằng SVG (không dùng ký tự chữ '♥'/'♡') — ký tự chữ phụ
      // thuộc vào font hệ thống của từng máy; nếu font đó thay ký tự tim
      // bằng emoji có sẵn màu riêng, CSS color:#ff5b8a sẽ bị bỏ qua hẳn,
      // khiến tim hiện màu đen/xám thay vì hồng. SVG luôn tô đúng màu
      // fill đã đặt, không phụ thuộc font máy khách.
      var heart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      heart.setAttribute('viewBox', '0 0 32 29');
      heart.setAttribute('class', 'mau01-pop-heart-svg');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M16 28.5 C16 28.5 1 19 1 9.2 C1 3.8 5.2 1 9.4 1 C12.3 1 14.8 2.7 16 5.4 C17.2 2.7 19.7 1 22.6 1 C26.8 1 31 3.8 31 9.2 C31 19 16 28.5 16 28.5 Z');
      heart.appendChild(path);

      var side = Math.random() > 0.5 ? 1 : -1;
      heart.style.setProperty('--hx', (side * rand(12, 220)).toFixed(1) + 'px');
      heart.style.setProperty('--hy', (-rand(70, 420)).toFixed(1) + 'px');
      heart.style.setProperty('--hr', rand(-75, 75).toFixed(1) + 'deg');
      heart.style.setProperty('--hs', rand(18, 58).toFixed(1) + 'px');
      heart.style.setProperty('--hscale', rand(.45, 1.75).toFixed(2));
      heart.style.setProperty('--hdelay', rand(.02, 1.1).toFixed(2) + 's');
      heart.style.setProperty('--hd', rand(2.0, 4.2).toFixed(2) + 's');

      layer.appendChild(heart);
    }
  }

  function restartChildrenAnimation(parent, selector){
    qsa(parent, selector).forEach(function(el){
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  }

  function syncEnvelope(envelope, input){
    if(!envelope || !input) return;

    ensureInlineHearts(envelope);

    var opened = !!input.checked;
    envelope.classList.toggle('opened', opened);
    envelope.setAttribute('aria-expanded', opened ? 'true' : 'false');

    var note = (envelope.parentElement || document).querySelector('.touch-note');
    if(note){
      note.textContent = opened ? 'Bấm lần nữa để đóng phong bì' : 'Bấm vào phong bì để ảnh và tim bay ra';
    }

    // "Chạm để mở thiệp" nảy nhẹ liên tục để mời khách bấm — dừng hẳn ngay
    // khi khách đã bấm mở phong bì (không nảy mãi sau khi không còn cần mời
    // nữa), quay lại bình thường ngay cả khi khách đóng lại rồi mở lại.
    var cover = envelope.closest ? envelope.closest('.cover') : null;
    var openHint = cover ? cover.querySelector('.open-text') : null;
    if(openHint) openHint.classList.toggle('is-tapped', opened);

    if(opened){
      restartChildrenAnimation(envelope, '.env-pop-hearts svg');
    }
  }

  function initEnvelope(root){
    var scope = scopeOf(root);

    qsa(scope, '.tpl-mau01 [data-envelope]').forEach(function(envelope){
      if(envelope.dataset.mau01EnvelopeReady === '1') return;
      envelope.dataset.mau01EnvelopeReady = '1';

      envelope.setAttribute('role', envelope.getAttribute('role') || 'button');
      envelope.setAttribute('tabindex', envelope.getAttribute('tabindex') || '0');

      var input = getEnvelopeInput(envelope);
      if(input) syncEnvelope(envelope, input);

      envelope.addEventListener('keydown', function(event){
        if(event.key !== 'Enter' && event.key !== ' ') return;

        var stateInput = getEnvelopeInput(envelope);
        if(!stateInput) return;

        event.preventDefault();
        stateInput.checked = !stateInput.checked;
        stateInput.dispatchEvent(new Event('change', { bubbles:true }));
      });
    });

    qsa(scope, '.tpl-mau01 .env-state').forEach(function(input){
      if(input.dataset.mau01EnvelopeInputReady === '1') return;
      input.dataset.mau01EnvelopeInputReady = '1';

      input.addEventListener('change', function(){
        syncEnvelope(getEnvelopeFromInput(input), input);
      });
    });
  }

  /* ============================================================
     HIỆU ỨNG MÀN BÌA — gắn class mau01-cover-in vào gốc đúng lúc lá
     thư vừa đóng lại, để CSS chạy hiệu ứng bay lên/bay vào cho tiêu
     đề, phong bì, tên cô dâu chú rể. Không dùng cuộn vì đây là phần
     đầu tiên hiện ra ngay khi mở thiệp.
     ============================================================ */
  function initCoverRise(root){
    var tplList = getTpls(root);
    tplList.forEach(function(tpl){
      if(tpl.dataset.mau01CoverRiseReady === '1') return;
      tpl.dataset.mau01CoverRiseReady = '1';

      var intro = tpl.querySelector('[data-letter-intro]');
      var introBlocking = intro && getComputedStyle(intro).display !== 'none';
      if(introBlocking){
        document.addEventListener('mau01:letter-opened', function(){
          tpl.classList.add('mau01-cover-in');
        }, { once:true });
      }else{
        tpl.classList.add('mau01-cover-in');
      }
    });
  }

  /* ============================================================
     HIỆU ỨNG BAY LÊN KHI CUỘN TỚI (đoạn "Trân trọng kính mời" +
     con thuyền) — đơn giản, chạy một lần rồi thôi (unobserve ngay
     sau khi hiện), không lặp lại khi cuộn qua lại, để tránh hẳn lớp
     phức tạp debounce/hiện-ẩn từng gây nhấp nháy trước đây.
     ============================================================ */
  function initRise(root){
    var scope = scopeOf(root);
    var items = qsa(scope, '.tpl-mau01 [data-rise],.tpl-mau01 [data-rise-boat],.tpl-mau01 [data-rise-fam],.tpl-mau01 [data-cross],.tpl-mau01 [data-grid-in],.tpl-mau01 [data-zoom-in],.tpl-mau01 [data-slide-left],.tpl-mau01 [data-sparkle]');
    if(!items.length) return;

    if(!('IntersectionObserver' in window)){
      items.forEach(function(item){ item.classList.add('is-in'); });
      return;
    }

    function setupObserving(){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      }, { threshold:0.14, rootMargin:'0px 0px -8% 0px' });

      items.forEach(function(item){ io.observe(item); });
    }

    var intro = scope.querySelector ? scope.querySelector('.tpl-mau01 [data-letter-intro]') : null;
    if(!intro) intro = document.querySelector('.tpl-mau01 [data-letter-intro]');
    var introBlocking = intro && getComputedStyle(intro).display !== 'none';
    if(introBlocking){
      document.addEventListener('mau01:letter-opened', setupObserving, { once:true });
    }else{
      setupObserving();
    }
  }

  function initLetterIntro(root){
    var scope = scopeOf(root);

    qsa(scope, '.tpl-mau01 [data-letter-intro]').forEach(function(intro){
      if(intro.dataset.mau01LetterReady === '1') return;
      intro.dataset.mau01LetterReady = '1';

      // Khung xem nhanh ở trang Chọn mẫu nhúng thiệp trong iframe nhỏ — màn
      // lá thư phủ kín sẽ chặn mất phần kéo xem nội dung bên trong. Chỉ hiện
      // màn lá thư khi thiệp được mở trực tiếp (link thật / Xem đầy đủ),
      // không hiện khi đang nhúng trong iframe xem nhanh.
      var win = ownerWin(intro);
      var inIframe = true;
      try{ inIframe = win.self !== win.top; }catch(error){ inIframe = true; }
      if(inIframe){
        intro.style.display = 'none';
        return;
      }

      var btn = intro.querySelector('[data-letter-open]');
      if(!btn) return;

      var badge = intro.querySelector('.mau01-letter-badge');
      var card = intro.querySelector('.mau01-letter-card');

      btn.addEventListener('click', function(){
        if(btn.disabled) return;
        btn.disabled = true;

        if(badge) badge.classList.add('is-opening');
        if(card) card.classList.add('is-opening');
        // Báo cho canvas cánh hoa toả nhẹ khắp màn hình ngay lúc này.
        document.dispatchEvent(new CustomEvent('mau01:letter-bursting', { detail:{ button:btn } }));

        // Ba bước nối tiếp nhau, không chồng lấn: (1) chờ cánh hoa toả ra gần
        // khắp màn hình, (2) thẻ thư từ từ hạ xuống HẾT HẲN trong khi nền lá
        // thư vẫn còn che kín màn hình, (3) chỉ sau khi thẻ đã hạ xong mới
        // cho nền lá thư mờ dần đi để lộ phần thiệp chính (index) ra. Trước
        // đây bước 2 và 3 chạy cùng lúc nên index hiện ra khi thẻ còn đang rơi
        // dở, nhìn giật — tách riêng để mượt hơn.
        var FALL_DELAY = 1300;
        var FALL_DURATION = 1300;
        var CLOSE_DURATION = 1100;

        window.setTimeout(function(){
          if(card) card.classList.add('is-falling');
        }, FALL_DELAY);

        window.setTimeout(function(){
          intro.classList.add('is-closing');
          // Báo "đã mở thư" ngay từ lúc này (không đợi lá thư biến mất hẳn),
          // để IntersectionObserver kịp gắn sớm cho MỌI phần dưới trang —
          // nếu đợi thêm 1.1s nữa mới gắn, khách cuộn nhanh ngay sau khi mở
          // thư sẽ cuộn lướt qua nhiều phần trong lúc chưa có observer nào
          // theo dõi, khiến các phần đó kẹt luôn ở trạng thái ẩn. Riêng màn
          // bìa (phần duy nhất đã nằm sẵn trong khung nhìn lúc này) được
          // hoãn NÉT ANIMATION của nó qua CSS (transition-delay ở
          // .cover[data-reveal]) chứ không hoãn cả sự kiện này.
          document.dispatchEvent(new Event('mau01:letter-opened'));
        }, FALL_DELAY + FALL_DURATION);

        window.setTimeout(function(){
          intro.style.display = 'none';
        }, FALL_DELAY + FALL_DURATION + CLOSE_DURATION);
      });
    });
  }

  function initLetterPetals(root){
    var scope = scopeOf(root);

    qsa(scope, '.tpl-mau01 [data-letter-petals]').forEach(function(canvas){
      if(canvas.dataset.mau01PetalsReady === '1') return;
      canvas.dataset.mau01PetalsReady = '1';

      var win = ownerWin(canvas);
      var intro = canvas.closest('[data-letter-intro]');
      // Màn lá thư đã bị ẩn (nhúng trong iframe xem nhanh, hoặc đang ở chế độ
      // Designer) thì không cần vẽ gì cả, đỡ tốn tài nguyên vô ích.
      if(intro && win.getComputedStyle(intro).display === 'none') return;

      var ctx = canvas.getContext('2d');
      if(!ctx) return;

      var dpr = Math.min(win.devicePixelRatio || 1, 2);
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
        grad.addColorStop(0, '#fff7f9');
        grad.addColorStop(.55, '#ffc3d6');
        grad.addColorStop(1, '#ff7fa2');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * .32, s * .5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Khi bấm "Mở thư": cánh hoa rơi xuống tự nhiên như hoa thật rụng,
      // không bắn toả ra mọi hướng và không hiện sẵn đầy màn hình ngay lập
      // tức — mỗi cánh xuất phát rải rác quanh nửa trên khung hình rồi rơi
      // thẳng xuống rất chầm chậm theo trọng lực (cùng tốc độ nhẹ nhàng với
      // cánh hoa nền), mờ dần hiện ra rồi mờ dần biến mất, tách biệt hoàn
      // toàn với cánh hoa đang rơi ở nền (cánh hoa nền vẫn tiếp tục rơi bình
      // thường, không bị gom/hút vào đâu cả).
      document.addEventListener('mau01:letter-bursting', function(event){
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
            startedAt: win.performance.now(),
            life: 3600 + Math.random() * 2200
          });
        }
      });

      function frame(){
        if(!running) return;
        var w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Cánh hoa nền: luôn rơi liên tục, không bị hiệu ứng nổ ảnh hưởng.
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

        // Cánh hoa lúc mở thư: mờ dần hiện ra, rơi thẳng xuống tự nhiên theo
        // trọng lực (không toả ra các hướng), rồi mờ dần biến mất sau khi
        // bay hết đời.
        if(bursts.length){
          var now = win.performance.now();
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

        rafId = win.requestAnimationFrame(frame);
      }

      size();
      var count = Math.max(24, Math.min(46, Math.round((canvas.width * canvas.height) / (52000 * dpr * dpr))));
      for(var i = 0; i < count; i++) petals.push(makePetal(true));

      win.addEventListener('resize', size);

      // Luôn chạy hiệu ứng rơi, không tắt theo cấu hình "giảm chuyển động"
      // của hệ điều hành/trình duyệt — hiệu ứng này nhẹ, người dùng đã yêu
      // cầu rõ ràng nhiều lần là muốn thấy cánh hoa rơi.
      frame();

      // Ngừng vẽ hẳn khi màn lá thư đã đóng xong, tránh chạy vòng lặp vô ích.
      if(intro){
        var stopWatcher = new MutationObserver(function(){
          if(win.getComputedStyle(intro).display === 'none'){
            running = false;
            if(rafId) win.cancelAnimationFrame(rafId);
            win.removeEventListener('resize', size);
            stopWatcher.disconnect();
          }
        });
        stopWatcher.observe(intro, { attributes:true, attributeFilter:['style'] });
      }
    });
  }

  function initMarquee(root){
    var scope = scopeOf(root);

    qsa(scope, '.tpl-mau01 [data-marquee-track]').forEach(function(track){
      if(track.dataset.mau01MarqueeReady === '1') return;
      track.dataset.mau01MarqueeReady = '1';
      if(ownerWin(track).NY_DESIGNER_PREVIEW) return;

      var originals = Array.prototype.slice.call(track.children);
      track.dataset.mau01OriginalCount = String(originals.length);
      track.classList.add('mau01-marquee-pending');
      originals.forEach(function(item){
        qsa(item, 'img').forEach(function(img){ img.loading = 'eager'; });
        var clone = item.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        qsa(clone, 'img').forEach(function(img){
          img.removeAttribute('data-ny-photo');
          img.removeAttribute('data-ny-slot');
          img.removeAttribute('data-ny-active');
          img.loading = 'eager';
          img.setAttribute('tabindex', '-1');
        });
        track.appendChild(clone);
      });

      function measure(){
        var count = Number(track.dataset.mau01OriginalCount || 0);
        if(!count) return;
        var items = Array.prototype.slice.call(track.children, 0, count);
        var style = getComputedStyle(track);
        var gap = parseFloat(track.classList.contains('film-roll') ? style.rowGap : style.columnGap) || 0;
        var distance = items.reduce(function(total, item){
          var rect = item.getBoundingClientRect();
          return total + (track.classList.contains('film-roll') ? rect.height : rect.width);
        }, 0) + gap * count;
        if(distance > 1){
          track.style.setProperty('--mau01-marquee-distance', distance.toFixed(2) + 'px');
          track.classList.remove('mau01-marquee-pending');
        }
      }

      requestAnimationFrame(function(){ requestAnimationFrame(measure); });
      qsa(track, 'img').forEach(function(img){
        if(!img.complete) img.addEventListener('load', measure, {once:true});
        if(img.decode) img.decode().then(measure).catch(function(){});
      });
      if(window.ResizeObserver){
        var observer = new ResizeObserver(measure);
        observer.observe(track.parentElement || track);
        track.__mau01MarqueeObserver = observer;
      }else{
        window.addEventListener('resize', measure, {passive:true});
      }
    });
  }

  function initGift(root){
    var scope = scopeOf(root);

    qsa(scope, '.tpl-mau01 [data-gift]').forEach(function(btn){
      if(btn.dataset.mau01GiftReady === '1') return;
      btn.dataset.mau01GiftReady = '1';

      btn.addEventListener('click', function(){
        var section = btn.closest('.gift-section');
        if(!section) return;

        section.classList.toggle('gift-opened');
        restartChildrenAnimation(section, '.gift-heart, .gift-sparkle-heart');
      });
    });
  }

  function initMusic(root){
    var scope = scopeOf(root);
    qsa(scope, '.tpl-mau01 .fixed-music').forEach(function(btn){
      btn.style.display = 'none';
      if(window.NhaYenMusicController) window.NhaYenMusicController.bind(btn.closest('.invitation') || root, btn);
    });
  }

  function showComment(tpl, index){
    var cards = qsa(tpl, '.comment-card');
    if(!cards.length) return;

    cards.forEach(function(card){ card.classList.remove('is-active'); });
    cards[index % cards.length].classList.add('is-active');
  }

  function initComments(root){
    var scope = scopeOf(root);

    getTpls(scope).forEach(function(tpl){
      if(isDesignMode(tpl)) return;

      var toggle = tpl.querySelector('[data-comments-toggle]');
      // Không thoát sớm khi chưa có sẵn .comment-card nào — lời chúc đầu
      // tiên thường chỉ xuất hiện SAU khi trang đã tải xong (khách vừa gửi),
      // nên vòng lặp bên dưới phải luôn được khởi động và tự đọc lại danh
      // sách thẻ mỗi lần chạy, không chốt cứng số thẻ ngay lúc khởi tạo.
      if(!toggle) return;

      if(toggle.dataset.mau01CommentsReady !== '1'){
        toggle.dataset.mau01CommentsReady = '1';
        toggle.addEventListener('click', function(){
          tpl.classList.toggle('comments-hidden');
          if(!tpl.classList.contains('comments-hidden')) showComment(tpl, 0);
        });
      }

      if(tpl.dataset.mau01CommentLoopReady === '1') return;
      tpl.dataset.mau01CommentLoopReady = '1';

      var index = 0;
      function loop(){
        if(tpl.classList.contains('comments-hidden')) return;
        var total = qsa(tpl, '.comment-card').length;
        if(!total) return;
        showComment(tpl, index % total);
        index = (index + 1) % total;
      }

      loop();
      window.setInterval(loop, 4300);
    });
  }

  function initMapButton(root){
    var scope = scopeOf(root);

    qsa(scope, '.tpl-mau01 .map-btn, .tpl-mau01 .mau01-map-btn').forEach(function(a){
      var url = a.getAttribute('data-map-url') || a.getAttribute('href') || '';
      if(!url || url.indexOf('{{') !== -1){
        a.removeAttribute('href');
        a.setAttribute('data-map-url', '');
        a.classList.add('map-btn-empty');
        a.textContent = 'Chưa có link đường đi';
        return;
      }

      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
      a.setAttribute('data-map-url', url);
      a.classList.remove('map-btn-empty');
      a.textContent = (a.textContent || '').trim() || 'Xem đường đi';
    });
  }

  function initMenuScroll(root){
    var scope = scopeOf(root);

    qsa(scope, '.tpl-mau01 .fixed-menu').forEach(function(btn){
      if(btn.dataset.mau01MenuReady === '1') return;
      btn.dataset.mau01MenuReady = '1';

      btn.addEventListener('click', function(){
        var tpl = btn.closest('.tpl-mau01');
        if(!tpl) return;

        var sections = qsa(tpl, 'section.screen');
        if(!sections.length) return;

        var current = 0;
        var viewMid = window.scrollY + window.innerHeight / 2;

        sections.forEach(function(section, i){
          var rect = section.getBoundingClientRect();
          var top = rect.top + window.scrollY;
          var bottom = top + rect.height;
          if(viewMid >= top && viewMid <= bottom) current = i;
        });

        sections[(current + 1) % sections.length].scrollIntoView({ behavior:'smooth', block:'start' });
      });
    });
  }



  function ownerWin(root){
    var doc = root && root.ownerDocument ? root.ownerDocument : document;
    return doc.defaultView || window;
  }

  function initMau01Inview(root){
    var scope = scopeOf(root);
    var items = qsa(scope, '.tpl-mau01 :is(.mau01-fx-text,.mau01-soft-line,.mau01-title-sweep,.mau01-fx-photo,.scroll-fx-img)');
    if(!items.length) return;
    var win = ownerWin(scope.nodeType === 1 ? scope : (items[0] || document.documentElement));
    items.forEach(function(item, idx){
      if(!item.style.getPropertyValue('--mau01-delay')) item.style.setProperty('--mau01-delay', Math.min(idx * .06, .42).toFixed(2) + 's');
      if(!item.style.getPropertyValue('--mau01-line-delay')) item.style.setProperty('--mau01-line-delay', Math.min(idx * .045, .32).toFixed(2) + 's');
    });
    function show(el){ el.classList.add('mau01-inview'); }
    if(!('IntersectionObserver' in win)){
      items.forEach(show);
      return;
    }
    var io = new win.IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          show(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, {threshold:.08, rootMargin:'0px 0px -8% 0px'});
    items.forEach(function(item){ io.observe(item); });
  }

  function cleanCssUrl(value){
    return 'url("' + String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '")';
  }

  function framePhotoTargets(root){
    return qsa(scopeOf(root), '.tpl-mau01 :is(.envelope-photo-card,.family-photo-box,.story-photo,.memory-frame,.calendar-photo-frame,.gallery-card,.film-shot,.gift-photo-pop) img, .tpl-mau01 img.calendar-photo');
  }

  function applyContainPhoto(img){
    if(!img || !img.closest) return;
    var frame = img.closest('.envelope-photo-card,.family-photo-box,.story-photo,.memory-frame,.calendar-photo-frame,.gallery-card,.film-shot,.gift-photo-pop') || img.parentElement;
    var inlineStyle = img.getAttribute('style') || '';
    var editedByDesigner = /(object-fit|object-position|transform|width|height|border-radius|opacity|left|top|inset)/i.test(inlineStyle);
    // Giữ nguyên cách căn của ảnh đã được chỉnh thủ công.
    if(!editedByDesigner){
      img.style.setProperty('object-fit', 'contain', 'important');
      img.style.setProperty('object-position', '50% 50%', 'important');
      img.style.setProperty('max-width', '100%', 'important');
      img.style.setProperty('background', 'rgba(255,246,250,.52)', 'important');
    }
    if(frame && frame !== img){
      frame.classList.add('mau01-contain-photo-frame');
      var src = img.currentSrc || img.src || img.getAttribute('src') || '';
      if(src && src.indexOf('{{') === -1){
        frame.style.setProperty('background-image', 'linear-gradient(rgba(255,246,250,.52),rgba(255,246,250,.52)), ' + cleanCssUrl(src), 'important');
        frame.style.setProperty('background-size', 'cover', 'important');
        frame.style.setProperty('background-position', 'center', 'important');
        frame.style.setProperty('background-repeat', 'no-repeat', 'important');
      }
    }
  }

  function initPhotoContain(root){
    framePhotoTargets(root).forEach(function(img){
      applyContainPhoto(img);
      if(img.dataset.mau01ContainReady === '1') return;
      img.dataset.mau01ContainReady = '1';
      img.addEventListener('load', function(){ applyContainPhoto(img); });
    });
  }

  function initMoreBackgroundHearts(root){
    getTpls(root).forEach(function(tpl){
      var layer = tpl.querySelector('.bg-fx');
      if(!layer || layer.dataset.mau01MoreHeartsReady === '1') return;
      layer.dataset.mau01MoreHeartsReady = '1';
      for(var i = 0; i < 7; i++){ // Tim nền nằm trong phạm vi thiệp
        var h = document.createElement('span');
        h.className = 'mau01-bg-soft-heart mau01-bg-heart-extra';
        h.textContent = '♥';
        h.style.left = rand(2, 96).toFixed(1) + '%';
        h.style.top = rand(3, 94).toFixed(1) + '%';
        h.style.fontSize = rand(9, 28).toFixed(1) + 'px';
        h.style.opacity = rand(.16, .44).toFixed(2);
        h.style.setProperty('--dur', rand(9, 24).toFixed(1) + 's');
        h.style.animationDelay = (-rand(0, 18)).toFixed(1) + 's';
        layer.appendChild(h);
      }
    });
  }

  function publicSlugFromLocation(){
    var path = (window.location && window.location.pathname) || '';
    var match = path.match(/^\/i\/([^\/]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }


  function escHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function makeGuestMessageCard(name, message, createdAt, emoji){
    emoji = emoji || '💖';
    name = (name || '').trim();
    if(['khách','khach','khách mời','khach moi'].indexOf(name.toLowerCase()) !== -1) name = '';
    var nameHtml = name ? '<b>' + escHtml(name) + '</b>' : '';
    return '<div class="wish wish-pink-bar mau01-live-message" style="--wish-delay:0ms">'
      + '<span class="wish-emoji">' + escHtml(emoji) + '</span>'
      + '<span class="wish-body">' + nameHtml
      + '<small>' + escHtml(message || '') + '</small></span>'
      + '</div>';
  }

  function makeCommentStreamCard(name, message, emoji){
    emoji = emoji || '💖';
    name = (name || '').trim();
    if(!name || ['khách','khach','khách mời','khach moi'].indexOf(name.toLowerCase()) !== -1) name = 'Khách mời';
    return '<div class="comment-card">'
      + '<span class="wish-text">' + escHtml(emoji) + ' ' + escHtml(message || '') + '</span>'
      + '<span class="wish-name">' + escHtml(name) + '</span>'
      + '</div>';
  }

  function showNewMessageInTemplate(root, name, message, emoji){
    var tpl = root && root.closest ? (root.closest('.tpl-mau01') || root) : scopeOf(root);
    if(!tpl || !tpl.querySelector) tpl = document;

    var list = tpl.querySelector('[data-wish-list]');
    if(list){
      qsa(list, '.empty,.wish-empty').forEach(function(el){ el.remove(); });
      list.insertAdjacentHTML('afterbegin', makeGuestMessageCard(name, message, null, emoji));
    }

    // Lời chúc vừa gửi phải nổi bong bóng ngay lập tức, không chờ tải lại
    // trang — trước đây bong bóng nổi chỉ render một lần lúc tải trang nên
    // lời chúc mới gửi (đặc biệt ở bản xem thử demo) không bao giờ xuất
    // hiện, đây chính là lỗi khách phản ánh "vẫn chưa thấy".
    var stream = tpl.querySelector('.comment-stream');
    if(stream){
      stream.insertAdjacentHTML('afterbegin', makeCommentStreamCard(name, message, emoji));
      showComment(tpl, 0);
    }

  }

  function saveDemoMessage(name, message){
    try{
      var key = 'mau01_demo_wishes';
      var old = JSON.parse(localStorage.getItem(key) || '[]');
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
    }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(data){
        if(!res.ok || data.ok === false) throw new Error(data.error || 'Không gửi được lời chúc');
        return data;
      });
    });
  }

  function initWishForm(root){
    qsa(scopeOf(root), '.tpl-mau01 [data-wish-form]').forEach(function(form){
      if(form.dataset.mau01WishReady === '1') return;
      form.dataset.mau01WishReady = '1';
      var result = form.querySelector('.mau01-wish-result');
      var btn = form.querySelector('.mau01-wish-send');
      var emojiInput = form.querySelector('[data-emoji-value]');
      qsa(form, '[data-emoji]').forEach(function(pickerBtn){
        pickerBtn.addEventListener('click', function(){
          qsa(form, '[data-emoji]').forEach(function(x){ x.classList.remove('active'); });
          pickerBtn.classList.add('active');
          if(emojiInput) emojiInput.value = pickerBtn.dataset.emoji || '💖';
        });
      });
      form.addEventListener('submit', function(event){
        event.preventDefault();
        var nameInput = form.querySelector('[name="guest_name"]');
        var msgInput = form.querySelector('[name="message"]');
        var name = (nameInput && nameInput.value || '').trim();
        var message = (msgInput && msgInput.value || '').trim();
        var emoji = (emojiInput && emojiInput.value || '💖').trim();
        form.classList.remove('is-error','is-done');
        if(message.length < 2){
          form.classList.add('is-error');
          if(result) result.textContent = 'Bạn nhập lời chúc rõ hơn một chút rồi gửi lại nha.';
          return;
        }
        form.classList.add('is-sending');
        if(btn) btn.textContent = 'Đang gửi...';
        if(result) result.textContent = '';
        postPublicMessage(publicSlugFromLocation(), name, message, emoji).then(function(data){
          form.classList.remove('is-sending');
          form.classList.add('is-done');
          if(btn) btn.textContent = 'Gửi lời chúc';
          if(result) result.textContent = data && data.demo ? 'Đã hiện lời chúc 💖' : 'Đã gửi lời chúc 💖';
          if(msgInput) msgInput.value = '';
          showNewMessageInTemplate(form, name, message, emoji);
        }).catch(function(err){
          form.classList.remove('is-sending');
          form.classList.add('is-error');
          if(btn) btn.textContent = 'Gửi lời chúc';
          if(result) result.textContent = err.message || 'Chưa gửi được lời chúc, vui lòng thử lại.';
        });
      });
    });
  }

  function initRsvp(root){
    qsa(scopeOf(root), '.tpl-mau01 .rsvp-card').forEach(function(form){
      if(form.dataset.mau01RsvpReady === '1') return;
      form.dataset.mau01RsvpReady = '1';
      form.setAttribute('data-rsvp-card', '1');
      var btn = form.querySelector('.submit-btn');
      if(btn && btn.getAttribute('type') !== 'submit') btn.setAttribute('type', 'submit');
      var result = form.querySelector('.rsvp-result');
      if(!result){
        result = document.createElement('div');
        result.className = 'rsvp-result';
        form.appendChild(result);
      }
      form.addEventListener('submit', function(event){
        event.preventDefault();
        var nameInput = form.querySelector('[name="guest_name"], input[type="text"]');
        var select = form.querySelector('[name="guest_count"], select');
        var checked = form.querySelector('[name="attendance"]:checked') || form.querySelector('.radio-line input:checked');
        var name = (nameInput && nameInput.value || '').trim();
        var count = (select && select.value || '1 người').trim();
        var attend = !checked || checked.value !== 'no';
        var msg = attend ? ('[RSVP] ' + name + ' xác nhận tham dự - ' + count) : ('[RSVP] ' + name + ' báo bận, không thể tham dự');
        form.classList.add('rsvp-loading');
        result.textContent = 'Đang gửi xác nhận...';
        result.style.display = 'block';
        var done = function(text, isDemo){
          form.classList.remove('rsvp-loading');
          form.classList.add('rsvp-sent');
          result.textContent = text;
          if(btn) btn.textContent = 'Đã gửi xác nhận';
          showNewMessageInTemplate(form, name, msg);
          if(isDemo){
            try{ localStorage.setItem('mau01_rsvp_demo', JSON.stringify({name:name,count:count,attend:attend,createdAt:new Date().toISOString()})); }catch(e){}
          }
        };
        postPublicMessage(publicSlugFromLocation(), name, msg)
          .then(function(data){
            done(data && data.demo ? 'Đã hiện xác nhận trên bản xem thử. Khi dùng link /i/... hệ thống sẽ lưu thật.' : (attend ? 'Đã nhận xác nhận tham dự của bạn. Cảm ơn bạn nhiều nha!' : 'Đã nhận phản hồi. Cảm ơn bạn đã báo lại nha!'), data && data.demo);
          })
          .catch(function(err){
            form.classList.remove('rsvp-loading');
            result.textContent = err.message || 'Chưa gửi được xác nhận, vui lòng thử lại.';
          });
      });
    });
  }


  // Tên cô dâu chú rể ở bìa thư mời: theo yêu cầu, LUÔN nằm 1 dòng thay vì tự
  // xuống dòng khi màn hẹp (trước đây co giãn theo clamp() nên màn điện
  // thoại hẹp thì xuống 2 dòng, màn rộng (máy tính) thì 1 dòng — nhìn khác
  // nhau tuỳ máy, khó hình dung tỉ lệ thật). Luôn thử về đúng cỡ chữ gốc
  // trước (theo clamp() bình thường), chỉ thu nhỏ dần nếu vẫn còn tràn dòng.
  function fitLetterNamesOneLine(root){
    if(window.NhaYenFitIntroNames){
      window.NhaYenFitIntroNames(scopeOf(root));
      return;
    }
  }

  function initLetterNamesFit(root){
    var scope = scopeOf(root);
    fitLetterNamesOneLine(scope);
    // Đo lúc font thảo (Great Vibes/Allura) CHƯA tải xong sẽ ra bề rộng theo
    // font dự phòng hệ thống (thường hẹp hơn) — dễ kết luận nhầm "vừa 1
    // dòng" trong khi font thật tải xong lại rộng hơn, tràn dòng. Đo lại
    // ngay khi font đã tải xong để chắc chắn đúng.
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){ fitLetterNamesOneLine(scope); }).catch(function(){});
    }
    setTimeout(function(){ fitLetterNamesOneLine(scope); }, 1200);
    if(!window.__mau01LetterNamesResizeBound){
      window.__mau01LetterNamesResizeBound = true;
      window.addEventListener('resize', function(){ fitLetterNamesOneLine(document); });
    }
  }

  function initAll(root){
    root = root || document;
    initLetterIntro(root);
    initLetterNamesFit(root);
    initLetterPetals(root);
    initCoverRise(root);
    initRise(root);
    initMarquee(root);
    initMau01Inview(root);
    initPhotoContain(root);
    initMoreBackgroundHearts(root);
    initEnvelope(root);
    initGift(root);
    initRsvp(root);
    initWishForm(root);
    initMusic(root);
    initComments(root);
    initMapButton(root);
    initMenuScroll(root);
  }

  window.RolaTemplateEffects.mau01 = initAll;
})();
