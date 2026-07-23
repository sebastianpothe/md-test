gsap.registerPlugin(ScrollTrigger);

function initLenis() {
  if (!window.Lenis) {
    return null;
  }

  const lenis = new Lenis({
    lerp: 0.09,
    smoothWheel: true,
  });

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  return lenis;
}

function initCoverAnimation() {
  const graphicScale = 1.5;
  const pinScrollDistance = 300;
  const introRevealStart = 0.4;
  const introRevealEnd = 0.5;
  const introHoldEnd = 0.9;
  const introHideEnd = 1;
  

  const mouseIntensity = 200;
  const mouseScrollActivationEnd = 0.12;
  const scrollMin = 30;
  const scrollMax = 100;
  const enableLayerScrollScale = true;
  const layerScaleMin = 1;
  const layerScaleMax = 1.15;
  const layerQuadrants = [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
  ];

  document.documentElement.style.setProperty("--graphic-scale", graphicScale);

  const graphicLayers = [
    { selector: ".graphic-stack__layer--violet", color: "#4A04FF" },
    { selector: ".graphic-stack__layer--pink", color: "#fc0097" },
    { selector: ".graphic-stack__layer--yellow", color: "#ffff00" },
    {
      selector: ".graphic-stack__layer--white",
      color: "#FFFFFF",
      stroke: "#FFFFFF",
    },
  ];

  async function renderInlineGraphics() {
    const response = await fetch("assets/graphic.svg");
    const graphicSvg = await response.text();
    const parser = new DOMParser();
    const svgDocument = parser.parseFromString(graphicSvg, "image/svg+xml");
    const sourceSvg = svgDocument.querySelector("svg");

    if (!sourceSvg) {
      return;
    }

    graphicLayers.forEach(({ selector, color, stroke }) => {
      const layer = document.querySelector(selector);
      const svg = sourceSvg.cloneNode(true);

      if (!layer) {
        return;
      }

      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
      svg.querySelectorAll("[fill]").forEach((node) => {
        if (node.getAttribute("fill") !== "none") {
          node.setAttribute("fill", color);
        }
      });

      if (stroke) {
        svg.querySelectorAll("path").forEach((path) => {
          path.setAttribute("stroke", stroke);
          path.setAttribute("stroke-width", "2");
        });
      }

      layer.replaceChildren(svg);
    });
  }

  renderInlineGraphics();

  const movingLayers = gsap.utils
    .toArray(".graphic-stack__layer:not(.graphic-stack__layer--white)")
    .map((layer, index) => {
      const quadrant = layerQuadrants[index % layerQuadrants.length];

      return {
        layer,
        quadrant,
        mouseX: gsap.quickSetter(layer, "--mouse-x", "px"),
        mouseY: gsap.quickSetter(layer, "--mouse-y", "px"),
        scrollX: gsap.quickSetter(layer, "--scroll-x", "px"),
        scrollY: gsap.quickSetter(layer, "--scroll-y", "px"),
        scrollScale: gsap.quickSetter(layer, "--layer-scale"),
        mouseDepth: gsap.utils.random(0.35, 1),
        scrollTargetX: quadrant.x * gsap.utils.random(scrollMin, scrollMax),
        scrollTargetY: quadrant.y * gsap.utils.random(scrollMin, scrollMax),
        scrollTargetScale: gsap.utils.random(layerScaleMin, layerScaleMax),
      };
    });

  movingLayers.forEach(({ layer }) => {
    gsap.set(layer, {
      "--mouse-x": 0,
      "--mouse-y": 0,
      "--scroll-x": 0,
      "--scroll-y": 0,
      "--layer-scale": 1,
    });
  });

  const introTimeline = gsap.timeline({ paused: true });

  introTimeline
    .set(".intro-text", { clipPath: "inset(100% 0% 0% 0%)" })
    .to(".intro-text", {
      clipPath: "inset(0% 0% 0% 0%)",
      duration: introRevealEnd - introRevealStart,
      ease: "none",
    })
    .to(".intro-text", {
      clipPath: "inset(0% 0% 0% 0%)",
      duration: introHoldEnd - introRevealEnd,
      ease: "none",
    })
    .to(".intro-text", {
      clipPath: "inset(0% 0% 100% 0%)",
      duration: introHideEnd - introHoldEnd,
      ease: "none",
    });

  let currentScrollProgress = 0;
  let pointerX = 0;
  let pointerY = 0;

  function updateMouseOffset() {
    const activationProgress = gsap.utils.clamp(
      0,
      1,
      currentScrollProgress / mouseScrollActivationEnd
    );
    const activationEase = gsap.parseEase("power3.in")(activationProgress);

    movingLayers.forEach(({ mouseX, mouseY, mouseDepth, quadrant }) => {
      mouseX(Math.abs(pointerX) * mouseIntensity * mouseDepth * activationEase * quadrant.x);
      mouseY(Math.abs(pointerY) * mouseIntensity * mouseDepth * activationEase * quadrant.y);
    });
  }

  // window.addEventListener("mousemove", (event) => {
  //   pointerX = event.clientX / window.innerWidth - 0.5;
  //   pointerY = event.clientY / window.innerHeight - 0.5;

  //   updateMouseOffset();
  // });

  ScrollTrigger.create({
    trigger: ".pin-section",
    start: "top top",
    end: `+=${pinScrollDistance}%`,
    pin: true,
    scrub: true,
    onUpdate: ({ progress }) => {
      const introProgress = gsap.utils.clamp(
        0,
        1,
        (progress - introRevealStart) / (introHideEnd - introRevealStart)
      );

      introTimeline.progress(introProgress);
    },
  });

  ScrollTrigger.create({
    trigger: ".page",
    start: "top top",
    end: `+=${pinScrollDistance}%`,
    scrub: true,
    onUpdate: ({ progress }) => {
      currentScrollProgress = progress;
      updateMouseOffset();

      movingLayers.forEach(
        ({
          scrollX,
          scrollY,
          scrollScale,
          scrollTargetX,
          scrollTargetY,
          scrollTargetScale,
        }) => {
          scrollX(scrollTargetX * progress);
          scrollY(scrollTargetY * progress);
          scrollScale(
            enableLayerScrollScale
              ? gsap.utils.interpolate(1, scrollTargetScale, progress)
              : 1
          );
        }
      );
    },
  });
}

