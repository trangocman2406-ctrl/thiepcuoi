(function(global){
  'use strict';

  function byteString(value){
    return unescape(encodeURIComponent(String(value || '')));
  }

  function resolveElement(element){
    if(typeof element === 'string') return document.getElementById(element);
    return element;
  }

  function QRCode(element, options){
    this.element = resolveElement(element);
    this.options = typeof options === 'string' ? {text:options} : (options || {});
    if(!this.element) throw new Error('Không tìm thấy vùng hiển thị QR');
    this.makeCode(this.options.text || '');
  }

  QRCode.prototype.makeCode = function(text){
    if(!global.QRCodeLocal || !global.QRErrorCorrectLevelLocal){
      throw new Error('Thư viện QR nội bộ chưa tải xong');
    }
    text = String(text || '').trim();
    if(!text) throw new Error('Link QR đang trống');

    var levelName = String(this.options.correctLevel || 'M').toUpperCase();
    var level = global.QRErrorCorrectLevelLocal[levelName];
    if(typeof level !== 'number') level = global.QRErrorCorrectLevelLocal.M;

    var qr = new global.QRCodeLocal(-1, level);
    qr.addData(byteString(text));
    qr.make();

    var modules = qr.getModuleCount();
    var quiet = 4;
    var requested = Math.max(128, Number(this.options.width || this.options.height || 240));
    var cell = Math.max(1, Math.floor(requested / (modules + quiet * 2)));
    var size = cell * (modules + quiet * 2);
    var ratio = Math.max(1, Math.min(3, global.devicePixelRatio || 1));

    var canvas = document.createElement('canvas');
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Mã QR mở link thiệp cưới');

    var ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = this.options.colorLight || '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = this.options.colorDark || '#111111';

    for(var row = 0; row < modules; row++){
      for(var col = 0; col < modules; col++){
        if(qr.isDark(row, col)){
          ctx.fillRect((col + quiet) * cell, (row + quiet) * cell, cell, cell);
        }
      }
    }

    this.element.innerHTML = '';
    this.element.appendChild(canvas);
    this.canvas = canvas;
    this.text = text;
    return canvas;
  };

  QRCode.prototype.clear = function(){
    if(this.element) this.element.innerHTML = '';
    this.canvas = null;
  };

  QRCode.prototype.toDataURL = function(){
    return this.canvas ? this.canvas.toDataURL('image/png') : '';
  };

  global.QRCode = QRCode;
})(window);
