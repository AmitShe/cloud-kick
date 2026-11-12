"use strict";

const scene = document.querySelector("#scene");
const action = document.querySelector("#action");
const actionText = document.querySelector("#action-text");
const hint = document.querySelector("#hint");
const soundButton = document.querySelector("#sound");
const stars = document.querySelector(".stars");
const cheer = document.querySelector("#cheer");
const finale = document.querySelector("#finale");
const particles = document.querySelector("#particles");
const ball = document.querySelector("#ball");
const plane = document.querySelector("#plane");
const hook = document.querySelector("#hook");
const cable = document.querySelector("#cable");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const muteKey = "cloud-kick:muted";

let muted = false;
let audio;

try { muted = localStorage.getItem(muteKey) === "yes"; } catch {}
soundButton.setAttribute("aria-pressed", String(!muted));

function getAudio() {
  if (muted) return null;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  try {
    audio ||= new Audio();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    return audio;
  } catch {
    return null;
  }
}

function notes(pitches, { interval = .095, length = .18, wave = "sine", volume = .1 } = {}) {
  const context = getAudio();
  if (!context) return;
  pitches.forEach((pitch, index) => {
    const time = context.currentTime + .015 + index * interval;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(pitch, time);
    gain.gain.setValueAtTime(.001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + .018);
    gain.gain.exponentialRampToValueAtTime(.001, time + length);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(time);
    oscillator.stop(time + length + .01);
  });
}

soundButton.addEventListener("click", () => {
  muted = !muted;
  soundButton.setAttribute("aria-pressed", String(!muted));
  try { localStorage.setItem(muteKey, muted ? "yes" : "no"); } catch {}
  if (muted) audio?.suspend().catch(() => {});
  else notes([523, 784]);
});

const goal = document.querySelector("#goal");
const spider = document.querySelector("#spider");
const shadow = document.querySelector("#ball-shadow");
const guide = document.querySelector("#guide");
const web = document.querySelector("#web");
const mission = document.querySelector("#mission");

const kickoff = { x: 40, y: 77 };
const runway = { x: 23, y: 44 };
const pickup = { x: 62, y: 38 };
const glove = { x: 37, y: 29 };
const states = {
  intro: ["", "משחק קטן בשמיים", "בואו נשחק"],
  kick: ["בעיטה לשער", "גוררים את הכדור לכיוון השער ומשחררים", "רמז", "ball"],
  catch: ["ספיידרמן תופס!", "נוגעים בכדור לפני שהוא עף", "רמז", "web"],
  taxi: ["מטוס ומנוף", "גוררים את המטוס אל הוו הזוהר", "רמז", "plane"],
  drop: ["מטוס ומנוף", "נוגעים בוו כשהכדור מעל השער", "לשחרר כדור", "hook"],
  busy: ["", "", "הכדור בדרך", "ball"],
  goal: ["", "כוכב חדש!", "גול!", "star"],
  done: ["", "כל הכוכבים שלך", "עוד סיבוב", "star"]
};

let state = "intro";
let level = 0;
let playthrough = 0;
let goals = 0;
let goalX = 58;
let ballAt = kickoff;
let planeAt = runway;
let hookAt = pickup;
let drag;
let frame;
let slowUntil = 0;
let hintTimer;

function setState(next) {
  cancelAnimationFrame(frame);
  clearTimeout(hintTimer);
  scene.classList.remove("help", "aligned", "dragging");
  showLine(guide);
  state = next;
  scene.dataset.state = next;
  scene.dataset.level = level;
  const [title, message, label, icon] = states[next];
  if (next !== "busy" && next !== "goal") mission.textContent = title;
  mission.hidden = next === "intro" || next === "done";
  if (message) hint.textContent = message;
  actionText.textContent = label;
  if (icon) action.dataset.icon = icon;
  else delete action.dataset.icon;
  action.setAttribute("aria-disabled", String(next === "busy" || next === "goal"));
  ball.disabled = next !== "kick" && next !== "catch";
  plane.disabled = next !== "taxi";
  hook.disabled = next !== "drop";
  finale.hidden = next !== "done";
}

function place(element, { x, y }) {
  element.style.left = x + "%";
  element.style.top = y + "%";
}

function placeBall(point) {
  ballAt = point;
  place(ball, point);
}

function placePlane(point) {
  planeAt = point;
  place(plane, point);
  placeBall({ x: point.x + 4, y: point.y + 8 });
}

function placeHook(point) {
  hookAt = point;
  place(hook, point);
  cable.style.left = point.x + "%";
}

function showLine(line, from, to) {
  line.classList.toggle("visible", Boolean(from));
  if (!from) return;
  line.setAttribute("x1", from.x);
  line.setAttribute("y1", from.y);
  line.setAttribute("x2", to.x);
  line.setAttribute("y2", to.y);
}

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function flyBall(points, time, turn = 360) {
  const motion = ball.animate(points.map((point, index) => ({
    left: point.x + "%",
    top: point.y + "%",
    rotate: turn * index / (points.length - 1) + "deg"
  })), { duration: reducedMotion.matches ? 150 : time, easing: "ease-in-out", fill: "forwards" });
  await motion.finished;
  placeBall(points.at(-1));
  motion.cancel();
}

