const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const levelBox = document.getElementById("levelBox");
const speedBox = document.getElementById("speedBox");
const placeBox = document.getElementById("placeBox");
const distBox = document.getElementById("distBox");
const messageBox = document.getElementById("message");

let leftPressed = false;
let rightPressed = false;
let accelPressed = false;
let boostPressed = false;

const levels = [
  {
    name: "Niveau 1 - Prairie",
    length: 2600,
    skyTop: "#7dd3fc",
    skyBottom: "#e0f5ff",
    ground: "#5ebd53",
    mountain: "#879aac",
    aiBase: [5.2, 5.0, 4.8],
    animalRate: 0.006,
    barrierRate: 0.010,
    curveStrength: 0.35
  },
  {
    name: "Niveau 2 - Désert",
    length: 3200,
    skyTop: "#88d8ff",
    skyBottom: "#fff0c4",
    ground: "#d3ad62",
    mountain: "#bf8740",
    aiBase: [5.6, 5.4, 5.2],
    animalRate: 0.008,
    barrierRate: 0.012,
    curveStrength: 0.50
  },
  {
    name: "Niveau 3 - Forêt sombre",
    length: 3800,
    skyTop: "#4d6c95",
    skyBottom: "#b8d1ea",
    ground: "#355f37",
    mountain: "#314c39",
    aiBase: [5.9, 5.7, 5.5],
    animalRate: 0.010,
    barrierRate: 0.014,
    curveStrength: 0.65
  },
  {
    name: "Niveau 4 - Ville de nuit",
    length: 4500,
    skyTop: "#071221",
    skyBottom: "#1c3557",
    ground: "#243446",
    mountain: "#203040",
    aiBase: [6.2, 6.0, 5.8],
    animalRate: 0.009,
    barrierRate: 0.016,
    curveStrength: 0.80
  }
];

let currentLevel = 0;
let gameState = "playing";
let nextLevelTimer = 0;
let worldTime = 0;
let roadShift = 0;
let curvePhase = 0;
let obstacles = [];

const cars = [
  { id: "player", color: "red", lane: 0, x: 0, y: 0, w: 26, h: 50, speed: 0, distance: 0, isPlayer: true, boost: 0 },
  { id: "yellow", color: "gold", lane: 1, x: 0, y: 0, w: 26, h: 50, speed: 0, distance: 0, isPlayer: false, boost: 0 },
  { id: "green", color: "limegreen", lane: 2, x: 0, y: 0, w: 26, h: 50, speed: 0, distance: 0, isPlayer: false, boost: 0 },
  { id: "purple", color: "violet", lane: 3, x: 0, y: 0, w: 26, h: 50, speed: 0, distance: 0, isPlayer: false, boost: 0 }
];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = Math.floor(window.innerHeight * 0.5);
  updateCarScreenPositions();
}

function getRoadData() {
  const topWidth = canvas.width * 0.42;
  const bottomWidth = canvas.width * 0.82;
  const centerX = canvas.width * 0.5 + roadShift;
  const horizonY = canvas.height * 0.26;
  return { topWidth, bottomWidth, centerX, horizonY };
}

function laneCenterAtY(laneIndex, y) {
  const { topWidth, bottomWidth, centerX, horizonY } = getRoadData();
  const t = (y - horizonY) / (canvas.height - horizonY);
  const width = topWidth + (bottomWidth - topWidth) * Math.max(0, Math.min(1, t));
  const roadLeft = centerX - width / 2;
  const laneWidth = width / 4;
  return roadLeft + laneWidth * (laneIndex + 0.5);
}

function updateCarScreenPositions() {
  cars[0].y = canvas.height - 65;
  cars[1].y = canvas.height - 110;
  cars[2].y = canvas.height - 155;
  cars[3].y = canvas.height - 200;

  for (const car of cars) {
    car.x = laneCenterAtY(car.lane, car.y);
  }
}

