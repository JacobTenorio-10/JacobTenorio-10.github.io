/* ===================================
   Jacob Tenorio Portfolio — Script
   Particle flow field, scroll reveals,
   streamline animations, nav effects
   =================================== */

(function () {
  'use strict';

  /* ---------------------------------
     CFD FLOW VISUALIZATION (Canvas)
     Potential flow: uniform freestream
     + Rankine vortices. Particles are
     advected & colored by velocity mag.
     --------------------------------- */
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');

  // Offscreen canvas for star layer (drawn once, composited each frame)
  const starCanvas = document.createElement('canvas');
  const starCtx = starCanvas.getContext('2d');

  let tracers = [];
  let vortices = [];
  let scrollY = 0;
  let animId;
  let globalTime = 0;

  const TRACER_COUNT = 500;
  const STAR_COUNT = 220;
  const FREESTREAM_U = 0.1;           // px/frame base freestream speed
  const VORTEX_COUNT = 5;
  const DT = 0.1;                     // advection timestep

  // Velocity-magnitude color stops (same palette)
  // low → mid → high  :  deep-blue → cyan → orange
  const COLOR_STOPS = [
    { t: 0.0,  r: 0,   g: 50,  b: 120 },   // very slow — deep navy
    { t: 0.25, r: 0,   g: 119, b: 182 },   // slow — accent-deep
    { t: 0.5,  r: 0,   g: 180, b: 216 },   // medium — accent-blue
    { t: 0.75, r: 0,   g: 240, b: 255 },   // fast — accent-cyan
    { t: 1.0,  r: 255, g: 107, b: 53  },   // very fast — accent-orange
  ];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    starCanvas.width = canvas.width;
    starCanvas.height = canvas.height;
    drawStars();
  }

  /* --- Stars (static backdrop) --- */
  function drawStars() {
    starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
    for (let i = 0; i < STAR_COUNT; i++) {
      const x = Math.random() * starCanvas.width;
      const y = Math.random() * starCanvas.height;
      const r = Math.random() * 1.1;
      const a = 0.15 + Math.random() * 0.35;
      starCtx.beginPath();
      starCtx.arc(x, y, r, 0, Math.PI * 2);
      starCtx.fillStyle = `rgba(200, 220, 255, ${a})`;
      starCtx.fill();
    }
  }

  /* --- Vortex (Rankine model) --- */
  class Vortex {
    constructor() {
      this.reset();
    }
    reset() {
      const W = canvas.width;
      const H = canvas.height;
      this.x = W * 0.1 + Math.random() * W * 0.8;
      this.y = H * 0.1 + Math.random() * H * 0.8;
      this.coreRadius = 40 + Math.random() * 80;
      this.strength = (Math.random() < 0.5 ? -1 : 1) * (3000 + Math.random() * 6000);
      // Slow drift
      this.driftVx = (Math.random() - 0.5) * 0.15;
      this.driftVy = (Math.random() - 0.5) * 0.08;
      // Oscillation
      this.oscAmpX = 20 + Math.random() * 60;
      this.oscAmpY = 10 + Math.random() * 40;
      this.oscFreqX = 0.0003 + Math.random() * 0.0006;
      this.oscFreqY = 0.0004 + Math.random() * 0.0007;
      this.oscPhaseX = Math.random() * Math.PI * 2;
      this.oscPhaseY = Math.random() * Math.PI * 2;
      this.baseX = this.x;
      this.baseY = this.y;
    }
    update(time) {
      this.baseX += this.driftVx;
      this.baseY += this.driftVy;
      this.x = this.baseX + Math.sin(time * this.oscFreqX + this.oscPhaseX) * this.oscAmpX;
      this.y = this.baseY + Math.cos(time * this.oscFreqY + this.oscPhaseY) * this.oscAmpY;
      // Wrap around with margin
      const margin = 150;
      if (this.baseX < -margin) this.baseX = canvas.width + margin;
      if (this.baseX > canvas.width + margin) this.baseX = -margin;
      if (this.baseY < -margin) this.baseY = canvas.height + margin;
      if (this.baseY > canvas.height + margin) this.baseY = -margin;
    }
    // Returns induced velocity [vx, vy] at point (px, py) — Rankine vortex
    velocityAt(px, py) {
      const dx = px - this.x;
      const dy = py - this.y;
      const r2 = dx * dx + dy * dy;
      const r = Math.sqrt(r2);
      const rc = this.coreRadius;
      let vTheta;
      if (r < rc) {
        // Solid-body rotation inside core
        vTheta = (this.strength * r) / (2 * Math.PI * rc * rc);
      } else {
        // Irrotational outside core
        vTheta = this.strength / (2 * Math.PI * r);
      }
      // Tangential direction: perpendicular to radial
      if (r < 1) return [0, 0];
      const vx = -vTheta * dy / r;
      const vy =  vTheta * dx / r;
      return [vx, vy];
    }
  }

  /* --- Velocity field query --- */
  function getVelocity(px, py) {
    // Freestream (left → right, slight scroll influence)
    let vx = FREESTREAM_U * (1 + scrollY * 0.0002);
    let vy = 0;
    // Sum vortex contributions
    for (const v of vortices) {
      const [dvx, dvy] = v.velocityAt(px, py);
      vx += dvx;
      vy += dvy;
    }
    return [vx, vy];
  }

  /* --- Velocity → color mapping --- */
  function velocityColor(vx, vy, alpha) {
    const mag = Math.sqrt(vx * vx + vy * vy);
    // Normalize magnitude (0–1). Typical range ~0.5 to ~5
    const t = Math.min(1, Math.max(0, (mag - 0.3) / 4.5));
    // Interpolate between color stops
    let i = 0;
    for (; i < COLOR_STOPS.length - 2; i++) {
      if (t <= COLOR_STOPS[i + 1].t) break;
    }
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    const localT = (t - a.t) / (b.t - a.t);
    const r = Math.round(a.r + (b.r - a.r) * localT);
    const g = Math.round(a.g + (b.g - a.g) * localT);
    const bl = Math.round(a.b + (b.b - a.b) * localT);
    return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
  }

  /* --- Flow tracer particle --- */
  class Tracer {
    constructor() {
      this.reset(true);
    }
    reset(initial = false) {
      if (initial) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      } else {
        // Re-enter from the left edge or random edge
        const edge = Math.random();
        if (edge < 0.7) {
          this.x = -5;
          this.y = Math.random() * canvas.height;
        } else if (edge < 0.85) {
          this.x = Math.random() * canvas.width;
          this.y = -5;
        } else {
          this.x = Math.random() * canvas.width;
          this.y = canvas.height + 5;
        }
      }
      this.life = 0;
      this.maxLife = 200 + Math.floor(Math.random() * 300);
      this.size = 1.0 + Math.random() * 1.5;
      this.prevX = this.x;
      this.prevY = this.y;
    }
    update() {
      this.prevX = this.x;
      this.prevY = this.y;
      const [vx, vy] = getVelocity(this.x, this.y);
      this.x += vx * DT;
      this.y += vy * DT;
      this.life++;
      // Out of bounds or expired → reset
      const margin = 30;
      if (
        this.x < -margin || this.x > canvas.width + margin ||
        this.y < -margin || this.y > canvas.height + margin ||
        this.life > this.maxLife
      ) {
        this.reset(false);
      }
    }
    draw() {
      const [vx, vy] = getVelocity(this.x, this.y);
      const mag = Math.sqrt(vx * vx + vy * vy);

      // Fade in at birth, fade out near end of life
      let alpha = 0.6;
      if (this.life < 20) alpha *= this.life / 20;
      if (this.life > this.maxLife - 40) alpha *= (this.maxLife - this.life) / 40;
      alpha = Math.max(0.02, alpha);

      const color = velocityColor(vx, vy, alpha);

      // Draw line segment from previous position (elongated streak)
      const dx = this.x - this.prevX;
      const dy = this.y - this.prevY;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (segLen > 0.1) {
        ctx.beginPath();
        ctx.moveTo(this.prevX, this.prevY);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = this.size * Math.min(1, mag * 0.4);
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Small head dot for visibility
      if (mag > 1.5) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
  }

  /* --- Initialization --- */
  function initFlow() {
    vortices = [];
    for (let i = 0; i < VORTEX_COUNT; i++) {
      vortices.push(new Vortex());
    }
    tracers = [];
    for (let i = 0; i < TRACER_COUNT; i++) {
      tracers.push(new Tracer());
    }
  }

  /* --- Animation loop --- */
  function animateFlow() {
    // Self-heal: if the canvas never picked up real dimensions (e.g. this
    // frame ran before layout settled), retry the resize instead of
    // drawing into a zero-size canvas every frame.
    if (canvas.width === 0 || canvas.height === 0) {
      if (window.innerWidth > 0 && window.innerHeight > 0) resizeCanvas();
      animId = requestAnimationFrame(animateFlow);
      return;
    }

    globalTime++;

    // Semi-transparent overlay → trails fade naturally (streamline effect)
    ctx.fillStyle = 'rgba(10, 14, 26, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Composite star backdrop (subtle, partially visible through fade)
    ctx.globalAlpha = 0.04;
    ctx.drawImage(starCanvas, 0, 0);
    ctx.globalAlpha = 1.0;

    // Update vortices
    for (const v of vortices) {
      v.update(globalTime);
    }

    // Update & draw tracers
    for (const t of tracers) {
      t.update();
      t.draw();
    }

    animId = requestAnimationFrame(animateFlow);
  }

  // Bootstrap
  resizeCanvas();
  initFlow();
  // Pre-fill: run a few hundred silent frames so trails are already visible on load.
  // Skipped if the canvas has no area yet (e.g. tab not laid out) — drawImage
  // throws on a zero-size source, which would otherwise abort the rest of this script.
  if (canvas.width > 0 && canvas.height > 0) {
    for (let i = 0; i < 250; i++) {
      globalTime++;
      ctx.fillStyle = 'rgba(10, 14, 26, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.04;
      ctx.drawImage(starCanvas, 0, 0);
      ctx.globalAlpha = 1.0;
      for (const v of vortices) v.update(globalTime);
      for (const t of tracers) { t.update(); t.draw(); }
    }
  }
  animateFlow();

  // Handle resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeCanvas();
      initFlow();
    }, 200);
  });


  /* ---------------------------------
     SCROLL TRACKING
     --------------------------------- */
  window.addEventListener('scroll', () => {
    scrollY = window.pageYOffset || document.documentElement.scrollTop;
  }, { passive: true });


  /* ---------------------------------
     NAVIGATION SCROLL EFFECT
     --------------------------------- */
  const navbar = document.getElementById('navbar');

  function updateNav() {
    if (scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });


  /* ---------------------------------
     MOBILE MENU TOGGLE
     --------------------------------- */
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('open');
  });

  // Close menu on link click
  navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navMenu.classList.remove('open');
    });
  });


  /* ---------------------------------
     SMOOTH SCROLL (Enhanced)
     --------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const target = document.querySelector(targetId);
      if (target) {
        const navHeight = navbar.offsetHeight;
        const targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });
      }
    });
  });


  /* ---------------------------------
     SCROLL REVEAL (Intersection Observer)
     --------------------------------- */
  const revealElements = document.querySelectorAll('.scroll-reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Stagger delay for multiple elements in same viewport
        const delay = entry.target.dataset.revealDelay || 0;
        setTimeout(() => {
          entry.target.classList.add('revealed');
        }, delay);
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach((el, i) => {
    // Add stagger delays to grouped items
    const parent = el.parentElement;
    const siblings = parent ? parent.querySelectorAll('.scroll-reveal') : [];
    if (siblings.length > 1) {
      const siblingIndex = Array.from(siblings).indexOf(el);
      el.dataset.revealDelay = siblingIndex * 100;
    }
    revealObserver.observe(el);
  });


  /* ---------------------------------
     STREAMLINE DIVIDER ANIMATION
     --------------------------------- */
  const streamlineDividers = document.querySelectorAll('.streamline-divider');

  const streamObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const paths = entry.target.querySelectorAll('.streamline-path');
        paths.forEach((path, i) => {
          setTimeout(() => {
            path.classList.add('animate');
          }, i * 200);
        });
        streamObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.3
  });

  streamlineDividers.forEach(div => streamObserver.observe(div));


  /* ---------------------------------
     IMAGE CAROUSELS (Instagram-style peek/scroll)
     Reads window.IMAGE_MANIFEST (assets/images/manifest.js).
     Falls back to placeholder slides when a folder has no images yet.
     --------------------------------- */
  function initImageCarousels() {
    const manifest = window.IMAGE_MANIFEST || {};
    const PLACEHOLDER_COUNT = 6;

    document.querySelectorAll('.image-carousel').forEach(root => {
      const dir = root.dataset.dir;
      const icon = root.dataset.icon || '🖼';
      const label = root.dataset.label || 'Image';
      const files = (manifest[dir] && manifest[dir].length) ? manifest[dir] : null;
      const count = files ? files.length : PLACEHOLDER_COUNT;

      const viewport = root.querySelector('.carousel-viewport');
      const track = root.querySelector('.carousel-track');
      const dotsEl = root.querySelector('.carousel-dots');
      const counterEl = root.querySelector('.carousel-counter');
      const prevBtn = root.querySelector('.carousel-arrow-prev');
      const nextBtn = root.querySelector('.carousel-arrow-next');

      const slides = [];
      for (let i = 0; i < count; i++) {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';

        if (files) {
          const img = document.createElement('img');
          img.src = `${dir}/${files[i]}`;
          img.alt = `${label} ${i + 1}`;
          img.loading = 'lazy';
          img.draggable = false;
          slide.appendChild(img);
        } else {
          slide.classList.add('carousel-slide-placeholder');
          const iconEl = document.createElement('div');
          iconEl.className = 'placeholder-icon';
          iconEl.textContent = icon;
          const labelEl = document.createElement('span');
          labelEl.textContent = label;
          const indexEl = document.createElement('span');
          indexEl.className = 'placeholder-index';
          indexEl.textContent = `${i + 1} / ${count}`;
          slide.append(iconEl, labelEl, indexEl);
        }
        track.appendChild(slide);
        slides.push(slide);
      }

      const showDots = count > 1 && count <= 8;
      if (showDots) {
        slides.forEach((_, i) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'carousel-dot';
          dot.setAttribute('aria-label', `Go to image ${i + 1}`);
          dot.addEventListener('click', () => goTo(i));
          dotsEl.appendChild(dot);
        });
      } else if (dotsEl) {
        dotsEl.style.display = 'none';
      }

      let activeIndex = 0;

      function updateActive() {
        const viewportRect = viewport.getBoundingClientRect();
        const center = viewportRect.left + viewportRect.width / 2;
        let closest = 0;
        let minDist = Infinity;
        slides.forEach((slide, i) => {
          const r = slide.getBoundingClientRect();
          const dist = Math.abs((r.left + r.width / 2) - center);
          if (dist < minDist) { minDist = dist; closest = i; }
        });
        activeIndex = closest;
        slides.forEach((slide, i) => slide.classList.toggle('is-active', i === activeIndex));
        if (showDots) {
          dotsEl.querySelectorAll('.carousel-dot').forEach((dot, i) => {
            dot.classList.toggle('is-active', i === activeIndex);
          });
        }
        if (counterEl) counterEl.textContent = `${activeIndex + 1} / ${count}`;
      }

      function goTo(i) {
        const wrapped = ((i % count) + count) % count;
        const target = slides[wrapped];
        target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        startAutoplay();
      }

      // Autoplay: advance to the next image every 10s, looping back to the
      // start. Paused while the visitor is hovering or actively dragging.
      const AUTOPLAY_INTERVAL = 10000;
      let autoplayTimer = null;

      function stopAutoplay() {
        if (autoplayTimer) {
          clearInterval(autoplayTimer);
          autoplayTimer = null;
        }
      }

      function startAutoplay() {
        stopAutoplay();
        if (count <= 1) return;
        autoplayTimer = setInterval(() => goTo(activeIndex + 1), AUTOPLAY_INTERVAL);
      }

      root.addEventListener('mouseenter', stopAutoplay);
      root.addEventListener('mouseleave', startAutoplay);
      viewport.addEventListener('touchstart', stopAutoplay, { passive: true });
      viewport.addEventListener('touchend', startAutoplay, { passive: true });

      let scrollRaf = null;
      viewport.addEventListener('scroll', () => {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(() => {
          updateActive();
          scrollRaf = null;
        });
      }, { passive: true });

      if (prevBtn) prevBtn.addEventListener('click', () => goTo(activeIndex - 1));
      if (nextBtn) nextBtn.addEventListener('click', () => goTo(activeIndex + 1));

      // Vertical wheel → horizontal scroll (desktop hover)
      viewport.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault();
        viewport.scrollLeft += e.deltaY;
      }, { passive: false });

      // Drag-to-scroll (mouse)
      let isDown = false, startX = 0, startScroll = 0, moved = false;
      viewport.addEventListener('mousedown', (e) => {
        isDown = true;
        moved = false;
        startX = e.pageX;
        startScroll = viewport.scrollLeft;
        viewport.classList.add('dragging');
      });
      window.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const dx = e.pageX - startX;
        if (Math.abs(dx) > 3) moved = true;
        viewport.scrollLeft = startScroll - dx;
      });
      window.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        viewport.classList.remove('dragging');
      });
      viewport.addEventListener('click', (e) => {
        if (moved) { e.preventDefault(); e.stopPropagation(); }
      }, true);

      // Keyboard nav
      viewport.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(activeIndex - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); goTo(activeIndex + 1); }
      });

      updateActive();
      startAutoplay();
    });
  }

  initImageCarousels();


  /* ---------------------------------
     ACTIVE NAV LINK HIGHLIGHT
     --------------------------------- */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, {
    threshold: 0.2,
    rootMargin: '-80px 0px -50% 0px'
  });

  sections.forEach(section => sectionObserver.observe(section));

})();
