/**
 * UniVerse cinematic campus arrival.
 * Built geometry follows the provided campus reference: warm low-rise wings,
 * a glazed academic atrium, landscaped grounds, and a front entrance gate.
 */
(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  let THREE = null;
  const journey = document.getElementById('campus-journey');
  const stage = document.querySelector('.journey-stage');
  const canvas = document.getElementById('hero-3d-canvas');
  const chapters = [...document.querySelectorAll('.journey-chapter')];
  const meter = document.getElementById('journey-meter-fill');
  const portalLeft = document.querySelector('.portal-curtain-left');
  const portalRight = document.querySelector('.portal-curtain-right');
  const portalWordmark = document.querySelector('.portal-wordmark');
  const caption = document.getElementById('journey-caption');
  const announcement = document.getElementById('journey-announcement');
  const chapterNames = ['Arrive at the campus', 'The entrance opens', 'Cross the green', 'Approach the academic wing', 'Discover the digital campus'];
  const state = { progress: 0, activeChapter: -1 };
  let renderer = null;
  let camera = null;
  let scene = null;
  let gateLeaves = [];
  let entryDoors = [];
  let particles = null;
  let frameId = 0;

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const smoothstep = (a, b, value) => {
    const t = clamp01((value - a) / (b - a));
    return t * t * (3 - 2 * t);
  };

  function setChapter(progress) {
    const index = Math.min(chapterNames.length - 1, Math.floor(progress * chapterNames.length));
    if (index === state.activeChapter) return;
    state.activeChapter = index;
    chapters.forEach((chapter, chapterIndex) => {
      const active = chapterIndex === index;
      chapter.classList.toggle('is-active', active);
      chapter.setAttribute('aria-hidden', String(!active));
    });
    if (meter) meter.style.width = `${Math.round(progress * 100)}%`;
    if (caption) caption.textContent = chapterNames[index];
    if (announcement && index > 0) announcement.textContent = chapterNames[index];
  }

  function makeMaterial(color, roughness = 0.82, options = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness, ...options });
  }

  function box(parent, width, height, depth, color, x, y, z, materialOptions = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), makeMaterial(color, 0.82, materialOptions));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function addTree(parent, x, z, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 2.5, 7), makeMaterial(0x73563b)));
    const canopy = makeMaterial(0x376843, 0.96);
    const sunlitLeaves = makeMaterial(0x65894b, 0.98);
    [[0, 2.55, 0, 1.1], [-0.44, 2.3, 0.08, 0.72], [0.42, 2.32, -0.12, 0.76], [0.03, 3.02, -0.02, 0.72]].forEach(([cx, cy, cz, radius], index) => {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), index === 3 ? sunlitLeaves : canopy);
      crown.position.set(cx, cy, cz);
      crown.scale.set(1.16, 0.82, 1);
      crown.castShadow = true;
      group.add(crown);
    });
    parent.add(group);
    return group;
  }

  function addWindowRow(parent, xStart, count, y, z, width = 0.92, height = 1.05, gap = 0.72) {
    const glass = makeMaterial(0x536c66, 0.28, { metalness: 0.12, emissive: 0x192e2a, emissiveIntensity: 0.12 });
    const trim = makeMaterial(0xddd2b1, 0.68);
    for (let i = 0; i < count; i += 1) {
      const x = xStart + i * (width + gap);
      const pane = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.075), glass);
      pane.position.set(x, y, z);
      parent.add(pane);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(width + 0.11, 0.075, 0.12), trim);
      sill.position.set(x, y - height / 2 - 0.06, z + 0.025);
      parent.add(sill);
    }
  }

  function makeGateLeaf(parent, side) {
    const hinge = new THREE.Group();
    const halfSpan = 5.0;
    hinge.position.set(side < 0 ? -halfSpan : halfSpan, 0.3, 16.8);
    const leaf = new THREE.Group();
    const direction = side < 0 ? 1 : -1;
    box(leaf, halfSpan, 0.15, 0.16, 0x34483f, direction * halfSpan / 2, 2.65, 0);
    box(leaf, halfSpan, 0.15, 0.16, 0x34483f, direction * halfSpan / 2, 0.2, 0);
    for (let i = 0; i <= 13; i += 1) {
      box(leaf, 0.075, 2.55, 0.1, i % 3 === 0 ? 0xc8b77f : 0x617061, direction * i * halfSpan / 13, 1.4, 0);
    }
    for (let i = 0; i < 2; i += 1) box(leaf, halfSpan, 0.07, 0.1, 0x718070, direction * halfSpan / 2, 1.25 + i * 0.66, 0);
    hinge.add(leaf);
    hinge.userData.openDirection = side < 0 ? -1 : 1;
    parent.add(hinge);
    return hinge;
  }

  function addCampusGeometry() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 180), makeMaterial(0x557b45, 1));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.2, -33);
    ground.receiveShadow = !isMobile;
    scene.add(ground);

    const path = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 78), makeMaterial(0xbab49a, 0.92));
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, -0.12, 1);
    scene.add(path);
    const forecourt = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), makeMaterial(0xb7b095, 0.9));
    forecourt.rotation.x = -Math.PI / 2;
    forecourt.position.set(0, -0.1, -8.5);
    scene.add(forecourt);

    const lowHillMat = makeMaterial(0x76945e, 1);
    [-1, 1].forEach((side) => {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(15, 24, 12), lowHillMat);
      hill.position.set(side * 21, -8, -44);
      hill.scale.set(1.2, 0.7, 0.4);
      scene.add(hill);
    });

    // Academic blocks use sandstone proportions and glazing from the campus photo.
    const wall = 0xc9bd98;
    const trim = 0xd9cfb0;
    box(scene, 22, 7.2, 3.3, wall, -2, 3.55, -13.3);
    box(scene, 7.6, 8.4, 3.7, 0xd1c5a1, -8.5, 4.15, -12.6);
    box(scene, 7.5, 7.0, 3.4, 0xb8ae8b, 4.0, 3.45, -13.5);
    box(scene, 4.3, 10.0, 4.0, 0x354d4c, 7.65, 4.95, -12.3, { roughness: 0.34, metalness: 0.14 });
    box(scene, 24.4, 0.36, 4.1, trim, -2, 7.25, -13.2);
    box(scene, 9.0, 0.3, 4.4, 0xbcae86, -8.5, 8.52, -12.6);
    box(scene, 8.7, 0.3, 4.1, 0xb3a781, 4, 7.02, -13.5);

    addWindowRow(scene, -10.9, 7, 5.35, -11.6, 1.25, 1.1, 0.62);
    addWindowRow(scene, -10.9, 7, 3.75, -11.6, 1.25, 1.1, 0.62);
    addWindowRow(scene, -7.5, 6, 6.05, -10.66, 0.83, 0.9, 0.52);
    addWindowRow(scene, -7.5, 6, 4.62, -10.66, 0.83, 0.9, 0.52);

    // Glass atrium mullions and warm lobby glow.
    box(scene, 3.5, 7.1, 0.12, 0x96b9aa, 7.65, 4.95, -10.22, { transparent: true, opacity: 0.64, roughness: 0.2, metalness: 0.05 });
    for (let i = 0; i < 6; i += 1) box(scene, 0.065, 7.2, 0.15, 0x334a43, 6.0 + i * 0.66, 4.95, -10.1);
    box(scene, 3.7, 0.09, 0.18, 0x334a43, 7.65, 2.55, -10.1);
    box(scene, 3.7, 0.09, 0.18, 0x334a43, 7.65, 5.1, -10.1);
    box(scene, 2.1, 0.18, 2.0, 0xc6b991, 0, 0.04, -10.4);
    box(scene, 1.8, 0.25, 0.45, 0xdbc58b, 0, 3.2, -10.8, { emissive: 0xb09250, emissiveIntensity: 0.1 });

    // Entrance door leaves on independently rotating hinges.
    [-1, 1].forEach((side) => {
      const hinge = new THREE.Group();
      hinge.position.set(side * 0.72, 0.05, -10.55);
      const leaf = box(hinge, 0.7, 2.65, 0.15, 0x46584d, side < 0 ? 0.35 : -0.35, 1.36, 0);
      hinge.userData.openDirection = side < 0 ? -1 : 1;
      hinge.userData.leaf = leaf;
      scene.add(hinge);
      entryDoors.push(hinge);
    });

    // Entry piers, lintel, and restrained bronze campus lettering.
    [-1, 1].forEach((side) => {
      box(scene, 0.65, 4.4, 0.68, 0xb7aa83, side * 5.45, 2.2, 16.8);
      box(scene, 0.82, 0.28, 0.86, 0xd4c79e, side * 5.45, 4.45, 16.8);
      box(scene, 0.3, 2.4, 0.34, 0x9d916e, side * 5.45, 1.15, 16.42);
    });
    box(scene, 10.9, 0.35, 0.48, 0xbcae86, 0, 4.52, 16.8);
    gateLeaves = [makeGateLeaf(scene, -1), makeGateLeaf(scene, 1)];

    // Low garden beds and tree rows give the camera parallax as it crosses the gate.
    [-1, 1].forEach((side) => {
      [-0.5, 3.2, 6.9, 10.6, 14.3, 18].forEach((z, index) => {
        addTree(scene, side * (7.4 + (index % 2) * 0.75), z, index % 3 === 0 ? 1.18 : 0.88);
      });
      for (let i = 0; i < 5; i += 1) {
        const planter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.38, 1.35), makeMaterial(0x7b8661));
        planter.position.set(side * 6.9, 0.05, 2 - i * 3.8);
        scene.add(planter);
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), makeMaterial(0x506f43, 1));
        bush.scale.set(1.3, 0.63, 0.9);
        bush.position.set(side * 6.9, 0.72, 2 - i * 3.8);
        scene.add(bush);
      }
    });
  }

  async function initThreeCampus() {
    if (!canvas) {
      stage?.classList.add('has-no-webgl');
      return false;
    }
    try {
      THREE = await import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js');
    } catch {
      stage?.classList.add('has-no-webgl');
      return false;
    }
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: !isMobile, powerPreference: 'high-performance' });
    } catch {
      stage?.classList.add('has-no-webgl');
      return false;
    }
    stage?.classList.add('has-webgl');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb6d0c9);
    scene.fog = new THREE.Fog(0xb6d0c9, 45, 110);
    camera = new THREE.PerspectiveCamera(isMobile ? 62 : 43, 1, 0.1, 160);

    const hemisphere = new THREE.HemisphereLight(0xe7f1d8, 0x607454, 2.0);
    const sun = new THREE.DirectionalLight(0xffe5b3, 2.3);
    sun.position.set(-18, 27, 18);
    sun.castShadow = !isMobile;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -14;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 80;
    sun.shadow.bias = -0.00025;
    const fill = new THREE.DirectionalLight(0xa6c9b3, 0.65);
    fill.position.set(20, 9, -15);
    scene.add(hemisphere, sun, fill);
    addCampusGeometry();

    const particleCount = isMobile ? 36 : 85;
    const points = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      points[i * 3] = (Math.random() - 0.5) * 22;
      points[i * 3 + 1] = Math.random() * 8 + 0.3;
      points[i * 3 + 2] = (Math.random() - 0.5) * 45;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xf1e4b7, size: isMobile ? 0.045 : 0.065, transparent: true, opacity: 0.42, depthWrite: false }));
    scene.add(particles);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.15 : 1.55));
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    function resize() {
      if (!stage || !renderer || !camera) return;
      const { width, height } = stage.getBoundingClientRect();
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
    return true;
  }

  const cameraTrack = [
    { at: 0, pos: [0, 5.1, 30], target: [0, 3.4, -7] },
    { at: 0.22, pos: [0, 4.7, 20], target: [0, 3.6, -9] },
    { at: 0.48, pos: [0, 3.55, 9], target: [0, 3.6, -11] },
    { at: 0.7, pos: [0, 4.05, 1.2], target: [0, 4.0, -13] },
    { at: 0.87, pos: [0, 4.0, -7.2], target: [0, 3.9, -17] },
    { at: 1, pos: [0, 3.3, -15], target: [0, 3.1, -25] },
  ];

  function trackValue(track, progress) {
    let nextIndex = track.findIndex((point) => point.at >= progress);
    if (nextIndex < 1) return track[0].value;
    if (nextIndex < 0) return track[track.length - 1].value;
    const previous = track[nextIndex - 1];
    const next = track[nextIndex];
    const local = smoothstep(previous.at, next.at, progress);
    return previous.value.map((value, index) => value + (next.value[index] - value) * local);
  }

  function updateScene(progress) {
    const p = clamp01(progress);
    const portal = prefersReducedMotion ? 1 : smoothstep(0.015, 0.22, p);
    if (portalLeft) portalLeft.style.transform = `translateX(${-portal * 101}%)`;
    if (portalRight) portalRight.style.transform = `translateX(${portal * 101}%)`;
    if (portalWordmark) {
      portalWordmark.style.opacity = String(1 - smoothstep(0.1, 0.25, p));
      portalWordmark.style.transform = `translateX(-50%) scale(${1 + portal * 0.12})`;
      const halves = portalWordmark.children;
      if (halves[0]) halves[0].style.transform = `translateX(${-portal * 2.2}vw)`;
      if (halves[1]) halves[1].style.transform = `translateX(${portal * 2.2}vw)`;
    }
    setChapter(p);
    if (meter) meter.style.width = `${Math.round(p * 100)}%`;
    if (renderer && camera) {
      const pos = trackValue(cameraTrack.map((point) => ({ at: point.at, value: point.pos })), p);
      const target = trackValue(cameraTrack.map((point) => ({ at: point.at, value: point.target })), p);
      camera.position.set(...pos);
      camera.lookAt(...target);
      if (!prefersReducedMotion) {
        const gateOpen = smoothstep(0.06, 0.27, p);
        gateLeaves.forEach((leaf) => { leaf.rotation.y = leaf.userData.openDirection * gateOpen * 1.28; });
        const doorOpen = smoothstep(0.7, 0.87, p);
        entryDoors.forEach((door) => { door.rotation.y = door.userData.openDirection * doorOpen * 1.08; });
      }
    } else if (!renderer && !prefersReducedMotion) {
      const gateOpen = smoothstep(0.06, 0.27, p);
      document.querySelectorAll('.fallback-gate-left').forEach((leaf) => { leaf.style.transform = `rotateY(${-gateOpen * 72}deg)`; });
      document.querySelectorAll('.fallback-gate-right').forEach((leaf) => { leaf.style.transform = `rotateY(${gateOpen * 72}deg)`; });
    }
  }

  function initFeatureDeck() {
    const deck = document.getElementById('feature-deck');
    if (!deck) return;
    const cards = [...deck.querySelectorAll('[data-feature-card]')];
    const count = document.querySelector('[data-feature-count]');
    const previous = document.querySelector('[data-feature-prev]');
    const next = document.querySelector('[data-feature-next]');
    if (!cards.length) return;
    let current = 0;
    let pointerStart = null;
    const show = (index) => {
      current = (index + cards.length) % cards.length;
      cards.forEach((card, i) => {
        const active = i === current;
        card.classList.toggle('is-current', active);
        card.setAttribute('aria-hidden', String(!active));
        if (active) card.removeAttribute('inert');
        else card.setAttribute('inert', '');
      });
      if (count) count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    };
    previous?.addEventListener('click', () => show(current - 1));
    next?.addEventListener('click', () => show(current + 1));
    deck.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        show(current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    deck.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      deck.setPointerCapture?.(event.pointerId);
    });
    deck.addEventListener('pointerup', (event) => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) show(current + (dx < 0 ? 1 : -1));
      pointerStart = null;
    });
    deck.addEventListener('pointercancel', () => { pointerStart = null; });
    show(0);
  }

  function renderFrame() {
    if (renderer && scene && camera) {
      if (particles && !prefersReducedMotion) particles.rotation.y = Math.sin(performance.now() * 0.00015) * 0.018;
      renderer.render(scene, camera);
    }
    frameId = requestAnimationFrame(renderFrame);
  }

  function initJourney() {
    initFeatureDeck();
    if (!journey) return;
    const updateBuddyPosition = () => {
      const bounds = journey.getBoundingClientRect();
      const introVisible = bounds.bottom > 70 && bounds.top < window.innerHeight;
      document.body.classList.toggle('campus-intro-active', introVisible);
    };
    updateBuddyPosition();
    window.addEventListener('scroll', updateBuddyPosition, { passive: true });
    window.addEventListener('resize', updateBuddyPosition, { passive: true });

    updateScene(0);
    initThreeCampus().then((available) => {
      updateScene(state.progress);
      if (available) renderFrame();
    });

    const enter = document.getElementById('enter-campus');
    enter?.addEventListener('click', () => {
      if (prefersReducedMotion) {
        document.getElementById('ecosystem')?.scrollIntoView({ behavior: 'auto' });
        return;
      }
      if (typeof gsap === 'undefined') {
        document.getElementById('ecosystem')?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      gsap.to(state, {
        progress: 1,
        duration: 3.8,
        ease: 'power2.inOut',
        onUpdate: () => updateScene(state.progress),
        onComplete: () => document.getElementById('ecosystem')?.scrollIntoView({ behavior: 'smooth' })
      });
    });

    if (prefersReducedMotion || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: journey,
      start: 'top top+=70',
      end: 'bottom bottom',
      scrub: 0.75,
      onUpdate: (self) => {
        state.progress = self.progress;
        updateScene(self.progress);
      },
      onLeaveBack: () => {
        state.progress = 0;
        updateScene(0);
      },
    });
  }

  function initGSAPAnimations() {
    if (prefersReducedMotion || typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('.reveal-section').forEach((section) => {
      gsap.from(section, {
        y: 24,
        opacity: 0,
        duration: 0.72,
        ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top 86%', once: true }
      });
    });
  }

  async function loadPublicStats() {
    try {
      const stats = await UniVerseAPI.request('/api/admin/public-stats');
      UniVerseInteractions.animateCounter(document.getElementById('stat-students'), stats.students);
      UniVerseInteractions.animateCounter(document.getElementById('stat-events'), stats.events);
      UniVerseInteractions.animateCounter(document.getElementById('stat-resources'), stats.resources);
      UniVerseInteractions.animateCounter(document.getElementById('stat-posts'), stats.posts);
    } catch {
      // Keep default values if offline.
    }
  }

  function initPreviewTabs() {
    const buttons = document.querySelectorAll('[data-preview-tab]');
    const panels = document.querySelectorAll('[data-preview-panel]');
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.getAttribute('data-preview-tab');
        buttons.forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        panels.forEach((panel) => panel.classList.toggle('d-none', panel.getAttribute('data-preview-panel') !== target));
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initJourney();
    initGSAPAnimations();
    loadPublicStats();
    initPreviewTabs();
    const themeButton = document.getElementById('landing-theme-toggle');
    themeButton?.addEventListener('click', () => {
      const next = UniVerseAPI.getTheme() === 'dark' ? 'light' : 'dark';
      UniVerseAPI.setTheme(next);
      const icon = themeButton.querySelector('i');
      if (icon) icon.className = `bi ${next === 'light' ? 'bi-moon-stars-fill' : 'bi-sun-fill'}`;
    });
  });

  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(frameId);
    renderer?.dispose();
  });
})();
