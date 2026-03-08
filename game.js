const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const levelBox = document.getElementById("levelBox");
const speedBox = document.getElementById("speedBox");
const placeBox = document.getElementById("placeBox");
const distBox = document.getElementById("distBox");
const messageBox = document.getElementById("message");
const startOverlay = document.getElementById("startOverlay");
const startBtn = document.getElementById("startBtn");

let leftPressed = false;
let rightPressed = false;
let accelPressed = false;
let boostPressed = false;
let started = false;

const levels = [
  {
    name: "Niveau 1 - Prairie",
    length: 4200,
    skyTop: "#7dd3fc",
    skyBottom: "#e0f5ff",
    ground: "#5ebd53",
    mountain: "#879aac",
    aiBase: [4.8, 4.6, 4.4],
    animalRate: 0.0018,
    barrierRate: 0.0032,
    curveStrength: 0.22
  },
  {
    name: "Niveau 2 - Désert",
    length: 5200,
    skyTop: "#88d8ff",
    skyBottom: "#fff0c4",
    ground: "#d3ad62",
    mountain: "#bf8740",
    aiBase: [5.1, 4.9, 4.7],
    animalRate: 0.0020,
    barrierRate: 0.0035,
    curveStrength: 0.32
  },
  {
    name: "Niveau 3 - Forêt sombre",
    length: 6200,
    skyTop: "#4d6c95",
    skyBottom: "#b8d1ea",
    ground: "#355f37",
    mountain: "#314c39",
    aiBase: [5.4, 5.2, 5.0],
    animalRate: 0.0022,
    barrierRate: 0.0038,
    curveStrength: 0.42
  },
  {
    name: "Niveau 4 - Ville de nuit",
    length: 7600,
    skyTop: "#071221",
    skyBottom: "#1c3557",
    ground: "#243446",
    mountain: "#203040",
    aiBase: [5.7, 5.5, 5.3],
    animalRate: 0.0022,
    barrierRate: 0.0040,
    curveStrength: 0.52
  }
];

let currentLevel = 0;
let gameState = "waiting";
let nextLevelTimer = 0;
let worldTime = 0;
let roadShift = 0;
let curvePhase = 0;
let obstacles = [];

const cars = [
  { id: "player", color: "red", lane: 0, x: 0, y: 0, w: 26, h: 50, speed: 0, distance: 0, boost: 0, targetLane: 0 },
  { id: "yellow", color: "gold", lane: 1, x: 0, y: 0, w: 26, h: 50, speed: 0, distance: 0, boost: 0, targetLane: 1 },
  { id: "green", color: "limegreen", lane: 2, x: 0, y: 0, w: 26, h: 50, speed: 0, distance: 0, boost: 0, targetLane: 2 },
  { id: "purple", color: "violet", lane: 3, x: 0, y: 0, w: 26, h: 50, speed: 0, distance: 0, boost: 0, targetLane: 3 }
];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = Math.floor(window.innerHeight * 0.5);
  updateStaticPlayerPosition();
}

function getRoadData() {
  const topWidth = canvas.width * 0.54;
  const bottomWidth = canvas.width * 0.94;
  const centerX = canvas.width * 0.5 + roadShift;
  const horizonY = canvas.height * 0.20;
  return { topWidth, bottomWidth, centerX, horizonY };
}

function roadWidthAtY(y) {
  const { topWidth, bottomWidth, horizonY } = getRoadData();
  const t = Math.max(0, Math.min(1, (y - horizonY) / (canvas.height - horizonY)));
  return topWidth + (bottomWidth - topWidth) * t;
}

function laneCenterAtY(laneIndex, y) {
  const { centerX } = getRoadData();
  const width = roadWidthAtY(y);
  const roadLeft = centerX - width / 2;
  const laneWidth = width / 4;
  return roadLeft + laneWidth * (laneIndex + 0.5);
}

function updateStaticPlayerPosition() {
  const player = cars[0];
  player.y = canvas.height - 72;
  player.x = laneCenterAtY(player.lane, player.y);
}

function resetCars() {
  const starts = [0, 1, 2, 3];
  for (let i = 0; i < cars.length; i++) {
    cars[i].lane = starts[i];
    cars[i].targetLane = starts[i];
    cars[i].distance = 0;
    cars[i].speed = 0;
    cars[i].boost = 0;
  }
  updateStaticPlayerPosition();
}

