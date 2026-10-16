/* Presentation-only purchase draft. No payment processing or access gates. */
globalThis.BBSAccessDemo = (() => {
  "use strict";
  const words = {
    subscription: ["Доступ", "Access"],
    lifetime: ["Бессрочный", "Lifetime"],
    demo: ["ДЕМО", "DEMO"],
    pay: ["Оплатить", "Pay"],
    title: ["Бессрочный доступ", "Lifetime access"],
    description: ["Одна покупка для одного пользователя с входом по e-mail. Без автопродления. Продажи пока не открыты.", "One purchase per user, with email sign-in. No automatic renewal. Sales are not open yet."],
    period: ["Срок действия", "Validity"],
    unlimited: ["Бессрочный", "No expiry"],
    status: ["Статус", "Status"],
    demoStatus: ["Демонстрационный", "Demo"],
    payment: ["Оплата", "Payment"],
    pending: ["Пока недоступна", "Not available yet"],
    notice: ["Это демо-экран: покупка не оформляется, деньги не списываются.", "This is a demo screen: no purchase is made and no money is charged."],
    close: ["Понятно", "Got it"],
  };
  const root = document.getElementById("accessDemo");
  if (!root) return {sync() {}};
  const text = (tag, key, cls) => {
    const n = document.createElement(tag);
    n.dataset.access = key;
    if (cls) n.className = cls;
    return n;
  };
  const copy = document.createElement("span"); copy.className = "access-copy";
  copy.append(text("small", "subscription"), text("strong", "lifetime"));
  const open = text("button", "pay", "pay-demo");
  open.id = "openPaymentDemo"; open.type = "button"; open.dataset.editable = "true";
  open.setAttribute("aria-haspopup", "dialog"); open.setAttribute("aria-controls", "paymentDemoDialog");
  root.dataset.mode = "demo"; root.append(copy, text("span", "demo", "demo-flag"), open);
  const dialog = document.createElement("dialog"); dialog.id = "paymentDemoDialog";
  dialog.dataset.mode = "demo";
  dialog.setAttribute("aria-labelledby", "paymentDemoTitle");
  dialog.setAttribute("aria-describedby", "paymentDemoDescription");
  const mark = document.createElement("span"); mark.className = "access-infinity";
  mark.textContent = "∞"; mark.setAttribute("aria-hidden", "true");
  const title = text("h2", "title"); title.id = "paymentDemoTitle";
  const description = text("p", "description", "muted"); description.id = "paymentDemoDescription";
  const details = document.createElement("dl"); details.className = "access-details";
  for (const [label, value] of [["period","unlimited"],["status","demoStatus"],["payment","pending"]]) {
    const row = document.createElement("div"); row.append(text("dt",label),text("dd",value)); details.append(row);
  }
  const close = text("button", "close", "primary"); close.id = "closePaymentDemo"; close.type = "button";
  dialog.append(mark, text("span", "demo", "demo-flag"), title, description, details, text("p", "notice", "access-notice"), close);
  document.body.append(dialog);
  open.onclick = () => { if (!open.disabled && !dialog.open) dialog.showModal(); };
  close.onclick = () => dialog.close();
  dialog.addEventListener("close", () => { if (!open.disabled) open.focus({preventScroll:true}); });
  function sync(lang) {
    globalThis.BBSAccount?.sync(lang);
    for (const host of [root,dialog]) host.querySelectorAll("[data-access]").forEach(n => {
      n.textContent = words[n.dataset.access][lang === "en" ? 1 : 0];
    });
  }
  sync(document.documentElement.lang);
  return {sync};
})();