function resetPieces() {
  place(plane, runway);
  planeAt = runway;
  placeHook(pickup);
  placeBall(kickoff);
  place(shadow, { x: kickoff.x, y: 81 });
  showLine(web);
  cheer.classList.remove("show");
  particles.replaceChildren();
  spider.classList.remove("shoot");
  goal.style.left = goalX + "%";
}

function beginLevel() {
  goalX = level === 2 ? (playthrough % 2 ? 77 : 60) : (playthrough % 2 ? 66 : 56);
  resetPieces();
  if (level === 0) {
    setState("kick");
    if (playthrough === 0) hintFor("kick");
  }
  if (level === 1) startCatch();
  if (level === 2) {
    placePlane(runway);
    setState("taxi");
    if (playthrough === 0) hintFor("taxi");
  }
}

function animateTarget(update) {
  let last = performance.now();
  let time = 0;
  slowUntil = 0;
  function tick(now) {
    const speed = reducedMotion.matches || now < slowUntil ? .47 : 1;
    time += Math.max(0, Math.min(now - last, 48)) * speed;
    last = now;
    update(time);
    frame = requestAnimationFrame(tick);
  }
  update(0);
  frame = requestAnimationFrame(tick);
}

function startCatch() {
  setState("catch");
  animateTarget(time => {
    const phase = time / 690 + (playthrough % 2) * Math.PI;
    placeBall({ x: 66 + 19 * Math.sin(phase), y: 39 + 6 * Math.sin(phase * 1.35) });
  });
}

function startDrop(fromX = pickup.x) {
  setState("drop");
  const initial = Math.asin(Math.max(-1, Math.min(1, (fromX - 73) / 11)));
  animateTarget(time => {
    const x = 73 + 11 * Math.sin(initial + time / 650);
    placeHook({ x, y: pickup.y });
    placeBall({ x, y: 45 });
    showLine(guide, ballAt, { x, y: 65 });
    scene.classList.toggle("aligned", dropAligned(x));
  });
}

function dropAligned(x) {
  return Math.abs(x - goalX) <= 9;
}

function updateStars() {
  for (const [index, star] of [...stars.children].entries()) {
    star.classList.toggle("earned", index < goals);
  }
  stars.setAttribute("aria-label", `${goals} מתוך 3 כוכבים`);
}

function burst() {
  if (reducedMotion.matches) return;
  const colors = ["#fff1a1", "#ffab6c", "#a7f6e5", "#ff9cc4", "#fffdf4"];
  for (let index = 0; index < 20; index++) {
    const spark = document.createElement("i");
    spark.className = "spark";
    spark.style.left = goalX + "%";
    const angle = index * Math.PI * 2 / 20;
    const distance = scene.clientWidth * (.19 + (index % 4) * .085);
    spark.style.setProperty("--dx", Math.cos(angle) * distance + "px");
    spark.style.setProperty("--dy", Math.sin(angle) * distance * .77 + "px");
    spark.style.setProperty("--size", 12 + (index % 5) * 4 + "px");
    spark.style.setProperty("--color", colors[index % colors.length]);
    spark.style.setProperty("--spin", index * 37 + "deg");
    particles.append(spark);
  }
}

async function score() {
  goals++;
  updateStars();
  setState("goal");
  cheer.classList.add("show");
  burst();
  notes(goals === 3 ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047], {
    interval: .105, length: .28, wave: "triangle", volume: .08
  });
  await pause(1150);
  if (goals === 3) {
    cheer.classList.remove("show");
    setState("done");
  } else {
    level++;
    beginLevel();
  }
}

function aimX(dx, dy) {
  return kickoff.x + dx * (kickoff.y - 64) / Math.max(-dy, 2);
}

async function kick(dx, dy) {
  if (dy > -4) return hintFor("kick");
  setState("busy");
  notes([262, 440, 660], { interval: .07, wave: "triangle", volume: .065 });
  const x = aimX(dx, dy);
  if (Math.abs(x - goalX) <= 12) {
    await flyBall([kickoff, { x: (kickoff.x + x) / 2, y: 58 }, { x, y: 66 }], 580);
    await score();
  } else {
    const edge = Math.max(8, Math.min(92, x));
    await flyBall([kickoff, { x: edge, y: 62 }, { x: edge, y: 72 }, kickoff], 750);
    setState("kick");
    hint.textContent = "כמעט! מכוונים שוב לשער";
    hintFor("kick");
  }
}