function initCapabilitySections() {
  gsap.utils.toArray(".cap-section").forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top top",
      // end: "+=400%",
      // pin: true,
      onEnter: () => section.classList.add("section-active"),
      onEnterBack: () => section.classList.add("section-active"),
      onLeave: () => section.classList.remove("section-active"),
      onLeaveBack: () => section.classList.remove("section-active"),
    });
  });
}

function initServiceGridNudge() {
  const desktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  if (!desktopPointer.matches) {
    return;
  }

  const maxStretch = 0.25;
  const maxBlur = 2;
  const speedReference = 1; // px/ms of pointer movement that maps to the full effect

  gsap.utils.toArray(".service-grid li").forEach((item) => {
    const state = { angle: 0, scaleX: 1, scaleY: 1, blur: 0 };
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;

    const applyState = () => {
      item.style.setProperty("--nudge-angle", `${state.angle}deg`);
      item.style.setProperty("--nudge-scale-x", state.scaleX);
      item.style.setProperty("--nudge-scale-y", state.scaleY);
      item.style.setProperty("--nudge-blur", `${state.blur}px`);
    };

    item.addEventListener("pointerenter", (event) => {
      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = performance.now();
    });

    item.addEventListener("pointermove", (event) => {
      const now = performance.now();
      const dt = Math.max(now - lastTime, 1);
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      const speed = Math.min(Math.hypot(dx, dy) / dt / speedReference, 1);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      lastX = event.clientX;
      lastY = event.clientY;
      lastTime = now;

      gsap.to(state, {
        angle,
        scaleX: 1 + speed * maxStretch,
        scaleY: 1 - speed * maxStretch * 0.5,
        blur: speed * maxBlur,
        duration: 0.4,
        ease: "power3.out",
        overwrite: true,
        onUpdate: applyState,
      });
    });

    item.addEventListener("pointerleave", () => {
      gsap.to(state, {
        scaleX: 1,
        scaleY: 1,
        blur: 0,
        duration: 0.8,
        ease: "elastic.out(1, 0.4)",
        overwrite: true,
        onUpdate: applyState,
      });
    });
  });
}

initLenis();
initCoverAnimation();
initCapabilitySections();
initServiceGridNudge();