function resetCars() {
  cars[0].lane = 0;
  cars[1].lane = 1;
  cars[2].lane = 2;
  cars[3].lane = 3;

  for (const car of cars) {
    car.distance = 0;
    car.speed = 0;
    car.boost = 0;
  }

  updateCarScreenPositions();
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
  gameState = "playing";
  nextLevelTimer = 0;
  worldTime = 0;
  roadShift = 0;
  curvePhase = 0;
  obstacles = [];
  hideMessage();
  resetCars();
  levelBox.textContent = levels[currentLevel].name;
}

function restartCurrentLevel() {
  resetLevel(currentLevel);
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

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "replayBtn") {
    restartCurrentLevel();
  }
});

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function maybeSpawnObstacle() {
  const lvl = levels[currentLevel];

  if (Math.random() < lvl.barrierRate) {
    const lane = Math.floor(Math.random() * 4);
    obstacles.push({
      type: "barrier",
      lane: lane,
      y: -30,
      w: 28,
      h: 18,
      speedFactor: rand(0.90, 1.05)
    });
  }

  if (Math.random() < lvl.animalRate) {
    const middleLane = Math.floor(rand(1, 3));
    obstacles.push({
      type: "animal",
      lane: middleLane,
      y: -40,
      w: 22,
      h: 14,
      speedFactor: rand(0.80, 0.95)
    });
  }
}

function updateObstacles(playerSpeed) {
  for (const o of obstacles) {
    o.y += playerSpeed * o.speedFactor + 4;
  }

  obstacles = obstacles.filter(o => o.y < canvas.height + 40);
}

function obstacleX(o) {
  return laneCenterAtY(o.lane, o.y);
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
  for (let i = -1; i < 5; i++) {
    const x = i * 170 - ((worldTime * 18) % 170);
    ctx.beginPath();
    ctx.moveTo(x, canvas.height * 0.28);
    ctx.lineTo(x + 65, canvas.height * 0.12);
    ctx.lineTo(x + 150, canvas.height * 0.28);
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
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const stripeSpacing = 60;
  const offset = cars[0].distance % stripeSpacing;
  for (let y = horizonY - stripeSpacing + offset; y < canvas.height + 20; y += stripeSpacing) {
    const t = (y - horizonY) / (canvas.height - horizonY);
    const h = 10 + t * 18;
    ctx.fillStyle = "white";
    ctx.fillRect(centerX - 4, y, 8, h);
  }
}

function drawCar(car) {
  ctx.save();
  ctx.translate(car.x, car.y);

  ctx.fillStyle = car.color;
  ctx.fillRect(-car.w / 2, -car.h / 2, car.w, car.h);

  ctx.fillStyle = "#d9ecff";
  ctx.fillRect(-8, -16, 16, 10);

  ctx.fillStyle = "#111";
  ctx.fillRect(-14, -20, 4, 14);
  ctx.fillRect(10, -20, 4, 14);
  ctx.fillRect(-14, 6, 4, 14);
  ctx.fillRect(10, 6, 4, 14);

  if (car.boost > 0) {
    ctx.fillStyle = "#ffb000";
    ctx.fillRect(-6, car.h / 2 - 2, 4, 9);
    ctx.fillRect(2, car.h / 2 - 2, 4, 9);
  }

  ctx.restore();
}

function drawObstacle(o) {
  const x = obstacleX(o);
  const y = o.y;

  if (o.type === "barrier") {
    ctx.fillStyle = "#d9472f";
    ctx.fillRect(x - o.w / 2, y - o.h / 2, o.w, o.h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - o.w / 2 + 4, y - 3, o.w - 8, 3);
  }

  if (o.type === "animal") {
    ctx.fillStyle = "#5b3a1e";
    ctx.fillRect(x - 8, y - 5, 16, 10);
    ctx.fillRect(x - 7, y - 10, 6, 6);
  }
}

function carRect(car) {
  return {
    x: car.x - car.w / 2,
    y: car.y - car.h / 2,
    w: car.w,
    h: car.h
  };
}

function obstacleRect(o) {
  return {
    x: obstacleX(o) - o.w / 2,
    y: o.y - o.h / 2,
    w: o.w,
    h: o.h
  };
}

function collide(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function playerLose(reason) {
  gameState = "lost";
  showMessage(`
    <div>${reason}</div>
    <button id="replayBtn" style="margin-top:10px;border:none;border-radius:10px;padding:10px 16px;font-weight:bold;background:#f9b321;color:white;">REJOUER</button>
  `);
}

function playerWinLevel() {
  gameState = "won";

  if (currentLevel < levels.length - 1) {
    showMessage(`Niveau gagné. Prochain niveau...`);
    nextLevelTimer = 90;
  } else {
    showMessage(`
      <div>Victoire finale. Tu bats toutes les voitures.</div>
      <button id="replayBtn" style="margin-top:10px;border:none;border-radius:10px;padding:10px 16px;font-weight:bold;background:#23b26d;color:white;">REJOUER</button>
    `);
  }
}

function updatePlayer() {
  const player = cars[0];

  const idleSpeed = 3.5;
  const accelSpeed = 6.2;
  const boostExtra = 2.8;

  let targetSpeed = accelPressed ? accelSpeed : idleSpeed;

  if (boostPressed && player.boost <= 0) {
    player.boost = 34;
  }

  if (player.boost > 0) {
    targetSpeed += boostExtra;
    player.boost--;
  }

  player.speed += (targetSpeed - player.speed) * 0.12;

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
    let target = lvl.aiBase[i - 1] + Math.sin(worldTime * 0.04 + i) * 0.20;

    if (Math.random() < 0.008) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      car.lane = Math.max(0, Math.min(3, car.lane + dir));
    }

    for (const o of obstacles) {
      const ox = obstacleX(o);
      const laneX = laneCenterAtY(car.lane, car.y);
      if (Math.abs(ox - laneX) < 16 && o.y > car.y - 70 && o.y < car.y + 30) {
        if (car.lane > 0) car.lane -= 1;
        else if (car.lane < 3) car.lane += 1;
      }
    }

    if (Math.random() < 0.005) {
      car.boost = 14;
    }

    if (car.boost > 0) {
      target += 1.4;
      car.boost--;
    }

    car.speed += (target - car.speed) * 0.08;
    car.distance += car.speed;
    car.x += (laneCenterAtY(car.lane, car.y) - car.x) * 0.14;
  }
}