function hideMessage() {
  messageBox.style.display = "none";
  messageBox.innerHTML = "";
}

function showMessage(html) {
  messageBox.innerHTML = html;
  messageBox.style.display = "block";
}

function resetLevel(index) {
  currentLevel = index;
  gameState = "waiting";
  nextLevelTimer = 0;
  worldTime = 0;
  roadShift = 0;
  curvePhase = 0;
  obstacles = [];
  hideMessage();
  resetCars();
  levelBox.textContent = levels[currentLevel].name;
  speedBox.textContent = "Vitesse 0";
  placeBox.textContent = "Place 1/4";
  distBox.textContent = "0 m";
}

function restartCurrentLevel() {
  resetLevel(currentLevel);
  started = false;
  startOverlay.style.display = "flex";
}

function bindHold(id, keyName) {
  const el = document.getElementById(id);

  const start = (e) => {
    e.preventDefault();
    if (gameState !== "playing") return;
    if (keyName === "left") leftPressed = true;
    if (keyName === "right") rightPressed = true;
    if (keyName === "accel") accelPressed = true;
    if (keyName === "boost") boostPressed = true;
  };

  const end = (e) => {
    e.preventDefault();
    if (keyName === "left") leftPressed = false;
    if (keyName === "right") rightPressed = false;
    if (keyName === "accel") accelPressed = false;
    if (keyName === "boost") boostPressed = false;
  };

  el.addEventListener("touchstart", start, { passive: false });
  el.addEventListener("touchend", end, { passive: false });
  el.addEventListener("touchcancel", end, { passive: false });
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", end);
  el.addEventListener("mouseleave", end);
}

bindHold("leftBtn", "left");
bindHold("rightBtn", "right");
bindHold("accelBtn", "accel");
bindHold("boostBtn", "boost");

window.addEventListener("resize", resizeCanvas);

startBtn.addEventListener("click", () => {
  started = true;
  gameState = "playing";
  startOverlay.style.display = "none";
  hideMessage();
});

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "replayBtn") {
    restartCurrentLevel();
  }
});

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function maybeSpawnObstacle() {
  if (!started || gameState !== "playing") return;

  const lvl = levels[currentLevel];

  if (Math.random() < lvl.barrierRate) {
    const lane = Math.floor(Math.random() * 4);
    obstacles.push({
      type: "barrier",
      lane,
      distance: cars[0].distance + rand(420, 820),
      w: 28,
      h: 18
    });
  }

  if (Math.random() < lvl.animalRate) {
    const lane = Math.floor(rand(1, 3));
    obstacles.push({
      type: "animal",
      lane,
      distance: cars[0].distance + rand(480, 900),
      w: 22,
      h: 14
    });
  }
}

function cleanupObstacles() {
  obstacles = obstacles.filter(o => o.distance > cars[0].distance - 300);
}

function obstacleScreenY(objDistance) {
  const player = cars[0];
  const delta = objDistance - player.distance;
  const y = player.y - delta * 0.34;
  return y;
}

function obstacleX(o, y) {
  return laneCenterAtY(o.lane, y);
}

