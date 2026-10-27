(() => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const motionOff = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.classList.add('motion-ready');
  // Preview another colour preset with ?theme=blue (presets live at the top of styles.css).
  const themeParam = new URLSearchParams(location.search).get('theme');
  if (themeParam && /^[a-z-]+$/.test(themeParam)) document.documentElement.dataset.theme = themeParam;
  const headerHeight = () => $('.site-header')?.offsetHeight ?? 0;

  // Inertial smooth scrolling; touch keeps native scrolling. Falls back to native if Lenis is missing.
  const lenis = window.Lenis && !motionOff.matches ? new window.Lenis({ lerp: .085 }) : null;
  if (lenis) {
    const tick = (time) => { lenis.raf(time); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]:not(.skip-link)');
      const target = link && link.hash.length > 1 && $(link.hash);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target.id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - headerHeight(), { duration: 1.4 });
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
        countdown.setAttribute('aria-label', ended.textContent);
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

  // The questions chapter pins to the viewport while the page scrolls through it; the scroll position
  // picks the question, so the view is always aligned and touch, keyboard and wheel all behave the same.
  const topicCopy = [
    { title: 'Better decisions, together.', text: 'How do hundreds of people working on the same project make better decisions together?' },
    { title: 'Catch it before site.', text: 'How do you identify a problem before it reaches the construction site?' },
    { title: 'One building, not three.', text: 'How do you make sure the building being designed, the building being constructed and the building eventually being operated are not three different versions of the same idea?' },
    { title: 'When AI enters.', text: 'And what changes when AI begins entering that process?' },
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
  let activeTopic = -1;
  let topicSwapTimer = 0;
  const renderTopic = (index) => {
    topicHeading.innerHTML = topicCopy[index].title;
    topicDescription.textContent = topicCopy[index].text;
    topicLabel.textContent = `THE QUESTION · 0${index + 1}`;
    topicCore.textContent = `0${index + 1}`;
  };
  const setTopic = (index, finished = false) => {
    topicTabs.forEach((tab, tabIndex) => {
      const cleared = tabIndex < index || (finished && tabIndex === index);
      tab.classList.toggle('is-cleared', cleared);
      $('i', tab).textContent = cleared ? '✓' : '↗';
    });
    if (index === activeTopic) return;
    const first = activeTopic < 0;
    activeTopic = index;
    // Fade the old copy out, swap it while hidden, then fade the new copy in.
    window.clearTimeout(topicSwapTimer);
    if (first || motionOff.matches) renderTopic(index);
    else {
      topicPanel.classList.add('is-changing');
      topicSwapTimer = window.setTimeout(() => { renderTopic(index); topicPanel.classList.remove('is-changing'); }, 280);
    }
    topicPanel.setAttribute('aria-labelledby', topicTabs[index].id);
    topicTabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    topicProgress.forEach((bar, barIndex) => {
      bar.classList.toggle('is-current', barIndex === index);
      bar.classList.toggle('is-visited', barIndex <= index);
    });
    if (!first) liveRegion.textContent = `Question ${index + 1} of 4. ${topicCopy[index].title.replace('<br />', ' ')}`;
  };
  // The view pins just under the sticky header, so all positions are measured from the header's bottom edge.
  const topicsRange = () => Math.max(1, topicsSection.offsetHeight - (window.innerHeight - headerHeight()));
  const topicsProgress = () => Math.max(0, Math.min(1, (headerHeight() - topicsSection.getBoundingClientRect().top) / topicsRange()));
  const scrollToTopic = (index) => {
    const top = topicsSection.getBoundingClientRect().top + window.scrollY - headerHeight() + (index / topicCopy.length) * topicsRange() + 2;
    if (lenis) lenis.scrollTo(top, { duration: 1.1 });
    else window.scrollTo({ top, behavior: motionOff.matches ? 'auto' : 'smooth' });
  };
  let topicsFrame = 0;
  const updateTopics = () => {
    if (topicsFrame) return;
    topicsFrame = requestAnimationFrame(() => {
      topicsFrame = 0;
      const progress = topicsProgress();
      setTopic(Math.min(topicCopy.length - 1, Math.floor(progress * topicCopy.length)), progress >= 1);
    });
  };
  topicTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => scrollToTopic(index));
    tab.addEventListener('keydown', (event) => {
      const last = topicTabs.length - 1;
      const next = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: last }[event.key];
      if (next === undefined || next < 0 || next > last) return;
      event.preventDefault();
      topicTabs[next].focus();
      scrollToTopic(next);
    });
  });
  window.addEventListener('scroll', updateTopics, { passive: true });
  window.addEventListener('resize', updateTopics);
  updateTopics();

  // Scroll-linked motion: gentle parallax on marked elements, and the "It's about" photo that grows
  // from a framed card to the full screen. Reduced-motion users get the finished state.
  const parallaxItems = $$('[data-parallax]');
  const zoom = $('.about-zoom');
  const zoomWords = zoom ? $$('h2 span', zoom) : [];
  if (!motionOff.matches) {
    let motionFrame = 0;
    const updateMotion = () => {
      if (motionFrame) return;
      motionFrame = requestAnimationFrame(() => {
        motionFrame = 0;
        const vh = window.innerHeight;
        parallaxItems.forEach((item) => {
          const rect = item.getBoundingClientRect();
          if (rect.bottom < -200 || rect.top > vh + 200) return;
          const offset = (rect.top + rect.height / 2 - vh / 2) * Number(item.dataset.parallax);
          item.style.setProperty('--py', `${offset.toFixed(1)}px`);
        });
        if (zoom) {
          const range = Math.max(1, zoom.offsetHeight - (vh - headerHeight()));
          const p = Math.max(0, Math.min(1, (headerHeight() - zoom.getBoundingClientRect().top) / range));
          zoom.style.setProperty('--p', p.toFixed(3));
          zoomWords.forEach((word, index) => word.classList.toggle('is-on', p > .16 + index * .24));
        }
      });
    };
    window.addEventListener('scroll', updateMotion, { passive: true });
    window.addEventListener('resize', updateMotion);
    updateMotion();
  } else zoomWords.forEach((word) => word.classList.add('is-on'));

  // Speaker cards and the event pass tilt toward the pointer, with a soft light following it.
  if (!motionOff.matches && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        card.style.setProperty('--ry', `${((x - .5) * 8).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((.5 - y) * 8).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  // Press feedback stays on the event's primary calls to action.
  if (!motionOff.matches) {
    $$('.btn').forEach((control) => {
      control.addEventListener('pointerdown', () => control.classList.add('is-pressed'));
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => control.addEventListener(type, () => control.classList.remove('is-pressed')));
    });
  }
})();
