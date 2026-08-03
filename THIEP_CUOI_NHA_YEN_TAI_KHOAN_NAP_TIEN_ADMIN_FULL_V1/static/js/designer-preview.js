(function(){
  'use strict';
  if(!window.NY_DESIGNER_PREVIEW) return;

  function all(selector, root){
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function send(data){
    if(!window.parent || window.parent === window) return;
    try{
      var targetOrigin = window.location.origin === 'null' ? '*' : window.location.origin;
      window.parent.postMessage(data || {}, targetOrigin);
    }catch(error){}
  }

  function cssEscape(value){
    return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function clamp(value, minimum, maximum){
    return Math.max(minimum, Math.min(maximum, value));
  }

  function number(value, fallback){
    var parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function syncText(field, value, except){
    all('.ny-editable-text[data-edit-field="' + cssEscape(field) + '"]').forEach(function(element){
      if(element !== except) element.textContent = value;
    });
  }

  // .textContent bỏ qua hẳn thẻ <br> (không sinh ra ký tự xuống dòng nào) —
  // phải dùng .innerText mới đọc đúng ra "\n" tại chỗ có <br>, vì giờ Cách
  // (spacebar) sẽ chèn <br> ngay tại con trỏ (xem insertLineBreakAtCaret).
  function readText(element){
    return (element.innerText || element.textContent || '').trim();
  }

  function insertLineBreakAtCaret(element){
    // Tự chèn <br> bằng Range API rồi đặt lại con trỏ ngay sau đó không đủ:
    // trình duyệt coi <br> cuối cùng trong 1 node là "chỗ giữ chỗ" nên gõ
    // tiếp sẽ chèn NGƯỢC lên trước <br> thay vì sau — execCommand mới xử lý
    // đúng phần này (được trình duyệt tự lo phần con trỏ).
    if(document.execCommand){
      element.focus();
      document.execCommand('insertLineBreak');
      return;
    }
    var selection = window.getSelection();
    if(!selection || !selection.rangeCount) return;
    var range = selection.getRangeAt(0);
    if(!element.contains(range.commonAncestorContainer)) return;
    range.deleteContents();
    var br = document.createElement('br');
    range.insertNode(br);
    range.setStartAfter(br);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Mẫu 03 tự viết contenteditable="true" thẳng trong HTML cho khá nhiều ô,
  // rồi server còn lồng thêm 1 span.ny-editable-text bên trong cho field nào
  // nằm trong EDITABLE_KEYS — thành 2 lớp contenteditable lồng nhau. Trình
  // duyệt luôn đưa focus/gõ phím vào lớp NGOÀI CÙNG của 1 chuỗi contenteditable
  // lồng nhau (đã kiểm chứng: focus lớp trong không nhận được gì cả), nên
  // phải gắn sự kiện cho phần tử ngoài cùng, không phải phần tử lá bên trong.
  function resolveEditField(element){
    if(element.dataset.editField) return element.dataset.editField;
    var nested = element.querySelector('[data-edit-field]');
    return nested ? nested.dataset.editField : undefined;
  }

  // Chữ giống nhau (VD tên cô dâu chú rể) có thể xuất hiện ở nhiều vị trí
  // trên thiệp, mỗi vị trí canh lề/cỡ/font riêng qua data-pos-key (xem
  // routes/templates.py). Bấm/chọn TRỰC TIẾP đúng chữ ở vị trí nào thì cụm
  // nút dính trên đầu khung chỉnh sửa phải chỉnh ĐÚNG vị trí đó — không phải
  // lúc nào cũng chỉnh field nội dung dùng chung (dễ gây hiểu lầm "sao chỉnh
  // chỗ này mà chỗ khác cũng đổi theo").
  function resolvePosKey(element){
    var withKey = element.closest('[data-pos-key]');
    if(withKey) return withKey.dataset.posKey;
    return resolveEditField(element);
  }

  function bootText(){
    all('[contenteditable="true"]').forEach(function(element){
      if(element.parentElement && element.parentElement.closest('[contenteditable="true"]')) return;
      if(element.dataset.nyBound === '1') return;
      element.dataset.nyBound = '1';
      element.setAttribute('contenteditable', 'true');
      element.setAttribute('spellcheck', 'false');

      element.addEventListener('focus', function(){
        var field = resolveEditField(element);
        if(!field) return;
        all('[contenteditable="true"].is-editing').forEach(function(item){ item.classList.remove('is-editing'); });
        all('[data-ny-photo-frame="1"].ny-photo-editing').forEach(function(item){ item.classList.remove('ny-photo-editing'); });
        element.classList.add('is-editing');
        send({type:'ny-edit-field', action:'focus', field:field, posField:resolvePosKey(element), value:readText(element)});
      });

      element.addEventListener('click', function(event){
        var field = resolveEditField(element);
        if(!field) return;
        event.stopPropagation();
        send({type:'ny-edit-field', action:'click', field:field, posField:resolvePosKey(element), value:readText(element)});
      });

      element.addEventListener('input', function(){
        var field = resolveEditField(element);
        if(!field) return;
        var value = readText(element);
        syncText(field, value, element);
        send({type:'ny-edit-field', action:'input', field:field, value:value});
      });

      element.addEventListener('blur', function(){
        var field = resolveEditField(element);
        element.classList.remove('is-editing');
        if(!field) return;
        send({type:'ny-edit-field', action:'blur', field:field, value:readText(element)});
      });

      // Bấm Enter sẽ ngắt dòng ngay tại con trỏ (thay vì kết thúc chỉnh sửa
      // như trước) — Cách (spacebar) trở lại bình thường, chỉ chèn dấu cách.
      // Muốn kết thúc chỉnh sửa thì bấm ra ngoài ô (blur).
      element.addEventListener('keydown', function(event){
        if(event.key === 'Enter'){
          event.preventDefault();
          insertLineBreakAtCaret(element);
          element.dispatchEvent(new Event('input', {bubbles:true}));
        }
      });
    });
  }

  // Một số vị trí chỉ cần canh lề/cỡ/font/màu riêng chứ không có chữ để gõ
  // (VD chữ ngày cưới — tự tính từ ngày tháng, không phải EDITABLE_KEYS nên
  // không có lớp contenteditable nào cả). bootText() ở trên chỉ gắn sự kiện
  // cho [contenteditable="true"], nên các vị trí này bấm/bôi đen sẽ không
  // trúng gì — trình duyệt chỉ tự bôi xanh chọn chữ mặc định. Gắn thêm click
  // riêng cho mọi [data-pos-key] để cụm nút dính trên đầu vẫn chọn được đúng
  // vị trí này — kể cả khi bên trong LẪN cả 1 mẩu contenteditable khác (VD
  // "Giờ lễ | {{weddingTime}}" trong khối ngày Save The Date: phần giờ lễ có
  // ô riêng để gõ, nhưng phần chữ ngày còn lại quanh nó vẫn cần bấm chọn
  // được) — bấm trúng ngay đúng mẩu contenteditable con thì nó tự
  // stopPropagation trước, không lọt xuống đây, nên không xung đột.
  function bootPosOnlyClicks(){
    all('[data-pos-key]').forEach(function(element){
      if(element.getAttribute('contenteditable') === 'true') return;
      if(element.dataset.nyPosBound === '1') return;
      element.dataset.nyPosBound = '1';
      element.style.cursor = 'pointer';
      element.addEventListener('click', function(event){
        event.stopPropagation();
        send({type:'ny-edit-field', action:'click', posField:element.dataset.posKey});
      });
    });
  }

  function translatePixels(element){
    var value = window.getComputedStyle(element).translate || '';
    if(!value || value === 'none') return {x:0,y:0};
    var parts = value.trim().split(/\s+/);
    return {x:number(parts[0],0), y:number(parts[1],0)};
  }

  function bootTextDragging(){
    if(document.documentElement.dataset.nyTextDragReady === '1') return;
    document.documentElement.dataset.nyTextDragReady = '1';

    document.addEventListener('pointerdown', function(event){
      if(event.button !== undefined && event.button !== 0) return;
      if(event.isPrimary === false || event.target.closest('img[data-ny-photo]')) return;
      var keyed = event.target.closest('[data-pos-key]');
      var editable = event.target.closest('[data-edit-field]');
      var element = keyed || editable;
      if(!element) return;
      var field = keyed ? keyed.dataset.posKey : element.dataset.editField;
      if(!field) return;

      var pointerId = event.pointerId;
      var startX = event.clientX;
      var startY = event.clientY;
      var start = translatePixels(element);
      var moved = false;

      function move(moveEvent){
        if(moveEvent.pointerId !== pointerId) return;
        var dx = moveEvent.clientX - startX;
        var dy = moveEvent.clientY - startY;
        if(!moved && Math.hypot(dx,dy) < 6) return;
        moved = true;
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        var x = clamp(start.x + dx, -100000, 100000);
        var y = clamp(start.y + dy, -100000, 100000);
        element.style.setProperty('translate', Math.round(x) + 'px ' + Math.round(y) + 'px', 'important');
        element.classList.add('ny-text-dragging');
        var selection = window.getSelection && window.getSelection();
        if(selection) selection.removeAllRanges();
      }

      function finish(upEvent){
        if(upEvent && upEvent.pointerId !== pointerId) return;
        cleanup();
        if(!moved) return;
        var finalPos = translatePixels(element);
        send({type:'ny-move-field', field:field, x:Math.round(finalPos.x), y:Math.round(finalPos.y)});
      }

      function cancel(cancelEvent){
        if(cancelEvent && cancelEvent.pointerId !== undefined && cancelEvent.pointerId !== pointerId) return;
        if(moved) element.style.setProperty('translate', Math.round(start.x) + 'px ' + Math.round(start.y) + 'px', 'important');
        cleanup();
      }

      function cleanup(){
        element.classList.remove('ny-text-dragging');
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', finish, true);
        window.removeEventListener('pointercancel', cancel, true);
        window.removeEventListener('blur', cancel, true);
      }

      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', finish, true);
      window.addEventListener('pointercancel', cancel, true);
      window.addEventListener('blur', cancel, true);
    }, true);
  }

  function normalizedUnit(value){
    return value === 'px' ? 'px' : 'pct';
  }

  function photoState(image){
    return {
      photo:image.dataset.nyPhoto || '',
      slot:image.dataset.nySlot || image.dataset.nyPhoto || '',
      x:number(image.dataset.nyX, 0),
      y:number(image.dataset.nyY, 0),
      zoom:number(image.dataset.nyZoom, 1),
      fit:image.dataset.nyFit === 'cover' ? 'cover' : 'contain',
      unit:normalizedUnit(image.dataset.nyUnit)
    };
  }

  function frameFor(image){
    var frame = image.parentElement;
    if(!frame) return image;
    frame.dataset.nyPhotoFrame = '1';
    var style = window.getComputedStyle(frame);
    if(style.position === 'static') frame.style.position = 'relative';
    frame.style.overflow = 'hidden';
    return frame;
  }

  function writePhotoState(image, state){
    var unit = normalizedUnit(state.unit);
    var limit = unit === 'pct' ? 5000 : 20000;
    var x = clamp(number(state.x, 0), -limit, limit);
    var y = clamp(number(state.y, 0), -limit, limit);
    var zoom = clamp(number(state.zoom, 1), 0.35, 4);
    var fit = state.fit === 'cover' ? 'cover' : 'contain';

    frameFor(image);
    image.dataset.nyX = String(Math.round(x * 100) / 100);
    image.dataset.nyY = String(Math.round(y * 100) / 100);
    image.dataset.nyZoom = String(Math.round(zoom * 1000) / 1000);
    image.dataset.nyFit = fit;
    image.dataset.nyUnit = unit;
    image.dataset.nyActive = '1';
    image.style.setProperty('--ny-photo-fit', fit);
    image.style.objectFit = fit;
    image.style.objectPosition = 'center center';
    image.style.transformOrigin = 'center center';
    image.style.willChange = state.dragging ? 'translate, scale' : '';
    image.draggable = false;

    var suffix = unit === 'pct' ? '%' : 'px';
    if('translate' in image.style && 'scale' in image.style){
      image.style.transform = '';
      image.style.translate = x + suffix + ' ' + y + suffix;
      image.style.scale = String(zoom);
    }else{
      image.style.transform = 'translate(' + x + suffix + ',' + y + suffix + ') scale(' + zoom + ')';
    }
  }

  function imagesWithSlot(slot){
    return all('img[data-ny-slot="' + cssEscape(slot) + '"]');
  }

  function imagesWithPhoto(photo){
    return all('img[data-ny-photo="' + cssEscape(photo) + '"]');
  }

  function imageWithSlot(slot){
    return document.querySelector('img[data-ny-slot="' + cssEscape(slot) + '"]');
  }

  function applyPhotoSlot(slot, state, source){
    imagesWithSlot(slot).forEach(function(image){
      writePhotoState(image, {
        x:state.x,
        y:state.y,
        zoom:state.zoom,
        fit:state.fit,
        unit:state.unit,
        dragging:Boolean(state.dragging && image === source)
      });
    });
  }

  function selectPhoto(image, notify){
    all('.ny-editable-text.is-editing').forEach(function(item){ item.classList.remove('is-editing'); });
    all('[data-ny-photo-frame="1"].ny-photo-editing').forEach(function(item){ item.classList.remove('ny-photo-editing'); });
    frameFor(image).classList.add('ny-photo-editing');
    if(notify !== false){
      var state = photoState(image);
      send({type:'ny-select-photo', photo:state.photo, slot:state.slot, x:state.x, y:state.y, zoom:state.zoom, fit:state.fit, unit:state.unit});
    }
  }

  function sendPhotoState(image){
    var state = photoState(image);
    send({type:'ny-edit-photo', photo:state.photo, slot:state.slot, x:state.x, y:state.y, zoom:state.zoom, fit:state.fit, unit:state.unit});
  }

  var fileInput = null;
  var uploadPhotoKey = '';
  var uploadSlotKey = '';

  function ensureFileInput(){
    if(fileInput) return fileInput;
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.hidden = true;
    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', function(){
      if(fileInput.files && fileInput.files.length && uploadPhotoKey){
        uploadPhoto(uploadPhotoKey, uploadSlotKey, fileInput.files[0]);
      }
      fileInput.value = '';
    });
    return fileInput;
  }

  function choosePhoto(image){
    var state = photoState(image);
    selectPhoto(image);
    uploadPhotoKey = state.photo;
    uploadSlotKey = state.slot;
    if(window.NY_PHOTO_UPLOAD_URL) ensureFileInput().click();
  }

  function uploadPhoto(photo, slot, file){
    if(!window.NY_PHOTO_UPLOAD_URL || !photo || !file) return;
    var data = new FormData();
    data.append('photo', photo);
    data.append('slot', slot || photo);
    data.append('files', file, file.name);
    send({type:'ny-photo-uploading', photo:photo, slot:slot || photo});

    fetch(window.NY_PHOTO_UPLOAD_URL, {method:'POST', body:data, credentials:'same-origin'})
      .then(function(response){
        return response.json().catch(function(){ return {ok:false, error:'Server upload lỗi'}; });
      })
      .then(function(result){
        if(!result || !result.ok) throw new Error(result && result.error || 'Upload ảnh lỗi');
        var key = result.photo || photo;
        var selectedSlot = slot || key;
        imagesWithPhoto(key).forEach(function(image){
          if(result.file_path) image.src = result.file_path;
          writePhotoState(image, {x:0, y:0, zoom:1, fit:'contain', unit:'pct'});
        });
        var selected = imageWithSlot(selectedSlot) || imagesWithPhoto(key)[0];
        if(selected) selectPhoto(selected, false);
        send({type:'ny-photo-uploaded', photo:key, slot:selectedSlot, src:result.file_path || '', x:0, y:0, zoom:1, fit:'contain', unit:'pct'});
      })
      .catch(function(error){
        send({type:'ny-photo-upload-error', photo:photo, slot:slot || photo, error:error && error.message || 'Upload ảnh lỗi'});
      });
  }

  function dragStartInPixels(image, state){
    var frame = frameFor(image);
    var rect = frame.getBoundingClientRect();
    var width = Math.max(1, rect.width || image.offsetWidth || 1);
    var height = Math.max(1, rect.height || image.offsetHeight || 1);
    return {
      x:state.unit === 'pct' ? state.x * width / 100 : state.x,
      y:state.unit === 'pct' ? state.y * height / 100 : state.y,
      width:width,
      height:height
    };
  }

  function bindPhoto(image){
    if(image.dataset.nyPointerBound === '1') return;
    image.dataset.nyPointerBound = '1';
    image.draggable = false;
    frameFor(image);
    var wheelTimer = null;
    var activePointerId = null;

    image.addEventListener('dragstart', function(event){ event.preventDefault(); });
    image.addEventListener('click', function(event){
      event.preventDefault();
      event.stopPropagation();
      selectPhoto(image);
    }, true);
    image.addEventListener('dblclick', function(event){
      event.preventDefault();
      event.stopPropagation();
      choosePhoto(image);
    }, true);

    image.addEventListener('pointerdown', function(event){
      if(event.button !== undefined && event.button !== 0) return;
      if(event.isPrimary === false || activePointerId !== null) return;
      event.preventDefault();
      event.stopPropagation();
      selectPhoto(image);

      var pointerId = event.pointerId;
      activePointerId = pointerId;
      var startX = event.clientX;
      var startY = event.clientY;
      var start = photoState(image);
      var base = dragStartInPixels(image, start);
      var moved = false;
      var canceled = false;
      image.classList.add('ny-photo-dragging');
      try{ image.setPointerCapture(pointerId); }catch(error){}

      function move(moveEvent){
        if(moveEvent.pointerId !== pointerId) return;
        moveEvent.preventDefault();
        var dx = moveEvent.clientX - startX;
        var dy = moveEvent.clientY - startY;
        if(!moved && Math.hypot(dx, dy) < 5) return;
        moved = true;
        applyPhotoSlot(start.slot, {
          x:(base.x + dx) / base.width * 100,
          y:(base.y + dy) / base.height * 100,
          zoom:start.zoom,
          fit:start.fit,
          unit:'pct',
          dragging:true
        }, image);
      }

      function cleanup(){
        image.classList.remove('ny-photo-dragging');
        imagesWithSlot(start.slot).forEach(function(item){ item.style.willChange = ''; });
        try{ image.releasePointerCapture(pointerId); }catch(error){}
        activePointerId = null;
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', finish, true);
        window.removeEventListener('pointercancel', cancel, true);
        window.removeEventListener('blur', cancel, true);
      }

      function finish(upEvent){
        if(upEvent && upEvent.pointerId !== pointerId) return;
        cleanup();
        if(moved) sendPhotoState(image);
        else if(!canceled) selectPhoto(image);
      }

      function cancel(cancelEvent){
        if(cancelEvent && cancelEvent.pointerId !== undefined && cancelEvent.pointerId !== pointerId) return;
        canceled = true;
        applyPhotoSlot(start.slot, {x:start.x, y:start.y, zoom:start.zoom, fit:start.fit, unit:start.unit}, null);
        cleanup();
      }

      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', finish, true);
      window.addEventListener('pointercancel', cancel, true);
      window.addEventListener('blur', cancel, true);
    }, true);

    image.addEventListener('wheel', function(event){
      event.preventDefault();
      event.stopPropagation();
      selectPhoto(image);
      var state = photoState(image);
      state.zoom = clamp(state.zoom * (event.deltaY < 0 ? 1.06 : 1 / 1.06), 0.35, 4);
      state.dragging = true;
      applyPhotoSlot(state.slot, state, image);
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function(){
        imagesWithSlot(state.slot).forEach(function(item){ item.style.willChange = ''; });
        sendPhotoState(image);
      }, 180);
    }, {passive:false, capture:true});
  }

  function openEnvelopeForEditing(){
    // Mẫu 03 phải nhận trạng thái editor rõ ràng; nếu chỉ trông chờ CSS :has
    // thì một số trình duyệt/cache sẽ khóa body hoặc để intro chặn thao tác.
    all('.tpl-mau03').forEach(function(root){
      root.classList.add('is-editor-preview', 'is-content-visible');
      root.setAttribute('data-editor', 'true');
      var body = root.querySelector('.mau03-body');
      if(body){
        body.removeAttribute('aria-hidden');
        body.style.pointerEvents = 'auto';
        body.style.visibility = 'visible';
        body.style.opacity = '1';
      }
    });
    all('.tpl-mau01 .env-state').forEach(function(input){ input.checked = true; });
    all('.tpl-mau01 [data-envelope],.tpl-mau01 .envelope-wrap').forEach(function(envelope){
      envelope.classList.add('opened');
      envelope.setAttribute('aria-expanded', 'true');
    });
    all('.tpl-mau01 .gift-section').forEach(function(section){ section.classList.add('gift-opened'); });
  }

  function bootPhotos(){
    openEnvelopeForEditing();
    all('img[data-ny-photo]').forEach(function(image){
      image.dataset.nySlot = image.dataset.nySlot || image.dataset.nyPhoto || '';
      image.dataset.nyX = image.dataset.nyX || '0';
      image.dataset.nyY = image.dataset.nyY || '0';
      image.dataset.nyZoom = image.dataset.nyZoom || '1';
      image.dataset.nyUnit = normalizedUnit(image.dataset.nyUnit);
      frameFor(image);
      if(image.dataset.nyActive === '1'){
        image.dataset.nyFit = image.dataset.nyFit === 'cover' ? 'cover' : 'contain';
        writePhotoState(image, photoState(image));
      }else{
        var computedFit = window.getComputedStyle(image).objectFit;
        image.dataset.nyFit = computedFit === 'cover' ? 'cover' : 'contain';
      }
      bindPhoto(image);
    });
  }

  window.addEventListener('message', function(event){
    if(event.source !== window.parent || event.origin !== window.location.origin || !event.data) return;
    var data = event.data;
    if(data.type === 'ny-focus-photo'){
      var focused = document.querySelector('img[data-ny-photo="' + cssEscape(data.photo) + '"]');
      if(focused){
        selectPhoto(focused, false);
        var focusedState = photoState(focused);
        send({type:'ny-select-photo', photo:focusedState.photo, slot:focusedState.slot, x:focusedState.x, y:focusedState.y, zoom:focusedState.zoom, fit:focusedState.fit, unit:focusedState.unit});
        try{ frameFor(focused).scrollIntoView({behavior:'smooth', block:'center', inline:'center'}); }catch(error){}
      }
      return;
    }
    if(data.type === 'ny-apply-photo'){
      var slot = data.slot || data.photo;
      applyPhotoSlot(slot, data, null);
      var selected = imageWithSlot(slot);
      if(selected) selectPhoto(selected, false);
      return;
    }
    if(data.type === 'ny-replace-photo'){
      imagesWithPhoto(data.photo).forEach(function(item){ if(data.src) item.src = data.src; });
      var replaceSlot = data.slot || data.photo;
      applyPhotoSlot(replaceSlot, data, null);
      var first = imageWithSlot(replaceSlot) || imagesWithPhoto(data.photo)[0];
      if(first) selectPhoto(first, false);
      return;
    }
    if(data.type === 'ny-reset-photo'){
      applyPhotoSlot(data.slot || data.photo, {x:0, y:0, zoom:1, fit:data.fit || 'contain', unit:'pct'}, null);
      return;
    }
    if(data.type === 'ny-open-photo-picker'){
      var pickerImage = imageWithSlot(data.slot || data.photo);
      if(pickerImage) choosePhoto(pickerImage);
    }
  });

  function boot(){
    bootText();
    bootPosOnlyClicks();
    bootTextDragging();
    bootPhotos();
    bootLetterNamesFit();
  }

  // Tên cô dâu chú rể ở bìa thư mời: theo yêu cầu, LUÔN nằm 1 dòng thay vì
  // tự xuống dòng khi màn hẹp (trước đây co giãn theo clamp() nên màn điện
  // thoại hẹp thì xuống 2 dòng, màn rộng thì 1 dòng — nhìn "tỉ lệ" khác nhau
  // tuỳ máy, khó hình dung). Luôn thử về đúng cỡ chữ gốc trước (theo
  // clamp() bình thường), chỉ thu nhỏ dần nếu vẫn còn tràn dòng.
  function fitLetterNamesOneLine(){
    all('.mau01-letter-names,.mau02-letter-names,.mau03-letter-names,.mau04-letter-names,.m05-letter-names').forEach(function(namesEl){
      var container = namesEl.parentElement;
      if(!container) return;
      namesEl.style.setProperty('width', '100%', 'important');
      namesEl.style.setProperty('max-width', 'none', 'important');
      namesEl.style.setProperty('white-space', 'nowrap', 'important');
      namesEl.style.setProperty('transform-origin', 'center center', 'important');
      var available = Math.max(1, container.clientWidth * .94);
      var clone = namesEl.cloneNode(true);
      clone.style.cssText = 'position:fixed!important;visibility:hidden!important;pointer-events:none!important;left:-99999px!important;top:0!important;width:max-content!important;max-width:none!important;white-space:nowrap!important;transform:none!important;translate:none!important;scale:1!important;animation:none!important;';
      document.body.appendChild(clone);
      var natural = Math.max(1, clone.getBoundingClientRect().width || clone.scrollWidth);
      clone.remove();
      var ratio = Math.max(.05, Math.min(1, available / natural));
      namesEl.style.setProperty('scale', ratio.toFixed(5), 'important');
      namesEl.dataset.nyIntroScale = ratio.toFixed(5);
    });
  }

  function bootLetterNamesFit(){
    fitLetterNamesOneLine();
    // Đo lúc font thảo (Great Vibes/Allura) CHƯA tải xong sẽ ra bề rộng theo
    // font dự phòng hệ thống (thường hẹp hơn) — dễ kết luận nhầm "vừa 1
    // dòng" trong khi font thật tải xong lại rộng hơn, tràn dòng. Đo lại
    // ngay khi font đã tải xong để chắc chắn đúng. KHÔNG dùng ResizeObserver
    // theo dõi khung chứa: tự thu nhỏ chữ làm khung đó THẤP đi, ResizeObserver
    // báo lại (nó báo cả khi cao độ đổi, không chỉ bề ngang), tạo vòng lặp
    // tự đặt lại rồi đo lại — có lúc bắt trúng lúc vừa đặt lại (chưa kịp thu
    // nhỏ lần nữa) nên tưởng "vừa" trong khi vẫn tràn. Chỉ nghe window
    // resize (đổi bề ngang thật, không tự kích lại do chữ tự đổi cao độ).
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(fitLetterNamesOneLine).catch(function(){});
    }
    setTimeout(fitLetterNamesOneLine, 1200);
    window.addEventListener('resize', fitLetterNamesOneLine);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