function drawBackground() {
  const lvl = levels[currentLevel];
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, lvl.skyTop);
  sky.addColorStop(0.45, lvl.skyBottom);
  sky.addColorStop(0.46, lvl.ground);
  sky.addColorStop(1, lvl.ground);

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = lvl.mountain;
  for (let i = -1; i < 6; i++) {
    const x = i * 170 - ((worldTime * 8) % 170);
    ctx.beginPath();
    ctx.moveTo(x, canvas.height * 0.30);
    ctx.lineTo(x + 70, canvas.height * 0.12);
    ctx.lineTo(x + 155, canvas.height * 0.30);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRoad() {
  const { topWidth, bottomWidth, centerX, horizonY } = getRoadData();

  ctx.beginPath();
  ctx.moveTo(centerX - topWidth / 2, horizonY);
  ctx.lineTo(centerX + topWidth / 2, horizonY);
  ctx.lineTo(centerX + bottomWidth / 2, canvas.height);
  ctx.lineTo(centerX - bottomWidth / 2, canvas.height);
  ctx.closePath();
  ctx.fillStyle = "#2b2c31";
  ctx.fill();

  ctx.strokeStyle = "#f4f4f4";
  ctx.lineWidth = 3;
  ctx.stroke();

  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const xTop = centerX - topWidth / 2 + topWidth * t;
    const xBottom = centerX - bottomWidth / 2 + bottomWidth * t;
    ctx.beginPath();
    ctx.moveTo(xTop, horizonY);
    ctx.lineTo(xBottom, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const playerDistance = cars[0].distance;

  for (let d = Math.floor(playerDistance / 90) * 90 - 260; d < playerDistance + 1800; d += 90) {
    const y = obstacleScreenY(d);
    if (y < horizonY || y > canvas.height) continue;
    const t = (y - horizonY) / (canvas.height - horizonY);
    const h = 9 + t * 16;
    ctx.fillStyle = "white";
    ctx.fillRect(centerX - 4, y, 8, h);
  }

  drawStartLine();
  drawFinishLine();
}

function drawCheckeredLine(targetDistance, label) {
  const y = obstacleScreenY(targetDistance);
  const { centerX, horizonY } = getRoadData();
  if (y < horizonY - 30 || y > canvas.height + 30) return;

  const width = roadWidthAtY(y);
  const roadLeft = centerX - width / 2;
  const cell = Math.max(10, width / 12);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 12; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#fff" : "#111";
      ctx.fillRect(roadLeft + col * cell, y + row * 9, cell, 9);
    }
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px Arial";
  ctx.fillText(label, roadLeft + width / 2 - 24, y - 6);
}

function drawStartLine() {
  drawCheckeredLine(0, "DÉPART");
}

function drawFinishLine() {
  drawCheckeredLine(levels[currentLevel].length, "ARRIVÉE");
}

function drawCarAt(car, x, y, scale = 1) {
  const w = car.w * scale;
  const h = car.h * scale;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = car.color;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.fillStyle = "#d9ecff";
  ctx.fillRect(-w * 0.31, -h * 0.32, w * 0.62, h * 0.2);

  ctx.fillStyle = "#111";
  ctx.fillRect(-w * 0.54, -h * 0.4, w * 0.15, h * 0.28);
  ctx.fillRect(w * 0.39, -h * 0.4, w * 0.15, h * 0.28);
  ctx.fillRect(-w * 0.54, h * 0.12, w * 0.15, h * 0.28);
  ctx.fillRect(w * 0.39, h * 0.12, w * 0.15, h * 0.28);

  if (car.boost > 0) {
    ctx.fillStyle = "#ffb000";
    ctx.fillRect(-w * 0.23, h * 0.5 - 2, w * 0.15, h * 0.18);
    ctx.fillRect(w * 0.08, h * 0.5 - 2, w * 0.15, h * 0.18);
  }

  ctx.restore();
}

function drawObstacle(o) {
  const y = obstacleScreenY(o.distance);
  if (y < 30 || y > canvas.height + 30) return;

  const x = obstacleX(o, y);
  const scale = Math.max(0.55, Math.min(1.15, (y / canvas.height) + 0.2));
  const w = o.w * scale;
  const h = o.h * scale;

  if (o.type === "barrier") {
    ctx.fillStyle = "#d9472f";
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - w / 2 + 4, y - 2, w - 8, 3);
  }

  if (o.type === "animal") {
    ctx.fillStyle = "#5b3a1e";
    ctx.fillRect(x - w * 0.36, y - h * 0.35, w * 0.72, h * 0.7);
    ctx.fillRect(x - w * 0.32, y - h * 0.75, w * 0.28, h * 0.35);
  }
}

function playerLose(reason) {
  gameState = "lost";
  showMessage(`
    <div>${reason}</div>
    <button id="replayBtn">REJOUER</button>
  `);
}

function playerWinLevel() {
  gameState = "won";

  if (currentLevel < levels.length - 1) {
    showMessage(`Niveau gagné. Prochain niveau...`);
    nextLevelTimer = 90;
  } else {
    showMessage(`
      <div>Victoire finale. Tu as fini le jeu.</div>
      <button id="replayBtn">REJOUER</button>
    `);
  }
}

