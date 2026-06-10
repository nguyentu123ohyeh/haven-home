/* =========================================================
   ALFANAR — main.js
   Inquiry-first version: no product prices, no checkout payment.
   Requires window.PRODUCTS from product.js (loaded first).
   ========================================================= */
(function(){
  "use strict";

  const CART_KEY = "carly_cart";
  const COOKIE_KEY = "carly_cookie_pref";

  /* ---------- Fallback if product.js missing ---------- */
  if (!window.PRODUCTS || !Array.isArray(window.PRODUCTS) || window.PRODUCTS.length === 0) {
    document.addEventListener("DOMContentLoaded", () => {
      const targets = document.querySelectorAll("[data-product-grid],[data-featured-grid],[data-pd-root],[data-cart-root],[data-checkout-root]");
      targets.forEach(t => {
        t.innerHTML = '<div class="empty-state"><div class="ic">!</div><h2>Product data not found.</h2><p>Product data is not loaded correctly. Please ensure assets/js/product.js loads before main.js.</p></div>';
      });
    });
    return;
  }

  const PRODUCTS = window.PRODUCTS;
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  /* ---------- Cart / inquiry helpers ---------- */
  function getCart(){
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch(e){ return []; }
  }
  function setCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); updateCartBadge(); }
  function cartCount(){ return getCart().reduce((s,i)=>s + i.quantity, 0); }
  function addToCart(productId, qty=1){
    const p = PRODUCTS.find(x => x.id === productId);
    if (!p) return;
    const cart = getCart();
    const existing = cart.find(i => i.id === productId);
    if (existing) existing.quantity += qty;
    else cart.push({id:p.id, name:p.name, category:p.category, image:p.image, quantity:qty});
    setCart(cart);
    toast(p.name + " added to inquiry list");
  }
  function changeQty(id, delta){
    const cart = getCart();
    const it = cart.find(i => i.id === id);
    if (!it) return;
    it.quantity += delta;
    if (it.quantity <= 0) return removeFromCart(id);
    setCart(cart);
  }
  function removeFromCart(id){
    setCart(getCart().filter(i => i.id !== id));
  }
  function clearCart(){ localStorage.removeItem(CART_KEY); updateCartBadge(); }

  function updateCartBadge(){
    const c = cartCount();
    $$(".cart-badge").forEach(b => {
      b.textContent = c;
      b.classList.toggle("show", c > 0);
    });
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg){
    let el = $(".toast");
    if (!el){
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>el.classList.remove("show"), 2400);
  }

  /* ---------- Mobile menu ---------- */
  function initMenu(){
    const btn = $(".menu-toggle");
    const links = $(".nav-links");
    if (!btn || !links) return;
    btn.addEventListener("click", () => links.classList.toggle("open"));
  }

  /* ---------- Cookie banner ---------- */
  function initCookie(){
    if (localStorage.getItem(COOKIE_KEY)) return;
    const el = document.createElement("div");
    el.className = "cookie show";
    el.innerHTML = `
      <p>We use a small amount of browser storage to remember your inquiry list and your cookie preference. No tracking. No third-party advertising.</p>
      <div class="row">
        <button class="btn btn-primary" data-c="accept">Accept</button>
        <button class="btn btn-ghost" data-c="decline">Decline</button>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener("click", e => {
      const c = e.target.dataset.c;
      if (!c) return;
      localStorage.setItem(COOKIE_KEY, c);
      el.remove();
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal(){
    const els = $$(".reveal");
    if (!("IntersectionObserver" in window)) return els.forEach(e => e.classList.add("in"));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, {threshold:.15});
    els.forEach(e => io.observe(e));
  }

  /* ---------- Product card render ---------- */
  function productCard(p){
    return `
      <article class="product-card reveal">
        <div class="ph"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>
        <div class="body">
          <span class="cat">${p.category}</span>
          <h3 class="name">${p.name}</h3>
          <p class="desc">${p.shortDescription}</p>
          <div class="actions">
            <button class="btn btn-dark" data-add="${p.id}">Add to Inquiry</button>
            <a class="btn btn-ghost" href="product-detail.html?id=${p.id}">View Detail</a>
          </div>
        </div>
      </article>`;
  }

  /* ---------- Featured (home) ---------- */
  function initFeatured(){
    const grid = $("[data-featured-grid]");
    if (!grid) return;
    const picks = [1,4,5,10].map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
    grid.innerHTML = picks.map(productCard).join("");
    bindAdd(grid);
  }

  /* ---------- Products page + pagination ---------- */
  const PER_PAGE = 9;
  function initProductsPage(){
    const grid = $("[data-product-grid]");
    if (!grid) return;
    const pagEl = $("[data-pagination]");
    const totalPages = Math.ceil(PRODUCTS.length / PER_PAGE);
    let page = 1;
    function render(){
      const start = (page-1)*PER_PAGE;
      const slice = PRODUCTS.slice(start, start+PER_PAGE);
      grid.innerHTML = slice.map(productCard).join("");
      bindAdd(grid);
      initReveal();
      if (pagEl){
        let html = `<button data-pg="prev" ${page===1?"disabled":""}>‹</button>`;
        for(let i=1;i<=totalPages;i++) html += `<button data-pg="${i}" class="${page===i?"active":""}">${i}</button>`;
        html += `<button data-pg="next" ${page===totalPages?"disabled":""}>›</button>`;
        pagEl.innerHTML = html;
      }
      window.scrollTo({top:grid.offsetTop-120, behavior:"smooth"});
    }
    if (pagEl) pagEl.addEventListener("click", e => {
      const v = e.target.dataset.pg;
      if (!v) return;
      if (v === "prev") page = Math.max(1, page-1);
      else if (v === "next") page = Math.min(totalPages, page+1);
      else page = +v;
      render();
    });
    render();
  }

  function bindAdd(scope){
    $$("[data-add]", scope).forEach(btn => {
      btn.addEventListener("click", () => addToCart(+btn.dataset.add));
    });
  }

  /* ---------- Product detail ---------- */
  function initProductDetail(){
    const root = $("[data-pd-root]");
    if (!root) return;
    const id = +new URLSearchParams(location.search).get("id");
    const p = PRODUCTS.find(x => x.id === id);
    if (!p){
      root.innerHTML = `<div class="empty-state"><h2>Product not found</h2><a class="btn btn-primary" href="products.html">Back to Products</a></div>`;
      return;
    }
    document.title = p.name + " — ALFANAR";
    const gallery = (p.images && p.images.length ? p.images : [p.image]);
    root.innerHTML = `
      <div class="pd-grid">
        <div class="pd-gallery">
          <div class="main"><img id="pdMain" src="${gallery[0]}" alt="${p.name}"></div>
          <div class="pd-thumbs">
            ${gallery.map((g,i)=>`<button class="${i===0?"active":""}" data-thumb="${g}"><img src="${g}" alt=""></button>`).join("")}
          </div>
        </div>
        <div class="pd-info">
          <span class="kicker">${p.category}</span>
          <h1>${p.name}</h1>
          <p>${p.description}</p>
          <div class="actions">
            <button class="btn btn-primary" data-add="${p.id}">Add to Inquiry</button>
            <a class="btn btn-ghost" href="contact.html?inquiry=products">Ask About This Product</a>
          </div>
          <h3>Features</h3>
          <ul>${p.features.map(f=>`<li>${f}</li>`).join("")}</ul>
          <h3>Specifications</h3>
          <table class="spec-table"><tbody>
            ${Object.entries(p.specifications).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("")}
          </tbody></table>
        </div>
      </div>
      <section class="section-sm">
        <h2 style="margin-bottom:24px">You may also like</h2>
        <div class="feat-grid" data-related></div>
      </section>`;
    const main = $("#pdMain");
    $$(".pd-thumbs button", root).forEach(b => b.addEventListener("click", () => {
      $$(".pd-thumbs button", root).forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      main.style.opacity = 0;
      setTimeout(()=>{main.src = b.dataset.thumb; main.style.opacity = 1;}, 150);
    }));
    bindAdd(root);
    const rel = $("[data-related]", root);
    const others = PRODUCTS.filter(x => x.id !== p.id && x.category === p.category).slice(0,3);
    const pool = others.length ? others : PRODUCTS.filter(x => x.id !== p.id).slice(0,3);
    rel.innerHTML = pool.map(productCard).join("");
    bindAdd(rel);
  }

  /* ---------- Cart / inquiry page ---------- */
  function initCartPage(){
    const root = $("[data-cart-root]");
    if (!root) return;
    function render(){
      const cart = getCart();
      if (cart.length === 0){
        root.innerHTML = `
          <div class="empty-state">
            <div class="ic">◇</div>
            <h2>Your inquiry list is empty</h2>
            <p>Discover interior furniture and bathroom fittings, then send an inquiry for selected items.</p>
            <a class="btn btn-primary" href="products.html" style="margin-top:18px">Browse Products</a>
          </div>`;
        return;
      }
      root.innerHTML = `
        <div class="cart-grid">
          <div>${cart.map(it => `
            <div class="cart-item">
              <div class="ph"><img src="${it.image}" alt="${it.name}"></div>
              <div>
                <span class="cat">${it.category}</span>
                <h3>${it.name}</h3>
                <div class="qty">
                  <button data-q="-" data-id="${it.id}">−</button>
                  <span>${it.quantity}</span>
                  <button data-q="+" data-id="${it.id}">+</button>
                </div>
              </div>
              <div class="right">
                <span class="sub">Qty ${it.quantity}</span>
                <button class="remove" data-rm="${it.id}">Remove</button>
              </div>
            </div>`).join("")}
          </div>
          <aside class="summary">
            <h3>Inquiry Summary</h3>
            <div class="row"><span>Selected items</span><span>${cart.length}</span></div>
            <div class="row"><span>Total quantity</span><span>${cartCount()}</span></div>
            <p style="margin:14px 0 0;font-size:.9rem;color:#5f6f7b;line-height:1.45">
              Prices are not displayed on this website. Please submit an inquiry and the studio will confirm availability, shipping and order arrangement.
            </p>
            <div class="btns" style="margin-top:18px">
              <a href="contact.html?inquiry=products" class="btn btn-primary btn-block">Ask About Selected Products</a>
              <a href="products.html" class="btn btn-ghost btn-block">Continue Shopping</a>
            </div>
          </aside>
        </div>`;
      $$("[data-q]", root).forEach(b => b.addEventListener("click", () => {
        changeQty(+b.dataset.id, b.dataset.q === "+" ? 1 : -1);
        render();
      }));
      $$("[data-rm]", root).forEach(b => b.addEventListener("click", () => {
        removeFromCart(+b.dataset.rm); render();
      }));
    }
    render();
  }

  /* ---------- Checkout ---------- */
  function initCheckout(){
    const root = $("[data-checkout-root]");
    if (!root) return;
    const cart = getCart();

    if (cart.length === 0){
      root.innerHTML = `<div class="empty-state"><h2>Your inquiry list is empty</h2><p>Add a product before sending an inquiry.</p><a class="btn btn-primary" href="products.html" style="margin-top:18px">Browse Products</a></div>`;
      return;
    }

    root.innerHTML = `
      <div class="empty-state">
        <div class="ic">◇</div>
        <h2>Checkout is not available</h2>
        <p>This website uses inquiry-first ordering. Please send your selected products to the studio for confirmation.</p>
        <a class="btn btn-primary" href="contact.html?inquiry=products" style="margin-top:18px">Ask About Selected Products</a>
        <a class="btn btn-ghost" href="products.html" style="margin-top:18px;margin-left:8px">Continue Shopping</a>
      </div>`;
  }

  /* ---------- Thank you ---------- */
  function initThank(){
    const root = $("[data-thank-root]");
    if (!root) return;
    const ref = "ALF-" + Math.random().toString(36).slice(2,8).toUpperCase();
    root.innerHTML = `
      <div class="thank">
        <div class="check">✓</div>
        <span class="kicker">Confirmation</span>
        <h1>Inquiry Submitted</h1>
        <p style="font-size:1.1rem">Your inquiry has been submitted successfully. The studio will contact you to confirm availability, shipping details and order arrangement.</p>
        <div class="ref">Reference · ${ref}</div>
        <div class="info">
          <h3 style="margin-top:0">What happens next</h3>
          <p>Our studio team reviews your inquiry, confirms stock and shipping windows, and reaches out within one business day. Any final adjustments or invoicing will be arranged directly with you.</p>
          <p style="margin:0"><strong>Status:</strong> Submitted — awaiting confirmation</p>
        </div>
        <div class="actions">
          <a class="btn btn-primary" href="products.html">Continue Shopping</a>
          <a class="btn btn-ghost" href="index.html">Back to Home</a>
        </div>
      </div>`;
  }

  /* ---------- FAQ accordion ---------- */
  function initFAQ(){
    $$(".faq-item").forEach(it => {
      const q = $(".faq-q", it);
      if (q) q.addEventListener("click", () => it.classList.toggle("open"));
    });
  }

  /* ---------- Contact ---------- */
  function initContact(){
    const form = $("#contactForm");
    if (!form) return;
    const typeRadios = $$("input[name='inquiryType']", form);
    const preview = $("#productPreview");
    const message = form.message;
    const cart = getCart();

    function renderPreview(){
      if (!preview) return;
      if (!cart.length){
        preview.innerHTML = `<p style="font-size:.9rem;color:#6b6158;margin:0">No products in your inquiry list yet. <a href="products.html" style="color:var(--copper-deep);text-decoration:underline">Browse Products</a></p>`;
        return;
      }
      const show = cart.slice(0,3);
      const hidden = cart.length - show.length;
      preview.innerHTML = show.map(it=>`
        <div class="summary-line">
          <div class="ph"><img src="${it.image}" alt="${it.name}"></div>
          <div class="meta">
            <div class="cat">${it.category}</div>
            <strong>${it.name}</strong>
            <div style="font-size:.8rem;color:#6b6158">Qty ${it.quantity}</div>
          </div>
        </div>`).join("") +
        (hidden > 0 ? `<div style="margin-top:10px;text-align:right"><a href="cart.html" class="btn btn-ghost" style="padding:8px 14px;font-size:.8rem">View all (${hidden} more)</a></div>` : "");
    }

    function autofillMessage(){
      if (!message) return;
      if (!cart.length){ message.value = "I would like more information about your products. Please contact me."; return; }
      const lines = cart.map(it => `• ${it.name} (${it.category}) — Qty ${it.quantity}`);
      message.value =
        "Hello ALFANAR team,\n\nI'd like more details about the following items currently in my inquiry list:\n\n" +
        lines.join("\n") +
        "\n\nPlease confirm availability, specifications, shipping arrangements and quotation details.\n\nThank you.";
    }

    function onTypeChange(){
      const checked = $("input[name='inquiryType']:checked", form);
      const v = checked ? checked.value : "general";
      if (v === "products"){
        if (preview) preview.style.display = "";
        renderPreview();
        autofillMessage();
      } else {
        if (preview) preview.style.display = "none";
        if (message) message.value = "";
      }
    }
    typeRadios.forEach(r => r.addEventListener("change", onTypeChange));

    const params = new URLSearchParams(location.search);
    const requestedInquiry = (params.get("inquiry") || params.get("type") || params.get("mode") || "").toLowerCase();
    const shouldOpenProducts = ["products","product","selected-products","ask-products","ask-product"].includes(requestedInquiry);
    const productRadio = form.querySelector("input[name='inquiryType'][value='products']");
    const generalRadio = form.querySelector("input[name='inquiryType'][value='general']");

    if (shouldOpenProducts && productRadio){
      productRadio.checked = true;
    } else if (generalRadio){
      generalRadio.checked = true;
    }

    onTypeChange();

    form.addEventListener("submit", e => {
      e.preventDefault();
      const required = ["name","email","phone","city","message"];
      for (const r of required){
        if (!form[r] || !form[r].value.trim()){ toast("Please complete: " + r); if (form[r]) form[r].focus(); return; }
      }
      const checked = $("input[name='inquiryType']:checked", form);
      const type = checked ? checked.value : "general";
      const success = $("#contactSuccess");
      if (success) success.style.display = "block";
      form.style.display = "none";
      if (type === "products"){
        clearCart();
      }
      if (success) window.scrollTo({top: success.offsetTop - 120, behavior:"smooth"});
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initMenu();
    updateCartBadge();
    initCookie();
    initFeatured();
    initProductsPage();
    initProductDetail();
    initCartPage();
    initCheckout();
    initThank();
    initFAQ();
    initContact();
    initReveal();
  });
})();
