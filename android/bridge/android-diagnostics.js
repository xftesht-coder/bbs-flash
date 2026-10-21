/* Local connection history, explicit opt-in upload. No Telegram credentials in the app. */
document.addEventListener('DOMContentLoaded',()=>{
  if(!window.BBSNative || !document.getElementById('panel-connection'))return;
  const N=BBSNative,section=document.createElement('details');section.className='card android-history';section.id='androidHistory';
  const make=(tag,text,parent=section)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;};
  const summary=make('summary','История подключений');
  const privacy=make('p','На телефоне хранятся последние 100 подключений за 90 дней: дата, USB-адаптер, этапы и ошибки. Без серийного номера мотора, сырых UART-пакетов, email и геолокации.');
  const status=make('p',''),stats=make('p','');status.setAttribute('role','status');
  const actions=make('div','');actions.className='android-history-actions';
  const refresh=make('button','Обновить',actions),exportButton=make('button','Сохранить историю JSON',actions),clear=make('button','Очистить на телефоне',actions);
  const list=make('ol','');list.className='android-history-list';
  make('p','Telegram пока не подключён. История сохраняется только на телефоне; отправка в этой версии отключена.');
  const settings=make('details',''),settingsTitle=make('summary','Передача диагностики',settings);settings.hidden=true;
  const explanation=make('p','Сначала настрой серверный приёмник. Токен Telegram-бота сюда вводить не нужно. Отчёты сохраняются на сервере, бот получает краткую сводку. Удаление истории на телефоне не удаляет уже отправленные отчёты.',settings);
  function input(label,type){const box=make('label',label,settings),field=make('input','',box);field.type=type;field.autocomplete='off';return field;}
  const endpoint=input('HTTPS-адрес приёмника','url');endpoint.placeholder='https://example.ru/diagnostics/v1/session';
  const access=input('Код доступа к диагностике (не токен бота)','password');access.maxLength=128;
  const consentLabel=make('label','',settings),consent=make('input','',consentLabel);consent.type='checkbox';
  const consentText=make('span','Разрешаю отправлять сохранённую историю подключений на указанный сервер и краткие отчёты владельцу BBS Flash в Telegram. Автоматически — после отключения от мотора или при следующем открытии приложения.',consentLabel);
  const save=make('button','Сохранить настройки передачи',settings),send=make('button','Отправить новые отчёты',settings);
  let snapshot={sessions:[]},working=false,loaded=false;
  const labels={connecting:'Подключение',not_found:'Кабель не найден',connected:'Мотор определён',readDone:'Все блоки прочитаны и проверены',written:'Запись проверена чтением',partial:'Запись не подтверждена',usb_error:'Ошибка USB',interrupted:'Приложение было прервано',permission_or_selection_cancelled:'Выбор или разрешение отменены',UNEXPECTED_BLOCK:'Неверное начало UART-ответа',FRAME:'Неполный или неверный пакет',WRITE_IO:'Ошибка передачи',CHECKSUM:'Ошибка контрольной суммы',VERIFY:'Ошибка проверки',TIMEOUT:'Нет ответа',STORAGE:'Ошибка хранилища',read_command:'Запрос чтения',write_command:'Команда записи',DISCONNECTED:'Соединение потеряно',DEVICE:'Контроллер не поддерживается',UNSTABLE_READ:'Данные чтения различаются',invalid:'Настройки не прошли проверку',disconnected:'Отключение',cancelled:'Отменено',noChanges:'Изменений нет'};
  function state(row){const events=row.events||[];return [...events].reverse().find(e=>!['disconnected','read_command','write_command','connecting'].includes(e.type))?.type || (row.endedAt?'disconnected':'connecting');}
  function controls(){const locked=N.busy||working;exportButton.disabled=locked;clear.disabled=locked||N.connected;save.disabled=locked;send.disabled=locked||N.connected||!snapshot.consent;refresh.disabled=working;}
  async function load(){
    snapshot=await N.history();loaded=true;list.replaceChildren();
    if(document.activeElement!==endpoint)endpoint.value=snapshot.endpoint||'';
    consent.checked=!!snapshot.consent;access.placeholder=snapshot.configured?'Код уже сохранён; оставь пустым, чтобы сохранить его':'';
    const rows=snapshot.sessions||[],verified=rows.filter(r=>(r.events||[]).some(e=>e.type==='written')).length,unsent=rows.filter(r=>r.endedAt&&!r.sentAt).length;
    stats.textContent=`Подключений: ${rows.length} · с проверенной записью: ${verified} · не отправлено: ${unsent}`;
    if(snapshot.error)status.textContent=snapshot.error;
    for(const row of [...rows].reverse()){
      const item=make('li','',list),details=make('details','',item),title=make('summary','',details);
      title.textContent=`${new Date(row.startedAt).toLocaleString('ru-RU')} — ${labels[state(row)]||state(row)}${row.sentAt?' · отправлено':''}`;
      make('p',`Отчёт ${row.id} · Android API ${row.androidApi} · приложение ${row.appVersion}`,details);
      if(row.usb)make('p',`${row.usb.driver} · ${row.usb.vendorId.toString(16)}:${row.usb.productId.toString(16)}`,details);
      if(row.eventsTruncated)make('p','Показаны последние 200 событий этого подключения.',details);
      const events=make('ol','',details);
      for(const event of row.events||[]){
        const block={81:'Контроллер',82:'Основные',83:'Помощь педалей',84:'Ручка газа'}[event.block];
        make('li',`${new Date(event.at).toLocaleTimeString('ru-RU')} · ${labels[event.type]||event.type}${event.code?' · '+({closed:'закрыто',background:'приложение свёрнуто',IO:'ошибка ввода-вывода',not_found:'кабель не найден',cancelled:'отменено'}[event.code]||event.code):''}${event.block?' · '+(block||'Блок')+' (0x'+event.block.toString(16)+')':''}`,events);
      }
    }
    if(!rows.length)make('li','Подключений пока нет. Здесь появятся и неудачные попытки.',list);
    controls();
  }
  async function run(fn){if(working)return;working=true;controls();try{await fn();}catch(e){status.textContent=e.message;}finally{working=false;controls();}}
  refresh.onclick=()=>run(load);
  section.addEventListener('toggle',()=>{if(section.open)run(load);});
  exportButton.onclick=()=>run(async()=>{if(N.busy)throw Error('Дождись завершения обмена');const data=await N.history();const blob=new Blob([JSON.stringify({schema:1,sessions:data.sessions},null,2)],{type:'application/json'});const a=document.createElement('a');a.download='bbs-connections.json';a.href=URL.createObjectURL(blob);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);status.textContent='Открыто сохранение истории. После проводника потребуется новое подключение к мотору.';});
  clear.onclick=()=>run(async()=>{if(confirm('Удалить локальную историю подключений? Резервные копии настроек мотора останутся. Отправленные отчёты на сервере сохранятся.')){await N.clearHistory();status.textContent='История на телефоне очищена.';await load();}});
  save.onclick=()=>run(async()=>{await N.configureDiagnostics({endpoint:endpoint.value,access:access.value,consent:consent.checked});access.value='';status.textContent=consent.checked?'Передача разрешена. Отправка завершённых подключений выполняется после отключения или при следующем открытии приложения.':'Передача выключена. История остаётся на телефоне.';await load();});
  send.onclick=()=>run(async()=>{const result=await N.sendDiagnostics();status.textContent=`Сервер подтвердил отчётов: ${result.sent}. Доставка уведомлений Telegram обрабатывается отдельно.`;await load();});
  document.getElementById('panel-connection').append(section);
  document.addEventListener('bbs-native-busy',controls);
});
