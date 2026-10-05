/* Account UI. Local bike card and email identity are distinct from motor settings. */
globalThis.BBSAccount = (() => {
  "use strict";
  const S = globalThis.BBSStore, M = globalThis.BBSAccountModel;
  const root = document.getElementById("accessDemo");
  if (!root || !S || !M) return {sync(){}};
  const words = {
    account:["Кабинет","Account"], title:["Личный кабинет","Your account"], close:["Закрыть","Close"],
    intro:["Велосипед, настройки и доступ — в одном месте.","Your bike, saved settings and access in one place."],
    overview:["Обзор","Overview"], bike:["Мой велосипед","My bike"], library:["Мои настройки","My settings"], purchases:["Покупки","Purchases"],
    local:["На этом устройстве","On this device"], signedIn:["Вход выполнен","Signed in"], guest:["Твой гараж готов","Your garage is ready"],
    localNote:["Карточка и файлы хранятся в этом браузере. На другом устройстве они автоматически не появятся.","The bike card and files are saved in this browser. They do not automatically appear on other devices."],
    cloudNote:["Карточка велосипеда сохранена в аккаунте. Профили мотора и резервные копии остаются в этом браузере.","Your bike card is saved in your account. Motor profiles and backups remain in this browser."],
    access:["Мой доступ","My access"], lifetime:["Бессрочный","Lifetime"], demo:["ДЕМО","DEMO"], active:["Активен","Active"], noPurchase:["Не куплен","Not purchased"],
    accessNote:["Одна покупка для одного пользователя. Без автопродления.","One purchase per user. No automatic renewal."],
    profiles:["Сохранённые профили","Saved profiles"], backups:["Резервные копии","Backups"], noBike:["Добавь свой велосипед","Add your bike"], editBike:["Заполнить карточку","Edit bike card"],
    loginTitle:["Вход по e-mail","Sign in with email"], loginNote:["Пришлём одноразовый код. Пароль придумывать не нужно.","We will send a one-time code. No password needed."],
    unavailable:["Вход по e-mail готовится к запуску. Пока можно сохранить карточку на этом устройстве.","Email sign-in is being prepared. You can save a bike card on this device for now."],
    email:["E-mail","Email"], consent:["Согласен с обработкой данных по политике конфиденциальности","I agree to data processing under the privacy policy"], privacy:["Политика конфиденциальности","Privacy policy"],
    send:["Получить код","Send code"], code:["Код из письма","Email code"], codeNote:["Введи 6 цифр из письма. Код действует 10 минут.","Enter the 6 digits from the email. The code is valid for 10 minutes."], verify:["Войти","Sign in"], changeEmail:["Другой e-mail / новый код","Another email / new code"], logout:["Выйти","Sign out"],
    name:["Как к тебе обращаться","Your name"], bikeName:["Велосипед","Bike"], motor:["Мотор","Motor"], scope:["Кабинет BBS02 750 Вт","BBS02 750 W account"],
    voltage:["Аккумулятор, В","Battery, V"], capacity:["Ёмкость, А·ч","Capacity, Ah"], battery:["Модель аккумулятора / ячейки","Battery model / cells"], chainring:["Передняя звезда, зубьев","Chainring, teeth"], display:["Дисплей","Display"],
    cardNote:["Это справочная карточка. Её сохранение не меняет настройки мотора или расчёт поездки.","This is a reference card. Saving it does not change motor settings or ride estimates."],
    save:["Сохранить карточку","Save bike card"], saved:["Карточка сохранена.","Bike card saved."], saving:["Сохраняем…","Saving…"], useLocal:["Взять карточку с этого устройства","Use the card from this device"],
    localFiles:["Файлы этого браузера","Files in this browser"], filesNote:["Черновик профиля — не подтверждение записи в мотор. Здесь показаны только сохранённые файлы.","A saved draft does not confirm a motor write. This list shows saved files only."],
    emptyProfiles:["Пока нет сохранённых профилей. Выбери характер поездки и сохрани черновик в «Мой гараж».","No saved profiles yet. Choose a ride profile and save a draft in My garage."],
    emptyBackups:["Копии появятся после подключения и проверенного чтения мотора.","Backups appear after connecting and completing a verified motor read."],
    openGarage:["Открыть гараж профилей","Open profile garage"], export:["Скачать мои данные","Download my data"], exported:["Архив скачан: карточка, профили и копии этого браузера.","Archive downloaded: bike card, profiles and backups from this browser."],
    purchaseTitle:["Один раз — и в твоём гараже","One purchase for your garage"], purchaseNote:["Готовим персональный бессрочный доступ по e-mail. Покупка будет привязана к пользователю, а не к велосипеду.","We are preparing personal lifetime access by email. The purchase will belong to the user, not the bike."],
    price:["Ориентир цены","Planned price"], priceValue:["299–499 ₽","RUB 299–499"], priceNote:["Цена и состав доступа пока не утверждены. Продажи ещё не открыты.","The final price and included features are not confirmed. Sales have not opened yet."],
    demoNotice:["Бессрочный демодоступ — пример будущего кабинета. Он не означает, что покупка оформлена.","Lifetime demo access previews the future account. It does not mean a purchase has been made."],
    payment:["Оплатить","Pay"], orders:["История покупок","Purchase history"], emptyOrders:["Покупок пока нет","No purchases yet"], emptyOrdersNote:["После запуска здесь появятся сумма, дата и статус оплаты.","Once sales launch, payment amounts, dates and statuses will appear here."],
    refresh:["Обновить кабинет","Refresh account"], storageError:["Хранилище браузера недоступно. Сохранение и экспорт локальных данных отключены.","Browser storage is unavailable. Saving and exporting local data are disabled."],
    serviceError:["Сервер кабинета недоступен. Обнови кабинет, чтобы проверить вход и данные.","The account server is unavailable. Refresh the account to check your session and data."],
    error:["Не удалось выполнить действие. Попробуй ещё раз.","The action failed. Please try again."],
    CODE:["Код неверный, истёк или уже использован. Запроси новый.","The code is incorrect, expired or already used. Request a new code."],
    RATE_LIMIT:["Слишком много попыток. Подожди перед следующим запросом.","Too many attempts. Wait before trying again."],
    MAIL_UNAVAILABLE:["Не удалось отправить письмо. Попробуй позже.","The email could not be sent. Try again later."],
    CONFLICT:["Карточка изменена в другом окне. Обнови кабинет перед сохранением.","The card changed in another window. Refresh the account before saving."],
    SESSION:["Сеанс истёк. Войди снова перед сохранением.","Your session expired. Sign in again before saving."],
    PROFILE:["Проверь поля карточки и допустимые значения.","Check the bike card fields and allowed values."],
    pending:["Ожидает оплаты","Pending"], succeeded:["Оплачен","Paid"], canceled:["Отменён","Canceled"], refunded:["Возвращён","Refunded"],
  };
  let lang = document.documentElement.lang, localCard = M.empty(), card = M.empty(), storage = false, busy = false;
  let remote = null, failed = false, tab = "overview", challenge = null, profiles = [], backups = [];
  let api = null;
  const configured = document.querySelector('meta[name="bbs-account-api"]')?.content;
  if (configured) { const url = new URL(configured, location.href); if (url.origin === location.origin && url.pathname === "/api/") api = url; }
  const t = key => words[key]?.[lang === "en" ? 1 : 0] || key;
  const open = document.createElement("button"); open.id = "openAccount"; open.type = "button"; open.className = "account-open";
  open.dataset.editable = "true"; open.dataset.a = "account"; open.setAttribute("aria-haspopup","dialog"); open.setAttribute("aria-controls","accountDialog");
  root.prepend(open);
  const dialog = document.createElement("dialog"); dialog.id = "accountDialog"; dialog.setAttribute("aria-labelledby","accountTitle");
  dialog.innerHTML = `
    <div class="account-heading"><div><p class="eyebrow">BBS // PERSONAL</p><h2 id="accountTitle" data-a="title"></h2><p class="muted" data-a="intro"></p></div><button id="accountClose" type="button" data-a="close"></button></div>
    <div class="account-layout"><nav class="account-nav" role="tablist" aria-label="Account">
      ${["overview","bike","library","purchases"].map((key,i)=>`<button type="button" role="tab" id="accountTab-${key}" aria-controls="accountPanel-${key}" data-account-tab="${key}"><span aria-hidden="true">0${i+1}</span><span data-a="${key}"></span></button>`).join("")}
    </nav><div class="account-content">
    <p id="accountMessage" role="status" aria-live="polite"></p>
    <section id="accountPanel-overview" role="tabpanel" aria-labelledby="accountTab-overview">
      <div class="account-identity"><span class="account-avatar" aria-hidden="true">B</span><div><span id="accountIdentityBadge" class="demo-flag"></span><h3 id="accountGreeting"></h3><p id="accountEmail" class="muted"></p></div></div>
      <p id="accountLocation" class="muted"></p>
      <div class="account-stats"><div><small data-a="access"></small><strong id="accountAccess"></strong><span id="accountAccessMode" class="demo-flag"></span></div><div><small data-a="profiles"></small><strong id="accountProfileCount">0</strong></div><div><small data-a="backups"></small><strong id="accountBackupCount">0</strong></div></div>
      <div class="account-bike-summary"><div><small data-a="bike"></small><h3 id="accountBikeSummary"></h3><p>BBS02 · 750 W</p></div><button type="button" id="accountEditBike" data-a="editBike"></button></div>
      <div class="account-signin"><h3 data-a="loginTitle"></h3><p id="accountAuthUnavailable" class="muted" data-a="unavailable"></p>
        <form id="accountLogin" hidden><p class="muted" data-a="loginNote"></p><label for="accountEmailInput" data-a="email"></label><input id="accountEmailInput" type="email" maxlength="254" autocomplete="email" required placeholder="you@example.com" />
          <label class="account-consent"><input id="accountConsent" type="checkbox" required /><span data-a="consent"></span></label><a id="accountPrivacy" data-a="privacy" target="_blank" rel="noopener"></a><button class="primary" type="submit" data-a="send"></button></form>
        <form id="accountCodeForm" hidden><p class="muted" data-a="codeNote"></p><label for="accountCode" data-a="code"></label><input id="accountCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required /><div class="account-actions"><button class="primary" type="submit" data-a="verify"></button><button id="accountChangeEmail" type="button" data-a="changeEmail"></button></div></form>
        <button type="button" id="accountLogout" data-a="logout" hidden></button>
      </div>
    </section>
    <section id="accountPanel-bike" role="tabpanel" aria-labelledby="accountTab-bike" hidden><h3 data-a="bike"></h3><p class="muted" data-a="cardNote"></p>
      <form id="accountBikeForm"><div class="account-fields">
        <label><span data-a="name"></span><input id="account-name" maxlength="60" autocomplete="nickname" placeholder="Антон / Anton" /></label>
        <label><span data-a="bikeName"></span><input id="account-bike" maxlength="100" placeholder="Trek Roscoe 8" /></label>
        <label><span data-a="voltage"></span><input id="account-voltage" type="number" min="24" max="60" step="0.1" placeholder="48" /></label>
        <label><span data-a="capacity"></span><input id="account-capacity" type="number" min="1" max="100" step="0.1" placeholder="19.2" /></label>
        <label><span data-a="battery"></span><input id="account-battery" maxlength="100" placeholder="LG Cells" /></label>
        <label><span data-a="chainring"></span><input id="account-chainring" type="number" min="20" max="60" step="1" placeholder="32" /></label>
        <label><span data-a="display"></span><input id="account-display" maxlength="60" placeholder="860C" /></label>
        <div class="account-motor"><small data-a="motor"></small><strong>Bafang BBS02 · 750 W</strong><span class="muted" data-a="scope"></span></div>
      </div><div class="account-actions"><button id="accountSave" class="primary" type="submit" data-a="save"></button><button id="accountUseLocal" type="button" data-a="useLocal" hidden></button></div></form>
    </section>
    <section id="accountPanel-library" role="tabpanel" aria-labelledby="accountTab-library" hidden><h3 data-a="localFiles"></h3><p class="muted" data-a="filesNote"></p><h4 data-a="profiles"></h4><ul id="accountProfiles" class="account-file-list"></ul><h4 data-a="backups"></h4><ul id="accountBackups" class="account-file-list"></ul><div class="account-actions"><button id="accountGarage" type="button" class="primary" data-a="openGarage"></button><button id="accountExport" type="button" data-a="export"></button></div></section>
    <section id="accountPanel-purchases" role="tabpanel" aria-labelledby="accountTab-purchases" hidden><div class="account-offer"><span class="demo-flag" data-a="demo"></span><h3 data-a="purchaseTitle"></h3><p data-a="purchaseNote"></p><div class="account-price"><span data-a="price"></span><strong data-a="priceValue"></strong></div><p data-a="accessNote"></p><p class="muted" data-a="priceNote"></p><button id="accountPayment" type="button" class="primary" data-a="payment"></button></div><p class="access-notice" data-a="demoNotice"></p><h3 data-a="orders"></h3><ul id="accountOrders" class="account-file-list"></ul></section>
    <div class="account-footer"><span id="accountFooterLocation" class="muted"></span><button type="button" id="accountRefresh" data-a="refresh"></button></div>
    </div></div>`;
  document.body.append(dialog);
  const $ = id => document.getElementById(id);
  const message = key => { $("accountMessage").textContent = key ? t(key) : ""; };
  function select(next) {
    tab = next;
    for (const b of dialog.querySelectorAll("[data-account-tab]")) {
      const selected = b.dataset.accountTab === tab; b.setAttribute("aria-selected",String(selected)); b.tabIndex = selected ? 0 : -1;
      $("accountPanel-" + b.dataset.accountTab).hidden = !selected;
    }
    message("");
  }
  function fill() { for (const key of Object.keys(M.empty())) $("account-" + key).value = card[key] ?? ""; }
  async function request(path, data) {
    const response = await fetch(new URL(path,api),{method:data===undefined?"GET":"POST",credentials:"same-origin",cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000),headers:data===undefined?{}:{"Content-Type":"application/json"},body:data===undefined?undefined:JSON.stringify(data)});
    const value = await response.json();
    if (!response.ok) throw Error(value.error || "error");
    return value;
  }
  function list(id, items, empty, describe) {
    const host = $(id); host.replaceChildren();
    for (const item of items.slice(0,8)) {
      const row = document.createElement("li"), text = document.createElement("strong"), date = document.createElement("span");
      text.textContent = describe(item); const at = new Date(item.at ?? item.created);
      date.textContent = Number.isFinite(at.getTime()) ? at.toLocaleDateString(lang === "en" ? "en-GB":"ru-RU") : "—";
      row.append(text,date); host.append(row);
    }
    if (!items.length) { const row = document.createElement("li"); row.className="account-empty"; row.textContent = t(empty); host.append(row); }
    if (items.length>8) { const row=document.createElement("li"); row.textContent=lang==="en"?"More items in the profile garage":"Остальные файлы — в гараже профилей";host.append(row); }
  }
  function render() {
    const user = remote?.user;
    $("accountIdentityBadge").textContent=t(user?"signedIn":"local");
    $("accountGreeting").textContent=card.name || t("guest");
    $("accountEmail").textContent=user?.email || "BBS02 / 750 W";
    $("accountLocation").textContent=t(user?"cloudNote":"localNote");
    $("accountFooterLocation").textContent=t("localFiles");
    const paid = user && remote.access?.status === "active";
    $("accountAccess").textContent=failed?"—":t(paid || !user ? "lifetime":"noPurchase");
    $("accountAccessMode").textContent=t(paid?"active":"demo");
    $("accountAccessMode").hidden=failed || (!!user && !paid);
    $("accountProfileCount").textContent=storage?profiles.length:"—"; $("accountBackupCount").textContent=storage?backups.length:"—";
    $("accountBikeSummary").textContent=card.bike || t("noBike");
    $("accountAuthUnavailable").hidden=!!remote?.authEnabled && !failed;
    $("accountLogin").hidden=!remote?.authEnabled || !!user || !!challenge || failed;
    $("accountCodeForm").hidden=!challenge || !!user || failed;
    $("accountLogout").hidden=!user;
    if (remote?.privacyUrl) { const u = new URL(remote.privacyUrl,location.href); if(u.origin===location.origin) $("accountPrivacy").href=u.href; }
    $("accountUseLocal").hidden=!user || !storage;
    $("accountSave").disabled=busy || failed || (!user && !storage);
    $("accountExport").disabled=busy || !storage || failed;
    $("accountLogout").disabled=busy;
    for (const form of [$("accountLogin"),$("accountCodeForm")]) for (const control of form.elements) control.disabled=busy;
    for (const control of $("accountBikeForm").elements) control.disabled=busy || failed || (!user && !storage);
    list("accountProfiles",profiles,"emptyProfiles",item=>item.name);
    list("accountBackups",backups,"emptyBackups",item=>[item.device?.manufacturer,item.device?.model].filter(Boolean).join(" ") || "BBS UART");
    list("accountOrders",remote?.orders || [],"emptyOrders",item=>`${(item.amountKopecks/100).toFixed(2)} ₽ · ${t(item.status)}`);
  }
  async function refresh() {
    busy=true; $("accountRefresh").disabled=true; render(); message("");
    try {
      storage=!!(await S.ready);
      if (storage) { const [saved,p,b] = await Promise.all([S.get("prefs","account.card.v1"),S.list("profiles"),S.list("backups")]); localCard=M.profile(saved || {}); profiles=p; backups=b; }
    } catch { storage=false; profiles=[];backups=[]; }
    if (api) {
      try { remote=await request("account"); failed=false; }
      catch { remote=null; failed=true; }
    }
    card=remote?.user?M.profile(remote.user.profile):{...localCard};
    fill(); busy=false; $("accountRefresh").disabled=false; render();
    if(failed) message("serviceError"); else if(!storage) message("storageError");
  }
  async function action(fn) {
    if(busy)return; busy=true;render();message("");
    try {await fn();} catch(error){message(words[error.message]?error.message:"error");}
    finally {busy=false;render();}
  }
  open.onclick=async()=>{if(open.disabled || busy)return; if(!dialog.open){select("overview");dialog.showModal();await refresh();}};
  $("accountClose").onclick=()=>dialog.close();
  dialog.addEventListener("close",()=>{challenge=null;$("accountCode").value="";if(!open.disabled)open.focus({preventScroll:true});});
  dialog.querySelectorAll("[data-account-tab]").forEach((button,i,buttons)=>{
    button.onclick=()=>select(button.dataset.accountTab);
    button.onkeydown=e=>{let n;if(e.key==="ArrowRight")n=(i+1)%buttons.length;else if(e.key==="ArrowLeft")n=(i+buttons.length-1)%buttons.length;else if(e.key==="Home")n=0;else if(e.key==="End")n=buttons.length-1;else return;e.preventDefault();select(buttons[n].dataset.accountTab);buttons[n].focus();};
  });
  $("accountEditBike").onclick=()=>{select("bike");$("account-name").focus();};
  $("accountRefresh").onclick=()=>{if(!busy)refresh();};
  $("accountUseLocal").onclick=()=>{if(!busy){card={...localCard};fill();}};
  $("accountBikeForm").onsubmit=e=>{e.preventDefault();action(async()=>{
    const value=M.profile(Object.fromEntries(Object.keys(M.empty()).map(key=>[key,$("account-"+key).value])));
    if(remote?.user){ const updated=await request("profile",{profile:value,revision:remote.user.revision});remote={...remote,...updated};card=M.profile(updated.user.profile); }
    else {if(!storage || failed)throw Error("error");await S.put("prefs",value,"account.card.v1");const saved=M.profile(await S.get("prefs","account.card.v1"));if(JSON.stringify(saved)!==JSON.stringify(value))throw Error("error");card=localCard=saved;}
    fill();message("saved");
  });};
  $("accountLogin").onsubmit=e=>{e.preventDefault();action(async()=>{
    if(!$("accountConsent").checked || !remote?.authEnabled)throw Error("error");
    const result=await request("auth/request",{email:$("accountEmailInput").value,privacyVersion:remote.privacyVersion});challenge=result.challenge;
    render();$("accountCode").disabled=false;$("accountCode").focus();
  });};
  $("accountCodeForm").onsubmit=e=>{e.preventDefault();action(async()=>{
    const result=await request("auth/verify",{challenge,code:$("accountCode").value});remote={...remote,...result};challenge=null;$("accountCode").value="";card=M.profile(remote.user.profile);fill();
  });};
  $("accountChangeEmail").onclick=()=>{if(busy)return;challenge=null;$("accountCode").value="";render();$("accountEmailInput").focus();};
  $("accountLogout").onclick=()=>action(async()=>{await request("auth/logout",{});remote={...remote,user:null,orders:[],access:{status:"guest"}};card={...localCard};fill();});
  $("accountPayment").onclick=()=>{dialog.close();$("openPaymentDemo").click();};
  $("accountGarage").onclick=()=>{
    dialog.close();const button=document.querySelector('[data-panel="presets"]');
    if(button){button.click();$("garageLibraryTitle").scrollIntoView({block:"center",behavior:"instant"});$("garageName").focus({preventScroll:true});}
    else location.href="./bbs-flash.html#presets";
  };
  $("accountExport").onclick=()=>action(async()=>{
    const [p,b]=await Promise.all([S.list("profiles"),S.list("backups")]);
    const account=remote?.user?{email:remote.user.email,access:remote.access,orders:remote.orders}:null;
    const data={format:"bbs-flash-account-export",version:1,exportedAt:new Date().toISOString(),account,card,profiles:p,controllerBackups:b};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="bbs-flash-my-data.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message("exported");
  });
  function sync(next){lang=next;for(const host of [root,dialog])host.querySelectorAll("[data-a]").forEach(n=>n.textContent=t(n.dataset.a));dialog.querySelector("[role=tablist]").setAttribute("aria-label",t("account"));render();}
  select(tab);sync(lang);
  return {sync};
})();
