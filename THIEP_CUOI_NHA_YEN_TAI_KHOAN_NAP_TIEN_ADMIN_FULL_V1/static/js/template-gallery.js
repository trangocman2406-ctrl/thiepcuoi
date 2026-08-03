(function(){
  'use strict';

  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-template-card]'));
  if(!cards.length) return;

  var activeCard = null;
  var animationId = 0;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame(card){ return card.querySelector('[data-template-frame]'); }

  function stopScroll(){
    if(animationId){
      cancelAnimationFrame(animationId);
      animationId = 0;
    }
  }

  function scrollLimit(iframe){
    try{
      var doc = iframe.contentDocument;
      if(!doc) return 0;
      var root = doc.documentElement;
      var body = doc.body;
      return Math.max(0, Math.max(root ? root.scrollHeight : 0, body ? body.scrollHeight : 0) - iframe.clientHeight);
    }catch(error){
      return 0;
    }
  }

  function animatePreview(card){
    stopScroll();
    if(reduceMotion || activeCard !== card || card.dataset.dragging === '1') return;
    var iframe = frame(card);
    if(!iframe || !iframe.contentWindow) return;
    var total = scrollLimit(iframe);
    if(total <= 8) return;

    var current = 0;
    try{ current = iframe.contentWindow.scrollY || 0; }catch(error){}
    var direction = current >= total - 4 ? -1 : 1;
    var target = direction > 0 ? total : 0;
    var distance = Math.abs(target - current);
    var duration = Math.max(5000, Math.min(15000, distance * 7));
    var started = performance.now();

    function tick(now){
      if(activeCard !== card || card.dataset.dragging === '1') return;
      var progress = Math.min(1, (now - started) / duration);
      var eased = progress < .5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      var next = current + (target - current) * eased;
      try{ iframe.contentWindow.scrollTo(0, next); }catch(error){ return; }
      if(progress < 1) animationId = requestAnimationFrame(tick);
    }

    animationId = requestAnimationFrame(tick);
  }

  function activate(card){
    if(activeCard && activeCard !== card) activeCard.classList.remove('is-previewing');
    activeCard = card;
    card.classList.add('is-previewing');
    card.setAttribute('aria-expanded', 'true');
    setTimeout(function(){ animatePreview(card); }, 80);
  }

  function deactivate(card){
    if(activeCard === card){
      stopScroll();
      activeCard = null;
    }
    card.classList.remove('is-previewing', 'is-dragging');
    card.dataset.dragging = '0';
    card.setAttribute('aria-expanded', 'false');
  }

  cards.forEach(function(card){
    var iframe = frame(card);
    var preview = card.querySelector('.tpl-preview');
    if(!iframe || !preview) return;

    iframe.addEventListener('load', function(){
      card.classList.add('is-ready');
      try{
        iframe.contentDocument.documentElement.style.scrollBehavior = 'auto';
        iframe.contentDocument.body.style.scrollBehavior = 'auto';
      }catch(error){}
    });

    card.addEventListener('mouseenter', function(){ activate(card); });
    card.addEventListener('mouseleave', function(){ if(card.dataset.dragging !== '1') deactivate(card); });
    card.addEventListener('focusin', function(){ activate(card); });
    card.addEventListener('focusout', function(event){
      if(!card.contains(event.relatedTarget) && card.dataset.dragging !== '1') deactivate(card);
    });

    var pointerId = null;
    var startY = 0;
    var startScroll = 0;
    var moved = false;

    preview.addEventListener('pointerdown', function(event){
      if(event.button !== undefined && event.button !== 0) return;
      pointerId = event.pointerId;
      startY = event.clientY;
      moved = false;
      try{ startScroll = iframe.contentWindow.scrollY || 0; }catch(error){ startScroll = 0; }
      card.dataset.dragging = '1';
      card.classList.add('is-dragging');
      activate(card);
      stopScroll();
      try{ preview.setPointerCapture(pointerId); }catch(error){}
      event.preventDefault();
    });

    preview.addEventListener('pointermove', function(event){
      if(pointerId === null || event.pointerId !== pointerId) return;
      var delta = event.clientY - startY;
      if(!moved && Math.abs(delta) < 4) return;
      moved = true;
      var total = scrollLimit(iframe);
      var next = Math.max(0, Math.min(total, startScroll - delta * 1.35));
      try{ iframe.contentWindow.scrollTo(0, next); }catch(error){}
      event.preventDefault();
    });

    function finish(event){
      if(pointerId === null || (event.pointerId !== undefined && event.pointerId !== pointerId)) return;
      try{ preview.releasePointerCapture(pointerId); }catch(error){}
      pointerId = null;
      card.dataset.dragging = '0';
      card.classList.remove('is-dragging');
      if(card.matches(':hover') || card.contains(document.activeElement)){
        setTimeout(function(){ animatePreview(card); }, 350);
      }else{
        deactivate(card);
      }
    }

    preview.addEventListener('pointerup', finish);
    preview.addEventListener('pointercancel', finish);
    preview.addEventListener('lostpointercapture', finish);
    preview.addEventListener('wheel', function(event){
      stopScroll();
      var total = scrollLimit(iframe);
      var current = 0;
      try{ current = iframe.contentWindow.scrollY || 0; }catch(error){}
      try{ iframe.contentWindow.scrollTo(0, Math.max(0, Math.min(total, current + event.deltaY))); }catch(error){}
      event.preventDefault();
    }, {passive:false});
  });

  // Dải mẫu chỉ cần cuộn ngang (và chỉ khi đó mới hiện mờ dần ở mép phải để
  // báo còn thêm mẫu) lúc màn hình hẹp không đủ chỗ cho cả 5 thẻ. Màn hình
  // đủ rộng thì canh giữa cho thoáng, không lệch trái với khoảng trống thừa
  // bên phải.
  var grid = document.querySelector('.template-grid');
  if(grid){
    var syncScrollable = function(){
      grid.classList.toggle('is-scrollable', grid.scrollWidth - grid.clientWidth > 4);
    };
    syncScrollable();
    window.addEventListener('resize', syncScrollable);
    if('ResizeObserver' in window){
      new ResizeObserver(syncScrollable).observe(grid);
    }
  }
})();
