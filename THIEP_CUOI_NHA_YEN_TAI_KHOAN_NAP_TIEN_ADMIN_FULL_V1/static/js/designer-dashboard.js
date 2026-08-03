(function(){
  var bellBtn = document.getElementById('notifBellBtn');
  var dropdown = document.getElementById('notifDropdown');
  if(bellBtn && dropdown){
    bellBtn.addEventListener('click', function(e){
      e.stopPropagation();
      dropdown.hidden = !dropdown.hidden;
    });
    document.addEventListener('click', function(e){
      if(!dropdown.hidden && !dropdown.contains(e.target) && e.target !== bellBtn){
        dropdown.hidden = true;
      }
    });
  }

  var masterButtons = document.querySelectorAll('.template-master-btn[data-set-master-url]');
  masterButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      var url = btn.getAttribute('data-set-master-url');
      if(!url || btn.disabled) return;
      if(!window.confirm('Đặt thiết kế này làm Mẫu chính? Từ lúc này, mỗi đơn mới cùng loại sẽ được deep clone thành Mẫu phụ độc lập; các đơn cũ không bị thay đổi.')) return;

      btn.disabled = true;
      fetch(url, {method:'POST'})
        .then(function(response){
          return response.json().catch(function(){ return {ok:false, error:'Server trả về lỗi'}; });
        })
        .then(function(result){
          if(!result || !result.ok) throw new Error((result && result.error) || 'Không đặt được làm mẫu chính');
          window.location.reload();
        })
        .catch(function(error){
          window.alert((error && error.message) || 'Lỗi đặt làm mẫu chính');
          btn.disabled = false;
        });
    });
  });
})();