function updatePlayer() {
  const player = cars[0];

  const accelSpeed = 7.0;
  const boostExtra = 2.9;
  const coast = 0.10;

  let targetSpeed = accelPressed ? accelSpeed : 0;

  if (boostPressed && player.boost <= 0) {
    player.boost = 34;
  }

  if (player.boost > 0) {
    targetSpeed += boostExtra;
    player.boost--;
  }

  player.speed += (targetSpeed - player.speed) * coast;
  if (player.speed < 0.05) player.speed = 0;

  if (leftPressed && player.lane > 0) {
    player.lane -= 1;
    leftPressed = false;
  }

  if (rightPressed && player.lane < 3) {
    player.lane += 1;
    rightPressed = false;
  }

  player.distance += player.speed;
  player.x += (laneCenterAtY(player.lane, player.y) - player.x) * 0.24;
}

function updateAI() {
  const lvl = levels[currentLevel];

  for (let i = 1; i < cars.length; i++) {
    const car = cars[i];
    let target = started ? lvl.aiBase[i - 1] + Math.sin(worldTime * 0.03 + i) * 0.18 : 0;

    if (started && Math.random() < 0.004) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      car.lane = Math.max(0, Math.min(3, car.lane + dir));
    }

    if (started && Math.random() < 0.0025) {
      car.boost = 10;
    }

    if (car.boost > 0) {
      target += 1.0;
      car.boost--;
    }

    car.speed += (target - car.speed) * 0.06;
    car.distance += car.speed;
  }
}

function updateCurve() {
  const lvl = levels[currentLevel];
  if (!started) return;
  curvePhase += 0.010;
  roadShift = Math.sin(curvePhase) * 26 * lvl.curveStrength;
}

function hitPlayerObstacle() {
  const player = cars[0];

  for (const o of obstacles) {
    const sameLane = o.lane === player.lane;
    const closeDistance = Math.abs(o.distance - player.distance) < 36;
    if (sameLane && closeDistance) return true;
  }

  return false;
}

function updateHUD() {
  const order = [...cars].sort((a, b) => b.distance - a.distance);
  const place = order.findIndex(c => c.id === "player") + 1;

  speedBox.textContent = "Vitesse " + Math.round(cars[0].speed * 22);
  placeBox.textContent = "Place " + place + "/4";
  distBox.textContent = Math.round(cars[0].distance) + " m";
}

function updateGame() {
  if (!started) return;

  if (gameState === "lost") return;

  if (gameState === "won") {
    if (nextLevelTimer > 0) {
      nextLevelTimer--;
      if (nextLevelTimer === 0) {
        resetLevel(currentLevel + 1);
        startOverlay.style.display = "flex";
        started = false;
      }
    }
    return;
  }

  worldTime += 1;

  updateCurve();
  updatePlayer();
  updateAI();
  maybeSpawnObstacle();
  cleanupObstacles();

  if (hitPlayerObstacle()) {
    playerLose("Obstacle touché.");
    return;
  }

  for (let i = 1; i < cars.length; i++) {
    if (cars[i].distance >= levels[currentLevel].length) {
      playerLose("Une voiture ordinateur a gagné.");
      return;
    }
  }

  if (cars[0].distance >= levels[currentLevel].length) {
    playerWinLevel();
    return;
  }

  updateHUD();
}

function renderCars() {
  const player = cars[0];
  const renderList = [];

  for (const car of cars) {
    if (car.id === "player") {
      renderList.push({
        car,
        x: car.x,
        y: player.y,
        scale: 1
      });
      continue;
    }

    const delta = car.distance - player.distance;
    const y = player.y - delta * 0.34;

    if (y < 30 || y > canvas.height + 60) continue;

    const t = Math.max(0.25, Math.min(1, y / player.y));
    const scale = 0.58 + t * 0.45;
    const x = laneCenterAtY(car.lane, y);

    renderList.push({ car, x, y, scale });
  }

  renderList.sort((a, b) => a.y - b.y);

  for (const item of renderList) {
    drawCarAt(item.car, item.x, item.y, item.scale);
  }
}

function render() {
  drawBackground();
  drawRoad();

  const visibleObstacles = [...obstacles].sort((a, b) => obstacleScreenY(a.distance) - obstacleScreenY(b.distance));
  for (const o of visibleObstacles) {
    drawObstacle(o);
  }

  renderCars();
}

function loop() {
  updateStaticPlayerPosition();
  updateGame();
  render();
  requestAnimationFrame(loop);
}

resizeCanvas();
resetLevel(0);
loop();
