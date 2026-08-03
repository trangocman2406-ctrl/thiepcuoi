(function(){
  'use strict';

  var CARD_SELECTOR = '.mau01-letter-card,.mau02-letter-card,.mau03-letter-card,.mau04-letter-card,.m05-letter-card';
  var NAMES_SELECTOR = '.mau01-letter-names,.mau02-letter-names,.mau03-letter-names,.mau04-letter-names,.m05-letter-names';

  function isDesigner(root){
    return !!(window.NY_DESIGNER_PREVIEW || root.classList.contains('is-editor-preview') || root.getAttribute('data-editor') === 'true');
  }

  /* Canvas intro có kích thước thiết kế cố định 1180 x 640. Tỷ lệ hiển
     thị phải được tính thành một số bằng JavaScript để tương thích Firefox,
     Safari và Chrome. CSS vẫn có các mốc fallback để khung đầu tiên trên
     điện thoại không bị phóng lớn trong lúc script vừa khởi động. */
  function ensureStage(root){
    var intro = root.querySelector('[data-letter-intro]');
    if(!intro || isDesigner(root)) return null;

    var card = intro.querySelector(CARD_SELECTOR);
    if(!card) return null;

    /* .ny-intro-stage đã được render sẵn trong HTML của cả 5 mẫu (bọc quanh
       thẻ thư ngay trong letter-intro.html). Nhánh tạo mới bên dưới chỉ còn
       là lưới an toàn cho trường hợp hiếm khi thiếu sẵn wrapper trong HTML,
       không phải luồng chạy bình thường — KHÔNG dùng insertBefore/appendChild
       để dời một card đang chạy animation, vì việc dời sang cha mới bằng JS
       làm trình duyệt coi đây là phần tử mới và reset animation về khung
       hình 0. */
    var stage = intro.querySelector(':scope > .ny-intro-stage');
    if(!stage){
      stage = document.createElement('div');
      stage.className = 'ny-intro-stage';
      card.parentNode.insertBefore(stage, card);
      stage.appendChild(card);
    }

    intro.classList.add('ny-intro-responsive');
    return {intro:intro, card:card, stage:stage};
  }

  function clamp(value, min, max){
    return Math.max(min, Math.min(max, value));
  }

  function viewportSize(){
    var doc = document.documentElement;
    var width = Number(window.innerWidth || (doc && doc.clientWidth) || 1);
    var height = Number(window.innerHeight || (doc && doc.clientHeight) || 1);
    return {
      width: Math.max(1, width),
      height: Math.max(1, height)
    };
  }

  function layoutStage(parts){
    if(!parts || !parts.stage) return;
    var viewport = viewportSize();
    var gutterX = clamp(viewport.width * .04, 20, 42);
    var gutterY = clamp(viewport.height * .03, 16, 34);
    var scaleX = Math.max(.16, (viewport.width - gutterX) / 1180);
    var scaleY = Math.max(.16, (viewport.height - gutterY) / 640);
    var scale = Math.min(1, scaleX, scaleY);
    if(!Number.isFinite(scale) || scale <= 0) scale = .16;
    var value = scale.toFixed(6);
    if(parts.stage.dataset.nyIntroScale === value) return;
    parts.stage.dataset.nyIntroScale = value;
    parts.stage.style.setProperty('--ny-intro-scale', value);
    parts.stage.dataset.nyIntroMeasured = '1';
  }

  function fitNames(root){
    if(isDesigner(root)) return;
    var names = root.querySelector('[data-letter-intro] ' + NAMES_SELECTOR);
    if(!names) return;

    var available = Math.max(1, (names.parentElement ? names.parentElement.clientWidth : names.clientWidth) * .96);
    /* Đo chiều rộng tự nhiên bằng một BẢN SAO ẩn ngoài màn hình, không đụng
       tới style của phần tử tên đang hiển thị. Cách cũ gỡ transform ra khỏi
       chính phần tử đang hiển thị rồi mới đo lại (đổi display/width, ép
       trình duyệt tính layout ngay) — hàm này chạy tới 4 lần trong lúc intro
       đang xuất hiện (ngay lúc gọi, khi font tải xong, mốc 120ms và 700ms),
       nên mỗi lần chạy tên lại "phồng to về cỡ thật" trong chốc lát rồi mới
       thu nhỏ lại đúng tỷ lệ — nhìn như giật/nhảy cỡ chữ liên tục. Đo trên
       bản sao xoá ngay sau khi đo thì phần tử thật luôn chỉ nhận đúng MỘT
       giá trị transform cuối cùng, không còn khung hình trung gian nào để
       mà giật. */
    var clone = names.cloneNode(true);
    clone.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;left:-9999px;top:0;width:max-content;max-width:none;display:inline-block;transform:none;translate:none;scale:1;';
    (names.parentElement || document.body).appendChild(clone);
    var natural = Math.max(1, clone.scrollWidth);
    clone.parentNode.removeChild(clone);

    var ratio = Math.min(1, (available * .96) / natural);
    var scale = ratio < .999 ? Math.max(.05, ratio) : 1;
    var scaleText = scale.toFixed(5);
    if(names.dataset.nyIntroScale === scaleText) return;
    names.dataset.nyIntroScale = scaleText;

    if(scale < .999){
      names.style.setProperty('scale', scaleText, 'important');
    }else{
      names.style.setProperty('scale', '1', 'important');
    }
    names.dataset.nyIntroFitted = '1';
  }

  function bootRoot(root){
    if(root.dataset.nyResponsiveBooted === '1') return;
    var parts = ensureStage(root);
    if(!parts) return;
    root.dataset.nyResponsiveBooted = '1';

    function layout(){
      layoutStage(parts);
      fitNames(root);
    }

    layout();
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(layout).catch(function(){});
    }
    setTimeout(layout, 120);
    setTimeout(layout, 700);

    root.__nyResponsiveLayout = layout;
  }

  function boot(){
    Array.prototype.forEach.call(document.querySelectorAll('.invitation[data-template]'), bootRoot);
  }

  function relayout(){
    Array.prototype.forEach.call(document.querySelectorAll('.invitation[data-template]'), function(root){
      if(typeof root.__nyResponsiveLayout === 'function') root.__nyResponsiveLayout();
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();

  window.addEventListener('resize', relayout, {passive:true});
  window.addEventListener('orientationchange', function(){ setTimeout(relayout, 80); }, {passive:true});
  if(window.visualViewport) window.visualViewport.addEventListener('resize', relayout, {passive:true});
  window.NhaYenResponsiveInvitation = {boot:boot, relayout:relayout};
})();
