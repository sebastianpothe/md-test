gsap.registerPlugin(ScrollTrigger);

const graphicScale = 1.5;
const pinScrollDistance = 500;
const introRevealStart = 0.4;
const introRevealEnd = 0.5;

document.documentElement.style.setProperty("--graphic-scale", graphicScale);

const mouseIntensity = 80;
const mouseScrollActivationEnd = 0.12;
const scrollMin = 30;
const scrollMax = 100;
const layerQuadrants = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
];

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
      mouseDepth: gsap.utils.random(0.35, 1),
      scrollTargetX: quadrant.x * gsap.utils.random(scrollMin, scrollMax),
      scrollTargetY: quadrant.y * gsap.utils.random(scrollMin, scrollMax),
    };
  });

movingLayers.forEach(({ layer }) => {
  gsap.set(layer, {
    "--mouse-x": 0,
    "--mouse-y": 0,
    "--scroll-x": 0,
    "--scroll-y": 0,
  });
});

const setIntroClip = gsap.quickSetter(".intro-text", "clipPath");

setIntroClip("inset(100% 0% 0% 0%)");

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

  movingLayers.forEach(({ mouseX, mouseY, mouseDepth }) => {
    mouseX(pointerX * -mouseIntensity * mouseDepth * activationEase);
    mouseY(pointerY * -mouseIntensity * mouseDepth * activationEase);
  });
}

window.addEventListener("mousemove", (event) => {
  pointerX = event.clientX / window.innerWidth - 0.5;
  pointerY = event.clientY / window.innerHeight - 0.5;

  updateMouseOffset();
});

ScrollTrigger.create({
  trigger: ".pin-section",
  start: "top top",
  end: `+=${pinScrollDistance}%`,
  pin: true,
  scrub: true,
  onUpdate: ({ progress }) => {
    const revealProgress = gsap.utils.clamp(
      0,
      1,
      (progress - introRevealStart) / (introRevealEnd - introRevealStart)
    );
    const topClip = 100 - revealProgress * 100;

    setIntroClip(`inset(${topClip}% 0% 0% 0%)`);
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

    movingLayers.forEach(({ scrollX, scrollY, scrollTargetX, scrollTargetY }) => {
      scrollX(scrollTargetX * progress);
      scrollY(scrollTargetY * progress);
    });
  },
});
