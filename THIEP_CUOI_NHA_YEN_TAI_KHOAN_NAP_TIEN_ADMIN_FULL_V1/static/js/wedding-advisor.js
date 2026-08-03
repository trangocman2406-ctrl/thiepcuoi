(function(){
  'use strict';

  if(window.NY_DESIGNER_PREVIEW || window.self !== window.top || /(?:\?|&)embed=1(?:&|$)/.test(location.search)) return;
  if(document.getElementById('ny-wedding-advisor')) return;

  var STORAGE_KEY = 'ny_wedding_advisor_v5';
  var HISTORY_LIMIT = 36;
  var SURVEY_STEPS = ['style','color','photos','motif','typography','priority','effects','quantity'];

  var templates = [
    {
      code:'mau01', number:'01', name:'Bao Thư Tình Yêu', color:'#d65d82', price:399000,
      summary:'Xanh mint – kem – hồng, mở bao thư, trái tim, khung sông nước và nhiều phần kể chuyện.',
      tags:['romantic','soft','pink','cream','sage','envelope','hearts','many-photos','story','strong-effects','script-font','mixed-font','family'],
      best:'Hợp cặp đôi thích không khí ngọt ngào, nhiều ảnh và màn mở thiệp thật ấn tượng.'
    },
    {
      code:'mau02', number:'02', name:'Lịch Cưới Hỷ Sắc', color:'#7c1420', price:285000,
      summary:'Xanh nhạt – kem – đỏ hỷ, lịch cưới rõ, bố cục giấy thiệp gọn và hai ảnh cặp đôi.',
      tags:['elegant','classic','clean','cream','sage','wine','red','calendar','medium-photos','light-effects','serif-font','modern-font','minimal-motif','family'],
      best:'Hợp gia đình thích thiệp trang nhã, lịch cưới nổi bật và thông tin dễ đọc.'
    },
    {
      code:'mau03', number:'03', name:'Thiệp Thư Thanh Lịch', color:'#8f2637', price:298000,
      summary:'Trắng kem – đỏ rượu – ánh vàng, phong cách stationery, ảnh trong bao thư, lịch và album dạng masonry.',
      tags:['elegant','luxury','classic','cream','wine','gold','envelope','calendar','many-photos','light-effects','serif-font','script-font','formal-motif','family'],
      best:'Hợp đám cưới thanh lịch, cần cảm giác chỉn chu và vẫn muốn có nhiều ảnh mà bố cục không rối.'
    },
    {
      code:'mau04', number:'04', name:'Đỏ Rượu Chuyện Tình', color:'#7d121b', price:263000,
      summary:'Đỏ rượu – kem – vàng nhạt, ảnh mở đầu lớn, timeline polaroid và album đậm chất sang trọng.',
      tags:['luxury','bold','wine','red','cream','gold','story','many-photos','medium-effects','formal','serif-font','script-font','formal-motif'],
      best:'Hợp đám cưới sang trọng, thích màu đậm và muốn kể hành trình tình yêu bằng nhiều ảnh.'
    },
    {
      code:'mau05', number:'05', name:'Sage Hồng Hai Nhà', color:'#3f7568', price:377000,
      summary:'Xanh sage – hồng phấn – kem, ảnh tròn cô dâu chú rể, phần hai nhà, love story và đếm ngược.',
      tags:['soft','modern','elegant','pink','cream','sage','family','story','many-photos','medium-effects','script-font','serif-font','mixed-font','floral'],
      best:'Hợp cặp đôi thích màu dịu, bố cục hai nhà rõ ràng và câu chuyện tình cảm trẻ trung.'
    }
  ];

  function formatPrice(value){
    return Number(value||0).toLocaleString('vi-VN')+'đ';
  }

  var survey = {
    style:{
      question:'Em thích phong cách thiệp nào nhất?',
      options:[
        ['Lãng mạn, ngọt ngào','romantic'],
        ['Hiện đại, trẻ trung','modern'],
        ['Sang trọng, nổi bật','luxury'],
        ['Thanh lịch, dễ đọc','elegant'],
        ['Chưa biết, để AI chọn','flexible']
      ]
    },
    color:{
      question:'Màu chủ đạo em mong muốn là gì?',
      options:[
        ['Hồng – kem','pink'],
        ['Đỏ hoặc đỏ rượu','wine'],
        ['Trắng/kem tối giản','cream'],
        ['Xanh sage/rêu','sage'],
        ['Có thể đổi linh hoạt','flexible']
      ]
    },
    photos:{
      question:'Em muốn đưa khoảng bao nhiêu ảnh cưới?',
      options:[
        ['Ít, khoảng 1–4 ảnh','few-photos'],
        ['Vừa, khoảng 5–8 ảnh','medium-photos'],
        ['Nhiều, từ 9 ảnh trở lên','many-photos'],
        ['Chưa chốt ảnh','flexible']
      ]
    },
    motif:{
      question:'Em thích họa tiết hoặc điểm nhấn nào?',
      options:[
        ['Trái tim và bao thư','hearts'],
        ['Lịch cưới','calendar'],
        ['Hoa lá, xanh sage','floral'],
        ['Timeline chuyện tình','story'],
        ['Tối giản, ít họa tiết','minimal-motif']
      ]
    },
    typography:{
      question:'Kiểu chữ nào hợp với em nhất?',
      options:[
        ['Chữ viết tay mềm mại','script-font'],
        ['Chữ serif sang trọng','serif-font'],
        ['Chữ hiện đại, dễ đọc','modern-font'],
        ['Phối nhiều kiểu chữ','mixed-font'],
        ['Chưa xác định','flexible']
      ]
    },
    priority:{
      question:'Phần nào cần nổi bật nhất trong thiệp?',
      options:[
        ['Bao thư và hiệu ứng mở','envelope'],
        ['Lịch cưới rõ ràng','calendar'],
        ['Thông tin hai nhà','family'],
        ['Love story và album ảnh','story'],
        ['Thông tin gọn, dễ xem','clean']
      ]
    },
    effects:{
      question:'Em thích mức độ hiệu ứng thế nào?',
      options:[
        ['Nhẹ, tinh tế','light-effects'],
        ['Vừa đủ sinh động','medium-effects'],
        ['Nhiều, tạo ấn tượng','strong-effects'],
        ['Không quan trọng','flexible']
      ]
    },
    quantity:{
      question:'Em dự kiến in bao nhiêu bộ thiệp?',
      options:[
        ['Chỉ dùng thiệp online','online-only'],
        ['50–149 bộ','50-149'],
        ['150–399 bộ','150-399'],
        ['Từ 400 bộ trở lên','400-plus'],
        ['Chưa xác định','unknown']
      ]
    }
  };

  var state = {
    open:false,
    busy:false,
    surveyActive:false,
    surveyIndex:0,
    answers:{},
    messages:[],
    lastUser:'',
    lastUserAt:0,
    lastBot:'',
    currentTemplate:null,
    galleryMode:false
  };

  var root, panel, messagesEl, quickEl, inputEl, sendEl, progressEl, progressBarEl, progressLabelEl;
  var quickDrag = {isDown:false, moved:false, suppressClick:false, startX:0, startScroll:0};
  var pendingTimer = null;

  function normalize(value){
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/Đ/g,'D')
      .toLowerCase().replace(/[^a-z0-9\s-]/g,' ')
      .replace(/\s+/g,' ').trim();
  }

  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }

  function currentTemplateCode(){
    var invite = document.querySelector('.invitation[data-template]');
    var raw = invite && (invite.getAttribute('data-effect-key') || invite.getAttribute('data-template')) || '';
    var match = String(raw).match(/mau0[1-5]/i);
    return match ? match[0].toLowerCase() : null;
  }

  function loadState(){
    state.galleryMode = !!document.querySelector('[data-advisor-gallery]');
    state.currentTemplate = currentTemplateCode();
    try{
      var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
      if(saved && saved.version === 5){
        state.surveyActive = !!saved.surveyActive;
        state.surveyIndex = Math.max(0,Math.min(SURVEY_STEPS.length-1,Number(saved.surveyIndex)||0));
        state.answers = saved.answers && typeof saved.answers === 'object' ? saved.answers : {};
        state.messages = Array.isArray(saved.messages) ? saved.messages.slice(-HISTORY_LIMIT) : [];
      }
    }catch(error){
      state.messages = [];
    }
  }

  function saveState(){
    try{
      sessionStorage.setItem(STORAGE_KEY,JSON.stringify({
        version:5,
        surveyActive:state.surveyActive,
        surveyIndex:state.surveyIndex,
        answers:state.answers,
        messages:state.messages.slice(-HISTORY_LIMIT)
      }));
    }catch(error){}
  }

  function buildRoot(){
    var statusText = state.galleryMode ? 'Một trợ lý dùng chung cho toàn bộ 5 mẫu' : 'Tư vấn mẫu đang xem và so sánh đủ 5 mẫu';
    root = document.createElement('div');
    root.id = 'ny-wedding-advisor';
    root.setAttribute('aria-live','polite');
    if(state.galleryMode) root.classList.add('is-gallery');
    root.innerHTML = ''+
      '<div class="ny-advisor-backdrop" data-advisor-close></div>'+
      '<section class="ny-advisor-panel" role="dialog" aria-modal="false" aria-label="Trợ lý tư vấn thiệp cưới">'+
        '<header class="ny-advisor-header">'+
          '<div class="ny-advisor-avatar" aria-hidden="true">Y</div>'+
          '<div class="ny-advisor-heading"><strong>Trợ lý chọn thiệp Nhà Yến</strong><span>'+escapeHtml(statusText)+'</span></div>'+
          '<button class="ny-advisor-icon-btn ny-advisor-expand-btn" type="button" data-advisor-expand title="Mở rộng khung chat" aria-label="Mở rộng khung chat">□</button>'+
          '<button class="ny-advisor-icon-btn" type="button" data-advisor-reset title="Làm lại tư vấn" aria-label="Làm lại tư vấn">↻</button>'+
          '<button class="ny-advisor-icon-btn" type="button" data-advisor-close title="Đóng" aria-label="Đóng chat">×</button>'+
        '</header>'+
        '<div class="ny-advisor-progress" data-advisor-progress>'+
          '<div class="ny-advisor-progress-row"><span>Đang tìm mẫu phù hợp</span><span data-advisor-progress-label>1/8</span></div>'+
          '<div class="ny-advisor-progress-track"><div class="ny-advisor-progress-bar" data-advisor-progress-bar></div></div>'+
        '</div>'+
        '<div class="ny-advisor-messages" data-advisor-messages tabindex="0" aria-label="Nội dung trò chuyện, có thể cuộn lên xuống"></div>'+
        '<div class="ny-advisor-quick" data-advisor-quick aria-label="Câu trả lời nhanh"></div>'+
        '<form class="ny-advisor-composer" data-advisor-form>'+
          '<textarea class="ny-advisor-input" data-advisor-input rows="1" maxlength="500" placeholder="Nhập màu, phong cách, số ảnh, chữ hoặc số lượng..."></textarea>'+
          '<button class="ny-advisor-send" data-advisor-send type="submit" aria-label="Gửi câu hỏi">'+
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13"></path><path d="m22 2-7 20-4-9-9-4Z"></path></svg>'+
          '</button>'+
        '</form>'+
        '<div class="ny-advisor-note">Một trợ lý dùng chung cho 5 mẫu • Báo giá cuối cùng do Nhà Yến xác nhận</div>'+
      '</section>'+
      '<button class="ny-advisor-launcher" type="button" data-advisor-launcher aria-expanded="false" aria-label="Mở tư vấn chọn thiệp">'+
        '<span class="ny-advisor-launcher-label">Nhờ AI chọn mẫu</span>'+
        '<span class="ny-advisor-dot">AI</span>'+
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-7a4 4 0 0 1-1-2.65V7a4 4 0 0 1 4-4h11a4 4 0 0 1 4 4Z"></path><path d="M7.5 10h.01M12 10h.01M16.5 10h.01"></path></svg>'+
      '</button>';
    document.body.appendChild(root);

    panel = root.querySelector('.ny-advisor-panel');
    messagesEl = root.querySelector('[data-advisor-messages]');
    quickEl = root.querySelector('[data-advisor-quick]');
    inputEl = root.querySelector('[data-advisor-input]');
    sendEl = root.querySelector('[data-advisor-send]');
    progressEl = root.querySelector('[data-advisor-progress]');
    progressBarEl = root.querySelector('[data-advisor-progress-bar]');
    progressLabelEl = root.querySelector('[data-advisor-progress-label]');
  }

  function setOpen(open){
    state.open = !!open;
    root.classList.toggle('is-open',state.open);
    var launcher = root.querySelector('[data-advisor-launcher]');
    launcher.setAttribute('aria-expanded',state.open ? 'true':'false');
    if(state.open){
      if(!state.messages.length) welcome();
      window.setTimeout(function(){inputEl.focus({preventScroll:true});scrollBottom();},80);
    }
  }

  function toggleExpanded(){
    root.classList.toggle('is-expanded');
    var expanded=root.classList.contains('is-expanded');
    var button=root.querySelector('[data-advisor-expand]');
    button.textContent=expanded ? '▣' : '□';
    button.title=expanded ? 'Thu gọn khung chat' : 'Mở rộng khung chat';
    button.setAttribute('aria-label',button.title);
    window.setTimeout(scrollBottom,80);
  }

  function bindQuickDragScroll(){
    function endDrag(event){
      if(!quickDrag.isDown) return;
      quickDrag.isDown=false;
      quickEl.classList.remove('is-dragging');
      if(quickDrag.moved) quickDrag.suppressClick=true;
      if(event && event.pointerId!=null){
        try{ quickEl.releasePointerCapture(event.pointerId); }catch(error){}
      }
    }
    quickEl.addEventListener('pointerdown',function(event){
      if(event.pointerType && event.pointerType!=='mouse') return;
      if(event.button!==undefined && event.button!==0) return;
      quickDrag.isDown=true;
      quickDrag.moved=false;
      quickDrag.startX=event.clientX;
      quickDrag.startScroll=quickEl.scrollLeft;
      quickEl.classList.add('is-dragging');
      try{ quickEl.setPointerCapture(event.pointerId); }catch(error){}
    });
    quickEl.addEventListener('pointermove',function(event){
      if(!quickDrag.isDown) return;
      var dx=event.clientX-quickDrag.startX;
      if(Math.abs(dx)>4) quickDrag.moved=true;
      if(quickDrag.moved){
        quickEl.scrollLeft=quickDrag.startScroll-dx;
        event.preventDefault();
      }
    });
    quickEl.addEventListener('pointerup',endDrag);
    quickEl.addEventListener('pointercancel',endDrag);
    quickEl.addEventListener('pointerleave',function(event){if(quickDrag.isDown) endDrag(event);});
    quickEl.addEventListener('wheel',function(event){
      if(Math.abs(event.deltaY)>Math.abs(event.deltaX)){
        quickEl.scrollLeft+=event.deltaY;
        event.preventDefault();
      }
    },{passive:false});
  }

  function bindEvents(){
    root.querySelector('[data-advisor-launcher]').addEventListener('click',function(){setOpen(!state.open);});
    root.querySelectorAll('[data-advisor-close]').forEach(function(button){button.addEventListener('click',function(){setOpen(false);});});
    root.querySelector('[data-advisor-reset]').addEventListener('click',resetConversation);
    root.querySelector('[data-advisor-expand]').addEventListener('click',toggleExpanded);
    root.querySelector('[data-advisor-form]').addEventListener('submit',function(event){
      event.preventDefault();
      submitUser(inputEl.value);
    });
    inputEl.addEventListener('input',function(){
      inputEl.style.height='auto';
      inputEl.style.height=Math.min(inputEl.scrollHeight,92)+'px';
      sendEl.disabled=!inputEl.value.trim() || state.busy;
    });
    inputEl.addEventListener('keydown',function(event){
      if(event.key==='Enter' && !event.shiftKey){
        event.preventDefault();
        submitUser(inputEl.value);
      }
    });
    bindQuickDragScroll();
    quickEl.addEventListener('click',function(event){
      if(quickDrag.suppressClick){
        quickDrag.suppressClick=false;
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      var button=event.target.closest('[data-advisor-action]');
      if(!button || state.busy) return;
      handleAction(button.dataset.advisorAction,button.dataset.value || '',button.textContent.trim());
    });
    messagesEl.addEventListener('click',function(event){
      var button=event.target.closest('[data-advisor-action]');
      if(!button || state.busy) return;
      handleAction(button.dataset.advisorAction,button.dataset.value || '',button.textContent.trim());
    });
    messagesEl.addEventListener('wheel',function(event){event.stopPropagation();},{passive:true});
    messagesEl.addEventListener('touchmove',function(event){event.stopPropagation();},{passive:true});
    document.addEventListener('keydown',function(event){if(event.key==='Escape' && state.open)setOpen(false);});
  }

  function messageNode(message){
    var row=document.createElement('div');
    row.className='ny-advisor-message '+(message.role==='user'?'is-user':'is-bot');
    var bubble=document.createElement('div');
    bubble.className='ny-advisor-bubble';
    if(message.html && message.role==='bot') bubble.innerHTML=message.text;
    else bubble.textContent=message.text;
    row.appendChild(bubble);
    return row;
  }

  function renderHistory(){
    messagesEl.innerHTML='';
    state.messages.forEach(function(message){messagesEl.appendChild(messageNode(message));});
    scrollBottom();
  }

  function addMessage(role,text,html){
    text=String(text || '').trim();
    if(!text) return;
    if(role==='bot' && state.lastBot===text){
      text += html ? '<small>Anh/chị có thể chọn một nút bên dưới hoặc nhập yêu cầu cụ thể hơn.</small>' : ' Anh/chị có thể nhập thêm màu hoặc phong cách mong muốn.';
    }
    if(role==='bot') state.lastBot=text;
    var message={role:role,text:text,html:!!html,at:Date.now()};
    state.messages.push(message);
    if(state.messages.length>HISTORY_LIMIT) state.messages=state.messages.slice(-HISTORY_LIMIT);
    messagesEl.appendChild(messageNode(message));
    saveState();
    scrollBottom();
  }

  function scrollBottom(){
    if(!messagesEl) return;
    requestAnimationFrame(function(){
      if(messagesEl.scrollTo) messagesEl.scrollTo({top:messagesEl.scrollHeight,behavior:'smooth'});
      else messagesEl.scrollTop=messagesEl.scrollHeight;
    });
  }

  function setQuick(options){
    quickEl.innerHTML='';
    (options || []).forEach(function(option){
      var button=document.createElement('button');
      button.type='button';
      button.className='ny-advisor-chip';
      button.dataset.advisorAction=option.action;
      if(option.value!=null) button.dataset.value=option.value;
      button.textContent=option.label;
      quickEl.appendChild(button);
    });
    quickEl.style.display=options && options.length ? 'flex':'none';
  }

  function setBusy(busy){
    state.busy=!!busy;
    sendEl.disabled=state.busy || !inputEl.value.trim();
    Array.prototype.forEach.call(root.querySelectorAll('[data-advisor-action]'),function(item){item.disabled=state.busy;});
  }

  function showTyping(){
    removeTyping();
    var row=document.createElement('div');
    row.className='ny-advisor-message is-bot';
    row.dataset.advisorTyping='1';
    row.innerHTML='<div class="ny-advisor-bubble ny-advisor-typing"><i></i><i></i><i></i></div>';
    messagesEl.appendChild(row);
    scrollBottom();
  }

  function removeTyping(){
    var old=messagesEl && messagesEl.querySelector('[data-advisor-typing]');
    if(old) old.remove();
  }

  function botReply(text,html,options,delay){
    if(pendingTimer) clearTimeout(pendingTimer);
    setBusy(true);
    setQuick([]);
    showTyping();
    pendingTimer=setTimeout(function(){
      removeTyping();
      addMessage('bot',text,html);
      setQuick(options || defaultQuick());
      setBusy(false);
      pendingTimer=null;
    },Math.max(180,Math.min(Number(delay)||360,650)));
  }

  function defaultQuick(){
    return [
      {label:'Tìm mẫu phù hợp',action:'start-survey'},
      {label:'Mẫu nổi bật',action:'popular'},
      {label:'Xem đủ 5 mẫu',action:'show-all'},
      {label:'Hỏi giá thiệp',action:'price'},
      {label:'Tính năng thiệp online',action:'features'}
    ];
  }

  function welcome(){
    var current=templates.find(function(item){return item.code===state.currentTemplate;});
    var intro=current
      ? 'Xin chào 👋 Em đang xem '+current.name+'. Tôi là trợ lý dùng chung cho cả 5 mẫu, có thể so sánh mẫu đang xem với những mẫu còn lại.'
      : 'Xin chào 👋 Đây là trợ lý dùng chung cho toàn bộ 5 mẫu. Tôi có thể hỏi vài câu ngắn để chọn mẫu hợp nhất theo màu sắc, số ảnh, kiểu chữ, họa tiết, hiệu ứng và số lượng in.';
    addMessage('bot',intro,false);
    setQuick(defaultQuick());
  }

  function updateProgress(){
    if(!state.surveyActive){progressEl.classList.remove('is-visible');return;}
    progressEl.classList.add('is-visible');
    var current=Math.min(state.surveyIndex+1,SURVEY_STEPS.length);
    progressLabelEl.textContent=current+'/'+SURVEY_STEPS.length;
    progressBarEl.style.width=Math.round((current/SURVEY_STEPS.length)*100)+'%';
  }

  function startSurvey(skipEcho){
    state.surveyActive=true;
    state.surveyIndex=0;
    state.answers={};
    saveState();
    updateProgress();
    if(!skipEcho) addMessage('user','Tìm mẫu phù hợp',false);
    askSurveyStep();
  }

  function askSurveyStep(){
    var key=SURVEY_STEPS[state.surveyIndex];
    var item=survey[key];
    if(!item) return finishSurvey();
    updateProgress();
    botReply(item.question,false,item.options.map(function(option){
      return {label:option[0],action:'survey-answer',value:key+'|'+option[1]};
    }),260);
  }

  function recordSurveyAnswer(key,value,label,skipEcho){
    state.answers[key]=value;
    if(!skipEcho) addMessage('user',label,false);
    state.surveyIndex+=1;
    saveState();
    if(state.surveyIndex>=SURVEY_STEPS.length) finishSurvey();
    else askSurveyStep();
  }

  function scoreTemplates(answers){
    return templates.map(function(template){
      var score=0;
      var reasons=[];
      ['style','color','photos','motif','typography','priority','effects'].forEach(function(key){
        var value=answers[key];
        if(!value || value==='flexible') return;
        if(template.tags.indexOf(value)!==-1){
          score+=(key==='priority'||key==='motif')?4:(key==='style'||key==='color'||key==='typography'?3:2);
          reasons.push(value);
        }
      });
      if(answers.photos==='few-photos' && template.code==='mau02') score+=2;
      if(answers.photos==='few-photos' && template.code==='mau03') score+=1;
      if(answers.priority==='family' && template.code==='mau05') score+=2;
      if(answers.priority==='calendar' && template.code==='mau03') score+=2;
      if(answers.priority==='story' && (template.code==='mau04'||template.code==='mau05')) score+=1;
      if(answers.style==='romantic' && template.code==='mau01') score+=2;
      if(answers.style==='luxury' && template.code==='mau04') score+=2;
      if(answers.style==='elegant' && template.code==='mau03') score+=2;
      if(!Object.keys(answers).length) score=0;
      return {template:template,score:score,reasons:reasons};
    }).sort(function(a,b){return b.score-a.score || a.template.code.localeCompare(b.template.code);});
  }

  function reasonText(item,answers){
    var bits=[];
    if(answers.style && answers.style!=='flexible') bits.push('đúng phong cách');
    if(answers.color && answers.color!=='flexible' && item.template.tags.indexOf(answers.color)!==-1) bits.push('hợp màu');
    if(answers.photos && answers.photos!=='flexible' && item.template.tags.indexOf(answers.photos)!==-1) bits.push('hợp số ảnh');
    if(answers.motif && item.template.tags.indexOf(answers.motif)!==-1) bits.push('hợp họa tiết');
    if(answers.typography && answers.typography!=='flexible' && item.template.tags.indexOf(answers.typography)!==-1) bits.push('hợp kiểu chữ');
    if(answers.priority && item.template.tags.indexOf(answers.priority)!==-1) bits.push('đúng phần cần nổi bật');
    if(answers.effects && answers.effects!=='flexible' && item.template.tags.indexOf(answers.effects)!==-1) bits.push('đúng mức hiệu ứng');
    return bits.length ? bits.slice(0,3).join(', ') : item.template.best;
  }

  function templateCards(items,answers,showScore){
    return '<div class="ny-advisor-template-list">'+items.map(function(item){
      var template=item.template || item;
      var score=item.score || 0;
      return '<article class="ny-advisor-template-card">'+
        '<div class="ny-advisor-template-number" style="--card-color:'+escapeHtml(template.color)+'">'+escapeHtml(template.number)+'</div>'+
        '<div class="ny-advisor-template-copy"><b>'+escapeHtml(template.name)+'</b>'+
        (template.price?'<span class="ny-advisor-price">'+escapeHtml(formatPrice(template.price))+'</span>':'')+
        '<span>'+escapeHtml(template.summary)+'</span>'+
        (showScore?'<span class="ny-advisor-score">✓ '+escapeHtml(reasonText(item,answers))+'</span>':'')+
        '<div class="ny-advisor-card-actions">'+
          '<a class="ny-advisor-link is-secondary" href="/preview/'+template.code+'" target="_blank" rel="noopener">Xem mẫu</a>'+
          '<a class="ny-advisor-link is-primary" href="/request?template='+template.code+'">Chọn mẫu này</a>'+
          '<button class="ny-advisor-link is-secondary" type="button" data-advisor-action="template-info" data-value="'+template.code+'">Hỏi thêm</button>'+
        '</div></div></article>';
    }).join('')+'</div>';
  }

  function quantityPrice(value){
    if(value==='online-only') return 'Em chỉ dùng thiệp online nên không tính số lượng in. Phần online vẫn có thể dùng ảnh, nhạc, bản đồ, đếm ngược và lời chúc.';
    if(value==='50-149') return 'Với 50–149 bộ, giá nhũ thơm tham khảo là 8.000đ/bộ.';
    if(value==='150-399') return 'Với 150–399 bộ, giá cơ bản tham khảo là 3.900đ/bộ.';
    if(value==='400-plus') return 'Từ 400 bộ: 400–799 bộ khoảng 3.400đ/bộ; 800–1.299 bộ khoảng 2.900đ/bộ; từ 1.300 bộ khoảng 2.700đ/bộ.';
    return 'Khi chốt số lượng, Nhà Yến sẽ báo đúng bậc giá và chất liệu cho em.';
  }

  function finishSurvey(){
    state.surveyActive=false;
    updateProgress();
    var ranked=scoreTemplates(state.answers);
    var top=ranked.slice(0,2);
    var priceNote=quantityPrice(state.answers.quantity);
    var html='<p>Dựa trên lựa chọn của em, <strong>'+escapeHtml(top[0].template.name)+'</strong> phù hợp nhất. Mẫu thứ hai đáng cân nhắc là <strong>'+escapeHtml(top[1].template.name)+'</strong>.</p>'+
      templateCards(top,state.answers,true)+
      '<small>'+escapeHtml(priceNote)+' Giá có thể thay đổi theo giấy, in hai mặt, ép kim/dập nổi và yêu cầu thiết kế.</small>';
    botReply(html,true,[
      {label:'So sánh 2 mẫu',action:'compare-top'},
      {label:'Làm lại tư vấn',action:'restart-survey'},
      {label:'Xem đủ 5 mẫu',action:'show-all'},
      {label:'Hỏi giá chi tiết',action:'price'}
    ],420);
  }

  function showPopular(skipEcho){
    if(!skipEcho) addMessage('user','Mẫu nổi bật',false);
    var featured=templates[0];
    var html='<p><strong>'+escapeHtml(featured.name)+'</strong> đang được đánh dấu là mẫu nổi bật trong hệ thống.</p><p>Mẫu này có bao thư mở đầu, tim bay, tông xanh mint – hồng và nhiều khung ảnh kể chuyện nên tạo ấn tượng mạnh khi khách mở thiệp.</p>'+templateCards([featured],{},false)+'<small>“Nổi bật” là nhãn của bộ sưu tập hiện tại, không phải số liệu bán chạy tự động.</small>';
    botReply(html,true,[{label:'Để AI kiểm tra có hợp không',action:'start-survey'},{label:'Xem đủ 5 mẫu',action:'show-all'}],300);
  }

  function showAllTemplates(skipEcho){
    if(!skipEcho) addMessage('user','Xem đủ 5 mẫu',false);
    var html='<p>Đây là điểm khác nhau chính của 5 mẫu:</p>'+templateCards(templates,{},false);
    botReply(html,true,[
      {label:'Để AI chọn giúp',action:'start-survey'},
      {label:'So sánh theo màu',action:'compare-color'},
      {label:'So sánh theo số ảnh',action:'compare-photos'}
    ],320);
  }

  function showPrice(skipEcho){
    if(!skipEcho) addMessage('user','Hỏi giá thiệp',false);
    var html='<p><strong>Giá thiệp online theo từng mẫu:</strong></p><ul>'+
      templates.map(function(t){return '<li>'+escapeHtml(t.name)+': <strong>'+escapeHtml(formatPrice(t.price))+'</strong></li>';}).join('')+
      '</ul>'+
      '<p><strong>Nếu cần in thêm bản giấy (nhũ thơm), giá tham khảo theo số lượng:</strong></p><ul>'+
      '<li>50–149 bộ: 8.000đ/bộ</li><li>150–399 bộ: 3.900đ/bộ</li><li>400–799 bộ: 3.400đ/bộ</li><li>800–1.299 bộ: 2.900đ/bộ</li><li>Từ 1.300 bộ: 2.700đ/bộ</li></ul>'+
      '<p>Phụ thu thường gặp khi in: ruột 2 mặt +1.000đ; bản đồ +500–1.000đ; giấy 230gsm +1.000đ; ép kim/dập nổi +1.000đ/bộ và phí khuôn.</p><small>Giá thiệp online đã gồm tùy chỉnh tên, ngày giờ, ảnh, nhạc, bản đồ và lời chúc. Phần in giấy là tùy chọn thêm, số lượng tối thiểu 50 bộ; báo giá cuối cùng phụ thuộc mẫu, giấy và gia công thực tế.</small>';
    botReply(html,true,[
      {label:'Xem đủ 5 mẫu',action:'show-all'},
      {label:'50–149 bộ (in giấy)',action:'quantity-price',value:'50-149'},
      {label:'Từ 400 bộ (in giấy)',action:'quantity-price',value:'400-plus'},
      {label:'Chọn mẫu trước',action:'start-survey'}
    ],320);
  }

  function showFeatures(skipEcho){
    if(!skipEcho) addMessage('user','Tính năng thiệp online',false);
    var html='<p>Cả 5 mẫu có thể tùy chỉnh theo đơn: tên cô dâu–chú rể, ngày giờ, địa chỉ, thông tin hai nhà, ảnh, màu/chữ, nhạc, bản đồ và lời chúc.</p><p>Khách nhận link có thể xem trên điện thoại, mở bản đồ, nghe nhạc và gửi lời chúc. Mỗi đơn là một bản sao độc lập nên chỉnh đơn này không làm thay đổi mẫu chính hoặc đơn khác.</p>';
    botReply(html,true,[
      {label:'Mẫu nhiều ảnh nhất',action:'compare-photos'},
      {label:'Mẫu hiệu ứng đẹp',action:'compare-effects'},
      {label:'Tìm mẫu phù hợp',action:'start-survey'}
    ],310);
  }

  function showTemplateInfo(code,skipEcho){
    var template=templates.find(function(item){return item.code===code;});
    if(!template) return;
    if(!skipEcho) addMessage('user','Hỏi thêm về '+template.name,false);
    var html='<p><strong>'+escapeHtml(template.name)+'</strong> – giá '+escapeHtml(formatPrice(template.price))+'</p><p>'+escapeHtml(template.summary)+'</p><p>'+escapeHtml(template.best)+'</p>'+templateCards([template],{},false);
    botReply(html,true,[
      {label:'So sánh với mẫu khác',action:'show-all'},
      {label:'Để AI kiểm tra độ phù hợp',action:'start-survey'},
      {label:'Hỏi giá',action:'price'}
    ],280);
  }

  function compareTop(){
    var top=scoreTemplates(state.answers).slice(0,2);
    addMessage('user','So sánh 2 mẫu được đề xuất',false);
    var a=top[0].template,b=top[1].template;
    var html='<p><strong>'+escapeHtml(a.name)+'</strong>: '+escapeHtml(a.best)+'</p><p><strong>'+escapeHtml(b.name)+'</strong>: '+escapeHtml(b.best)+'</p><p>Nếu ưu tiên đúng lựa chọn đã trả lời, nên chọn <strong>'+escapeHtml(a.name)+'</strong>. Nếu muốn đổi cảm giác thị giác, xem thêm '+escapeHtml(b.name)+'.</p>'+templateCards(top,state.answers,true);
    botReply(html,true,[{label:'Làm lại tư vấn',action:'restart-survey'},{label:'Xem đủ 5 mẫu',action:'show-all'}],330);
  }

  function compare(kind,skipEcho){
    var data;
    var title;
    if(kind==='color'){
      title='So sánh theo màu';
      data='<p><strong>Hồng–kem:</strong> Mẫu 01 và 05. <strong>Đỏ/đỏ rượu:</strong> Mẫu 02, 03 và 04. <strong>Xanh sage/mint:</strong> Mẫu 01, 02 và 05; trong đó Mẫu 05 thể hiện sage rõ nhất.</p>';
    }else if(kind==='photos'){
      title='So sánh theo số ảnh';
      data='<p><strong>Ít đến vừa ảnh:</strong> Mẫu 02. <strong>Nhiều ảnh nhưng vẫn thanh lịch:</strong> Mẫu 03. <strong>Nhiều ảnh, kể chuyện rõ:</strong> Mẫu 01, 04 hoặc 05.</p>';
    }else{
      title='So sánh hiệu ứng';
      data='<p><strong>Hiệu ứng nổi bật nhất:</strong> Mẫu 01. <strong>Sinh động vừa:</strong> Mẫu 04 và 05. <strong>Nhẹ, tập trung nội dung:</strong> Mẫu 02 và 03.</p>';
    }
    if(!skipEcho) addMessage('user',title,false);
    botReply(data+templateCards(templates,{},false),true,[{label:'Để AI chọn giúp',action:'start-survey'}],300);
  }

  function resetConversation(){
    if(pendingTimer){clearTimeout(pendingTimer);pendingTimer=null;}
    state.busy=false;
    state.surveyActive=false;
    state.surveyIndex=0;
    state.answers={};
    state.messages=[];
    state.lastBot='';
    try{sessionStorage.removeItem(STORAGE_KEY);}catch(error){}
    renderHistory();
    updateProgress();
    welcome();
  }

  function handleAction(action,value,label){
    if(action==='start-survey') return startSurvey();
    if(action==='restart-survey') return startSurvey();
    if(action==='survey-answer'){
      var parts=value.split('|');
      return recordSurveyAnswer(parts[0],parts[1],label);
    }
    if(action==='popular') return showPopular();
    if(action==='show-all') return showAllTemplates();
    if(action==='price') return showPrice();
    if(action==='features') return showFeatures();
    if(action==='template-info') return showTemplateInfo(value);
    if(action==='compare-top') return compareTop();
    if(action==='compare-color') return compare('color');
    if(action==='compare-photos') return compare('photos');
    if(action==='compare-effects') return compare('effects');
    if(action==='quantity-price'){
      addMessage('user',label,false);
      return botReply('<p>'+escapeHtml(quantityPrice(value))+'</p><small>Đây là giá tham khảo; gia công và chất liệu sẽ được báo riêng.</small>',true,[{label:'Tìm mẫu phù hợp',action:'start-survey'},{label:'Xem bảng giá',action:'price'}],230);
    }
  }

  function parseQuantity(text){
    var clean=normalize(text);
    var match=clean.match(/(?:^|\s)(\d{2,5})(?:\s|$)/);
    if(!match) return null;
    var count=parseInt(match[1],10);
    if(count<50) return {count:count,range:'under-50'};
    if(count<150) return {count:count,range:'50-149'};
    if(count<400) return {count:count,range:'150-399'};
    return {count:count,range:'400-plus'};
  }

  function quantityAnswer(parsed){
    if(parsed.range==='under-50') return 'Bên Nhà Yến nhận tối thiểu 50 bộ. Em đang dự kiến '+parsed.count+' bộ nên cần nâng lên ít nhất 50 bộ để đặt in.';
    var base;
    if(parsed.count<150) base=8000;
    else if(parsed.count<400) base=3900;
    else if(parsed.count<800) base=3400;
    else if(parsed.count<1300) base=2900;
    else base=2700;
    var total=parsed.count*base;
    return 'Với '+parsed.count.toLocaleString('vi-VN')+' bộ, đơn giá nhũ thơm tham khảo là '+base.toLocaleString('vi-VN')+'đ/bộ, tạm tính '+total.toLocaleString('vi-VN')+'đ trước phụ thu giấy, in hai mặt hoặc gia công.';
  }

  function inferSurveyValue(key,text){
    var t=normalize(text);
    if(key==='style'){
      if(/hien dai|tre trung|toi gian/.test(t)) return ['modern','Hiện đại, trẻ trung'];
      if(/sang trong|cao cap|noi bat|luxury/.test(t)) return ['luxury','Sang trọng, nổi bật'];
      if(/lang man|ngot ngao|de thuong/.test(t)) return ['romantic','Lãng mạn, ngọt ngào'];
      if(/thanh lich|nhe nhang|de doc|trang nha/.test(t)) return ['elegant','Thanh lịch, dễ đọc'];
    }
    if(key==='color'){
      if(/do ruou|do dam|burgundy|wine/.test(t)) return ['wine','Đỏ hoặc đỏ rượu'];
      if(/(?:^|\s)hong(?:\s|$)/.test(t)) return ['pink','Hồng – kem'];
      if(/(?:^|\s)xanh(?:\s|$)|sage|xanh reu/.test(t)) return ['sage','Xanh sage/rêu'];
      if(/(?:^|\s)(?:trang|kem|beige)(?:\s|$)|toi gian/.test(t)) return ['cream','Trắng/kem tối giản'];
    }
    if(key==='photos'){
      var photoCount=t.match(/(?:^|\s)(\d{1,2})\s*(?:anh|hinh|photo)(?:\s|$)/);
      if(photoCount){
        var count=parseInt(photoCount[1],10);
        if(count<=4) return ['few-photos','Ít, khoảng 1–4 ảnh'];
        if(count<=8) return ['medium-photos','Vừa, khoảng 5–8 ảnh'];
        return ['many-photos','Nhiều, từ 9 ảnh trở lên'];
      }
      var q=parseQuantity(t);
      if(q && q.count<=4) return ['few-photos','Ít, khoảng 1–4 ảnh'];
      if(q && q.count<=8) return ['medium-photos','Vừa, khoảng 5–8 ảnh'];
      if(q && q.count>=9) return ['many-photos','Nhiều, từ 9 ảnh trở lên'];
      if(/it anh/.test(t)) return ['few-photos','Ít, khoảng 1–4 ảnh'];
      if(/nhieu anh|album|love story/.test(t)) return ['many-photos','Nhiều, từ 9 ảnh trở lên'];
    }
    if(key==='motif'){
      if(/trai tim|bao thu|phong bi/.test(t)) return ['hearts','Trái tim và bao thư'];
      if(/^lich$|lich cuoi|lich ngay|calendar/.test(t)) return ['calendar','Lịch cưới'];
      if(/hoa la|hoa tiet hoa|sage|xanh reu|la cay/.test(t)) return ['floral','Hoa lá, xanh sage'];
      if(/tap chi|editorial|duong net/.test(t)) return ['editorial','Bố cục tạp chí'];
      if(/toi gian|it hoa tiet|khong hoa tiet/.test(t)) return ['minimal-motif','Tối giản, ít họa tiết'];
    }
    if(key==='typography'){
      if(/viet tay|bay bong|chu mem|script/.test(t)) return ['script-font','Chữ viết tay mềm mại'];
      if(/serif|co dien|sang trong/.test(t)) return ['serif-font','Chữ serif sang trọng'];
      if(/chu hien dai|de doc|sans/.test(t)) return ['modern-font','Chữ hiện đại, dễ đọc'];
      if(/phoi chu|nhieu kieu chu/.test(t)) return ['mixed-font','Phối nhiều kiểu chữ'];
    }
    if(key==='priority'){
      if(/bao thu|phong bi|mo thiep/.test(t)) return ['envelope','Bao thư và hiệu ứng mở'];
      if(/^lich$|lich cuoi|lich ngay|ngay cuoi|calendar/.test(t)) return ['calendar','Lịch cưới rõ ràng'];
      if(/hai nha|gia dinh|nha trai|nha gai/.test(t)) return ['family','Thông tin hai nhà'];
      if(/love story|chuyen tinh|album|nhieu anh|anh cuoi/.test(t)) return ['story','Love story và album ảnh'];
      if(/gon|de xem|de doc|thong tin/.test(t)) return ['clean','Thông tin gọn, dễ xem'];
    }
    if(key==='effects'){
      if(/(?:hieu ung|chuyen dong).*(?:nhieu|manh)|(?:^|\s)manh(?:\s|$)|an tuong/.test(t)) return ['strong-effects','Nhiều, tạo ấn tượng'];
      if(/(?:hieu ung|chuyen dong).*(?:nhe|it)|(?:^|\s)nhe(?:\s|$)|tinh te/.test(t)) return ['light-effects','Nhẹ, tinh tế'];
      if(/(?:hieu ung|chuyen dong).*(?:vua|sinh dong)|(?:^|\s)vua(?:\s|$)/.test(t)) return ['medium-effects','Vừa đủ sinh động'];
    }
    if(key==='quantity'){
      if(/online|khong in/.test(t)) return ['online-only','Chỉ dùng thiệp online'];
      var parsed=parseQuantity(t);
      if(parsed && parsed.range!=='under-50') return [parsed.range,parsed.count+' bộ'];
    }
    if(/khong biet|chua biet|tuy|linh hoat/.test(t)) return ['flexible','Chưa biết, để AI chọn'];
    return null;
  }

  function answerFreeText(raw){
    var text=normalize(raw);
    var quantity=!/(anh|hinh|photo)/.test(text) && (/(bo|thiep|so luong|dat in|in )/.test(text) || /^\d{2,5}$/.test(text)) ? parseQuantity(text) : null;
    var templateMatch=text.match(/mau\s*0?([1-5])/);

    if(state.surveyActive){
      var key=SURVEY_STEPS[state.surveyIndex];
      var inferred=inferSurveyValue(key,raw);
      if(inferred) return recordSurveyAnswer(key,inferred[0],inferred[1],true);
      return botReply('Tôi chưa xác định được lựa chọn ở bước này. Em chọn một nút bên dưới hoặc mô tả cụ thể hơn nhé.',false,survey[key].options.map(function(option){return {label:option[0],action:'survey-answer',value:key+'|'+option[1]};}),230);
    }

    if(templateMatch) return showTemplateInfo('mau0'+templateMatch[1],true);
    if(/(?:^|\s)(?:xin chao|hello|hi|chao)(?:\s|$)/.test(text)) return botReply('Xin chào 👋 Tôi có thể chọn mẫu theo màu, phong cách, số ảnh, hiệu ứng hoặc số lượng thiệp của em.',false,defaultQuick(),230);
    if(/bao gia|gia thiep|gia bao nhieu|bao nhieu tien|chi phi|don gia|tinh tien|ep kim|dap noi|giay 230|in hai mat|^gia$/.test(text)){
      if(quantity) return botReply('<p>'+escapeHtml(quantityAnswer(quantity))+'</p><small>Chưa gồm phụ thu thiết kế, giấy, in hai mặt, ép kim/dập nổi hoặc khuôn.</small>',true,[{label:'Xem bảng giá đầy đủ',action:'price'},{label:'Tìm mẫu phù hợp',action:'start-survey'}],280);
      return showPrice(true);
    }
    if(quantity) return botReply('<p>'+escapeHtml(quantityAnswer(quantity))+'</p>',true,[{label:'Xem bảng giá đầy đủ',action:'price'},{label:'Chọn mẫu',action:'start-survey'}],260);
    if(/mau hot|mau noi bat|mau pho bien|dang hot/.test(text)) return showPopular(true);
    if(/5 mau|tat ca mau|xem mau|co mau nao/.test(text)) return showAllTemplates(true);
    if(/tinh nang|nhac|ban do|loi chuc|dem nguoc|qr|link|dien thoai/.test(text)) return showFeatures(true);
    if(/so sanh.*mau|khac nhau/.test(text)) return showAllTemplates(true);
    if(/tu van|chon giup|phu hop|nen chon|khong biet chon/.test(text)) return startSurvey(true);

    var earlyInferred={};
    ['style','color','photos','motif','typography','priority','effects'].forEach(function(key){
      var found=inferSurveyValue(key,raw);
      if(found && found[0]!=='flexible') earlyInferred[key]=found[0];
    });
    if(Object.keys(earlyInferred).length>=2){
      var earlyRanked=scoreTemplates(earlyInferred).slice(0,2);
      var earlyHtml='<p>Từ mô tả của em, hai mẫu gần nhất là:</p>'+templateCards(earlyRanked,earlyInferred,true)+'<small>Để chọn chính xác hơn, tôi có thể hỏi thêm 8 câu ngắn.</small>';
      return botReply(earlyHtml,true,[{label:'Hỏi tiếp để chọn chính xác',action:'start-survey'},{label:'Xem đủ 5 mẫu',action:'show-all'}],330);
    }
    if(/mau sac|mau nao|(?:^|\s)hong(?:\s|$)|do ruou|xanh sage|xanh reu|trang kem/.test(text)) return compare('color',true);
    if(/bao nhieu anh|nhieu anh|it anh|album|hinh anh/.test(text)) return compare('photos',true);
    if(/hieu ung|chuyen dong|bi do|lap lai|lag|do/.test(text)) return botReply('Chatbox này chạy trực tiếp trong trình duyệt, không chờ API ngoài nên hạn chế bị đơ. Phần tư vấn có khóa gửi trùng, giới hạn lịch sử và không lặp nguyên câu trả lời liên tiếp. Về mẫu: Mẫu 01 có hiệu ứng nổi bật nhất; Mẫu 02 và 03 nhẹ hơn, tập trung vào thông tin.',false,[{label:'So sánh hiệu ứng',action:'compare-effects'},{label:'Tìm mẫu phù hợp',action:'start-survey'}],280);
    if(/thoi gian|bao lau|may ngay|gap|kip khong/.test(text)) return botReply('<p>Thời gian thiết kế/test thường khoảng 4–5 ngày; thời gian hoàn thiện thực tế tùy số lượng và gia công. Đơn gấp cần kiểm tra lịch sản xuất trước, đặc biệt nếu có ép kim hoặc dập nổi.</p><small>Thời gian ship thường khoảng 2–5 ngày tùy hình thức giao.</small>',true,[{label:'Chọn mẫu trước',action:'start-survey'},{label:'Gửi yêu cầu',action:'template-info',value:state.currentTemplate}],280);
    if(/file goc|file mem|vector|corel|ai file/.test(text)) return botReply('Nhà Yến hỗ trợ ảnh xem mẫu hoặc ảnh chất lượng cao theo chính sách đơn hàng; không gửi file vector/file mềm thiết kế. Nội dung và ảnh của từng đơn vẫn được chỉnh trực tiếp trong hệ thống.',false,[{label:'Tính năng thiệp online',action:'features'},{label:'Chọn mẫu',action:'start-survey'}],260);
    if(/doi mau|doi font|doi chu|chinh sua|sua mau|hoa tiet/.test(text)) return botReply('Có thể đổi màu, font, nội dung, ảnh và điều chỉnh bố cục trong phạm vi mẫu. Nếu thay đổi sáng tạo hoặc bố cục trên 50%, có thể tính phí thiết kế riêng. Màu trên màn hình và màu in thực tế có thể chênh nhẹ.',false,[{label:'So sánh theo màu',action:'compare-color'},{label:'Tìm mẫu phù hợp',action:'start-survey'}],290);
    if(/in them|in du|bo sung so luong/.test(text)) return botReply('Nên chốt và in dư ngay từ đầu. Khi in bổ sung, giá có thể phải tính lại theo số lượng mới và số lượng in thêm tối thiểu thường là 50 bộ.',false,[{label:'Hỏi giá',action:'price'},{label:'Tìm mẫu',action:'start-survey'}],270);
    if(/coc|zalo|lien he|dat mau|gui yeu cau|designer/.test(text)){
      var current=templates.find(function(item){return item.code===state.currentTemplate;});
      if(!current) return botReply('<p>Em chọn một mẫu trước, sau đó bấm <strong>Chọn mẫu này</strong> để gửi mã đơn, Zalo, tên cô dâu–chú rể, ngày cưới, địa chỉ, ảnh/nhạc và ghi chú cho Designer.</p>'+templateCards(templates,{},false),true,[{label:'Để AI chọn giúp',action:'start-survey'},{label:'Hỏi giá',action:'price'}],320);
      var html='<p>Em có thể bấm <strong>Chọn mẫu này</strong> để gửi thông tin đơn. Designer sẽ nhận mã đơn, Zalo, tên cô dâu–chú rể, ngày cưới, địa chỉ, ảnh/nhạc và ghi chú.</p>'+templateCards([current],{},false);
      return botReply(html,true,[{label:'Xem đủ 5 mẫu',action:'show-all'},{label:'Hỏi giá',action:'price'}],300);
    }

    var inferredAnswers={};
    ['style','color','photos','motif','typography','priority','effects'].forEach(function(key){
      var found=inferSurveyValue(key,raw);
      if(found && found[0]!=='flexible') inferredAnswers[key]=found[0];
    });
    if(Object.keys(inferredAnswers).length){
      var ranked=scoreTemplates(inferredAnswers).slice(0,2);
      var html='<p>Từ mô tả của em, hai mẫu gần nhất là:</p>'+templateCards(ranked,inferredAnswers,true)+'<small>Để chọn chính xác hơn, tôi có thể hỏi thêm 8 câu ngắn.</small>';
      return botReply(html,true,[{label:'Hỏi tiếp để chọn chính xác',action:'start-survey'},{label:'Xem đủ 5 mẫu',action:'show-all'}],330);
    }

    return botReply('Tôi chưa hiểu đủ ý. Em có thể nói theo dạng: “muốn màu hồng, nhiều ảnh, hiệu ứng nhẹ”, “300 bộ giá bao nhiêu”, hoặc chọn một mục bên dưới.',false,defaultQuick(),260);
  }

  function submitUser(raw){
    var value=String(raw || '').trim();
    if(!value || state.busy) return;
    var now=Date.now();
    if(value===state.lastUser && now-state.lastUserAt<1400) return;
    state.lastUser=value;
    state.lastUserAt=now;
    inputEl.value='';
    inputEl.style.height='auto';
    sendEl.disabled=true;
    addMessage('user',value,false);
    answerFreeText(value);
  }

  function boot(){
    loadState();
    buildRoot();
    bindEvents();
    renderHistory();
    updateProgress();
    if(state.surveyActive){
      var resumeKey=SURVEY_STEPS[state.surveyIndex];
      var resume=survey[resumeKey];
      setQuick(resume ? resume.options.map(function(option){return {label:option[0],action:'survey-answer',value:resumeKey+'|'+option[1]};}) : defaultQuick());
    }else{
      setQuick(state.messages.length ? defaultQuick() : []);
    }
    sendEl.disabled=true;
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