async function catchBall() {
  if (state !== "catch") return;
  const from = ballAt;
  setState("busy");
  spider.classList.add("shoot");
  showLine(web, glove, from);
  notes([587, 880, 1175], { interval: .055, wave: "triangle", volume: .075 });
  const caught = { x: 43, y: 34 };
  const retract = web.animate([{ opacity: 1 }, { opacity: .85 }], 270);
  await flyBall([from, caught], 285, -90);
  retract.cancel();
  showLine(web, glove, caught);
  await pause(100);
  showLine(web);
  spider.classList.remove("shoot");
  await flyBall([caught, { x: goalX + 5, y: 47 }, { x: goalX, y: 66 }], 530);
  await score();
}

function dropBall() {
  if (state !== "drop") return;
  const from = ballAt;
  const hit = dropAligned(from.x);
  setState("busy");
  notes([659, 523, 392], { interval: .09, volume: .07 });
  flyBall([from, { x: from.x, y: hit ? 66 : 73 }], 490, 170).then(async () => {
    if (hit) {
      await score();
    } else {
      await flyBall([ballAt, from], 470, -120);
      startDrop(from.x);
      hint.textContent = "כמעט! חכו שהכדור יהיה מעל השער";
    }
  });
}

function position(event) {
  const bounds = scene.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) / bounds.width * 100,
    y: (event.clientY - bounds.top) / bounds.height * 100
  };
}

function startDrag(event) {
  const kind = event.currentTarget === ball ? "kick" : "taxi";
  if (state !== kind || drag || event.button !== 0) return;
  const start = position(event);
  const origin = kind === "kick" ? kickoff : planeAt;
  drag = { id: event.pointerId, kind, start, origin };
  event.currentTarget.setPointerCapture(event.pointerId);
  scene.classList.add("dragging");
}

function updateDrag(event) {
  if (drag?.id !== event.pointerId) return;
  const point = position(event);
  const dx = point.x - drag.start.x;
  const dy = point.y - drag.start.y;
  if (drag.kind === "kick") {
    const x = aimX(dx, dy);
    showLine(guide, kickoff, {
      x: dy < -4 ? Math.max(1, Math.min(99, x)) : point.x,
      y: dy < -4 ? 64 : point.y
    });
    scene.classList.toggle("aligned", dy < -4 && Math.abs(x - goalX) <= 12);
    placeBall({ x: kickoff.x + dx * .18, y: kickoff.y + dy * .18 });
  } else {
    placePlane({
      x: Math.max(15, Math.min(82, drag.origin.x + dx)),
      y: Math.max(23, Math.min(71, drag.origin.y + dy))
    });
    scene.classList.toggle("aligned", canDock());
  }
}

function canDock() {
  return Math.abs(planeAt.x + 8 - pickup.x) <= 13 && Math.abs(planeAt.y + 4 - pickup.y) <= 12;
}

function endDrag(event) {
  if (drag?.id !== event.pointerId) return;
  if (event.type === "pointerup") updateDrag(event);
  const { kind, start } = drag;
  drag = undefined;
  scene.classList.remove("dragging", "aligned");
  showLine(guide);
  if (kind === "kick") {
    placeBall(kickoff);
    if (event.type === "pointerup") {
      const point = position(event);
      kick(point.x - start.x, point.y - start.y);
    }
  } else if (event.type === "pointerup" && canDock()) {
    notes([330, 554, 740], { interval: .085, wave: "triangle", volume: .075 });
    place(plane, runway);
    planeAt = runway;
    startDrop();
  } else if (event.type === "pointerup") {
    hint.textContent = "משחררים את המטוס ליד העיגול הזוהר";
  }
}

function hintFor(kind) {
  clearTimeout(hintTimer);
  scene.classList.add("help");
  if (kind === "kick") showLine(guide, kickoff, { x: goalX, y: 64 });
  if (kind === "taxi") showLine(guide, planeAt, pickup);
  if (kind === "catch") slowUntil = performance.now() + 3500;
  hintTimer = setTimeout(() => {
    scene.classList.remove("help");
    if (!drag) showLine(guide);
  }, 2400);
}

function nextAction() {
  if (state === "intro" || state === "done") {
    if (state === "done") playthrough++;
    goals = 0;
    level = 0;
    updateStars();
    beginLevel();
    notes([392, 523, 659], { wave: "triangle", volume: .075 });
  } else if (state === "drop") {
    dropBall();
  } else if (["kick", "taxi", "catch"].includes(state)) {
    hintFor(state);
  }
}

for (const piece of [ball, plane]) {
  piece.addEventListener("pointerdown", startDrag);
  piece.addEventListener("pointermove", updateDrag);
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
    piece.addEventListener(event, endDrag);
  }
}
ball.addEventListener("pointerdown", event => {
  if (event.button === 0 && state === "catch") {
    event.preventDefault();
    catchBall();
  }
});
ball.addEventListener("click", event => {
  if (event.detail === 0 && state === "catch") catchBall();
});
hook.addEventListener("click", dropBall);
action.addEventListener("click", nextAction);
setState("intro");
