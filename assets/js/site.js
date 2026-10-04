(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = {
    get: function (s, k) { try { return window[s].getItem(k); } catch (e) { return null; } },
    set: function (s, k, v) { try { window[s].setItem(k, v); } catch (e) {} },
    del: function (s, k) { try { window[s].removeItem(k); } catch (e) {} }
  };
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function raf2(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }
  function focus(el) {
    if (!el || !el.focus) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }

  var loader = $(".loader");
  var curtain = $(".curtain");

  function startHero() {
    root.classList.remove("pre-intro");
    if (window.__gzFailsafe) clearTimeout(window.__gzFailsafe);
  }

  function runLoader() {
    $$(".loader__mark .st").forEach(function (p, i) {
      var len = Math.ceil(p.getTotalLength ? p.getTotalLength() : 400);
      p.style.setProperty("--len", len);
      p.style.setProperty("--dl", (0.08 + i * 0.08) + "s");
    });
    store.set("sessionStorage", "gz-intro", "1");
    var done = false, introTimer;
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(introTimer);
      loader.classList.add("is-done");
      setTimeout(startHero, 160);
      setTimeout(function () { root.classList.remove("intro"); loader.classList.remove("is-done"); }, 600);
    }
    loader.addEventListener("click", finish, { once: true });
    introTimer = setTimeout(finish, 620);
  }

  if (root.classList.contains("intro") && loader && !reduce) {
    runLoader();
  } else {
    root.classList.remove("intro");
    if (curtain && root.classList.contains("pt")) {
      raf2(function () {
        curtain.classList.add("is-out");
        root.classList.remove("pt");
        setTimeout(startHero, 120);
        setTimeout(function () { curtain.classList.remove("is-out"); }, 560);
      });
    } else {
      raf2(startHero);
    }
  }
  store.del("sessionStorage", "gz-pt");

  if (curtain && !reduce) {
    var navigating = false;
    doc.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || a.origin !== location.origin || !/\.html$/.test(a.pathname)) return;
      if (a.hash && a.pathname === location.pathname) return;
      e.preventDefault();
      if (navigating) return;
      navigating = true;
      store.set("sessionStorage", "gz-pt", "1");
      curtain.classList.remove("is-out");
      curtain.classList.add("is-in");
      setTimeout(function () { window.location.href = a.href; }, 300);
    });
    window.addEventListener("pageshow", function (ev) {
      if (ev.persisted) {
        navigating = false;
        curtain.classList.remove("is-in", "is-cover", "is-out");
      }
    });
  }

  var hdr = $(".hdr");
  var lastY = window.scrollY || 0, ticking = false;
  var readingProgress = doc.createElement("div");
  readingProgress.className = "reading-progress";
  readingProgress.setAttribute("aria-hidden", "true");
  doc.body.appendChild(readingProgress);
  function onScrollHdr() {
    var y = window.scrollY || 0;
    if (hdr) {
      hdr.classList.toggle("is-solid", y > 40 || hdr.hasAttribute("data-solid"));
      if (!root.classList.contains("menu-open") && (Math.abs(y - lastY) > 4 || y < 80)) {
        hdr.classList.toggle("is-hidden", y > lastY && y > 420);
      }
    }
    if (Math.abs(y - lastY) > 4) lastY = y;
    var distance = Math.max(0, root.scrollHeight - window.innerHeight);
    var progress = distance ? Math.max(0, Math.min(1, y / distance)) : 0;
    readingProgress.style.transform = "scaleX(" + progress.toFixed(4) + ")";
    readingProgress.style.setProperty("--progress", progress.toFixed(4));
  }

  var menuBtn = $(".menu-btn");
  var mobileNav = $(".mnav");
  var closeMenu = function () {};
  if (menuBtn && mobileNav) {
    var menuLabel = $("span", menuBtn);
    var background = $$("main,footer,.cookie");
    var backgroundState = [], previousFocus = null, bodyOverflow = "", rootOverflow = "";
    var focusSelector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    mobileNav.setAttribute("aria-hidden", "true");
    mobileNav.inert = true;
    mobileNav.setAttribute("role", "dialog");
    mobileNav.setAttribute("aria-label", $(".nav") ? $(".nav").getAttribute("aria-label") : menuLabel ? menuLabel.textContent : "Menü");
    function setMenu(open, restoreFocus) {
      if (open === root.classList.contains("menu-open")) return;
      if (open) {
        previousFocus = doc.activeElement;
        backgroundState = background.map(function (el) { return el.inert; });
        background.forEach(function (el) { el.inert = true; });
        bodyOverflow = doc.body.style.overflow;
        rootOverflow = root.style.overflow;
        doc.body.style.overflow = "hidden";
        root.style.overflow = "hidden";
      } else {
        background.forEach(function (el, i) { el.inert = backgroundState[i] || false; });
        doc.body.style.overflow = bodyOverflow;
        root.style.overflow = rootOverflow;
      }
      root.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (menuLabel) menuLabel.textContent = open ? "Kapat" : "Menü";
      if (!open) {
        if (restoreFocus !== false) focus(previousFocus && previousFocus.isConnected ? previousFocus : menuBtn);
        else if (mobileNav.contains(doc.activeElement)) focus(hdr && $("a[href]", hdr));
      }
      mobileNav.inert = !open;
      mobileNav.setAttribute("aria-hidden", open ? "false" : "true");
      if (open) mobileNav.setAttribute("aria-modal", "true");
      else mobileNav.removeAttribute("aria-modal");
      if (hdr) hdr.classList.remove("is-hidden");
      if (open) raf2(function () {
        if (root.classList.contains("menu-open")) focus($(focusSelector, mobileNav) || menuBtn);
      });
    }
    closeMenu = function (restoreFocus) { setMenu(false, restoreFocus); };
    menuBtn.addEventListener("click", function () {
      setMenu(!root.classList.contains("menu-open"));
    });
    doc.addEventListener("keydown", function (e) {
      if (!root.classList.contains("menu-open")) return;
      if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
      if (e.key !== "Tab") return;
      var items = [menuBtn].concat($$(focusSelector, mobileNav).filter(function (el) {
        return el.getClientRects().length && !el.hidden && !el.closest("[inert]");
      }));
      var current = items.indexOf(doc.activeElement);
      if (e.shiftKey && current <= 0) { e.preventDefault(); focus(items[items.length - 1]); }
      else if (!e.shiftKey && (current < 0 || current === items.length - 1)) { e.preventDefault(); focus(items[0]); }
    });
    doc.addEventListener("focusin", function (e) {
      if (root.classList.contains("menu-open") && e.target !== menuBtn && !mobileNav.contains(e.target)) focus(menuBtn);
    });
    mobileNav.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (a && !e.defaultPrevented) closeMenu();
    });
    window.addEventListener("pageshow", function (ev) { if (ev.persisted) closeMenu(false); });
    window.addEventListener("resize", function () {
      if (root.classList.contains("menu-open") && getComputedStyle(menuBtn).display === "none") closeMenu(false);
    });
  }

  var hero = $(".hero");
  if (hero) {
    var slides = $$(".hero__slide", hero);
    var bars = $$(".hero__prog i", hero);
    var nameEl = $("[data-hero-name]", hero), locEl = $("[data-hero-loc]", hero), stEl = $("[data-hero-st]", hero), cntEl = $("[data-hero-count]", hero);
    var heroInfo = $(".hero__info", hero);
    var cur = 0, timer = null, DUR = 6500, paused = false, remaining = DUR, deadline = 0;
    var bounds = hero.getBoundingClientRect();
    var pauses = { hover: false, focus: hero.contains(doc.activeElement), hidden: doc.hidden, outside: bounds.bottom <= 0 || bounds.top >= window.innerHeight };
    hero.style.setProperty("--dur", DUR + "ms");
    function show(n, manual) {
      if (!slides.length) return;
      n = (n + slides.length) % slides.length;
      slides[cur].classList.remove("is-active");
      cur = n;
      var s = slides[cur];
      s.classList.add("is-active");
      slides.forEach(function (slide, i) { slide.setAttribute("aria-hidden", i === cur ? "false" : "true"); });
      if (heroInfo) heroInfo.setAttribute("aria-live", manual ? "polite" : "off");
      var img = s.querySelector("img");
      if (img && img.loading === "lazy") img.loading = "eager";
      if (nameEl) nameEl.textContent = s.getAttribute("data-name");
      if (locEl) locEl.textContent = s.getAttribute("data-loc");
      if (stEl) stEl.textContent = s.getAttribute("data-st");
      if (cntEl) cntEl.textContent = String(cur + 1).padStart(2, "0");
      bars.forEach(function (b, i) {
        b.classList.remove("is-on", "is-done");
        if (i < cur) b.classList.add("is-done");
      });
      if (bars[cur]) { void bars[cur].offsetWidth; if (!reduce) bars[cur].classList.add("is-on"); }
      var nx = slides[(cur + 1) % slides.length].querySelector("img");
      if (nx && nx.loading === "lazy") nx.loading = "eager";
      remaining = DUR;
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      timer = null;
      if (reduce || paused || slides.length < 2) return;
      deadline = Date.now() + remaining;
      timer = setTimeout(function () { timer = null; show(cur + 1, false); }, remaining);
    }
    function setPaused(reason, value) {
      pauses[reason] = value;
      var p = reduce || Object.keys(pauses).some(function (key) { return pauses[key]; });
      if (p === paused) return;
      paused = p; hero.classList.toggle("paused", p);
      if (p) {
        if (timer !== null) remaining = Math.max(0, deadline - Date.now());
        clearTimeout(timer); timer = null;
      } else schedule();
    }
    var prev = $("[data-hero-prev]", hero), next = $("[data-hero-next]", hero);
    if (prev) prev.addEventListener("click", function () { show(cur - 1, true); });
    if (next) next.addEventListener("click", function () { show(cur + 1, true); });
    hero.addEventListener("keydown", function (e) {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1, true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1, true); }
    });
    hero.addEventListener("pointerenter", function (e) { if (e.pointerType !== "touch") setPaused("hover", true); });
    hero.addEventListener("pointerleave", function () { setPaused("hover", false); });
    hero.addEventListener("focusin", function () { setPaused("focus", true); });
    hero.addEventListener("focusout", function () { setTimeout(function () { setPaused("focus", hero.contains(doc.activeElement)); }, 0); });
    doc.addEventListener("visibilitychange", function () { setPaused("hidden", doc.hidden); });
    if ("IntersectionObserver" in window) {
      var heroIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { setPaused("outside", !entry.isIntersecting); });
      }, { threshold: 0 });
      heroIO.observe(hero);
    }
    setPaused("hidden", doc.hidden);
    if (slides.length) show(0);
  }

  $$(".rooms").forEach(function (rooms, i) {
    var section = rooms.closest("section");
    var title = section && $("h2", section);
    rooms.setAttribute("tabindex", "0");
    if (title) {
      if (!title.id) title.id = "rooms-title-" + (i + 1);
      rooms.setAttribute("role", "region");
      rooms.setAttribute("aria-labelledby", title.id);
    }
  });

  $$("[data-split]").forEach(function (el) {
    var wi = 0;
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var parts = ch.textContent.split(/(\s+)/);
          var frag = doc.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(" ")); return; }
            var w = doc.createElement("span"); w.className = "w";
            var i = doc.createElement("span"); i.textContent = p; i.style.setProperty("--wi", wi++);
            w.appendChild(i); frag.appendChild(w);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.tagName !== "BR") {
          walk(ch);
        }
      });
    }
    walk(el);
  });

  var revealEls = $$("[data-reveal],[data-split]");
  var counters = $$("[data-count]");
  if (!reduce && "IntersectionObserver" in window) {
    var playIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        playIO.unobserve(el);
        if (el.hasAttribute("data-count")) { runCount(el); return; }
        raf2(function () { el.classList.add("is-in"); });
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
    var armIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        armIO.unobserve(el);
        if (en.boundingClientRect.top > window.innerHeight * 0.96) {
          if (el.hasAttribute("data-count")) el.textContent = el.getAttribute("data-zero") || "0";
          else el.classList.add("is-armed");
          playIO.observe(el);
        }
      });
    }, { rootMargin: "0px 0px 40% 0px" });
    revealEls.concat(counters).forEach(function (el) { armIO.observe(el); });
  }
  function fmt(n) { try { return n.toLocaleString("tr-TR"); } catch (e) { return String(n); } }
  function runCount(el) {
    var to = parseFloat(el.getAttribute("data-count")) || 0;
    var suf = el.getAttribute("data-suffix") || "";
    var plain = el.hasAttribute("data-plain");
    var t0 = null, D = 1600;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 4);
      var v = Math.round(to * e);
      el.innerHTML = (plain ? String(v) : fmt(v)) + (suf ? "<sup>" + suf + "</sup>" : "");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var plx = $$("[data-plx]").map(function (el) {
    return { el: el, img: $("img", el), amount: parseFloat(el.getAttribute("data-plx")) || 7 };
  });
  var tls = $$(".tl");
  function onScrollFx() {
    var vh = window.innerHeight;
    if (!reduce) {
      plx.forEach(function (item) {
        var r = item.el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        p = Math.max(-1, Math.min(1, p));
        if (item.img) item.img.style.transform = "translate3d(0," + (-item.amount + p * item.amount).toFixed(3) + "%,0)";
      });
    }
    tls.forEach(function (tl) {
      var r = tl.getBoundingClientRect();
      var mark = vh * 0.62;
      var p = Math.max(0, Math.min(1, (mark - r.top) / r.height));
      tl.style.setProperty("--p", p.toFixed(4));
      $$("li", tl).forEach(function (li) {
        li.classList.toggle("is-past", li.getBoundingClientRect().top + 30 < mark);
      });
    });
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScrollHdr(); onScrollFx(); ticking = false; });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScrollHdr(); onScrollFx();

  $$("[data-filters]").forEach(function (box) {
    var gridSel = box.getAttribute("data-filters");
    var grid = $(gridSel);
    if (!grid) return;
    var cards = $$("[data-status]", grid);
    var btns = $$("[data-filter]", box);
    var empty = $(".pgrid-empty", grid.parentNode);
    function apply(f, push) {
      var shown = 0;
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-filter") === f ? "true" : "false"); });
      cards.forEach(function (c) {
        var ok = f === "tumu" || c.getAttribute("data-status") === f;
        c.hidden = !ok; if (ok) shown++;
        if (ok && !reduce) { c.classList.remove("is-in"); c.classList.add("is-armed"); raf2(function () { c.classList.add("is-in"); }); }
      });
      if (empty) empty.hidden = shown > 0;
      if (push && box.hasAttribute("data-hash")) {
        try { history.replaceState(null, "", f === "tumu" ? location.pathname : "#" + f); } catch (e) {}
      }
    }
    btns.forEach(function (b) {
      var f = b.getAttribute("data-filter");
      var n = f === "tumu" ? cards.length : cards.filter(function (c) { return c.getAttribute("data-status") === f; }).length;
      var ns = b.querySelector(".n"); if (ns) ns.textContent = n;
      b.addEventListener("click", function () { apply(f, true); });
    });
    var h = (location.hash || "").replace("#", "");
    if (box.hasAttribute("data-hash") && h && btns.some(function (b) { return b.getAttribute("data-filter") === h; })) apply(h, false);
  });

  var ps = $("[data-partner-search]");
  if (ps) {
    var tiles = $$(".partners [data-name]");
    var pcount = $("[data-partner-count]");
    var pempty = $(".partners-empty");
    var TRM = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u" };
    var norm = function (v) {
      return v.replace(/\./g, "").toLocaleLowerCase("tr").replace(/[çğıöşüâîû]/g, function (c) { return TRM[c]; })
        .replace(/[^a-z0-9]+/g, " ").trim();
    };
    ps.addEventListener("input", function () {
      var q = norm(ps.value), n = 0;
      tiles.forEach(function (t) {
        var ok = !q || t.getAttribute("data-name").indexOf(q) > -1;
        t.hidden = !ok; if (ok) { n++; t.classList.remove("is-armed"); }
      });
      if (pcount) pcount.textContent = n + " marka";
      if (pempty) pempty.hidden = n > 0;
    });
  }

  var cookie = $(".cookie");
  if (cookie && store.get("localStorage", "gz-cerez") !== "1") {
    setTimeout(function () { cookie.hidden = false; raf2(function () { cookie.classList.add("is-on"); }); }, 1600);
    var ok = $("[data-cookie-ok]", cookie);
    if (ok) ok.addEventListener("click", function () {
      store.set("localStorage", "gz-cerez", "1");
      cookie.classList.remove("is-on");
      setTimeout(function () { cookie.hidden = true; }, 800);
    });
  }

  (function () {
    var sel = document.getElementById("il-konu");
    if (!sel || !window.URLSearchParams) return;
    if (new URLSearchParams(location.search).get("konu") === "satis") sel.value = "Satış ve daire bilgisi";
  })();
  var errorIndex = 0;
  $$("form[data-form]").forEach(function (form) {
    var done = $(form.getAttribute("data-done"));
    function fieldOf(inp) { return inp.closest(".f") || inp.closest(".check"); }
    function check(inp) {
      var box = fieldOf(inp); if (!box) return true;
      var err = box.querySelector(".err");
      if (err) {
        if (!err.id) err.id = "field-error-" + (++errorIndex);
        var descriptions = (inp.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
        if (descriptions.indexOf(err.id) < 0) descriptions.push(err.id);
        inp.setAttribute("aria-describedby", descriptions.join(" "));
      }
      var msg = "";
      if (inp.type === "checkbox") { if (inp.required && !inp.checked) msg = "Devam etmek için onay vermeniz gerekiyor."; }
      else if (inp.required && !inp.value.trim()) msg = "Bu alan zorunlu.";
      else if (inp.type === "email" && inp.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value)) msg = "Geçerli bir e-posta adresi yazın.";
      else if (inp.type === "tel" && inp.value && inp.value.replace(/\D/g, "").length < 10) msg = "Telefon numarasını alan koduyla birlikte yazın.";
      box.classList.toggle("is-bad", !!msg);
      inp.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg;
      return !msg;
    }
    $$("input,select,textarea", form).forEach(function (inp) {
      inp.addEventListener("blur", function () { if (inp.value || inp.type === "checkbox") check(inp); });
      inp.addEventListener("input", function () { if (fieldOf(inp) && fieldOf(inp).classList.contains("is-bad")) check(inp); });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = null;
      $$("input,select,textarea", form).forEach(function (inp) { if (!check(inp) && !bad) bad = inp; });
      if (bad) { bad.focus(); return; }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      var endpoint = form.getAttribute("data-endpoint");
      var btn = form.querySelector("[type=submit]");
      function finish(title, text) {
        if (!done) return;
        done.querySelector("h3").textContent = title;
        done.querySelector("p").textContent = text;
        form.hidden = true; done.hidden = false;
        done.setAttribute("tabindex", "-1"); done.focus();
      }
      if (!endpoint) {
        finish("Form hazır, henüz bir adrese bağlı değil", "Bu önizlemede başvurular bir e-posta adresine ya da veritabanına gönderilmiyor. Site yayına alınmadan önce form bağlanacak.");
        return;
      }
      if (btn) { btn.disabled = true; }
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          finish("Başvurunuz bize ulaştı", "Teşekkür ederiz. Ekibimiz bilgilerinizi inceleyip en kısa sürede sizi arayacak.");
        })
        .catch(function () {
          if (btn) btn.disabled = false;
          var note = form.querySelector(".form__note");
          if (note) note.textContent = "Gönderim sırasında bir sorun oluştu. Lütfen tekrar deneyin ya da bizi telefonla arayın.";
        });
    });
  });

  var yr = $("[data-year]"); if (yr) yr.textContent = new Date().getFullYear();
})();
