(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var motionQuery = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = !!(motionQuery && motionQuery.matches);
  var store = {
    get: function (s, k) { try { return window[s].getItem(k); } catch (e) { return null; } },
    set: function (s, k, v) { try { window[s].setItem(k, v); } catch (e) {} },
    del: function (s, k) { try { window[s].removeItem(k); } catch (e) {} }
  };
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function raf2(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }
  $$("a.skip").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var main = doc.getElementById("icerik");
      if (!main) return;
      event.preventDefault();
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      main.scrollIntoView({ block: "start", behavior: "auto" });
    });
  });
  var focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function focusable(el) {
    return $$(focusableSelector, el).filter(function (node) {
      return !node.closest('[hidden],[inert]') && node.getClientRects().length > 0;
    });
  }
  function trapTab(e, nodes) {
    if (e.key !== "Tab" || !nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && (doc.activeElement === first || nodes.indexOf(doc.activeElement) < 0)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (doc.activeElement === last || nodes.indexOf(doc.activeElement) < 0)) {
      e.preventDefault(); first.focus();
    }
  }
  function isolate(keep) {
    var changed = [];
    function visit(parent) {
      Array.prototype.slice.call(parent.children).forEach(function (node) {
        if (/^(SCRIPT|STYLE|LINK)$/.test(node.tagName)) return;
        if (keep.indexOf(node) >= 0) return;
        if (keep.some(function (item) { return node.contains(item); })) { visit(node); return; }
        changed.push({ node: node, inert: node.hasAttribute("inert") });
        node.setAttribute("inert", "");
      });
    }
    visit(doc.body);
    return function () {
      changed.forEach(function (item) { if (!item.inert) item.node.removeAttribute("inert"); });
    };
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
      p.style.setProperty("--dl", (0.25 + i * 0.12) + "s");
    });
    store.set("sessionStorage", "gz-intro", "1");
    var skip = function () { finish(0); };
    loader.addEventListener("click", skip, { once: true });
    var done = false;
    function finish(delay) {
      if (done) return; done = true;
      setTimeout(function () {
        loader.classList.add("is-done");
        setTimeout(startHero, 380);
        setTimeout(function () { root.classList.remove("intro"); loader.classList.remove("is-done"); }, 1100);
      }, delay);
    }
    finish(650);
  }

  if (root.classList.contains("intro") && loader && !reduce) {
    runLoader();
  } else {
    root.classList.remove("intro");
    if (curtain && root.classList.contains("pt")) {
      raf2(function () {
        curtain.classList.add("is-out");
        root.classList.remove("pt");
        setTimeout(startHero, 250);
        setTimeout(function () { curtain.classList.remove("is-out"); }, 950);
      });
    } else {
      raf2(startHero);
    }
  }
  store.del("sessionStorage", "gz-pt");

  if (curtain && !reduce) {
    doc.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || /^(mailto:|tel:|https?:|javascript:)/i.test(href)) return;
      if (!/\.html(#.*)?$/.test(href)) return;
      if (a.hash && a.pathname === location.pathname) return;
      e.preventDefault();
      store.set("sessionStorage", "gz-pt", "1");
      curtain.classList.remove("is-out");
      curtain.classList.add("is-in");
      setTimeout(function () { window.location.href = a.href; }, 560);
    });
    window.addEventListener("pageshow", function (ev) {
      if (ev.persisted) curtain.classList.remove("is-in", "is-cover", "is-out");
    });
  }

  var hdr = $(".hdr");
  var lastY = window.scrollY || 0, ticking = false;
  function onScrollHdr() {
    var y = window.scrollY || 0;
    if (hdr) {
      hdr.classList.toggle("is-solid", y > 40 || hdr.hasAttribute("data-solid"));
      if (!root.classList.contains("menu-open")) {
        hdr.classList.toggle("is-hidden", y > lastY && y > 420);
      }
    }
    lastY = y;
  }

  var menuBtn = $(".menu-btn"), mobileMenu = $(".mnav"), restoreMenu = null;
  function closeMenu(restoreFocus) {
    if (!menuBtn || !mobileMenu) return;
    root.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.querySelector("span").textContent = "Menü";
    if (restoreMenu) { restoreMenu(); restoreMenu = null; }
    if (restoreFocus) menuBtn.focus();
    mobileMenu.setAttribute("inert", "");
    mobileMenu.setAttribute("aria-hidden", "true");
  }
  if (menuBtn && mobileMenu) {
    mobileMenu.setAttribute("inert", "");
    mobileMenu.setAttribute("aria-hidden", "true");
    menuBtn.addEventListener("click", function () {
      if (root.classList.contains("menu-open")) { closeMenu(true); return; }
      mobileMenu.removeAttribute("inert"); mobileMenu.removeAttribute("aria-hidden");
      root.classList.add("menu-open"); menuBtn.setAttribute("aria-expanded", "true");
      menuBtn.querySelector("span").textContent = "Kapat";
      if (hdr) hdr.classList.remove("is-hidden");
      restoreMenu = isolate([mobileMenu, menuBtn]);
      var first = focusable(mobileMenu)[0]; if (first) first.focus();
    });
    mobileMenu.addEventListener("click", function (e) {
      if (e.target.closest("a[href]")) closeMenu(true);
    });
    doc.addEventListener("keydown", function (e) {
      if (!root.classList.contains("menu-open")) return;
      if (e.key === "Escape") { e.preventDefault(); closeMenu(true); return; }
      trapTab(e, [menuBtn].concat(focusable(mobileMenu)));
    });
    window.addEventListener("resize", function () {
      if (root.classList.contains("menu-open") && window.getComputedStyle(menuBtn).display === "none") closeMenu(false);
    });
  }

  var hero = $(".hero");
  if (hero) {
    var slides = $$(".hero__slide", hero);
    var bars = $$(".hero__prog i", hero);
    var nameEl = $("[data-hero-name]", hero), locEl = $("[data-hero-loc]", hero), stEl = $("[data-hero-st]", hero), cntEl = $("[data-hero-count]", hero);
    var cur = 0, timer = null, DUR = 6500;
    var manualPause = reduce, hovering = false, focused = false;
    var pauseBtn = $("[data-hero-pause]", hero), nav = $(".hero__nav", hero);
    if (!pauseBtn && nav && slides.length > 1) {
      pauseBtn = doc.createElement("button"); pauseBtn.type = "button";
      pauseBtn.className = "icon-btn hero-pause"; pauseBtn.setAttribute("data-hero-pause", "");
      nav.insertBefore(pauseBtn, nav.firstChild);
    }
    function paused() { return manualPause || reduce || hovering || focused || doc.hidden; }
    function updatePlayback() {
      hero.classList.toggle("paused", paused());
      if (pauseBtn) {
        pauseBtn.disabled = reduce;
        pauseBtn.setAttribute("aria-pressed", manualPause || reduce ? "true" : "false");
        pauseBtn.setAttribute("aria-label", reduce ? "Hareket tercihinize göre görsel geçişleri durduruldu" : manualPause ? "Tüm görsel hareketlerini sürdür" : "Tüm görsel hareketlerini durdur");
        var pauseIcon = manualPause ? "play" : "pause";
        if (pauseBtn.getAttribute("data-playback-icon") !== pauseIcon) {
          pauseBtn.setAttribute("data-playback-icon", pauseIcon);
          pauseBtn.innerHTML = manualPause ? '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="m8 5 11 7-11 7Z"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
        }
      }
      var info = $(".hero__info", hero); if (info) info.setAttribute("aria-live", paused() ? "polite" : "off");
      schedule();
    }
    hero.style.setProperty("--dur", DUR + "ms");
    function show(n) {
      n = (n + slides.length) % slides.length;
      slides[cur].classList.remove("is-active");
      cur = n;
      var s = slides[cur];
      s.classList.add("is-active");
      slides.forEach(function (slide, i) { slide.setAttribute("aria-hidden", i === cur ? "false" : "true"); });
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
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (slides.length < 2 || paused()) return;
      timer = setTimeout(function () { show(cur + 1); }, DUR);
    }
    var prev = $("[data-hero-prev]", hero), next = $("[data-hero-next]", hero);
    if (prev) prev.addEventListener("click", function () { show(cur - 1); });
    if (next) next.addEventListener("click", function () { show(cur + 1); });
    if (pauseBtn) pauseBtn.addEventListener("click", function () { manualPause = !manualPause; updatePlayback(); });
    hero.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); show(cur + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(cur - 1); }
    });
    hero.addEventListener("mouseenter", function () { hovering = true; updatePlayback(); });
    hero.addEventListener("mouseleave", function () { hovering = false; updatePlayback(); });
    hero.addEventListener("focusin", function () { focused = true; updatePlayback(); });
    hero.addEventListener("focusout", function () {
      setTimeout(function () { focused = hero.contains(doc.activeElement); updatePlayback(); }, 0);
    });
    doc.addEventListener("visibilitychange", updatePlayback);
    if (motionQuery) {
      var motionChange = function (e) { reduce = e.matches; if (reduce) manualPause = true; updatePlayback(); };
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", motionChange);
      else if (motionQuery.addListener) motionQuery.addListener(motionChange);
    }
    if (slides.length) { show(0); updatePlayback(); }
  }

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

  var plx = $$("[data-plx]");
  var tls = $$(".tl");
  function onScrollFx() {
    var vh = window.innerHeight;
    if (!reduce) {
      plx.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        p = Math.max(-1, Math.min(1, p));
        var img = el.querySelector("img");
        var amt = parseFloat(el.getAttribute("data-plx")) || 7;
        if (img) img.style.transform = "translate3d(0," + (-amt + p * amt).toFixed(3) + "%,0)";
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

  (function () {
    var cookie = $(".cookie"), key = "gz-consent-v2", version = 2, consent = null;
    var maps = $$(".mapbox iframe"), modal = null, restoreBackground = null, returnFocus = null;
    // A future measurement adapter must explicitly implement consent-aware start/stop.
    // No adapter is installed or loaded by this site script.
    var measurement = window.GerzogluMeasurement;
    var analyticsReady = !!(measurement && measurement.enabled === true &&
      typeof measurement.enable === "function" && typeof measurement.disable === "function");
    // An old acknowledgement does not establish choices for optional services.
    store.del("localStorage", "gz-cerez");
    try {
      var saved = JSON.parse(store.get("localStorage", key));
      if (saved && saved.version === version && saved.essential === true &&
        typeof saved.external === "boolean" && typeof saved.analytics === "boolean" &&
        typeof saved.expiresAt === "number" && saved.expiresAt > Date.now()) consent = saved;
    } catch (e) {}
    maps.forEach(function (iframe) {
      if (!iframe.hasAttribute("data-src") && iframe.hasAttribute("src")) {
        iframe.setAttribute("data-src", iframe.getAttribute("src")); iframe.removeAttribute("src");
      }
    });
    function dismissBanner() {
      if (!cookie) return;
      var wasFocused = cookie.contains(doc.activeElement);
      cookie.classList.remove("is-on"); cookie.hidden = true;
      if (wasFocused && (!modal || modal.hidden)) focusContent();
    }
    function focusContent() {
      var target = $("main") || $(".ftr [data-cookie-settings]");
      if (target) {
        if (!target.hasAttribute("tabindex") && target.tagName === "MAIN") target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    }
    function applyAnalytics() {
      if (!analyticsReady) return;
      try {
        if (consent && consent.analytics) measurement.enable(); else measurement.disable();
      } catch (e) { /* An unavailable optional adapter must never block site navigation or forms. */ }
    }
    function save(external, analytics) {
      var now = new Date(), expiry = new Date(now.getTime()); expiry.setFullYear(expiry.getFullYear() + 1);
      consent = { version: version, essential: true, external: !!external, analytics: analyticsReady && !!analytics,
        updatedAt: now.getTime(), expiresAt: expiry.getTime() };
      store.set("localStorage", key, JSON.stringify(consent));
      dismissBanner(); applyMaps(); applyAnalytics();
    }
    function applyMaps() {
      maps.forEach(function (iframe) {
        var box = iframe.closest(".mapbox"), placeholder = $(".map-consent", box);
        if (!placeholder) {
          placeholder = doc.createElement("div"); placeholder.className = "map-consent";
          placeholder.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><h3>Ofis konumumuz</h3><p>Google Haritalar’ı açtığınızda Google cihaz ve bağlantı bilgilerinizi işleyebilir. Harita, izninizle yüklenir.</p><button type="button" class="btn btn--dark" data-map-load>Haritayı yükle</button>';
          $("[data-map-load]", placeholder).addEventListener("click", function () {
            save(true, consent && consent.analytics);
            // Keep keyboard focus on the newly available map.
            iframe.setAttribute("tabindex", "0"); iframe.focus();
          });
          box.appendChild(placeholder);
        }
        if (consent && consent.external) {
          placeholder.hidden = true; iframe.hidden = false;
          if (!iframe.hasAttribute("src")) iframe.setAttribute("src", iframe.getAttribute("data-src"));
        } else {
          iframe.removeAttribute("src"); iframe.hidden = true; placeholder.hidden = false;
        }
      });
    }
    function closeSettings() {
      if (!modal || modal.hidden) return;
      modal.hidden = true; root.classList.remove("consent-open");
      if (restoreBackground) { restoreBackground(); restoreBackground = null; }
      if (returnFocus && returnFocus.isConnected && !returnFocus.closest("[hidden],[inert]") && returnFocus.getClientRects().length) returnFocus.focus({ preventScroll: true });
      else focusContent();
    }
    function openSettings(trigger) {
      if (!modal) {
        modal = doc.createElement("div"); modal.className = "consent-overlay"; modal.hidden = true;
        modal.innerHTML = '<section class="consent-panel" role="dialog" aria-modal="true" aria-labelledby="consent-title" aria-describedby="consent-description" tabindex="-1"><div class="consent-panel__head"><h2 id="consent-title">Çerez tercihleri</h2><button class="consent-close" type="button" data-consent-close aria-label="Çerez tercihlerini kapat">×</button></div><p id="consent-description">İsteğe bağlı hizmetleri siz seçersiniz. Tercihlerinizi istediğiniz zaman alt bölümdeki “Çerez tercihleri” bağlantısından değiştirebilirsiniz.</p><div class="consent-category"><div><h3>Zorunlu işlevler</h3><p>Tercihlerinizi hatırlar ve sayfa geçişlerini yönetir. Her zaman etkindir.</p></div><span class="consent-required">Her zaman açık</span></div><label class="consent-category" for="consent-external"><span><strong>Harita ve dış içerik</strong><span class="consent-category__description">Google Haritalar’ın yüklenmesine izin verir.</span></span><input type="checkbox" id="consent-external"></label><label class="consent-category" for="consent-analytics"><span><strong>İsteğe bağlı analiz</strong><span class="consent-category__description">Bu sitede isteğe bağlı analiz aracı henüz etkin değil.</span></span><input type="checkbox" id="consent-analytics" disabled></label><div class="btns"><button class="btn" type="button" data-consent-save>Tercihlerimi kaydet</button><button class="btn" type="button" data-consent-reject>İsteğe bağlıları reddet</button></div></section>';
        if (analyticsReady) {
          $("#consent-analytics", modal).disabled = false;
          $('label[for="consent-analytics"] .consent-category__description', modal).textContent = "Site ziyaretlerinin ve iletişim butonu tıklamalarının ölçülmesine izin verir.";
        }
        doc.body.appendChild(modal);
        $("[data-consent-close]", modal).addEventListener("click", closeSettings);
        $("[data-consent-save]", modal).addEventListener("click", function () {
          save($("#consent-external", modal).checked, $("#consent-analytics", modal).checked); closeSettings();
        });
        $("[data-consent-reject]", modal).addEventListener("click", function () { save(false, false); closeSettings(); });
        modal.addEventListener("click", function (e) { if (e.target === modal) closeSettings(); });
        modal.addEventListener("keydown", function (e) {
          if (e.key === "Escape") { e.preventDefault(); closeSettings(); return; }
          trapTab(e, focusable(modal));
        });
      }
      $("#consent-external", modal).checked = !!(consent && consent.external);
      $("#consent-analytics", modal).checked = !!(consent && consent.analytics);
      returnFocus = trigger || doc.activeElement;
      modal.hidden = false; root.classList.add("consent-open");
      restoreBackground = isolate([modal]);
      $(".consent-panel", modal).focus();
    }
    if (cookie) {
      var policy = $("a[href]", cookie), prose = $("p", cookie), buttons = $(".btns", cookie);
      if (prose) prose.textContent = "Tercihlerinizi hatırlamak için zorunlu işlevler kullanıyoruz. Google Haritalar gibi isteğe bağlı dış içerikler" + (analyticsReady ? " ve analiz hizmeti" : "") + " yalnızca izninizle yüklenir.";
      if (buttons) {
        buttons.innerHTML = '<button class="btn" type="button" data-cookie-accept>Tümünü kabul et</button><button class="btn" type="button" data-cookie-reject>İsteğe bağlıları reddet</button><button class="consent-settings" type="button" data-cookie-settings>Tercihleri düzenle</button>';
        if (policy) { policy.className = "consent-settings"; buttons.appendChild(policy); }
        $("[data-cookie-accept]", cookie).addEventListener("click", function () { save(true, analyticsReady); });
        $("[data-cookie-reject]", cookie).addEventListener("click", function () { save(false, false); });
      }
      if (!consent) setTimeout(function () {
        if (consent) return;
        cookie.hidden = false; raf2(function () { cookie.classList.add("is-on"); });
      }, reduce ? 0 : 1600);
    }
    $$('[data-cookie-settings]').forEach(function (button) {
      button.addEventListener("click", function () { openSettings(button); });
    });
    applyMaps(); applyAnalytics();
  })();

  (function () {
    var sel = document.getElementById("il-konu");
    if (!sel || !window.URLSearchParams) return;
    if (new URLSearchParams(location.search).get("konu") === "satis") sel.value = "Satış ve daire bilgisi";
  })();
  $$("form[data-form]").forEach(function (form, formIndex) {
    var done = $(form.getAttribute("data-done")), sending = false;
    var deliveryUnavailable = false, checkingDelivery = false;
    var submitButton = form.querySelector("[type=submit]");
    var deliveryNote = doc.createElement("div"); deliveryNote.className = "form-delivery-note"; deliveryNote.hidden = true;
    deliveryNote.setAttribute("role", "status"); deliveryNote.setAttribute("aria-live", "polite");
    deliveryNote.innerHTML = '<p>E-posta ile form gönderimi henüz açık değil. Telefon veya WhatsApp üzerinden bize ulaşabilirsiniz.</p><div class="form-delivery-note__links"><a href="tel:+905322660409">Bizi arayın</a><a href="https://wa.me/905322660409" target="_blank" rel="noopener noreferrer">WhatsApp ile iletişime geçin</a><button type="button" data-delivery-refresh>Durumu tekrar kontrol et</button></div>';
    var formFoot = $(".form__foot", form);
    form.insertBefore(deliveryNote, formFoot || form.firstChild);
    var status = doc.createElement("div"); status.className = "form-feedback"; status.hidden = true;
    status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    form.appendChild(status);
    function checkDeliveryAvailability() {
      var endpoint = form.getAttribute("data-endpoint");
      if (!endpoint || checkingDelivery || form.getAttribute("data-delivery") === "whatsapp") return;
      checkingDelivery = true;
      var retry = $("[data-delivery-refresh]", deliveryNote); retry.disabled = true;
      var probeController = window.AbortController ? new AbortController() : null;
      var probeTimer = probeController ? setTimeout(function () { probeController.abort(); }, 6000) : null;
      fetch(endpoint, { method: "GET", headers: { "Accept": "application/json" }, credentials: "same-origin", cache: "no-store",
        signal: probeController ? probeController.signal : undefined })
        .then(function (response) {
          if (!response.ok) return null;
          return response.json();
        })
        .then(function (result) {
          if (!result || typeof result.available !== "boolean") return;
          deliveryUnavailable = !result.available;
          deliveryNote.hidden = !deliveryUnavailable;
          if (submitButton && !sending) submitButton.disabled = deliveryUnavailable;
        })
        .catch(function () { /* A failed probe says nothing about the delivery service's availability. */ })
        .finally(function () {
          if (probeTimer) clearTimeout(probeTimer);
          checkingDelivery = false; retry.disabled = false;
        });
    }
    $("[data-delivery-refresh]", deliveryNote).addEventListener("click", checkDeliveryAvailability);
    checkDeliveryAvailability();
    function fieldOf(inp) { return inp.closest(".f") || inp.closest(".check"); }
    function setError(inp, msg) {
      var box = fieldOf(inp); if (!box) return;
      var err = box.querySelector(".err");
      if (!err) { err = doc.createElement("span"); err.className = "err"; box.appendChild(err); }
      if (!err.id) err.id = (inp.id || "form-" + formIndex + "-" + inp.name) + "-error";
      var describedBy = (inp.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
      if (describedBy.indexOf(err.id) < 0) describedBy.push(err.id);
      inp.setAttribute("aria-describedby", describedBy.join(" "));
      inp.setAttribute("aria-invalid", msg ? "true" : "false");
      box.classList.toggle("is-bad", !!msg); err.textContent = msg;
    }
    function check(inp) {
      var box = fieldOf(inp); if (!box) return true;
      var msg = "";
      if (inp.type === "checkbox") { if (inp.required && !inp.checked) msg = "Devam etmek için onay vermeniz gerekiyor."; }
      else if (inp.required && !inp.value.trim()) msg = "Bu alan zorunlu.";
      else if (inp.type === "email" && inp.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value)) msg = "Geçerli bir e-posta adresi yazın.";
      else if (inp.type === "tel" && inp.value && (!/^[+()\d\s.-]+$/.test(inp.value) || inp.value.replace(/\D/g, "").length < 10 || inp.value.replace(/\D/g, "").length > 15)) msg = "Telefon numarasını alan koduyla birlikte yazın.";
      else if (inp.value && inp.maxLength > 0 && inp.value.length > inp.maxLength) msg = "Bu alan en fazla " + inp.maxLength + " karakter olabilir.";
      else if (inp.value && /^(daire_sayisi|kat_sayisi|dukkan_sayisi)$/.test(inp.name) && !/^\d{1,4}$/.test(inp.value.trim())) msg = "Pozitif tam sayı veya sıfır yazın.";
      else if (inp.value && inp.name === "arsa_m2" && (!/^\d{1,8}(?:[.,]\d{1,2})?$/.test(inp.value.trim()) || Number(inp.value.replace(",", ".")) <= 0)) msg = "Geçerli bir alan yazın.";
      setError(inp, msg);
      return !msg;
    }
    $$("input,select,textarea", form).forEach(function (inp) {
      inp.addEventListener("blur", function () { if (inp.value || inp.type === "checkbox") check(inp); });
      inp.addEventListener("input", function () { if (fieldOf(inp) && fieldOf(inp).classList.contains("is-bad")) check(inp); });
    });
    function showStatus(message, failed) {
      status.replaceChildren();
      var p = doc.createElement("p"); p.textContent = message; status.appendChild(p);
      status.classList.toggle("is-error", !!failed); status.hidden = false;
    }
    function whatsappOption(message) {
      showStatus(message, true);
      var note = doc.createElement("p"); note.className = "form-feedback__note";
      note.textContent = "Alternatif olarak mesajınızı WhatsApp’ta hazırlayabilirsiniz. Bilgileriniz yalnızca aşağıdaki butona bastığınızda WhatsApp’a aktarılır; ardından sohbet ekranında Gönder’e basmanız gerekir.";
      var action = doc.createElement("button"); action.type = "button"; action.className = "btn btn--line";
      action.textContent = "WhatsApp’ta hazırla";
      action.addEventListener("click", function () {
        var bad = null; $$("input,select,textarea", form).forEach(function (inp) { if (!check(inp) && !bad) bad = inp; });
        if (bad) { bad.focus(); return; }
        var formType = form.getAttribute("data-form-type") || (form.elements.namedItem("formType") && form.elements.namedItem("formType").value);
        var lines = [formType === "urban" ? "Kentsel dönüşüm başvurusu" : "Gerzoğlu İnşaat iletişim talebi"];
        $$("input,select,textarea", form).forEach(function (inp) {
          if (!inp.name || /^(hidden|checkbox|submit)$/.test(inp.type) || !inp.value.trim()) return;
          var label = inp.id && doc.querySelector('label[for="' + inp.id + '"]');
          lines.push((label ? label.textContent.replace(/\*/g, "").trim() : inp.name) + ": " + inp.value.trim());
        });
        var link = doc.createElement("a");
        link.href = "https://wa.me/905322660409?text=" + encodeURIComponent(lines.join("\n"));
        link.target = "_blank"; link.rel = "noopener noreferrer"; link.click();
      });
      status.appendChild(note); status.appendChild(action);
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      if (deliveryUnavailable) {
        deliveryNote.hidden = false;
        var phoneLink = $("a", deliveryNote); if (phoneLink) phoneLink.focus();
        return;
      }
      status.hidden = true;
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
      if (form.getAttribute("data-delivery") === "whatsapp") {
        whatsappOption("Mesajınız WhatsApp için hazır. Henüz gönderilmedi.");
        return;
      }
      if (!endpoint) {
        whatsappOption("Bu form üzerinden e-posta gönderimi şu anda kullanılamıyor. Bilgileriniz gönderilmedi.");
        return;
      }
      sending = true; form.setAttribute("aria-busy", "true");
      if (btn) btn.disabled = true;
      showStatus("Mesajınız gönderiliyor…", false);
      var controller = window.AbortController ? new AbortController() : null;
      var timeout = controller ? setTimeout(function () { controller.abort(); }, 40000) : null;
      fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "same-origin", body: JSON.stringify(data), signal: controller ? controller.signal : undefined })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (result) {
            if (!response.ok || (result.ok !== true && result.success !== true)) {
              var firstError = null;
              if (result.errors && typeof result.errors === "object") {
                $$("input,select,textarea", form).forEach(function (inp) {
                  if (typeof result.errors[inp.name] === "string") {
                    setError(inp, result.errors[inp.name].slice(0, 200)); if (!firstError) firstError = inp;
                  }
                });
              }
              if (firstError) firstError.focus();
              throw new Error(response.status === 429 ? "Çok sayıda deneme yapıldı. Birkaç dakika sonra tekrar deneyin." :
                response.status === 400 || response.status === 422 ? "Gönderim tamamlanamadı. İşaretli alanları kontrol edip tekrar deneyin." :
                response.status === 503 ? "E-posta üzerinden gönderim şu anda kullanılamıyor. Bilgileriniz gönderilmedi ve bu ekranda korunuyor. Telefon veya WhatsApp ile bize ulaşabilirsiniz." :
                "E-posta gönderimi tamamlanamadı. Bilgileriniz bu ekranda korunuyor; tekrar deneyebilir veya bizi arayabilirsiniz.");
            }
            status.hidden = true;
            finish("Mesajınız gönderildi", "Teşekkür ederiz. Talebiniz info@gerzoglu.com adresine iletildi. Ekibimiz sizinle iletişime geçecek.");
          });
        })
        .catch(function (error) {
          whatsappOption(error.name === "AbortError" ? "Gönderim sonucunu doğrulayamadık. Tekrar göndermeden önce telefon veya WhatsApp ile bize ulaşabilirsiniz. Bilgileriniz bu ekranda korunuyor." : error.message && !/^(Failed to fetch|fetch failed|NetworkError|Load failed)/i.test(error.message) ? error.message : "Gönderim sonucunu bağlantı nedeniyle doğrulayamadık. Tekrar göndermeden önce telefon veya WhatsApp ile bize ulaşabilirsiniz. Bilgileriniz bu ekranda korunuyor.");
        })
        .finally(function () {
          if (timeout) clearTimeout(timeout);
          sending = false; form.removeAttribute("aria-busy"); if (btn) btn.disabled = deliveryUnavailable;
        });
    });
  });

  var yr = $("[data-year]"); if (yr) yr.textContent = new Date().getFullYear();
})();