function updateCurve() {
  const lvl = levels[currentLevel];
  curvePhase += 0.018;
  roadShift = Math.sin(curvePhase) * 45 * lvl.curveStrength;
}

function updateGame() {
  if (gameState === "lost") return;

  if (gameState === "won") {
    if (nextLevelTimer > 0) {
      nextLevelTimer--;
      if (nextLevelTimer === 0) {
        resetLevel(currentLevel + 1);
      }
    }
    return;
  }

  worldTime += 1;

  updateCurve();
  updatePlayer();
  updateAI();
  maybeSpawnObstacle();
  updateObstacles(cars[0].speed);

  const player = cars[0];
  const pRect = carRect(player);

  for (const o of obstacles) {
    if (collide(pRect, obstacleRect(o))) {
      playerLose("Obstacle touché.");
      return;
    }
  }

  for (let i = 1; i < cars.length; i++) {
    if (cars[i].distance >= levels[currentLevel].length) {
      playerLose("Une voiture ordinateur a gagné.");
      return;
    }
  }

  if (player.distance >= levels[currentLevel].length) {
    playerWinLevel();
    return;
  }

  const order = [...cars].sort((a, b) => b.distance - a.distance);
  const place = order.findIndex(c => c.id === "player") + 1;

  speedBox.textContent = "Vitesse " + Math.round(player.speed * 22);
  placeBox.textContent = "Place " + place + "/4";
  distBox.textContent = Math.round(player.distance) + " m";
}

function render() {
  drawBackground();
  drawRoad();

  for (const o of obstacles) {
    drawObstacle(o);
  }

  const drawOrder = [...cars].sort((a, b) => a.y - b.y);
  for (const car of drawOrder) {
    drawCar(car);
  }
}

function loop() {
  updateCarScreenPositions();
  updateGame();
  render();
  requestAnimationFrame(loop);
}

resizeCanvas();
resetLevel(0);
loop();
