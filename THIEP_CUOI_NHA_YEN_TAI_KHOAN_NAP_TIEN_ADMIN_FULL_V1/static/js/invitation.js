(function(){
  'use strict';

  function all(selector, root){
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value){
    return String(value || '').replace(/[&<>"]/g, function(character){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[character];
    });
  }

  function number(value, fallback){
    var parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function fixedFrameFor(image){
    var frame = image.parentElement;
    if(!frame) return null;
    frame.dataset.nyPhotoFrame = '1';
    var style = window.getComputedStyle(frame);
    if(style.position === 'static') frame.style.position = 'relative';
    frame.style.overflow = 'hidden';
    return frame;
  }

  function applyStoredPhotos(root){
    all('img[data-ny-photo]', root).forEach(function(image){
      if(image.dataset.nyActive !== '1') return;
      fixedFrameFor(image);
      var unit = image.dataset.nyUnit === 'pct' ? 'pct' : 'px';
      var limit = unit === 'pct' ? 5000 : 20000;
      var x = Math.max(-limit, Math.min(limit, number(image.dataset.nyX, 0)));
      var y = Math.max(-limit, Math.min(limit, number(image.dataset.nyY, 0)));
      var zoom = Math.max(0.35, Math.min(4, number(image.dataset.nyZoom, 1)));
      var fit = image.dataset.nyFit === 'cover' ? 'cover' : 'contain';
      var suffix = unit === 'pct' ? '%' : 'px';
      image.style.setProperty('--ny-photo-fit', fit);
      image.style.objectPosition = 'center center';
      image.style.transformOrigin = 'center center';
      if('translate' in image.style && 'scale' in image.style){
        image.style.transform = '';
        image.style.translate = x + suffix + ' ' + y + suffix;
        image.style.scale = String(zoom);
      }else{
        image.style.transform = 'translate(' + x + suffix + ',' + y + suffix + ') scale(' + zoom + ')';
      }
    });
  }

  function loadScript(source){
    if(!source || source.indexOf('{{') !== -1) return Promise.resolve();
    var cleanSource = source.split('#')[0];
    var existing = all('script[src]').find(function(script){
      return script.getAttribute('src') === cleanSource;
    });
    if(existing) return Promise.resolve();

    return new Promise(function(resolve){
      var script = document.createElement('script');
      script.src = cleanSource;
      script.defer = true;
      script.dataset.templateEffectSrc = cleanSource;
      script.onload = resolve;
      script.onerror = function(){
        console.warn('[NhaYen] Không tải được hiệu ứng:', cleanSource);
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  function runTemplate(root){
    if(!root || root.dataset.invitationBooted === '1') return;
    if(window.NY_DESIGNER_PREVIEW){
      root.dataset.invitationBooted = '1';
      return;
    }
    var key = root.getAttribute('data-effect-key') || root.getAttribute('data-template');
    var source = root.getAttribute('data-effect-file') || '';
    loadScript(source).then(function(){
      var effect = window.RolaTemplateEffects && window.RolaTemplateEffects[key];
      if(typeof effect === 'function'){
        try{
          effect(root);
        }catch(error){
          console.error('[NhaYen] Hiệu ứng lỗi ở mẫu', key, error);
        }
      }
      root.dataset.invitationBooted = '1';
    });
  }

  function wishHtml(name, message, emoji){
    name = (name || '').trim();
    if(['khách','khach','khách mời','khach moi'].indexOf(name.toLowerCase()) !== -1) name = '';
    var nameHtml = name ? '<b>' + escapeHtml(name) + '</b>' : '';
    return "<div class='wish wish-pink-bar' style='--wish-delay:0ms'><span class='wish-emoji'>" +
      escapeHtml(emoji || '💖') + "</span><span class='wish-body'>" + nameHtml + '<small>' +
      escapeHtml(message || '') + '</small></span></div>';
  }

  function bootWishForms(){
    all('[data-wish-form-public]').forEach(function(form){
      if(form.dataset.bound === '1') return;
      form.dataset.bound = '1';
      var box = form.closest('[data-public-wish-box]');
      var list = box && box.querySelector('.wish-list');
      var emojiInput = form.querySelector('[data-emoji-value]');

      all('[data-emoji]', form).forEach(function(button){
        button.addEventListener('click', function(){
          all('[data-emoji]', form).forEach(function(item){ item.classList.remove('active'); });
          button.classList.add('active');
          if(emojiInput) emojiInput.value = button.dataset.emoji || '💖';
        });
      });

      form.addEventListener('submit', function(event){
        if(form.action.indexOf('/i/preview/messages') !== -1) return;
        event.preventDefault();
        var data = new FormData(form);
        var name = String(data.get('name') || '').trim();
        var message = String(data.get('message') || '').trim();
        var emoji = String(data.get('emoji') || '💖');
        if(!message) return;

        fetch(form.action, {method:'POST', body:new URLSearchParams(data)})
          .then(function(response){
            if(!response.ok) throw new Error('Không gửi được lời chúc');
            if(list){
              var empty = list.querySelector('.wish-empty');
              if(empty) empty.remove();
              list.insertAdjacentHTML('afterbegin', wishHtml(name, message, emoji));
            }
            form.reset();
            if(emojiInput) emojiInput.value = emoji;
          })
          .catch(function(){ form.submit(); });
      });
    });
  }

  function fitIntroNames(scope){
    all('.mau01-letter-names,.mau02-letter-names,.mau03-letter-names,.mau04-letter-names,.m05-letter-names', scope && scope.querySelectorAll ? scope : document).forEach(function(names){
      if(names.closest('[data-letter-intro].ny-intro-responsive')) return;
      var container = names.parentElement;
      if(!container) return;
      names.style.setProperty('width', '100%', 'important');
      names.style.setProperty('max-width', 'none', 'important');
      names.style.setProperty('white-space', 'nowrap', 'important');
      names.style.setProperty('transform-origin', 'center center', 'important');
      var available = Math.max(1, container.clientWidth * .94);
      var clone = names.cloneNode(true);
      clone.style.cssText = 'position:fixed!important;visibility:hidden!important;pointer-events:none!important;left:-99999px!important;top:0!important;width:max-content!important;max-width:none!important;white-space:nowrap!important;transform:none!important;translate:none!important;scale:1!important;animation:none!important;';
      document.body.appendChild(clone);
      var natural = Math.max(1, clone.getBoundingClientRect().width || clone.scrollWidth);
      clone.remove();
      var ratio = Math.max(.05, Math.min(1, available / natural));
      names.style.setProperty('scale', ratio.toFixed(5), 'important');
      names.dataset.nyIntroScale = ratio.toFixed(5);
    });
  }

  var musicControllers = [];
  function bindMusic(root, button){
    if(!root || !button || button.dataset.nyMusicBound === '1') return root && root.__nyMusicController;
    button.dataset.nyMusicBound = '1';
    var src = String(button.getAttribute('data-audio-src') || '').trim();
    if(!src || src.indexOf('{{') !== -1){
      button.title = 'Chưa upload nhạc';
      return null;
    }
    var audio = new Audio();
    audio.src = src;
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = .82;
    var controller = {root:root, button:button, audio:audio};
    root.__nyMusicController = controller;
    musicControllers.push(controller);

    function sync(){
      var playing = !audio.paused && !audio.ended;
      button.classList.toggle('playing', playing);
      button.setAttribute('aria-label', playing ? 'Tắt nhạc' : 'Bật nhạc');
    }
    function play(){
      musicControllers.forEach(function(item){
        if(item !== controller && !item.audio.paused){ item.audio.pause(); item.button.classList.remove('playing'); }
      });
      var promise = audio.play();
      if(promise && promise.then) promise.then(sync).catch(function(){ sync(); });
      else sync();
    }
    function toggle(event){
      if(event){ event.preventDefault(); event.stopPropagation(); }
      if(audio.paused) play(); else { audio.pause(); sync(); }
    }
    button.addEventListener('click', toggle);
    audio.addEventListener('play', sync);
    audio.addEventListener('pause', sync);

    var openButton = root.querySelector('[data-letter-open]');
    if(openButton){
      openButton.addEventListener('click', function(){
        // This listener runs from the user's trusted click, so browsers allow audio.
        if(audio.paused) play();
      }, true);
    }
    return controller;
  }

  window.NhaYenMusicController = {bind:bindMusic};
  window.NhaYenFitIntroNames = fitIntroNames;

  function boot(){
    all('.invitation[data-template]').forEach(function(root){
      applyStoredPhotos(root);
      var musicButton = root.querySelector('[data-audio-src]');
      if(musicButton) bindMusic(root, musicButton);
      runTemplate(root);
    });
    bootWishForms();
    fitIntroNames();
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(fitIntroNames).catch(function(){});
    }
    setTimeout(fitIntroNames, 800);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();

  window.addEventListener('resize', fitIntroNames);
  window.NhaYenBootInvitation = boot;
})();
