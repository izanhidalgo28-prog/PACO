(function(){
  var INFO = window.ChatbotClinica || {};
  var API = (window.ChatbotClinica && window.ChatbotClinica.apiUrl) || 'https://https://paco-k3ql08ouq-izanhidalgo28-1644s-projects.vercel.app/api/chat';

  var css = '#cb-bubble{position:fixed;bottom:28px;right:28px;width:60px;height:60px;border-radius:50%;background:#185FA5;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(24,95,165,.5);z-index:9999}#cb-bubble svg{width:28px;height:28px;fill:white}#cb-box{position:fixed;bottom:100px;right:28px;width:340px;height:500px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.2);z-index:9998;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,sans-serif}#cb-box.open{display:flex}#cb-head{background:#185FA5;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}.h-info .nm{color:#fff;font-size:14px;font-weight:600;margin:0}.h-info .st{color:rgba(255,255,255,.75);font-size:11px;margin:2px 0 0}#cb-close{margin-left:auto;background:none;border:none;color:#fff;font-size:24px;cursor:pointer}#cb-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f5f7ff}.msg{max-width:83%;display:flex;flex-direction:column;gap:2px}.msg.b{align-self:flex-start}.msg.u{align-self:flex-end}.bbl{padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.5}.msg.b .bbl{background:#fff;border:1px solid #e0e8f5;color:#1a1a1a;border-bottom-left-radius:3px}.msg.u .bbl{background:#185FA5;color:#fff;border-bottom-right-radius:3px}.tm{font-size:10px;color:#aab;padding:0 3px}.msg.b .tm{align-self:flex-start}.msg.u .tm{align-self:flex-end}#cb-qr{padding:8px 12px 5px;display:flex;flex-wrap:wrap;gap:5px;background:#fff;border-top:1px solid #eef;flex-shrink:0}.qb{background:none;border:1.5px solid #185FA5;color:#185FA5;border-radius:20px;padding:5px 11px;font-size:12px;cursor:pointer}#cb-form{display:flex;gap:8px;padding:10px 12px;background:#fff;border-top:1px solid #eef;flex-shrink:0}#cb-input{flex:1;border:1.5px solid #dde3f0;border-radius:20px;padding:8px 14px;font-size:13px;outline:none}#cb-input:focus{border-color:#185FA5}#cb-send{background:#185FA5;color:#fff;border:none;border-radius:50%;width:38px;height:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}.dot{width:6px;height:6px;border-radius:50%;background:#bbb;animation:dt 1.2s infinite;display:inline-block;margin:0 2px}.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}@keyframes dt{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}';

  var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);

  document.body.insertAdjacentHTML('beforeend',
    '<div id="cb-bubble"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div>'+
    '<div id="cb-box">'+
      '<div id="cb-head"><div class="h-info"><p class="nm">'+(INFO.nombre||'Asistente')+'</p><p class="st">En línea · responde al instante</p></div><button id="cb-close">&times;</button></div>'+
      '<div id="cb-msgs"></div>'+
      '<div id="cb-qr"></div>'+
      '<div id="cb-form"><input id="cb-input" type="text" placeholder="Escribe tu mensaje..."/><button id="cb-send"><svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button></div>'+
    '</div>'
  );

  var QR=['Agendar una cita','Ver especialidades','Horarios y costos','Hablar con alguien'];
  var chatHistory=[],busy=false,started=false;

  function now(){return new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}
  function addMsg(txt,who){var m=document.getElementById('cb-msgs'),d=document.createElement('div');d.className='msg '+who;d.innerHTML='<div class="bbl">'+txt+'</div><span class="tm">'+now()+'</span>';m.appendChild(d);m.scrollTop=m.scrollHeight;}
  function showTyping(){var m=document.getElementById('cb-msgs'),d=document.createElement('div');d.className='msg b';d.id='cb-ty';d.innerHTML='<div class="bbl"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';m.appendChild(d);m.scrollTop=m.scrollHeight;}
  function hideTyping(){var e=document.getElementById('cb-ty');if(e)e.remove();}
  function setQR(){var q=document.getElementById('cb-qr');q.innerHTML='';QR.forEach(function(r){var b=document.createElement('button');b.className='qb';b.textContent=r;b.onclick=function(){doSend(r)};q.appendChild(b);});}

  async function doSend(txt){
    if(busy||!txt.trim())return;
    busy=true;
    document.getElementById('cb-qr').innerHTML='';
    addMsg(txt,'u');
    chatHistory.push({role:'user',content:txt});
    showTyping();
    try{
      var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:chatHistory,clinicInfo:INFO})});
      var d=await r.json();
      hideTyping();
      var reply=d.reply||'Lo siento, hubo un error.';
      addMsg(reply,'b');
      chatHistory.push({role:'assistant',content:reply});
    }catch(e){hideTyping();addMsg('Error de conexión. Intenta de nuevo.','b');}
    busy=false;
  }

  document.getElementById('cb-bubble').onclick=function(){
    var box=document.getElementById('cb-box');
    if(box.classList.contains('open')){box.classList.remove('open');}
    else{box.classList.add('open');if(!started){started=true;addMsg('Hola, bienvenido a '+(INFO.nombre||'nuestra clínica')+'. Soy tu asistente virtual. ¿En qué te puedo ayudar?','b');setQR();}}
  };
  document.getElementById('cb-close').onclick=function(e){e.stopPropagation();document.getElementById('cb-box').classList.remove('open');};
  document.getElementById('cb-send').onclick=function(){var v=document.getElementById('cb-input').value.trim();if(v){doSend(v);document.getElementById('cb-input').value='';}};
  document.getElementById('cb-input').onkeydown=function(e){if(e.key==='Enter'){var v=e.target.value.trim();if(v){doSend(v);e.target.value='';}}}; 
})();
