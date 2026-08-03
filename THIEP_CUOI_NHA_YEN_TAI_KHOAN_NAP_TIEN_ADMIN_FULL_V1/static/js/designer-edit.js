(function(){
  'use strict';

  var form = document.getElementById('designerEditForm');
  var status = document.getElementById('autosaveStatus');
  var iframe = document.getElementById('designerLivePreview');
  if(!form || !status) return;

  var saveTimer = null;
  var saving = false;
  var pendingSave = false;
  var reloadAfterSave = false;
  var reloadPreviewAfterSave = false;
  var lastSerialized = '';
  var selectedSlot = '';
  var selectedPhoto = '';
  var zoomInput = document.querySelector('[data-photo-zoom]');
  var photoName = document.querySelector('.selected-photo-name');
  var centerButton = document.querySelector('[data-photo-center]');
  var fitButton = document.querySelector('[data-photo-fit]');
  var replaceButton = document.querySelector('[data-photo-replace]');
  var autoFileInput = document.querySelector('[data-auto-upload-files]');
  var themeFields = ['name_size','heading_size','body_size','name_font','heading_font','body_font','text_color','accent_color','background_color'];
  var photoSettingPattern = /^(photo\d+(?:__\d+)?)_(x|y|zoom|fit|unit)$/;

  function setStatus(text, className){
    status.textContent = text;
    status.className = 'autosave-status ' + (className || '');
  }

  // Ô nào cũng tự cao theo đúng số dòng đang gõ — không cần cuộn bên trong
  // từng ô nữa (trước đây textarea giữ cỡ cố định ~78px nên nội dung nhiều
  // dòng bị che khuất, phải tự kéo giãn tay mới thấy hết).
  function autoGrowTextarea(el){
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function autoGrowAllTextareas(){
    form.querySelectorAll('textarea').forEach(autoGrowTextarea);
  }

  function cssEscape(value){
    return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function previewDocument(){
    try{ return iframe && iframe.contentDocument; }catch(error){ return null; }
  }

  function previewWindow(){
    try{ return iframe && iframe.contentWindow; }catch(error){ return null; }
  }

  function field(name){
    return form.querySelector('[name="' + cssEscape(name) + '"]');
  }

  function ensurePhotoField(name){
    var element = field(name);
    if(element) return element;
    var match = photoSettingPattern.exec(name);
    if(!match) return null;
    var slot = match[1];
    var prop = match[2];
    var base = slot.split('__', 1)[0];
    element = document.createElement('input');
    element.type = 'hidden';
    element.name = name;
    element.value = prop === 'zoom' ? '1' : prop === 'fit' ? 'contain' : prop === 'unit' ? 'pct' : '0';
    element.dataset.photoSetting = name;
    element.dataset.photoKey = slot;
    element.dataset.photoBase = base;
    element.disabled = true;
    form.appendChild(element);
    return element;
  }

  function setFieldValue(name, value){
    var element = field(name) || ensurePhotoField(name);
    var next = String(value == null ? '' : value);
    if(element && element.value !== next) element.value = next;
  }

  function fieldValue(name, fallback){
    var element = field(name) || ensurePhotoField(name);
    return element ? element.value : fallback;
  }

  function serializeForm(){
    var data = new FormData(form);
    var params = new URLSearchParams();
    data.forEach(function(value, key){
      if(!(value instanceof File)) params.append(key, value == null ? '' : value);
    });
    return params.toString();
  }

  function autosave(force){
    var body = serializeForm();
    if(!force && body === lastSerialized) return Promise.resolve(true);
    if(saving){
      pendingSave = true;
      return Promise.resolve(false);
    }

    saving = true;
    var saveSucceeded = false;
    lastSerialized = body;
    setStatus('Đang tự lưu...', 'saving');

    return fetch(form.dataset.autosaveUrl, {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
      body:body
    })
      .then(function(response){
        return response.json().catch(function(){ return {ok:false, error:'Server trả về lỗi'}; });
      })
      .then(function(data){
        if(!data || !data.ok) throw new Error(data && data.error || 'Tự lưu lỗi');
        saveSucceeded = true;
        setStatus('Đã tự lưu', 'saved');
        return true;
      })
      .catch(function(error){
        lastSerialized = '';
        setStatus(error && error.message || 'Tự lưu lỗi mạng', 'error');
        return false;
      })
      .finally(function(){
        saving = false;
        if(pendingSave){
          pendingSave = false;
          autosave(true);
          return;
        }
        if(reloadAfterSave && saveSucceeded){
          reloadAfterSave = false;
          window.location.reload();
          return;
        }
        if(reloadPreviewAfterSave && saveSucceeded){
          reloadPreviewAfterSave = false;
          reloadPreviewFrame();
        }else if(reloadPreviewAfterSave && !saveSucceeded){
          reloadPreviewAfterSave = false;
        }
      });
  }

  function scheduleSave(delay){
    setStatus('Có thay đổi...', 'saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function(){ autosave(false); }, delay == null ? 650 : delay);
  }

  // Font mặc định của từng mẫu khi Designer để trống lựa chọn — khớp với
  // TEMPLATE_FONT_DEFAULTS bên routes/templates.py, để xem trước trực tiếp
  // hiển thị đúng ngay cả khi chưa tải lại trang.
  var TEMPLATE_FONT_DEFAULTS = {
    mau01: { name: 'Great Vibes', heading: 'Playfair Display', body: 'Cormorant Garamond' },
    mau02: { name: 'Imperial Script', heading: 'Playfair Display', body: 'Montserrat' },
    mau03: { name: 'Allura', heading: 'Playfair Display', body: 'Cormorant Garamond' },
    mau04: { name: 'Allura', heading: 'Playfair Display', body: 'Cormorant Garamond' },
    mau05: { name: 'Playfair Display', heading: 'Playfair Display', body: 'Montserrat' }
  };

  function resolveFont(tier, chosen){
    if(chosen) return chosen;
    var code = fieldValue('template_code', 'mau01') || 'mau01';
    var fallback = TEMPLATE_FONT_DEFAULTS[code] || TEMPLATE_FONT_DEFAULTS.mau01;
    return fallback[tier];
  }

  function applyThemeControls(){
    var doc = previewDocument();
    if(!doc) return;
    var root = doc.querySelector('.invitation');
    if(!root) return;
    root.style.setProperty('--ny-name-size', (fieldValue('name_size', '46') || '46') + 'px');
    root.style.setProperty('--ny-heading-size', (fieldValue('heading_size', '34') || '34') + 'px');
    root.style.setProperty('--ny-body-size', (fieldValue('body_size', '16') || '16') + 'px');
    root.style.setProperty('--ny-name-font', "'" + resolveFont('name', fieldValue('name_font', '')) + "'");
    root.style.setProperty('--ny-heading-font', "'" + resolveFont('heading', fieldValue('heading_font', '')) + "'");
    root.style.setProperty('--ny-body-font', "'" + resolveFont('body', fieldValue('body_font', '')) + "'");
    root.style.setProperty('--ny-text', fieldValue('text_color', '#2b211b'));
    root.style.setProperty('--ny-accent', fieldValue('accent_color', '#b77916'));
    root.style.setProperty('--ny-bg', fieldValue('background_color', '#fffaf5'));
  }

  // Danh sách font riêng cho từng ô — khớp đúng FONT_FAMILIES bên
  // models.py/routes/templates.py (font cục bộ + font hệ thống phổ biến).
  var TEXT_FONT_LIST = ['Allura', 'Cormorant Garamond', 'Great Vibes', 'Imperial Script', 'Italiana', 'Montserrat', 'Playfair Display', 'Georgia', 'Times New Roman', 'Arial', 'Trebuchet MS', 'Verdana', 'Tahoma'];
  var TEXT_FONT_OPTIONS_HTML = '<option value="">Font (theo nhóm)</option>' +
    TEXT_FONT_LIST.map(function(name){ return '<option value="' + name + '">' + name + '</option>'; }).join('');

  // Canh lề + nhích text: nút nhỏ ngay cạnh mỗi ô chỉnh nội dung có sẵn
  // (label[data-field]) — chỉ những trường có input ẩn {field}_align (tức là
  // có mặt trong EDITABLE_KEYS bên server) mới được thêm cụm nút này; các ô
  // không liên quan tới nội dung hiển thị trên thiệp (mã đơn, số Zalo...)
  // không có input ẩn tương ứng nên tự động bị bỏ qua.
  function clampNudge(value){
    return Math.max(-100000, Math.min(100000, Math.round(value)));
  }

  function purgeStaleFieldRule(doc, fieldName, cssProp){
    // Sau khi tải lại trang, server nhúng sẵn rule cỡ chữ/font riêng (nếu
    // có) thẳng vào <style data-ny-design>. Bấm "về mặc định" chỉ xoá được
    // inline style — rule cũ trong <style> vẫn còn và vẫn !important, nên
    // phải xoá thẳng rule đó khỏi stylesheet thì xem trước mới cập nhật
    // ngay, không cần tải lại trang.
    var styleEl = doc.querySelector('style[data-ny-design]');
    var sheet = styleEl && styleEl.sheet;
    if(!sheet || !sheet.cssRules) return;
    var needles = ['[data-edit-field="' + fieldName + '"]', '[data-pos-key="' + fieldName + '"]'];
    var propRe = new RegExp(cssProp);
    for(var i = sheet.cssRules.length - 1; i >= 0; i--){
      var rule = sheet.cssRules[i];
      var matchesNeedle = rule.selectorText && needles.some(function(needle){ return rule.selectorText.indexOf(needle) !== -1; });
      if(matchesNeedle && propRe.test(rule.cssText)){
        sheet.deleteRule(i);
      }
    }
  }

  function applyTextPos(fieldName){
    var doc = previewDocument();
    if(!doc || !fieldName) return;
    var align = fieldValue(fieldName + '_align', '');
    var nudgeX = fieldValue(fieldName + '_nudge_x', '0');
    var nudgeY = fieldValue(fieldName + '_nudge_y', '0');
    var size = fieldValue(fieldName + '_size', '');
    var fontName = fieldValue(fieldName + '_font', '');
    var color = fieldValue(fieldName + '_color', '');
    if(!size) purgeStaleFieldRule(doc, fieldName, 'font-size');
    if(!fontName) purgeStaleFieldRule(doc, fieldName, 'font-family');
    if(!color) purgeStaleFieldRule(doc, fieldName, 'color');
    // :is(...) khớp cả [data-edit-field] (trường hợp thường) lẫn
    // [data-pos-key] (trường hợp canh riêng 1 vị trí cụ thể, xem
    // intro_groom_name/intro_bride_name bên routes/templates.py).
    doc.querySelectorAll(':is([data-edit-field="' + cssEscape(fieldName) + '"],[data-pos-key="' + cssEscape(fieldName) + '"])').forEach(function(element){
      if(element.parentElement) element.parentElement.style.textAlign = align || '';
      var hasNudge = nudgeX !== '0' || nudgeY !== '0';
      // Dùng thuộc tính translate riêng (không phải transform:translate()) để
      // cộng dồn được với transform gốc của đúng vị trí đó (canh giữa theo %,
      // hiệu ứng hiện dần...) thay vì ghi đè mất — khớp với CSS server sinh
      // ra trong build_design_css().
      if(hasNudge) element.style.setProperty('translate', nudgeX + 'px ' + nudgeY + 'px', 'important');
      else element.style.removeProperty('translate');
      // font-size/font-family/color cần !important vì tier CSS (name/heading/
      // body, hoặc màu script riêng của mẫu) đã tự đặt !important — inline
      // style thường sẽ bị đè, chỉ inline !important mới thắng được để xem
      // trước tức thì (chưa cần chờ lưu + tải lại).
      if(size) element.style.setProperty('font-size', size + 'px', 'important');
      else element.style.removeProperty('font-size');
      if(fontName) element.style.setProperty('font-family', "'" + fontName + "'", 'important');
      else element.style.removeProperty('font-family');
      if(color) element.style.setProperty('color', color, 'important');
      else element.style.removeProperty('color');
    });
  }

  function clampFieldSize(value){
    return Math.max(10, Math.min(160, Math.round(value)));
  }

  // Cụm nút canh lề/nhích/cỡ/font giờ CHỈ CÓ 1 BỘ DUY NHẤT, dính cố định
  // (position:sticky) trên đầu khung chỉnh sửa — giống thanh thuộc tính
  // trong CorelDRAW/Illustrator: bấm vào ô chữ nào (hoặc dòng "Vị trí..."),
  // cụm nút tự chuyển sang chỉnh đúng ô đó, không cần cuộn đi tìm cụm nút
  // riêng của từng ô như trước.
  var posToolbarSticky = document.getElementById('posToolbarSticky');
  var posToolbarLabel = document.getElementById('posToolbarLabel');
  var posToolbarTools = document.getElementById('posToolbarTools');
  var currentPosField = '';
  var suppressAutoPosSelect = false;

  function labelCaption(label){
    var text = '';
    label.childNodes.forEach(function(node){
      if(node.nodeType === 3) text += node.textContent;
    });
    return text.trim();
  }

  // Tên hiển thị ưu tiên lấy từ đúng ô trong sidebar nếu ô đó còn hiện (VD
  // "Tên chú rể"), nếu không có ô nào (đã bỏ danh sách "Vị trí..." dài dòng,
  // giờ chọn bằng cách bấm/bôi đen thẳng trong khung xem thiệp) thì lấy từ
  // NY_FIELD_LABELS — bảng tên tiếng Việt server sinh sẵn từ EDITABLE_KEYS/
  // DECORATIVE_FIELDS (xem routes/designer.py: pos_field_labels_json()).
  function fieldDisplayName(fieldName){
    var label = qsaLabels().filter(function(l){ return l.getAttribute('data-field') === fieldName; })[0];
    var caption = label ? labelCaption(label) : '';
    if(caption) return caption;
    if(window.NY_FIELD_LABELS && window.NY_FIELD_LABELS[fieldName]) return window.NY_FIELD_LABELS[fieldName];
    return fieldName;
  }

  function selectFieldForPos(fieldName){
    if(!fieldName || !field(fieldName + '_align') || !posToolbarTools) return;
    currentPosField = fieldName;
    qsaLabels().forEach(function(l){ l.classList.remove('field-focus'); });
    var label = qsaLabels().filter(function(l){ return l.getAttribute('data-field') === fieldName; })[0];
    if(label) label.classList.add('field-focus');
    if(posToolbarLabel) posToolbarLabel.textContent = fieldDisplayName(fieldName);
    if(posToolbarSticky) posToolbarSticky.classList.remove('is-empty');
    syncPosButtons(posToolbarTools, fieldName);
  }

  function buildTextPosTools(){
    if(!posToolbarTools) return;
    posToolbarTools.innerHTML =
      '<button type="button" data-align="left" title="Canh trái">↰</button>' +
      '<button type="button" data-align="center" title="Canh giữa">≡</button>' +
      '<button type="button" data-align="right" title="Canh phải">↱</button>' +
      '<button type="button" data-nudge="up" title="Nhích lên">↑</button>' +
      '<button type="button" data-nudge="down" title="Nhích xuống">↓</button>' +
      '<button type="button" data-nudge="left" title="Nhích trái">←</button>' +
      '<button type="button" data-nudge="right" title="Nhích phải">→</button>' +
      '<button type="button" data-size-step="-1" title="Cỡ chữ riêng: nhỏ hơn">A-</button>' +
      '<input type="number" class="text-size-num" data-size-input min="10" max="160" ' +
        'placeholder="cỡ" title="Cỡ chữ riêng cho ô này (px) — để trống = theo cỡ nhóm">' +
      '<button type="button" data-size-step="1" title="Cỡ chữ riêng: to hơn">A+</button>' +
      '<select class="text-font-select" data-font-select title="Font chữ riêng cho ô này — để trống = theo nhóm">' +
        TEXT_FONT_OPTIONS_HTML +
      '</select>' +
      '<input type="color" class="text-color-input" data-color-input title="Màu chữ riêng cho ô này — bấm ✕ bên cạnh để bỏ, dùng lại màu chung">' +
      '<button type="button" data-color-clear title="Bỏ màu riêng, dùng màu chung">✕</button>' +
      '<button type="button" data-pos-reset title="Về mặc định">⟲</button>';

    posToolbarTools.addEventListener('click', function(event){
      var btn = event.target.closest('button');
      if(!btn || !currentPosField) return;
      var fieldName = currentPosField;
      event.preventDefault();
      if(btn.dataset.align){
        var current = fieldValue(fieldName + '_align', '');
        setFieldValue(fieldName + '_align', current === btn.dataset.align ? '' : btn.dataset.align);
      }else if(btn.dataset.nudge){
        var step = { left: [-4, 0], right: [4, 0], up: [0, -4], down: [0, 4] }[btn.dataset.nudge];
        var nx = clampNudge((parseFloat(fieldValue(fieldName + '_nudge_x', '0')) || 0) + step[0]);
        var ny = clampNudge((parseFloat(fieldValue(fieldName + '_nudge_y', '0')) || 0) + step[1]);
        setFieldValue(fieldName + '_nudge_x', String(nx));
        setFieldValue(fieldName + '_nudge_y', String(ny));
      }else if(btn.dataset.sizeStep){
        var cur = parseFloat(fieldValue(fieldName + '_size', '')) || 0;
        if(!cur){
          var doc = previewDocument();
          var el = doc && doc.querySelector(':is([data-edit-field="' + cssEscape(fieldName) + '"],[data-pos-key="' + cssEscape(fieldName) + '"])');
          cur = el ? Math.round(parseFloat(getComputedStyle(el).fontSize)) : 24;
        }
        setFieldValue(fieldName + '_size', String(clampFieldSize(cur + parseInt(btn.dataset.sizeStep, 10) * 2)));
      }else if(btn.hasAttribute('data-color-clear')){
        setFieldValue(fieldName + '_color', '');
      }else if(btn.hasAttribute('data-pos-reset')){
        setFieldValue(fieldName + '_align', '');
        setFieldValue(fieldName + '_nudge_x', '0');
        setFieldValue(fieldName + '_nudge_y', '0');
        setFieldValue(fieldName + '_size', '');
        setFieldValue(fieldName + '_font', '');
        setFieldValue(fieldName + '_color', '');
      }
      applyTextPos(fieldName);
      syncPosButtons(posToolbarTools, fieldName);
      scheduleSave(300);
    });
    var fontSelect = posToolbarTools.querySelector('[data-font-select]');
    if(fontSelect){
      fontSelect.addEventListener('change', function(){
        if(!currentPosField) return;
        setFieldValue(currentPosField + '_font', fontSelect.value);
        applyTextPos(currentPosField);
        scheduleSave(300);
      });
    }
    var colorInput = posToolbarTools.querySelector('[data-color-input]');
    if(colorInput){
      colorInput.addEventListener('input', function(){
        if(!currentPosField) return;
        setFieldValue(currentPosField + '_color', colorInput.value);
        applyTextPos(currentPosField);
        syncPosButtons(posToolbarTools, currentPosField);
        scheduleSave(300);
      });
    }
    var sizeInput = posToolbarTools.querySelector('[data-size-input]');
    if(sizeInput){
      sizeInput.addEventListener('change', function(){
        if(!currentPosField) return;
        var raw = sizeInput.value.trim();
        var val = raw === '' ? '' : String(clampFieldSize(parseFloat(raw) || 0));
        setFieldValue(currentPosField + '_size', val);
        sizeInput.value = val;
        applyTextPos(currentPosField);
        scheduleSave(300);
      });
    }

    // Bấm vào ô chữ (focus) hoặc dòng "Vị trí..." không có ô nhập (click) đều
    // chuyển cụm nút dính trên đầu sang chỉnh đúng ô/vị trí đó. Bỏ qua lúc
    // suppressAutoPosSelect=true (focusControl() đang tự .focus() sang ô nội
    // dung sau khi bấm chữ trong khung xem thiệp — không được đè mất vị trí
    // cụ thể vừa chọn, xem message handler 'ny-edit-field').
    form.addEventListener('focusin', function(event){
      if(suppressAutoPosSelect) return;
      var label = event.target.closest('label[data-field]');
      if(label) selectFieldForPos(label.getAttribute('data-field'));
    });
    form.addEventListener('click', function(event){
      var label = event.target.closest('label.pos-only-field[data-field]');
      if(label) selectFieldForPos(label.getAttribute('data-field'));
    });
  }

  function rgbToHex(rgb){
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb || '');
    if(!m) return '#000000';
    return '#' + [m[1], m[2], m[3]].map(function(n){
      return ('0' + parseInt(n, 10).toString(16)).slice(-2);
    }).join('');
  }

  function syncPosButtons(box, fieldName){
    var align = fieldValue(fieldName + '_align', '');
    box.querySelectorAll('button[data-align]').forEach(function(btn){
      btn.classList.toggle('is-active', btn.dataset.align === align);
    });
    var sizeInput = box.querySelector('[data-size-input]');
    if(sizeInput) sizeInput.value = fieldValue(fieldName + '_size', '');
    var fontSelect = box.querySelector('[data-font-select]');
    if(fontSelect) fontSelect.value = fieldValue(fieldName + '_font', '');
    var colorInput = box.querySelector('[data-color-input]');
    var colorClearBtn = box.querySelector('[data-color-clear]');
    if(colorInput){
      var colorVal = fieldValue(fieldName + '_color', '');
      var hasColor = !!colorVal;
      if(hasColor){
        colorInput.value = colorVal;
      }else{
        // Chưa có màu riêng — mở bảng chọn màu thì bắt đầu từ đúng màu đang
        // hiển thị thật của ô đó, không phải luôn về đen mặc định của input.
        var doc = previewDocument();
        var el = doc && doc.querySelector(':is([data-edit-field="' + cssEscape(fieldName) + '"],[data-pos-key="' + cssEscape(fieldName) + '"])');
        colorInput.value = el ? rgbToHex(getComputedStyle(el).color) : '#000000';
      }
      colorInput.classList.toggle('is-set', hasColor);
      if(colorClearBtn) colorClearBtn.disabled = !hasColor;
    }
  }

  function qsaLabels(){
    return Array.prototype.slice.call(form.querySelectorAll('label[data-field]'));
  }

  function applyAllTextPos(){
    qsaLabels().forEach(function(label){
      var fieldName = label.getAttribute('data-field');
      if(fieldName && field(fieldName + '_align')) applyTextPos(fieldName);
    });
  }

  function updatePreviewText(fieldName, value){
    var doc = previewDocument();
    if(!doc || !fieldName) return;
    doc.querySelectorAll('.ny-editable-text[data-edit-field="' + cssEscape(fieldName) + '"]').forEach(function(element){
      if(element.textContent !== value) element.textContent = value;
    });
  }

  function focusControl(fieldName){
    var element = field(fieldName);
    if(!element) return;
    document.querySelectorAll('.field-focus').forEach(function(item){ item.classList.remove('field-focus'); });
    var box = element.closest('label') || element;
    box.classList.add('field-focus');
    box.scrollIntoView({behavior:'smooth', block:'center'});
    setTimeout(function(){
      // .focus() ở đây tự sinh ra sự kiện focusin thật, bị handler chung bên
      // dưới bắt được và gọi selectFieldForPos(field nội dung) — ĐÈ MẤT lựa
      // chọn posField đúng vị trí vừa bấm trong khung xem thiệp (xem message
      // handler 'ny-edit-field'). Tạm khoá handler chung lúc focus programmatic
      // này để cụm nút dính vẫn giữ đúng vị trí đã chọn.
      suppressAutoPosSelect = true;
      try{ element.focus({preventScroll:true}); }catch(error){ element.focus(); }
      setTimeout(function(){ suppressAutoPosSelect = false; }, 0);
    }, 120);
  }

  function postToPreview(message){
    var win = previewWindow();
    if(!win) return;
    win.postMessage(message, window.location.origin);
  }

  function focusPhotoInPreview(photo){
    if(!photo) return;
    postToPreview({type:'ny-focus-photo', photo:photo});
  }

  function sendPhotoToPreview(slot){
    if(!slot) return;
    postToPreview({
      type:'ny-apply-photo',
      slot:slot,
      photo:selectedPhoto || slot.split('__', 1)[0],
      x:parseFloat(fieldValue(slot + '_x', '0')) || 0,
      y:parseFloat(fieldValue(slot + '_y', '0')) || 0,
      zoom:parseFloat(fieldValue(slot + '_zoom', '1')) || 1,
      fit:fieldValue(slot + '_fit', 'contain'),
      unit:fieldValue(slot + '_unit', 'pct')
    });
  }

  function slotLabel(slot){
    if(!slot) return '';
    var parts = slot.split('__');
    return parts.length > 1 ? parts[0] + ' · vị trí ' + parts[1] : parts[0] + ' · vị trí 1';
  }

  function updatePhotoPanel(slot, photo){
    selectedSlot = slot || selectedSlot;
    selectedPhoto = photo || selectedPhoto || (selectedSlot ? selectedSlot.split('__', 1)[0] : '');
    if(!selectedSlot) return;
    if(photoName){
      photoName.textContent = 'Đang chỉnh: ' + slotLabel(selectedSlot) + ' — khung giữ nguyên, kéo để canh ảnh, lăn chuột để zoom';
      photoName.classList.add('is-active');
    }
    if(zoomInput) zoomInput.value = fieldValue(selectedSlot + '_zoom', '1');
    document.querySelectorAll('[data-select-photo]').forEach(function(card){
      card.classList.toggle('is-selected-photo', card.getAttribute('data-select-photo') === selectedPhoto);
    });
  }

  function selectPhoto(photo){
    if(!photo) return;
    selectedPhoto = photo;
    focusPhotoInPreview(photo);
  }

  function activatePhotoInputs(slot){
    form.querySelectorAll('[data-photo-key="' + cssEscape(slot) + '"]').forEach(function(input){
      input.disabled = false;
    });
  }

  function setPhotoState(slot, data, saveNow){
    if(!slot) return;
    setFieldValue(slot + '_x', data.x == null ? fieldValue(slot + '_x', '0') : data.x);
    setFieldValue(slot + '_y', data.y == null ? fieldValue(slot + '_y', '0') : data.y);
    setFieldValue(slot + '_zoom', data.zoom == null ? fieldValue(slot + '_zoom', '1') : data.zoom);
    setFieldValue(slot + '_fit', data.fit || fieldValue(slot + '_fit', 'contain'));
    setFieldValue(slot + '_unit', data.unit || fieldValue(slot + '_unit', 'pct'));
    updatePhotoPanel(slot, data.photo);
    if(saveNow){
      activatePhotoInputs(slot);
      scheduleSave(300);
    }
  }

  function resetPhotoFields(base){
    form.querySelectorAll('[data-photo-base="' + cssEscape(base) + '"]').forEach(function(input){
      var match = photoSettingPattern.exec(input.name || '');
      var prop = match && match[2];
      input.value = prop === 'zoom' ? '1' : prop === 'fit' ? 'contain' : prop === 'unit' ? 'pct' : '0';
      input.disabled = true;
    });
  }

  function uploadFiles(input){
    if(!input || !input.files || !input.files.length) return;
    var url = form.getAttribute('data-auto-upload-url');
    if(!url) return;
    var data = new FormData();
    Array.prototype.forEach.call(input.files, function(file){ data.append('files', file, file.name); });
    var note = document.querySelector('.upload-status');
    if(!note){
      note = document.createElement('div');
      note.className = 'upload-status';
      input.closest('label').appendChild(note);
    }
    note.textContent = 'Đang tải file lên...';
    setStatus('Đang tải ảnh/nhạc...', 'saving');

    fetch(url, {method:'POST', body:data})
      .then(function(response){
        return response.json().catch(function(){ return {ok:false, error:'Server trả về lỗi upload'}; });
      })
      .then(function(result){
        if(!result || !result.ok) throw new Error(result && result.error || 'Upload lỗi');
        note.textContent = 'Đã tải ' + (result.images_added || 0) + ' ảnh' + (result.music_added ? ' và nhạc' : '') + '.';
        setStatus('Đã tải file', 'saved');
        window.location.reload();
      })
      .catch(function(error){
        note.textContent = error && error.message || 'Upload lỗi';
        setStatus('Upload lỗi', 'error');
      });
  }

  form.addEventListener('input', function(event){
    if(event.target.type === 'file') return;
    if(event.target.tagName === 'TEXTAREA') autoGrowTextarea(event.target);
    if(event.target.name) updatePreviewText(event.target.name, event.target.value || '');
    if(themeFields.indexOf(event.target.name) !== -1) applyThemeControls();
    scheduleSave(650);
  });

  form.addEventListener('change', function(event){
    if(event.target.type === 'file') return;
    if(event.target.name) updatePreviewText(event.target.name, event.target.value || '');
    if(themeFields.indexOf(event.target.name) !== -1) applyThemeControls();
    if(event.target.name === 'template_code') reloadAfterSave = true;
    scheduleSave(250);
  });

  form.addEventListener('submit', function(event){
    event.preventDefault();
    setStatus('Đang lưu bản chốt...', 'saving');
    clearTimeout(saveTimer);
    autosave(true).then(function(saved){
      if(saved) setStatus('Đã lưu chỉnh sửa', 'saved');
    });
  });

  window.addEventListener('message', function(event){
    if(event.source !== previewWindow() || event.origin !== window.location.origin || !event.data) return;
    var data = event.data;
    if(data.type === 'ny-edit-field'){
      // posField: đúng vị trí vừa bấm trong khung xem thiệp (VD tên cô dâu ở
      // riêng khung sông nước) — cụm nút dính trên đầu phải chỉnh ĐÚNG vị trí
      // này, không phải lúc nào cũng field nội dung dùng chung. Tách riêng
      // khỏi việc đồng bộ chữ (field) bên dưới vì 2 việc khác mục đích.
      if(data.action === 'focus' || data.action === 'click'){
        selectFieldForPos(data.posField || data.field);
      }
      var element = field(data.field);
      if(!element) return;
      var value = data.value == null ? '' : String(data.value);
      if(element.value !== value){
        element.value = value;
        scheduleSave(650);
      }
      if(data.action === 'focus' || data.action === 'click') focusControl(data.field);
      return;
    }
    if(data.type === 'ny-move-field'){
      var moveField = data.field || '';
      if(!moveField || !field(moveField + '_nudge_x')) return;
      setFieldValue(moveField + '_nudge_x', String(clampNudge(parseFloat(data.x) || 0)));
      setFieldValue(moveField + '_nudge_y', String(clampNudge(parseFloat(data.y) || 0)));
      selectFieldForPos(moveField);
      applyTextPos(moveField);
      scheduleSave(180);
      return;
    }
    if(data.type === 'ny-select-photo'){
      setPhotoState(data.slot || data.photo, data, false);
      return;
    }
    if(data.type === 'ny-edit-photo'){
      setPhotoState(data.slot || data.photo, data, true);
      return;
    }
    if(data.type === 'ny-photo-uploading'){
      updatePhotoPanel(data.slot || selectedSlot, data.photo || selectedPhoto);
      setStatus('Đang thay ảnh ' + (data.photo || selectedPhoto) + '...', 'saving');
      return;
    }
    if(data.type === 'ny-photo-uploaded'){
      var photo = data.photo || selectedPhoto;
      var slot = data.slot || selectedSlot || photo;
      resetPhotoFields(photo);
      setPhotoState(slot, {photo:photo, x:0, y:0, zoom:1, fit:'contain', unit:'pct'}, true);
      var thumb = document.querySelector('[data-select-photo="' + cssEscape(photo) + '"] img');
      if(thumb && data.src) thumb.src = data.src;
      setStatus('Đã thay ảnh ' + photo, 'saved');
      return;
    }
    if(data.type === 'ny-photo-upload-error'){
      setStatus(data.error || 'Upload ảnh lỗi', 'error');
      if(photoName) photoName.textContent = data.error || 'Upload ảnh lỗi. Bấm Thay ảnh để chọn lại.';
    }
  });

  function reloadPreviewFrame(){
    if(!iframe) return;
    try{
      iframe.contentWindow.location.reload();
    }catch(error){
      var source = iframe.getAttribute('src') || window.location.href;
      var url = new URL(source, window.location.href);
      url.searchParams.set('_ny_reload', String(Date.now()));
      iframe.setAttribute('src', url.pathname + url.search + url.hash);
    }
  }

  window.NhaYenReloadPreview = function(){
    reloadPreviewAfterSave = true;
    clearTimeout(saveTimer);
    autosave(true);
  };

  // Khung "Điện thoại" luôn dựng khung trong đúng 390 x 844 (kích thước
  // thật của điện thoại, để mọi phép đo viewport bên trong iframe không
  // sai khác so với máy khách thật) rồi mới thu nhỏ HÌNH ẢNH của cả khung
  // bằng transform: scale() cho vừa đúng khoảng trống hiện có của
  // .canvas-stage — xem giải thích đầy đủ tại rule CSS tương ứng trong
  // base.css. Không đụng gì tới iframe.contentWindow (thu nhỏ bằng
  // transform không đổi toạ độ con trỏ chuột khi kéo-thả trong iframe,
  // trình duyệt tự quy đổi đúng).
  var canvasStageEl = document.querySelector('.canvas-stage');
  var mobileFitFrame = null;

  function fitMobilePreviewStage(){
    if(!canvasStageEl || canvasStageEl.getAttribute('data-size') !== 'mobile') return;
    if(!iframe) return;
    var gutter = 20;
    var availableWidth = canvasStageEl.clientWidth - gutter;
    var availableHeight = canvasStageEl.clientHeight - gutter;
    var scale = Math.min(1, availableWidth / 390, availableHeight / 844);
    if(!Number.isFinite(scale) || scale <= 0) scale = 1;
    canvasStageEl.style.setProperty('--ny-mobile-fit-scale', scale.toFixed(4));
  }

  function scheduleFitMobilePreviewStage(){
    if(mobileFitFrame) cancelAnimationFrame(mobileFitFrame);
    mobileFitFrame = requestAnimationFrame(fitMobilePreviewStage);
  }

  document.querySelectorAll('[data-preview-size]').forEach(function(button){
    button.addEventListener('click', function(){
      var stage = document.querySelector('.canvas-stage');
      if(stage) stage.setAttribute('data-size', button.getAttribute('data-preview-size'));
      document.querySelectorAll('[data-preview-size]').forEach(function(item){ item.classList.toggle('is-active', item === button); });
      scheduleFitMobilePreviewStage();
    });
  });

  if(canvasStageEl && window.ResizeObserver){
    new ResizeObserver(scheduleFitMobilePreviewStage).observe(canvasStageEl);
  }else{
    window.addEventListener('resize', scheduleFitMobilePreviewStage);
  }
  scheduleFitMobilePreviewStage();

  document.querySelectorAll('[data-select-photo]').forEach(function(card){
    card.addEventListener('click', function(){ selectPhoto(card.getAttribute('data-select-photo')); });
  });

  if(autoFileInput) autoFileInput.addEventListener('change', function(){ uploadFiles(autoFileInput); });

  if(zoomInput){
    zoomInput.addEventListener('input', function(){
      if(!selectedSlot) return;
      setPhotoState(selectedSlot, {photo:selectedPhoto, zoom:zoomInput.value}, true);
      sendPhotoToPreview(selectedSlot);
    });
  }

  if(centerButton){
    centerButton.addEventListener('click', function(){
      if(!selectedSlot) return;
      setPhotoState(selectedSlot, {photo:selectedPhoto, x:0, y:0, zoom:1, unit:'pct'}, true);
      sendPhotoToPreview(selectedSlot);
    });
  }

  if(fitButton){
    fitButton.addEventListener('click', function(){
      if(!selectedSlot) return;
      var oldFit = fieldValue(selectedSlot + '_fit', 'contain');
      setPhotoState(selectedSlot, {photo:selectedPhoto, fit:oldFit === 'cover' ? 'contain' : 'cover'}, true);
      sendPhotoToPreview(selectedSlot);
    });
  }

  if(replaceButton){
    replaceButton.addEventListener('click', function(){
      if(!selectedSlot){
        setStatus('Hãy bấm chọn một khung ảnh trước', 'error');
        return;
      }
      postToPreview({type:'ny-open-photo-picker', slot:selectedSlot, photo:selectedPhoto});
    });
  }

  var setMasterButton = document.getElementById('setMasterTemplateBtn');
  if(setMasterButton){
    setMasterButton.addEventListener('click', function(){
      var url = setMasterButton.getAttribute('data-set-master-url');
      if(!url) return;
      if(!window.confirm('Đặt thiết kế này làm Mẫu chính? Các đơn mới cùng loại sẽ deep clone thành bản Mẫu phụ độc lập. Việc này không ghi đè các đơn đã có.')) return;

      setMasterButton.disabled = true;
      setStatus('Đang lưu làm mẫu chính...', 'saving');
      clearTimeout(saveTimer);

      autosave(true).then(function(saved){
        if(!saved){
          setMasterButton.disabled = false;
          return;
        }
        return fetch(url, {method:'POST'})
          .then(function(response){
            return response.json().catch(function(){ return {ok:false, error:'Server trả về lỗi'}; });
          })
          .then(function(result){
            if(!result || !result.ok) throw new Error(result && result.error || 'Không đặt được làm mẫu chính');
            setStatus(result.message || 'Đã đặt làm mẫu chính', 'saved');
            setMasterButton.textContent = 'Đang là mẫu chính';
            setMasterButton.disabled = true;
          })
          .catch(function(error){
            setStatus(error && error.message || 'Lỗi đặt làm mẫu chính', 'error');
          })
          .finally(function(){ setMasterButton.disabled = false; });
      });
    });
  }

  if(iframe){
    iframe.addEventListener('load', function(){
      setTimeout(function(){ applyThemeControls(); applyAllTextPos(); }, 100);
    });
  }

  buildTextPosTools();
  lastSerialized = serializeForm();
  applyThemeControls();
  applyAllTextPos();
  autoGrowAllTextareas();
  setStatus('Sẵn sàng tự lưu', '');
})();
