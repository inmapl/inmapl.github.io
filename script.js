const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ══════════ Sonidos (WebAudio, sintetizados) ══════════ */
const Sound = (() => {
  let ctx = null;
  let muted = localStorage.getItem("cv-sound") === "off";
  let lastHover = 0;

  const ensureCtx = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  const tone = (freq, endFreq, duration, volume, type = "sine") => {
    if (muted) return;
    const ac = ensureCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const now = ac.currentTime;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  };

  return {
    hover() {
      const now = performance.now();
      if (now - lastHover < 80) return; // no ametrallar
      lastHover = now;
      tone(1900, 2100, 0.045, 0.012);
    },
    click() {
      tone(340, 190, 0.11, 0.045, "triangle");
    },
    on() {
      tone(520, 780, 0.14, 0.05);
    },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      localStorage.setItem("cv-sound", muted ? "off" : "on");
      if (!muted) this.on();
      return muted;
    },
  };
})();

/* ══════════ Tema claro / oscuro ══════════ */
// El tema inicial lo fija un script inline en el <head> para evitar parpadeo
const themeBtn = document.getElementById("themeToggle");
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("cv-theme", next);
});

// Toggle de sonido en la nav
const soundBtn = document.getElementById("soundToggle");
soundBtn.classList.toggle("muted", Sound.muted);
soundBtn.addEventListener("click", () => {
  soundBtn.classList.toggle("muted", Sound.toggle());
});

// Hover: tick sutil en elementos interactivos
document
  .querySelectorAll("a, button, .area-card, .edu-card, .xp-row, .diff-item")
  .forEach((el) => el.addEventListener("mouseenter", () => Sound.hover()));

// Click: pop suave en enlaces y botones
document
  .querySelectorAll("a, button")
  .forEach((el) => el.addEventListener("click", () => Sound.click()));

/* ══════════ Reveal on scroll con stagger ══════════ */
const revealObserver = new IntersectionObserver(
  (entries) => {
    // Los elementos que entran a la vez se escalonan entre sí
    let order = 0;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.style.setProperty("--stagger", `${order * 0.09}s`);
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
      order++;
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ══════════ Scroll suave con easing propio ══════════ */
const easeInOutQuint = (t) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

const smoothScrollTo = (targetY, duration = 950) => {
  const startY = window.scrollY;
  const diff = targetY - startY;
  const start = performance.now();

  const step = (now) => {
    const p = Math.min((now - start) / duration, 1);
    window.scrollTo(0, startY + diff * easeInOutQuint(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    if (reducedMotion) {
      target.scrollIntoView();
    } else {
      const navOffset = 64;
      smoothScrollTo(target.getBoundingClientRect().top + window.scrollY - navOffset);
    }
    history.pushState(null, "", link.getAttribute("href"));
  });
});

/* ══════════ Nav, barra de progreso y parallax del hero ══════════ */
const nav = document.querySelector(".nav");
const progressBar = document.querySelector(".progress-bar");
const heroContent = document.querySelector(".hero-content");
let ticking = false;

const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 40);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";

    // El hero se aleja y desvanece suavemente al bajar
    if (!reducedMotion && y < window.innerHeight) {
      heroContent.style.transform = `translateY(${y * 0.28}px)`;
      heroContent.style.opacity = 1 - Math.min(y / (window.innerHeight * 0.75), 1);
    }

    ticking = false;
  });
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ══════════ Contacto ofuscado ══════════ */
// Los datos no existen en el HTML: se guardan en trozos invertidos y se
// ensamblan solo cuando el visitante pulsa "mostrar", para que los bots
// que cosechan emails/teléfonos del código fuente no los encuentren.
const unscramble = (chunks) =>
  chunks
    .slice()
    .reverse()
    .map((s) => s.split("").reverse().join(""))
    .join("");

const setupReveal = (id, buildHref, buildText) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", (e) => {
    if (el.dataset.revealed === "no") {
      e.preventDefault();
      el.href = buildHref();
      el.textContent = buildText();
      el.dataset.revealed = "yes";
    }
  });
};

setupReveal(
  "revealMail",
  () => "otliam".split("").reverse().join("") + ":" +
        unscramble(["m", "oc.li", "amg@6", "9zepo", "lzere", "pamni"]),
  () => unscramble(["m", "oc.li", "amg@6", "9zepo", "lzere", "pamni"])
);

setupReveal(
  "revealPhone",
  () => "let".split("").reverse().join("") + ":" +
        unscramble(["98", "92132", "9643+"]),
  () => {
    const n = unscramble(["98", "92132", "9643+"]).slice(3);
    return `${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}`;
  }
);

/* ══════════ Contadores animados ══════════ */
const animateCount = (el) => {
  const target = parseInt(el.dataset.count, 10);
  const duration = 1200;
  const start = performance.now();

  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll("[data-count]").forEach(animateCount);
        statObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 }
);

const stats = document.querySelector(".stats");
if (stats) statObserver.observe(stats);
