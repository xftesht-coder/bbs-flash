/* Descriptor-only inspection. No open/claim/transfer, UART or motor commands. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const words={
    language:["Язык","Language"], title:["Проверка USB-кабеля","USB cable check"],
    intro:["Первый шаг для Android + OTG. Эта страница определяет USB-кабель; она не настраивает мотор.","First step for Android + OTG. This page identifies a USB cable; it does not configure the motor."],
    step1:["Открой эту страницу в Chrome на телефоне.","Open this page in Chrome on your phone."],
    step2:["Подключи USB-кабель программирования к телефону через OTG. Мотор подключать не нужно.","Connect your USB programming cable to the phone using OTG. The motor does not need to be connected."],
    step3:["Нажми кнопку ниже, выбери свой кабель и разреши браузеру доступ.","Tap the button below, choose your cable and grant the browser access."],
    inspect:["Определить USB-кабель","Identify USB cable"],
    available:["WebUSB доступен. Нажми кнопку, чтобы выбрать кабель.","WebUSB is available. Tap the button to choose your cable."],
    unavailable:["WebUSB недоступен. Открой HTTPS-ссылку в Chrome на Android. Подключение через этот браузер пока не подтверждено.","WebUSB is unavailable. Open the HTTPS link in Chrome on Android. Connection through this browser is not confirmed."],
    waiting:["Выбери кабель в окне браузера…","Choose your cable in the browser dialog…"],
    found:["Идентификатор получен. Мотор не считывался и не изменялся.","Identifier received. The motor was neither read nor modified."],
    cancelled:["Выбор отменён или устройство не выбрано.","Selection cancelled or no device selected."],
    denied:["Доступ не разрешён. Проверь разрешения USB и попробуй снова.","Access denied. Check USB permissions and try again."],
    failed:["Не удалось получить данные кабеля. Проверь OTG и повтори выбор.","Unable to obtain cable information. Check OTG and select it again."],
    removed:["Выбранный кабель отключён. Ниже сохранён его идентификатор; для повторной проверки подключи кабель снова.","The selected cable was disconnected. Its identifier remains below; reconnect it to check again."],
    resultTitle:["Данные для подключения","Connection details"],
    reportLabel:["Скопируй этот текст и пришли в чат","Copy this text and send it in the chat"],
    selectReport:["Выделить текст","Select text"],
    resultHelp:["VID/PID помогут выбрать драйвер. Обнаружение кабеля ещё не подтверждает возможность чтения и записи мотора.","VID/PID help select a driver. Detecting the cable does not yet confirm motor reading or writing."],
    trouble:["Кабеля нет в списке?","Cable missing from the list?"],
    troubleHelp:["Проверь OTG в настройках телефона, адаптер с передачей данных и разъёмы. Закрой приложения, которые используют USB. Если список пуст, сообщи об этом вместе с моделью телефона и версией браузера.","Check your phone's OTG setting, a data-capable adapter and the connections. Close apps using USB. If the list is empty, report this with your phone model and browser version."],
    privacy:["Страница не открывает UART, не отправляет команды кабелю и не загружает данные на сервер. Серийный номер USB не собирается. Наличие WebUSB — не подтверждение поддержки конкретного кабеля.","This page does not open UART, send cable commands or upload data. The USB serial number is not collected. WebUSB availability does not confirm support for a particular cable."],
  };
  const usb=navigator.usb, available=isSecureContext && typeof usb?.requestDevice === "function";
  let busy=false,status="",selected=null;
  const t=k=>words[k][$("language").value==="en"?1:0];
  function render(){
    document.documentElement.lang=$("language").value;
    document.title="BBS Flash · "+t("title");
    document.querySelectorAll("[data-text]").forEach(n=>n.textContent=t(n.dataset.text));
    $("capability").textContent=t(available?"available":"unavailable");
    $("status").textContent=status?t(status):"";
    $("inspect").disabled=!available||busy;
  }
  $("language").addEventListener("change",render);
  $("selectReport").addEventListener("click",()=>{$("report").focus();$("report").select();});
  $("inspect").addEventListener("click",async()=>{
    if(!available||busy)return;
    busy=true;status="waiting";selected=null;$("report").value="";$("result").hidden=true;render();
    try{
      const device=await usb.requestDevice({filters:[]});
      const hex=n=>Number.isInteger(n)&&n>=0&&n<=65535?n.toString(16).padStart(4,"0").toUpperCase():"unknown";
      const text=s=>String(s||"—").replace(/[\r\n\x00-\x1F\x7F]/g," ").slice(0,120);
      $("report").value=["BBS Flash USB check 1",`VID: ${hex(device.vendorId)}`,`PID: ${hex(device.productId)}`,`Product: ${text(device.productName)}`,`Manufacturer: ${text(device.manufacturerName)}`,`WebUSB: available`,`Web Serial API: ${typeof navigator.serial?.requestPort==="function"?"available":"unavailable"}`].join("\n");
      selected=device;status="found";$("result").hidden=false;
    }catch(e){status=e.name==="NotFoundError"?"cancelled":["SecurityError","NotAllowedError"].includes(e.name)?"denied":"failed";}
    finally{busy=false;render();}
  });
  usb?.addEventListener("disconnect",event=>{if(event.device===selected){status="removed";render();}});
  render();
})();
