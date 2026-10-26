(() => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const motionOff = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.classList.add('motion-ready');

  // Inertial smooth scrolling. Wheel events another handler already consumed (the question
  // stepper) are left alone; touch keeps native scrolling. Falls back to native if Lenis is missing.
  const lenis = window.Lenis && !motionOff.matches
    ? new window.Lenis({ lerp: .085, virtualScroll: ({ event }) => !event.defaultPrevented })
    : null;
  if (lenis) {
    const tick = (time) => { lenis.raf(time); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]:not(.skip-link)');
      const target = link && link.hash.length > 1 && $(link.hash);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
      history.pushState(null, '', link.hash);
    });
  }

  // Reveal elements as they enter the reading flow; reduced-motion users see content immediately.
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !motionOff.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    reveals.forEach((item) => revealObserver.observe(item));
  } else reveals.forEach((item) => item.classList.add('is-visible'));

  // Reading progress in the top rule.
  const progress = $('.scroll-progress span');
  let progressFrame = 0;
  const updateProgress = () => {
    if (progressFrame) return;
    progressFrame = requestAnimationFrame(() => {
      progressFrame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    });
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  // Keep the hero countdown tied to the published event date; once it passes, show a clear end state.
  const countdown = $('[data-countdown]');
  if (countdown) {
    const target = new Date(countdown.dataset.target).getTime();
    const units = $('.countdown-units', countdown);
    const ended = $('.countdown-ended', countdown);
    const values = {
      days: $('[data-countdown-days]', countdown),
      hours: $('[data-countdown-hours]', countdown),
      minutes: $('[data-countdown-minutes]', countdown),
      seconds: $('[data-countdown-seconds]', countdown),
    };
    const updateCountdown = () => {
      const remaining = target - Date.now();
      if (remaining <= 0) {
        Object.values(values).forEach((value) => { value.textContent = '00'; });
        ended.hidden = false;
        countdown.setAttribute('aria-label', 'Countdown ended. The forum took place on October 23, 2026');
        return false;
      }
      const totalSeconds = Math.floor(remaining / 1000);
      values.days.textContent = String(Math.floor(totalSeconds / 86400)).padStart(2, '0');
      values.hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0');
      values.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      values.seconds.textContent = String(totalSeconds % 60).padStart(2, '0');
      return true;
    };
    if (updateCountdown()) {
      const countdownInterval = window.setInterval(() => {
        if (!updateCountdown()) window.clearInterval(countdownInterval);
      }, 1000);
    }
  }

  // Pin the People story and scrub its image rail horizontally from the page scroll.
  const gallerySection = $('.scroll-gallery-section');
  const galleryViewport = $('.voice-viewport');
  const galleryTrack = $('.voice-grid', gallerySection ?? document);
  const galleryProgress = $('.gallery-progress i', gallerySection ?? document);
  const galleryCount = $('.gallery-count', gallerySection ?? document);
  if (gallerySection && galleryViewport && galleryTrack && !motionOff.matches) {
    const galleryCards = $$('.voice-card', galleryTrack);
    let galleryTravel = 0;
    let galleryScrollRange = 0;
    let galleryFrame = 0;
    const measureGallery = () => {
      galleryTravel = Math.max(0, galleryTrack.scrollWidth - galleryViewport.clientWidth);
      galleryScrollRange = Math.max(window.innerHeight * .6, galleryTravel / 1.7);
      gallerySection.style.height = `${Math.ceil(window.innerHeight + galleryScrollRange)}px`;
      updateGallery();
    };
    const updateGallery = () => {
      if (galleryFrame) return;
      galleryFrame = requestAnimationFrame(() => {
        galleryFrame = 0;
        const rect = gallerySection.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, -rect.top / (galleryScrollRange || 1)));
        galleryTrack.style.transform = `translate3d(${-galleryTravel * progress}px, 0, 0)`;
        const viewportBounds = galleryViewport.getBoundingClientRect();
        const viewportCenter = viewportBounds.left + viewportBounds.width / 2;
        galleryCards.forEach((card, index) => {
          const bounds = card.getBoundingClientRect();
          const center = bounds.left + bounds.width / 2;
          const diagonal = Math.max(-1, Math.min(1, (center - viewportCenter) / (viewportBounds.width / 2 + bounds.width / 2)));
          const visibility = Math.max(0, Math.min(1, (1.15 - Math.abs(diagonal)) / .45));
          const stagger = [0, 8, -7, 6][index % 4];
          const diagonalTravel = Math.min(125, window.innerHeight * .13);
          const drift = diagonal * diagonalTravel + stagger;
          card.style.setProperty('--gallery-y', `${drift.toFixed(1)}px`);
          card.style.setProperty('--gallery-scale', (0.91 + visibility * .09).toFixed(3));
          card.style.setProperty('--gallery-opacity', (0.18 + visibility * .82).toFixed(3));
        });
        if (galleryProgress) galleryProgress.style.transform = `scaleX(${progress})`;
        if (galleryCount) {
          const active = Math.min(galleryCards.length, Math.floor(progress * Math.max(1, galleryCards.length - 1)) + 1);
          galleryCount.textContent = `${String(active).padStart(2, '0')} / ${String(galleryCards.length).padStart(2, '0')}`;
        }
      });
    };
    measureGallery();
    window.addEventListener('scroll', updateGallery, { passive: true });
    window.addEventListener('resize', measureGallery);
    if ('ResizeObserver' in window) new ResizeObserver(measureGallery).observe(galleryTrack);
  }

  // The shared atmosphere's ribbons respond softly to the pointer, without changing the layout.
  const hero = $('.hero-story');
  if (hero && !motionOff.matches && matchMedia('(pointer:fine)').matches) {
    const ribbons = $$('.ribbon', hero);
    let pointerFrame = 0;
    hero.addEventListener('pointermove', (event) => {
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        // The art is sticky to the viewport, so measure against the viewport.
        const x = event.clientX / window.innerWidth - .5;
        const y = event.clientY / window.innerHeight - .5;
        ribbons.forEach((ribbon, index) => {
          const weight = (index + 1) * 7;
          ribbon.style.setProperty('--move-x', `${(-x * weight).toFixed(1)}px`);
          ribbon.style.setProperty('--move-y', `${(-y * weight).toFixed(1)}px`);
        });
      });
    });
    hero.addEventListener('pointerleave', () => ribbons.forEach((ribbon) => {
      ribbon.style.setProperty('--move-x', '0px');
      ribbon.style.setProperty('--move-y', '0px');
    }));
  }

  // Keep the current chapter visible in the desktop navigation.
  const navLinks = $$('.desktop-nav a[href^="#"]');
  if ('IntersectionObserver' in window) {
    const sections = navLinks.map((link) => $(link.getAttribute('href'))).filter(Boolean);
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => link.classList.toggle('is-current', link.hash === `#${entry.target.id}`));
      });
    }, { rootMargin: '-32% 0px -58% 0px' });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  // Accessible full-screen navigation. Escape closes the panel and returns focus to its trigger.
  const menu = $('.menu-panel');
  const menuToggle = $('.menu-toggle');
  const menuClose = $('.menu-close');
  const menuLinks = $$('nav a', menu);
  const openMenu = () => {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close navigation');
    document.body.classList.add('menu-open');
    lenis?.stop();
    menuLinks[0]?.focus();
  };
  const closeMenu = (restore = true) => {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    document.body.classList.remove('menu-open');
    lenis?.start();
    if (restore) menuToggle.focus();
  };
  menuToggle.addEventListener('click', () => menu.classList.contains('is-open') ? closeMenu() : openMenu());
  menuClose.addEventListener('click', () => closeMenu());
  menuLinks.forEach((link) => link.addEventListener('click', () => closeMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (!menu.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeMenu();
    if (event.key !== 'Tab') return;
    const focusable = [menuClose, ...menuLinks];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  // Four ordered manufacturing questions advance with wheel, keyboard, or touch.
  const topicCopy = [
    { title: 'Engineer better<br />products, faster.', text: 'Reduce design and engineering cycle time, increase reuse and automation, and improve product quality through earlier validation.' },
    { title: 'Accelerate design<br />to manufacturing.', text: 'Reduce manual handoffs and production rework. Improve manufacturability, automate manufacturing preparation and shorten the path to production.' },
    { title: 'Connect data<br />to decisions.', text: 'Create a trusted source of product and manufacturing information. Improve collaboration, change visibility and traceability across the product lifecycle.' },
    { title: 'Improve with<br />every cycle.', text: 'Use lifecycle information to make stronger decisions, improve processes and continuously raise product and manufacturing performance.' },
  ];
  const topicsSection = $('.topics');
  const topicTabs = $$('.topic-tab');
  const topicPanel = $('.topic-panel');
  const topicHeading = $('h3', $('.topic-content'));
  const topicDescription = $('.topic-description');
  const topicLabel = $('.topic-label');
  const topicCore = $('.topic-core');
  const topicProgress = $$('.topic-progress span');
  const liveRegion = $('.topics-live');
  let activeTopic = 0;
  let maxVisited = 0;
  let topicAnimating = false;
  let wheelGestureLocked = false;
  let wheelIdleTimer = 0;
  const setTopic = (index, focus = false) => {
    if (index < 0 || index >= topicCopy.length || index > maxVisited + 1) return;
    if (topicAnimating && index !== activeTopic) return;
    const changed = index !== activeTopic;
    activeTopic = index;
    maxVisited = Math.max(maxVisited, index);
    const current = topicCopy[index];
    topicHeading.innerHTML = current.title;
    topicDescription.textContent = current.text;
    topicLabel.textContent = `THE FORUM / THEME 0${index + 1}`;
    topicCore.textContent = `0${index + 1}`;
    topicPanel.setAttribute('aria-labelledby', topicTabs[index].id);
    if (changed) {
      topicAnimating = true;
      topicPanel.classList.remove('is-changing');
      void topicPanel.offsetWidth;
      topicPanel.classList.add('is-changing');
      window.setTimeout(() => {
        topicPanel.classList.remove('is-changing');
        topicAnimating = false;
      }, 540);
    }
    topicTabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.disabled = tabIndex > activeTopic;
      tab.classList.toggle('is-cleared', tabIndex < activeTopic);
      $('i', tab).textContent = tabIndex < activeTopic ? '✓' : '↗';
      tab.setAttribute('aria-label', `${String(tabIndex + 1).padStart(2, '0')} ${tab.querySelector('b').textContent}${tabIndex < activeTopic ? ', completed' : selected ? ', current question' : ', upcoming question'}`);
    });
    topicProgress.forEach((bar, barIndex) => {
      bar.classList.toggle('is-current', barIndex === index);
      bar.classList.toggle('is-visited', barIndex <= maxVisited);
    });
    liveRegion.textContent = `Question ${index + 1} of 4. ${current.title.replace('<br />', ' ')}`;
    if (focus) topicTabs[index].focus();
  };
  const canStep = (direction) => direction < 0 ? activeTopic > 0 : activeTopic < topicCopy.length - 1;
  const advance = (direction) => setTopic(activeTopic + direction);
  const scrollStep = (direction) => {
    if (topicAnimating) return true;
    if (!canStep(direction)) {
      if (direction > 0 && activeTopic === topicCopy.length - 1 && maxVisited === topicCopy.length - 1) {
        topicTabs[activeTopic].classList.add('is-cleared');
        $('i', topicTabs[activeTopic]).textContent = '✓';
        topicProgress[activeTopic].classList.add('is-visited');
      }
      return false;
    }
    advance(direction);
    return true;
  };
  topicTabs.forEach((tab, index) => {
    tab.tabIndex = index === 0 ? 0 : -1;
    tab.disabled = index > 0;
    tab.addEventListener('click', () => { if (!tab.disabled) setTopic(index); });
    tab.addEventListener('keydown', (event) => {
      if ((event.key === 'ArrowDown' || event.key === 'ArrowRight') && index === activeTopic && activeTopic === topicCopy.length - 1) {
        const handled = scrollStep(1);
        if (handled) event.preventDefault();
        return;
      }
      if ((event.key === 'ArrowDown' || event.key === 'ArrowRight') && index === activeTopic && activeTopic < topicCopy.length - 1) { event.preventDefault(); scrollStep(1); topicTabs[activeTopic].focus(); return; }
      if ((event.key === 'ArrowUp' || event.key === 'ArrowLeft') && index === activeTopic && activeTopic > 0) { event.preventDefault(); scrollStep(-1); topicTabs[activeTopic].focus(); return; }
      if (event.key === 'PageDown' && scrollStep(1)) { event.preventDefault(); return; }
      if (event.key === 'PageUp' && scrollStep(-1)) { event.preventDefault(); return; }
      let next = null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = topicTabs[Math.min(index + 1, topicTabs.length - 1)];
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = topicTabs[Math.max(index - 1, 0)];
      if (event.key === 'Home') next = topicTabs[0];
      if (event.key === 'End') next = topicTabs[topicTabs.length - 1];
      if (!next || next.disabled) return;
      event.preventDefault();
      setTopic(topicTabs.indexOf(next), true);
    });
  });
  topicsSection.addEventListener('wheel', (event) => {
    if (event.ctrlKey) return;
    const direction = Math.sign(event.deltaY);
    if (!direction) return;
    if (wheelGestureLocked) {
      event.preventDefault();
      window.clearTimeout(wheelIdleTimer);
      wheelIdleTimer = window.setTimeout(() => { wheelGestureLocked = false; }, 240);
      return;
    }
    if (scrollStep(direction)) {
      event.preventDefault();
      wheelGestureLocked = true;
      window.clearTimeout(wheelIdleTimer);
      wheelIdleTimer = window.setTimeout(() => { wheelGestureLocked = false; }, 240);
    }
  }, { passive: false });
  let touchStartY = null;
  topicsSection.addEventListener('touchstart', (event) => { touchStartY = event.touches[0].clientY; }, { passive: true });
  topicsSection.addEventListener('touchmove', (event) => {
    if (touchStartY === null) return;
    const delta = event.touches[0].clientY - touchStartY;
    if (Math.abs(delta) > 12 && (topicAnimating || canStep(delta < 0 ? 1 : -1))) event.preventDefault();
  }, { passive: false });
  topicsSection.addEventListener('touchend', (event) => {
    if (touchStartY === null) return;
    const delta = event.changedTouches[0].clientY - touchStartY;
    touchStartY = null;
    if (Math.abs(delta) > 36) scrollStep(delta < 0 ? 1 : -1);
  }, { passive: true });
  topicsSection.addEventListener('keydown', (event) => {
    if (event.target.closest('a,button')) return;
    if (event.repeat) { event.preventDefault(); return; }
    let direction = 0;
    if (['ArrowDown', 'PageDown', ' '].includes(event.key)) direction = 1;
    if (['ArrowUp', 'PageUp'].includes(event.key)) direction = -1;
    if (!direction || !scrollStep(direction)) return;
    event.preventDefault();
  });
  setTopic(0);

  // Section 05 expands its manufacturing image in direct response to the scroll position.
  const zoomSection = $('.register-zoom');
  const zoomFrame = $('.zoom-image-frame', zoomSection);
  const zoomProgress = $('.zoom-progress i', zoomSection);
  if (zoomSection && zoomFrame && !motionOff.matches) {
    let zoomFrameId = 0;
    const updateZoom = () => {
      if (zoomFrameId) return;
      zoomFrameId = requestAnimationFrame(() => {
        zoomFrameId = 0;
        const bounds = zoomSection.getBoundingClientRect();
        const range = Math.max(1, zoomSection.offsetHeight - window.innerHeight);
        const progress = Math.max(0, Math.min(1, -bounds.top / range));
        const startScale = window.matchMedia('(max-width: 640px)').matches ? .88 : .84;
        const scale = startScale + progress * 1.14;
        zoomFrame.style.transform = `translate3d(-50%, -50%, 0) scale(${scale})`;
        zoomFrame.style.borderRadius = `${Math.max(0, 26 * (1 - progress))}px`;
        if (zoomProgress) zoomProgress.style.transform = `scaleX(${progress})`;
        zoomSection.classList.toggle('is-zoom-complete', progress > .94);
      });
    };
    window.addEventListener('scroll', updateZoom, { passive: true });
    window.addEventListener('resize', updateZoom);
    updateZoom();
  }

  // Accordion keeps one agenda detail open; each item can be opened or closed with a single tap.
  const agendaItems = $$('.agenda-item');
  const setAgendaItem = (item, open) => {
    agendaItems.forEach((other) => {
      const otherTrigger = $('.agenda-trigger', other);
      other.classList.toggle('is-open', other === item && open);
      otherTrigger.setAttribute('aria-expanded', String(other === item && open));
      $('.agenda-plus', otherTrigger).textContent = other === item && open ? '−' : '+';
    });
  };
  agendaItems.forEach((item) => {
    const trigger = $('.agenda-trigger', item);
    trigger.addEventListener('click', () => {
      const shouldOpen = !item.classList.contains('is-open');
      setAgendaItem(item, shouldOpen);
    });
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      item.addEventListener('pointerenter', () => setAgendaItem(item, true));
    }
  });

  // Press feedback stays on the event's primary calls to action.
  if (!motionOff.matches) {
    $$('.nav-cta, .register-cta-button, .hero-ticket, .round-link').forEach((control) => {
      control.addEventListener('pointerdown', () => control.classList.add('is-pressed'));
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => control.addEventListener(type, () => control.classList.remove('is-pressed')));
    });
  }

  // Slow scroll-linked image drift; no autonomous movement, and disabled for reduced motion.
  if (!motionOff.matches) {
    const images = $$('.story-image img');
    let parallaxFrame = 0;
    const updateParallax = () => {
      if (parallaxFrame) return;
      parallaxFrame = requestAnimationFrame(() => {
        parallaxFrame = 0;
        const vh = window.innerHeight;
        images.forEach((img) => {
          const rect = img.parentElement.getBoundingClientRect();
          if (rect.bottom < -100 || rect.top > vh + 100) return;
          const ratio = (vh - rect.top) / (vh + rect.height);
          const progress = Math.max(-1, Math.min(1, (ratio - .5) * 2));
          const direction = images.indexOf(img) % 2 === 0 ? 1 : -1;
          const offsetX = progress * 76 * direction;
          const offsetY = progress * (images.indexOf(img) % 3 === 0 ? -35 : 42);
          img.style.setProperty('--scroll-x', `${offsetX.toFixed(1)}px`);
          img.style.setProperty('--scroll-y', `${offsetY.toFixed(1)}px`);
        });
      });
    };
    window.addEventListener('scroll', updateParallax, { passive: true });
    window.addEventListener('resize', updateParallax);
    updateParallax();
  }
})();
