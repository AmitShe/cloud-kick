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

const steps = {
  intro: { label: "בואו נשחק", hint: "משחק קטן בשמיים" },
  ball: { label: "להקפיץ כדור", hint: "נוגעים בכדור הזוהר", target: ball, icon: "ball" },
  plane: { label: "להטיס את הכדור", hint: "נוגעים במטוס הזוהר", target: plane, icon: "plane" },
  hook: { label: "להוריד את המנוף", hint: "נוגעים בוו הזוהר", target: hook, icon: "hook" },
  moving: { label: "הכדור בדרך", hint: "הנה הוא בא…", icon: "ball" },
  goal: { label: "גול!", hint: "כוכב חדש!", icon: "star" },
  done: { label: "עוד סיבוב", hint: "כל הכוכבים שלך", icon: "star" }
};

const start = {
  ball: { left: "40%", top: "76%", rotate: "0deg", scale: "1", opacity: "1" },
  plane: { left: "25%", top: "40%", rotate: "0deg", scale: "1" },
  hook: { left: "62%", top: "38%" },
  cable: { height: "5%" }
};
const caught = { left: "28%", top: "49%", rotate: "340deg", scale: ".53" };
const onHook = { left: "62%", top: "44%", rotate: "605deg", scale: ".53" };

let state = "intro";
let goals = 0;
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

function show(next) {
  state = next;
  scene.dataset.state = next;
  const { label, hint: message, target, icon } = steps[next];
  for (const piece of [ball, plane, hook]) piece.disabled = piece !== target;
  actionText.textContent = label;
  hint.textContent = message;
  if (icon) action.dataset.icon = icon;
  else delete action.dataset.icon;
  action.setAttribute("aria-disabled", String(next === "moving" || next === "goal"));
  finale.hidden = next !== "done";
}

function resetPieces() {
  Object.assign(ball.style, start.ball);
  Object.assign(plane.style, start.plane);
  Object.assign(hook.style, start.hook);
  Object.assign(cable.style, start.cable);
  scene.dataset.round = goals;
  cheer.classList.remove("show");
  particles.replaceChildren();
}

function updateStars() {
  for (const [index, star] of [...stars.children].entries()) {
    star.classList.toggle("earned", index < goals);
  }
  stars.setAttribute("aria-label", `${goals} מתוך 3 כוכבים`);
}

async function move(element, frames, duration, easing = "ease-in-out") {
  const motion = element.animate(frames, { duration: reducedMotion.matches ? 140 : duration, easing, fill: "forwards" });
  await motion.finished;
  Object.assign(element.style, frames.at(-1));
  motion.cancel();
}

function kick() {
  notes([262, 440, 660], { interval: .07, wave: "triangle", volume: .065 });
  return move(ball, [
    start.ball,
    { left: goals === 1 ? "49%" : "22%", top: "48%", rotate: "180deg", scale: ".77" },
    { left: "23%", top: "43%", rotate: "270deg", scale: ".62" },
    caught
  ], 690, "cubic-bezier(.22,.7,.36,1)");
}

async function fly() {
  notes([330, 440, 554, 740, 554], { interval: .12, wave: "triangle", volume: .045 });
  await Promise.all([
    move(plane, [
      start.plane,
      { left: "42%", top: "24%", rotate: "-13deg", scale: "1.05" },
      { left: "63%", top: "34%", rotate: "8deg", scale: ".85" }
    ], 790),
    move(ball, [
      caught,
      { left: "44%", top: "34%", rotate: "450deg", scale: ".55" },
      onHook
    ], 790)
  ]);
  await move(plane, [
    { left: "63%", top: "34%", rotate: "8deg", scale: ".85" },
    { left: "48%", top: "41%", rotate: "-7deg", scale: ".88" },
    start.plane
  ], 460);
}

async function lower() {
  notes([784, 659, 523, 392], { interval: .12, volume: .075 });
  const lowHook = { left: "62%", top: "56%" };
  await Promise.all([
    move(cable, [start.cable, { height: "23%" }], 590),
    move(hook, [start.hook, lowHook], 590),
    move(ball, [onHook, { left: "62%", top: "62%", rotate: "670deg", scale: ".53" }], 590)
  ]);
  await move(ball, [
    { left: "62%", top: "62%", rotate: "670deg", scale: ".53" },
    { left: "57%", top: "66%", rotate: "755deg", scale: ".37", opacity: "1" }
  ], 285, "cubic-bezier(.55,.05,.68,.5)");
}

function burst() {
  if (reducedMotion.matches) return;
  const colors = ["#fff1a1", "#ffab6c", "#a7f6e5", "#ff9cc4", "#fffdf4"];
  for (let index = 0; index < 22; index++) {
    const spark = document.createElement("i");
    spark.className = "spark";
    const angle = index * Math.PI * 2 / 22;
    const distance = scene.clientWidth * (.19 + (index % 4) * .085);
    spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--dy", `${Math.sin(angle) * distance * .77}px`);
    spark.style.setProperty("--size", `${12 + (index % 5) * 4}px`);
    spark.style.setProperty("--color", colors[index % colors.length]);
    spark.style.setProperty("--spin", `${index * 37}deg`);
    particles.append(spark);
  }
}

async function playStep() {
  if (state === "moving" || state === "goal") return;
  if (state === "intro" || state === "done") {
    goals = 0;
    updateStars();
    resetPieces();
    show("ball");
    notes([392, 523, 659], { wave: "triangle", volume: .075 });
    return;
  }

  const step = state;
  show("moving");
  if (step === "ball") {
    await kick();
    show("plane");
    return;
  }
  if (step === "plane") {
    await fly();
    show("hook");
    return;
  }

  await lower();
  goals++;
  updateStars();
  show("goal");
  cheer.classList.add("show");
  burst();
  notes(goals === 3 ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047], { interval: .105, length: .28, wave: "triangle", volume: .08 });
  await new Promise(resolve => setTimeout(resolve, 1050));
  if (goals === 3) {
    show("done");
  } else {
    resetPieces();
    show("ball");
  }
}

action.addEventListener("click", playStep);
for (const piece of [ball, plane, hook]) piece.addEventListener("click", event => {
  playStep();
  if (event.detail === 0) action.focus({ preventScroll: true });
});
show("intro");
