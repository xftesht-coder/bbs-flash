/* Android-only connection guidance. Capability detection does not authorize motor writes. */
document.addEventListener('DOMContentLoaded',()=>{
  const native=window.BBSNative,panel=document.getElementById('panel-connection');
  if(!native||!panel)return;
  const section=document.createElement('details');section.className='card android-history';section.id='androidCompatibility';
  const add=(tag,text,parent=section)=>{const node=document.createElement(tag);node.textContent=text;parent.append(node);return node;};
  add('summary','Телефон, кабель и совместимость');
  add('p','Android 8 и новее, поддержка USB Host/OTG, актуальный Android System WebView и кабель программирования Bafang UART. Интернет для настройки не нужен.');
  const status=add('p',''),refresh=add('button','Проверить телефон');status.setAttribute('role','status');
  const steps=add('ol','');
  for(const text of [
    'Подключи USB-C OTG-переходник и USB-UART кабель. На некоторых iQOO, vivo, OPPO и OnePlus включи OTG в настройках телефона.',
    'Включи питание мотора. Нажми «Подключить», выбери адаптер и разреши Android доступ к USB.',
    'Считай все блоки и сохрани резервную копию. Выбор профиля сам по себе ничего не записывает.',
    'Во время записи держи приложение открытым и не отсоединяй кабель. Дождись подтверждения повторным чтением.'
  ])add('li',text,steps);
  add('p','Драйверы: FTDI, CP210x, CH34x, PL2303, CDC. CAN и Bluetooth не поддерживаются. Наличие USB-C само по себе не подтверждает OTG или совместимость кабеля.');
  add('p','Запись разрешена только для проверенной конфигурации BBS02: HZXT SZZ9, HW 1.1, FW 2.0.1.1, 48 В, предел контроллера 25 А. Для других контроллеров приложение не обещает запись.');
  const privacy=add('details','');add('summary','Конфиденциальность и данные',privacy);
  add('p','BBS Flash Android 0.3.0-rc1. Разработчик проекта: xftesht-coder (BBS Flash). Приложение не отправляет данные разработчику: нет рекламы, аналитических SDK, онлайн-входа, платежей и работающей отправки Telegram.',privacy);
  add('p','Настройки, резервные копии и гараж хранятся внутри приложения. История хранит до 100 подключений за 90 дней, до 200 последних событий каждого: время, USB-адаптер, этапы и ошибки. Сырые UART-пакеты видны в журнале текущего сеанса и экспортируются отдельно по твоей команде.',privacy);
  add('p','Историю можно удалить её кнопкой очистки. Все локальные данные удаляются очисткой хранилища в настройках Android или удалением приложения. Это также удалит резервные копии внутри приложения. Экспортированные файлы хранятся в выбранной тобой папке: удали их отдельно. Автоматической облачной копии нет.',privacy);
  add('p','При экспорте ты сам выбираешь место хранения; при выборе облачного диска файл обрабатывает его провайдер. Внешние ссылки открываются в браузере и подчиняются правилам соответствующего сайта. Не публикуй файлы с личными данными в открытых обсуждениях.',privacy);
  const support=add('a','Поддержка и вопросы о данных',privacy);support.href='https://github.com/xftesht-coder/bbs-flash/issues';
  add('p','Независимый проект, не официальное приложение Bafang. Благодарности: BafangConfigTool / Stefan Penov (Penoff); usb-serial-for-android (MIT); AndroidX (Apache 2.0); Russo One (OFL). Уведомления об авторстве включены в приложение.',privacy);
  const locked=()=>refresh.disabled=native.busy;
  async function inspect(){refresh.disabled=true;try{const info=await native.compatibility();status.textContent=`Приложение ${info.appVersion} · Android API ${info.androidApi} · WebView ${info.webView}. USB Host: ${info.usbHost?'поддерживается':'не поддерживается'}. Видимых USB-устройств: ${info.usbDevices}. Это проверка телефона, а не подтверждение совместимости мотора.`;}catch(e){status.textContent=e.message;}finally{locked();}}
  refresh.onclick=inspect;section.addEventListener('toggle',()=>{if(section.open)inspect();});
  document.addEventListener('bbs-native-busy',locked);panel.append(section);
  const header=document.getElementById('accessDemo');
  if(header){header.replaceChildren();const button=add('button',`Android ${native.version}`,header);button.onclick=()=>{document.querySelector('[data-panel="connection"]')?.click();section.open=true;section.scrollIntoView({block:'start',behavior:'smooth'});};}
});
