(function () {
  "use strict";

  window.RolaTemplateEffects = window.RolaTemplateEffects || {};

  function qsa(root, selector) {
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function reducedMotion() {
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function isEditorMode(root) {
    if (!root) return false;

    if (
      root.classList.contains("design-mode") ||
      root.classList.contains("editor-mode") ||
      root.classList.contains("is-designing") ||
      root.classList.contains("is-editor-preview")
    ) {
      return true;
    }

    return !!root.closest(
      ".design-mode, .editor-mode, .is-designing, .template-editor, " +
      ".canvas-editor, .design-canvas, [data-mode='design'], [data-editor='true']"
    );
  }

  function escHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function publicSlugFromLocation() {
    var path = (window.location && window.location.pathname) || "";
    var match = path.match(/^\/i\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function saveDemoMessage(name, message) {
    try {
      var key = "mau03_demo_wishes";
      var old = JSON.parse(localStorage.getItem(key) || "[]");

      old.unshift({
        guest_name: name,
        message: message,
        created_at: new Date().toISOString()
      });

      localStorage.setItem(key, JSON.stringify(old.slice(0, 30)));
    } catch (error) {
      /* Không làm hỏng thiệp nếu localStorage bị chặn. */
    }
  }

  function postPublicMessage(slug, name, message, emoji) {
    if (!slug) {
      saveDemoMessage(name, message);
      return Promise.resolve({ ok: true, demo: true });
    }

    return fetch("/api/public/" + encodeURIComponent(slug) + "/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guest_name: name,
        message: message,
        emoji: emoji || "💖"
      })
    }).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          if (!response.ok || data.ok === false) {
            throw new Error(data.error || "Chưa gửi được, vui lòng thử lại.");
          }

          return data;
        });
    });
  }

  function makeWishCard(name, message, emoji) {
    emoji = emoji || "💖";
    name = (name || "").trim();

    if (
      ["khách", "khach", "khách mời", "khach moi"].indexOf(
        name.toLowerCase()
      ) !== -1
    ) {
      name = "";
    }

    var nameHtml = name ? "<b>" + escHtml(name) + "</b>" : "";

    return (
      '<div class="wish wish-pink-bar" style="--wish-delay:0ms">' +
      '<span class="wish-emoji">' +
      escHtml(emoji) +
      "</span>" +
      '<span class="wish-body">' +
      nameHtml +
      "<small>" +
      escHtml(message || "") +
      "</small></span>" +
      "</div>"
    );
  }

  function showNewMessage(fromElement, name, message, emoji) {
    var root = fromElement.closest(".tpl-mau03");
    var list = root && root.querySelector("[data-wish-list]");

    if (list) {
      list.insertAdjacentHTML(
        "afterbegin",
        makeWishCard(name, message, emoji)
      );
    }
  }

  /* ========================================================
     ẢNH LỖI
     ======================================================== */

  function initImageFallback(root) {
    qsa(root, "img").forEach(function (image) {
      if (image.dataset.mau03ImageReady === "1") return;
      image.dataset.mau03ImageReady = "1";

      function markMissing() {
        var frame = image.closest("figure") || image.parentElement;
        if (frame) frame.classList.add("is-image-missing");
      }

      image.addEventListener("error", markMissing);

      if (image.complete && !image.naturalWidth) {
        markMissing();
      }
    });
  }

  /* ========================================================
     INTRO BAO THƯ — lấy nguyên bố cục, thông số hiệu ứng và bảng màu
     từ mẫu 1 (phong bì mở, hoa rơi nền, thẻ thư rơi xuống).
     ======================================================== */

  function prepareLetterReveal(intro) {
    qsa(intro, "[data-letter-reveal]").forEach(function (item) {
      var delay = Number(item.dataset.delay || 0);
      item.style.setProperty("--letter-delay", delay + "ms");
    });
  }

  function initLetterPetals(root) {
    var canvas = root.querySelector("[data-letter-petals]");
    var intro = root.querySelector("[data-letter-intro]");

    if (!canvas || !intro) return;
    // Màn lá thư đã bị ẩn (nhúng trong iframe xem nhanh) thì không cần vẽ
    // gì cả, đỡ tốn tài nguyên vô ích.
    if (getComputedStyle(intro).display === "none") return;
    if (canvas.dataset.mau03PetalsReady === "1") return;
    canvas.dataset.mau03PetalsReady = "1";

    if (reducedMotion()) return;

    var context = canvas.getContext("2d");
    if (!context) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [];
    var bursts = [];
    var frameId = 0;
    var running = true;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    }

    function createParticle(spread) {
      var size = (11 + Math.random() * 13) * dpr;

      return {
        x: Math.random() * canvas.width,
        y: spread ? Math.random() * canvas.height : -size * 2,
        size: size,
        speed: (7 + Math.random() * 8) * dpr / 60,
        drift: (Math.random() - .5) * .25 * dpr,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - .5) * .008,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: .005 + Math.random() * .009
      };
    }

    function drawParticle(particle, sizeOverride, opacityOverride) {
      var s = sizeOverride == null ? particle.size : sizeOverride;
      if (s <= .6) return;
      context.save();
      context.globalAlpha = opacityOverride == null ? 1 : Math.max(0, opacityOverride);
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      var grad = context.createLinearGradient(0, -s / 2, 0, s / 2);
      grad.addColorStop(0, "#fff7f9");
      grad.addColorStop(.55, "#ffc3d6");
      grad.addColorStop(1, "#ff7fa2");
      context.fillStyle = grad;
      context.beginPath();
      context.ellipse(0, 0, s * .32, s * .5, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    function createBurst() {
      var size = (8 + Math.random() * 13) * dpr;

      return {
        x: Math.random() * canvas.width,
        y: -canvas.height * .12 + Math.random() * canvas.height * .78,
        size: size,
        vx: (Math.random() - .5) * .3 * dpr,
        vy: (6 + Math.random() * 9) * dpr / 60,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - .5) * .012,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: .005 + Math.random() * .007,
        startedAt: performance.now(),
        life: 3600 + Math.random() * 2200
      };
    }

    function render() {
      if (!running) return;

      context.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(function (particle) {
        particle.y += particle.speed;
        particle.sway += particle.swaySpeed;
        particle.x += particle.drift + Math.sin(particle.sway) * .25 * dpr;
        particle.rotation += particle.spin;

        if (particle.y - particle.size > canvas.height) {
          particle.y = -particle.size;
          particle.x = Math.random() * canvas.width;
        }
        if (particle.x < -particle.size) particle.x = canvas.width + particle.size;
        if (particle.x > canvas.width + particle.size) particle.x = -particle.size;

        drawParticle(particle);
      });

      if (bursts.length) {
        var now = performance.now();
        bursts = bursts.filter(function (burst) {
          var age = now - burst.startedAt;
          if (age >= burst.life) return false;

          burst.sway += burst.swaySpeed;
          burst.x += burst.vx + Math.sin(burst.sway) * .25 * dpr;
          burst.y += burst.vy;
          burst.rotation += burst.spin;

          var t = age / burst.life;
          var alpha = t < .18 ? t / .18 : (t < .78 ? 1 : 1 - (t - .78) / .22);
          drawParticle(burst, burst.size, alpha);
          return true;
        });
      }

      frameId = requestAnimationFrame(render);
    }

    resize();

    var count = Math.max(
      24,
      Math.min(46, Math.round((canvas.width * canvas.height) / (52000 * dpr * dpr)))
    );

    for (var index = 0; index < count; index += 1) {
      particles.push(createParticle(true));
    }

    window.addEventListener("resize", resize);
    render();

    intro.addEventListener("mau03:letter-bursting", function () {
      for (var i = 0; i < 200; i += 1) {
        bursts.push(createBurst());
      }
    });

    intro.addEventListener(
      "mau03:intro-closed",
      function () {
        running = false;
        cancelAnimationFrame(frameId);
        window.removeEventListener("resize", resize);
      },
      { once: true }
    );
  }

  function initLetterIntro(root) {
    var intro = root.querySelector("[data-letter-intro]");
    var openButton = intro && intro.querySelector("[data-letter-open]");
    var card = intro && intro.querySelector(".mau03-letter-card");
    var body = root.querySelector(".mau03-body");

    // Khung xem nhanh ở trang chọn mẫu nhúng thiệp trong iframe nhỏ — màn
    // lá thư phủ kín sẽ chặn mất phần kéo xem nội dung thật bên trong.
    // Chỉ hiện màn lá thư khi thiệp được mở trực tiếp (link thật / "Xem
    // đầy đủ"), không hiện khi đang nhúng trong iframe xem nhanh.
    var inIframe = true;
    try { inIframe = window.self !== window.top; } catch (error) { inIframe = true; }

    if (!intro || !openButton || inIframe) {
      if (intro) intro.style.display = "none";
      root.classList.add("is-content-visible");
      if (body) body.removeAttribute("aria-hidden");
      startBodyReveal(root);
      initSectionMotion(root);
      return;
    }

    if (intro.dataset.mau03IntroReady === "1") return;
    intro.dataset.mau03IntroReady = "1";

    prepareLetterReveal(intro);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        intro.classList.add("is-ready");
      });
    });

    var opening = false;

    function finishOpening() {
      intro.style.display = "none";
      intro.dispatchEvent(new Event("mau03:intro-closed"));

      root.classList.add("is-content-visible");

      if (body) {
        body.removeAttribute("aria-hidden");
      }

      startBodyReveal(root);
      initSectionMotion(root);
    }

    function openLetter() {
      if (opening) return;
      opening = true;

      openButton.disabled = true;
      openButton.querySelector("span").textContent = "Đang mở...";
      intro.classList.add("is-opening");
      intro.dispatchEvent(new CustomEvent("mau03:letter-bursting"));

      if (reducedMotion()) {
        window.setTimeout(function () {
          intro.classList.add("is-leaving");
        }, 40);
        window.setTimeout(finishOpening, 120);
        return;
      }

      // Ba bước nối tiếp, đúng nhịp mở thư của mẫu 1: (1) thẻ thư trôi rơi
      // xuống sau khi bao thư đã rung mở, (2) nền lá thư mới bắt đầu mờ đi,
      // (3) gỡ hẳn màn lá thư — tách riêng để không bị chồng lấn, nhìn giật.
      var CARD_FALL_DELAY = 1300;
      var CARD_FALL_DURATION = 1300;
      var LEAVE_DURATION = 1100;

      window.setTimeout(function () {
        if (card) card.classList.add("is-falling");
      }, CARD_FALL_DELAY);

      window.setTimeout(function () {
        intro.classList.add("is-leaving");
      }, CARD_FALL_DELAY + CARD_FALL_DURATION);

      window.setTimeout(
        finishOpening,
        CARD_FALL_DELAY + CARD_FALL_DURATION + LEAVE_DURATION
      );
    }

    openButton.addEventListener("click", openLetter);
  }



  /* ========================================================
     KIM CƯƠNG ĐỎ NHẠT
     ======================================================== */

  function softRedDiamondSvg() {
    return (
      '<svg viewBox="0 0 72 54" aria-hidden="true">' +
      '<polygon points="8,16 22,4 50,4 64,16 36,50" ' +
      'fill="rgba(222,145,157,.22)" stroke="rgba(171,67,84,.48)" stroke-width="1"/>' +
      '<polygon points="8,16 22,4 28,16" fill="rgba(255,236,239,.58)"/>' +
      '<polygon points="22,4 36,16 28,16" fill="rgba(210,108,124,.22)"/>' +
      '<polygon points="22,4 50,4 36,16" fill="rgba(255,246,247,.62)"/>' +
      '<polygon points="50,4 44,16 36,16" fill="rgba(194,82,100,.18)"/>' +
      '<polygon points="50,4 64,16 44,16" fill="rgba(255,229,233,.50)"/>' +
      '<polygon points="8,16 28,16 36,50" fill="rgba(225,143,155,.18)"/>' +
      '<polygon points="28,16 36,16 36,50" fill="rgba(255,242,244,.45)"/>' +
      '<polygon points="36,16 44,16 36,50" fill="rgba(184,70,89,.14)"/>' +
      '<polygon points="44,16 64,16 36,50" fill="rgba(239,181,190,.24)"/>' +
      '<polyline points="8,16 28,16 36,50 44,16 64,16" ' +
      'fill="none" stroke="rgba(158,56,74,.30)" stroke-width=".8"/>' +
      '</svg>'
    );
  }

  function initSoftRedDiamonds(root) {
    var layer = root.querySelector("[data-diamond-layer]");
    if (!layer || layer.dataset.mau03DiamondReady === "1") return;

    layer.dataset.mau03DiamondReady = "1";

    var count = window.innerWidth <= 390 ? 11 : 14;

    for (var index = 0; index < count; index += 1) {
      var diamond = document.createElement("span");
      var edgeParticle = Math.random() < .72;
      var left;

      if (edgeParticle) {
        left = Math.random() < .5
          ? 3 + Math.random() * 18
          : 79 + Math.random() * 18;
      } else {
        left = 26 + Math.random() * 48;
      }

      var size = edgeParticle
        ? 10 + Math.random() * 7
        : 7 + Math.random() * 5;

      var duration = 13 + Math.random() * 8;
      var delay = -(Math.random() * duration);
      var drift = -18 + Math.random() * 36;
      var opacity = edgeParticle
        ? .18 + Math.random() * .15
        : .08 + Math.random() * .08;

      diamond.className = "mau03-red-diamond";
      diamond.innerHTML = softRedDiamondSvg();
      diamond.style.setProperty("--diamond-left", left.toFixed(2) + "%");
      diamond.style.setProperty("--diamond-size", size.toFixed(1) + "px");
      diamond.style.setProperty("--diamond-duration", duration.toFixed(2) + "s");
      diamond.style.setProperty("--diamond-delay", delay.toFixed(2) + "s");
      diamond.style.setProperty("--diamond-drift", drift.toFixed(1) + "px");
      diamond.style.setProperty("--diamond-opacity", opacity.toFixed(2));

      layer.appendChild(diamond);
    }
  }

  /* ========================================================
     REVEAL KHI CUỘN
     ======================================================== */

  function prepareRevealItems(root) {
    var items = qsa(
      root,
      ".mau03-body [data-reveal], .mau03-body [data-reveal-line]"
    );

    items.forEach(function (item) {
      item.classList.remove("is-visible", "is-settled");

      var delay = Number(item.dataset.delay || 0);
      var slowDelay = Math.round(delay * 1.35);
      item.style.setProperty("--reveal-delay", slowDelay + "ms");
    });

    return items;
  }

  function revealBodyItem(item) {
    if (!item || item.classList.contains("is-visible")) return;

    item.classList.add("is-visible");

    window.setTimeout(function () {
      item.classList.add("is-settled");
    }, reducedMotion() ? 0 : 1750);
  }

  function startBodyReveal(root) {
    if (root.dataset.revealStarted === "true") return;
    root.dataset.revealStarted = "true";

    var items = prepareRevealItems(root);

    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(revealBodyItem);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          revealBodyItem(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });

    /*
      Chỉ cứu các phần tử đang ở gần màn hình nếu trình duyệt bỏ lỡ observer.
      Không hiện sẵn toàn bộ trang, nên animation các phần phía dưới vẫn còn.
    */
    window.setTimeout(function () {
      items.forEach(function (item) {
        if (item.classList.contains("is-visible")) return;

        var rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight * 1.25 && rect.bottom > -100) {
          revealBodyItem(item);
        }
      });
    }, 5200);
  }

  function initSectionMotion(root) {
    if (root.dataset.sectionMotionReady === "1") return;
    root.dataset.sectionMotionReady = "1";

    var sections = qsa(root, ".mau03-body .mau03-section");
    if (!sections.length) return;

    if (reducedMotion() || !("IntersectionObserver" in window)) {
      sections.forEach(function (section) {
        section.classList.add("is-section-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-section-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: .12,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ========================================================
     ALBUM / LIGHTBOX
     ======================================================== */

  function initGallery(root) {
    var section = root.querySelector(".mau03-gallery-section");

    if (!section || section.dataset.mau03GalleryReady === "1") return;
    section.dataset.mau03GalleryReady = "1";

    var images = qsa(section, "[data-lightbox-item] img");
    if (!images.length) return;

    var lightbox = document.createElement("div");
    lightbox.className = "mau03-lightbox";
    lightbox.setAttribute("aria-hidden", "true");

    lightbox.innerHTML =
      '<button type="button" class="mau03-lightbox-close" aria-label="Đóng ảnh">✕</button>' +
      '<button type="button" class="mau03-lightbox-nav mau03-lightbox-prev" aria-label="Ảnh trước">‹</button>' +
      '<img class="mau03-lightbox-stage" alt="Ảnh cưới phóng to">' +
      '<button type="button" class="mau03-lightbox-nav mau03-lightbox-next" aria-label="Ảnh sau">›</button>';

    root.appendChild(lightbox);

    var stage = lightbox.querySelector(".mau03-lightbox-stage");
    var currentIndex = 0;

    function show(index) {
      currentIndex = (index + images.length) % images.length;
      stage.src = images[currentIndex].currentSrc || images[currentIndex].src;
      stage.alt = images[currentIndex].alt || "Ảnh cưới phóng to";
    }

    function open(index) {
      show(index);
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
    }

    function close() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
    }

    images.forEach(function (image, index) {
      image.addEventListener("click", function () {
        open(index);
      });
    });

    lightbox
      .querySelector(".mau03-lightbox-close")
      .addEventListener("click", close);

    lightbox
      .querySelector(".mau03-lightbox-prev")
      .addEventListener("click", function () {
        show(currentIndex - 1);
      });

    lightbox
      .querySelector(".mau03-lightbox-next")
      .addEventListener("click", function () {
        show(currentIndex + 1);
      });

    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) close();
    });

    document.addEventListener("keydown", function (event) {
      if (!lightbox.classList.contains("is-open")) return;

      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") show(currentIndex - 1);
      if (event.key === "ArrowRight") show(currentIndex + 1);
    });

    var pointerStartX = null;

    lightbox.addEventListener("pointerdown", function (event) {
      pointerStartX = event.clientX;
    });

    lightbox.addEventListener("pointerup", function (event) {
      if (pointerStartX == null) return;

      var distance = event.clientX - pointerStartX;
      pointerStartX = null;

      if (Math.abs(distance) < 40) return;

      if (distance > 0) {
        show(currentIndex - 1);
      } else {
        show(currentIndex + 1);
      }
    });
  }

  /* ========================================================
     RSVP
     ======================================================== */

  function initRsvp(root) {
    qsa(root, "[data-rsvp-form]").forEach(function (form) {
      if (form.dataset.mau03RsvpReady === "1") return;
      form.dataset.mau03RsvpReady = "1";

      var result = form.querySelector("[data-rsvp-result]");
      var button = form.querySelector(".mau03-rsvp-submit");

      form.addEventListener("submit", function (event) {
        event.preventDefault();

        var nameInput = form.querySelector('[name="guest_name"]');
        var countInput = form.querySelector('[name="guest_count"]');
        var noteInput = form.querySelector('[name="guest_note"]');
        var attendanceInput = form.querySelector(
          '[name="attendance"]:checked'
        );

        var name = ((nameInput && nameInput.value) || "").trim();
        var count = ((countInput && countInput.value) || "1 người").trim();
        var note = ((noteInput && noteInput.value) || "").trim();
        var attending =
          !attendanceInput || attendanceInput.value !== "no";

        form.classList.remove("is-error", "is-sent");

        if (!name) {
          form.classList.add("is-error");
          if (result) result.textContent = "Bạn nhập tên trước khi gửi nhé.";
          return;
        }

        var message = attending
          ? "[RSVP] " + name + " xác nhận tham dự - " + count
          : "[RSVP] " + name + " báo bận, không thể tham dự";

        if (note) {
          message += " - Lời nhắn: " + note;
        }

        form.classList.add("is-sending");

        if (button) {
          button.disabled = true;
          button.dataset.oldText = button.textContent;
          button.textContent = "Đang gửi...";
        }

        if (result) {
          result.textContent = "Đang gửi xác nhận...";
        }

        postPublicMessage(
          publicSlugFromLocation(),
          name,
          message,
          "📅"
        )
          .then(function (data) {
            form.classList.remove("is-sending");
            form.classList.add("is-sent");

            if (button) {
              button.disabled = false;
              button.textContent = "Đã gửi xác nhận";
            }

            if (result) {
              result.textContent =
                data && data.demo
                  ? "Đã lưu xác nhận trên bản xem thử."
                  : "Đã nhận xác nhận của bạn. Cảm ơn bạn!";
            }

            showNewMessage(form, name, message, "📅");
          })
          .catch(function (error) {
            form.classList.remove("is-sending");
            form.classList.add("is-error");

            if (button) {
              button.disabled = false;
              button.textContent =
                button.dataset.oldText || "Gửi xác nhận";
            }

            if (result) {
              result.textContent =
                error.message ||
                "Chưa gửi được xác nhận, vui lòng thử lại.";
            }
          });
      });
    });
  }

  /* ========================================================
     LỜI CHÚC
     ======================================================== */

  function initWishForm(root) {
    qsa(root, "[data-wish-form]").forEach(function (form) {
      if (form.dataset.mau03WishReady === "1") return;
      form.dataset.mau03WishReady = "1";

      var result = form.querySelector("[data-wish-result]");
      var button = form.querySelector(".mau03-wish-submit");
      var emojiInput = form.querySelector("[data-emoji-value]");

      qsa(form, "[data-emoji]").forEach(function (emojiButton) {
        emojiButton.addEventListener("click", function () {
          qsa(form, "[data-emoji]").forEach(function (item) {
            item.classList.remove("active");
          });

          emojiButton.classList.add("active");

          if (emojiInput) {
            emojiInput.value = emojiButton.dataset.emoji || "💖";
          }
        });
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();

        var nameInput = form.querySelector('[name="guest_name"]');
        var messageInput = form.querySelector('[name="message"]');

        var name = ((nameInput && nameInput.value) || "").trim();
        var message = ((messageInput && messageInput.value) || "").trim();
        var emoji = ((emojiInput && emojiInput.value) || "💖").trim();

        form.classList.remove("is-error", "is-sent");

        if (message.length < 2) {
          form.classList.add("is-error");
          if (result) {
            result.textContent =
              "Bạn nhập lời chúc rõ hơn một chút rồi gửi lại nha.";
          }
          return;
        }

        form.classList.add("is-sending");

        if (button) {
          button.disabled = true;
          button.dataset.oldText = button.textContent;
          button.textContent = "Đang gửi...";
        }

        postPublicMessage(
          publicSlugFromLocation(),
          name,
          message,
          emoji
        )
          .then(function (data) {
            form.classList.remove("is-sending");
            form.classList.add("is-sent");

            if (button) {
              button.disabled = false;
              button.textContent =
                button.dataset.oldText || "Gửi lời chúc";
            }

            if (result) {
              result.textContent =
                data && data.demo
                  ? "Đã hiện lời chúc trên bản xem thử."
                  : "Đã gửi lời chúc 💖";
            }

            if (messageInput) {
              messageInput.value = "";
            }

            showNewMessage(form, name, message, emoji);
          })
          .catch(function (error) {
            form.classList.remove("is-sending");
            form.classList.add("is-error");

            if (button) {
              button.disabled = false;
              button.textContent =
                button.dataset.oldText || "Gửi lời chúc";
            }

            if (result) {
              result.textContent =
                error.message ||
                "Chưa gửi được lời chúc, vui lòng thử lại.";
            }
          });
      });
    });
  }

  /* ========================================================
     NHẠC
     ======================================================== */

  function initMusic(root) {
    qsa(root, "[data-audio-src]").forEach(function (button) {
      if (window.NhaYenMusicController) window.NhaYenMusicController.bind(root, button);
    });
  }

  /* ========================================================
     VỀ ĐẦU TRANG
     ======================================================== */

  function initBackToTop(root) {
    qsa(root, "[data-back-to-top]").forEach(function (button) {
      if (button.dataset.mau03TopReady === "1") return;
      button.dataset.mau03TopReady = "1";

      function update() {
        button.classList.toggle("is-visible", window.scrollY > 650);
      }

      window.addEventListener("scroll", update, { passive: true });
      update();

      button.addEventListener("click", function () {
        window.scrollTo({
          top: 0,
          behavior: reducedMotion() ? "auto" : "smooth"
        });
      });
    });
  }

  /* ========================================================
     HÀM KHỞI TẠO CHÍNH
     ======================================================== */

  /* ========================================================
     BẢN ĐỒ — nhúng Google Maps từ link data-map-url, có màn dự
     phòng khi đơn chưa dán link.
     ======================================================== */

  /* Ưu tiên dựng URL nhúng từ ĐỊA CHỈ CHỮ (mau03-map-address) thay vì link
     data-map-url dán sẵn — link "Chia sẻ" copy từ Google Maps (kể cả link
     rút gọn maps.app.goo.gl) thường bị Google chặn nhúng iframe, nhét
     nguyên link đó vào q= sẽ ra trang báo "không xác định được vị trí"
     thay vì bản đồ. Địa chỉ chữ luôn dựng được URL nhúng hợp lệ, không cần
     API key (đã áp dụng ở mẫu 2). Chỉ dùng lại link dán sẵn khi không có
     địa chỉ chữ. */
  function buildMapEmbed(address, url) {
    var query = String(address || "").trim();
    if (query && query.indexOf("{{") === -1) {
      return "https://www.google.com/maps?q=" + encodeURIComponent(query) + "&output=embed";
    }
    url = String(url || "").trim();
    if (!url || url === "#" || url.indexOf("{{") !== -1) return "";
    if (url.indexOf("/maps/embed") !== -1 || url.indexOf("output=embed") !== -1) return url;
    return "https://www.google.com/maps?q=" + encodeURIComponent(url) + "&output=embed";
  }

  function initMap(root) {
    var frame = root.querySelector("[data-map-frame]");
    var empty = root.querySelector("[data-map-empty]");
    if (!frame) return;
    var addressEl = root.querySelector(".mau03-map-address");
    var embed = buildMapEmbed(addressEl && addressEl.textContent, root.getAttribute("data-map-url"));
    if (!embed) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    frame.src = embed;
    frame.addEventListener(
      "error",
      function () {
        if (empty) empty.hidden = false;
      },
      { once: true }
    );
  }

  window.RolaTemplateEffects.mau03 = function (root) {
    if (!root || !root.querySelector) return;
    if (root.dataset.fxReady === "1") return;

    root.dataset.fxReady = "1";

    if (isEditorMode(root)) {
      root.classList.add("is-editor-preview", "is-content-visible");

      var editorBody = root.querySelector(".mau03-body");
      if (editorBody) editorBody.removeAttribute("aria-hidden");

      initImageFallback(root);
      initSoftRedDiamonds(root);
      return;
    }

    root.classList.add("is-js");

    initImageFallback(root);
    initGallery(root);
    initRsvp(root);
    initWishForm(root);
    initMusic(root);
    initBackToTop(root);
    initSoftRedDiamonds(root);
    initLetterIntro(root);
    initLetterPetals(root);
    initMap(root);
  };

  /* Chạy được cả khi mở trực tiếp lẫn khi hệ thống gọi effect loader. */
  function autoInit() {
    qsa(document, ".tpl-mau03").forEach(function (root) {
      window.RolaTemplateEffects.mau03(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit, { once: true });
  } else {
    autoInit();
  }

  /* Hỗ trợ template được fetch và chèn vào DOM sau DOMContentLoaded. */
  if ("MutationObserver" in window) {
    var observer = new MutationObserver(function (mutations) {
      var shouldScan = mutations.some(function (mutation) {
        return mutation.addedNodes && mutation.addedNodes.length;
      });

      if (shouldScan) autoInit();
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }
})();
