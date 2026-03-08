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
    deco: "prairie",
    aiBase: [5.5, 5.3, 5.1],
    animalRate: 0.010,
    barrierRate: 0.016,
    curveStrength: 0.55
  },
  {
    name: "Niveau 2 - Désert",
    length: 3200,
    skyTop: "#88d8ff",
    skyBottom: "#fff0c4",
    ground: "#d3ad62",
    mountain: "#bf8740",
    deco: "desert",
    aiBase: [5.9, 5.7, 5.6],
    animalRate: 0.012,
    barrierRate: 0.018,
    curveStrength: 0.7
  },
  {
    name: "Niveau 3 - Forêt sombre",
    length: 3800,
    skyTop: "#4d6c95",
    skyBottom: "#b8d1ea",
    ground: "#355f37",
    mountain: "#314c39",
    deco: "forest",
    aiBase: [6.2, 6.0, 5.9],
    animalRate: 0.014,
    barrierRate: 0.020,
    curveStrength: 0.9
  },
  {
    name: "Niveau 4 - Ville de nuit",
    length: 4500,
    skyTop: "#071221",
    skyBottom: "#1c3557",
    ground: "#243446",
    mountain: "#203040",
    deco: "city",
    aiBase: [6.5, 6.3, 6.15],
    animalRate: 0.009,
    barrierRate: 0.022,
    curveStrength: 1.05
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
  { id: "player", color: "red", lane: 0, x: 0, y: 0, w: 30, h: 58, speed: 0, distance: 0, isPlayer: true, boost: 0 },
  { id: "yellow", color: "gold", lane: 1, x: 0, y: 0, w: 30, h: 58, speed: 0, distance: 0, isPlayer: false, boost: 0 },
  { id: "green", color: "limegreen", lane: 2, x: 0, y: 0, w: 30, h: 58, speed: 0, distance: 0, isPlayer: false, boost: 0 },
  { id: "purple", color: "violet", lane: 3, x: 0, y: 0, w: 30, h: 58, speed: 0, distance: 0, isPlayer: false, boost: 0 }
];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = Math.floor(window.innerHeight * 0.72);
  updateCarScreenPositions();
}

function getRoadData() {
  const topWidth = canvas.width * 0.42;
  const bottomWidth = canvas.width * 0.84;
  const centerX = canvas.width * 0.5 + roadShift;
  const horizonY = canvas.height * 0.24;
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
  cars[0].y = canvas.height - 88;
  cars[1].y = canvas.height - 152;
  cars[2].y = canvas.height - 216;
  cars[3].y = canvas.height - 280;

  for (const car of cars) {
    car.x = laneCenterAtY(car.lane, car.y);
  }
}

function resetLevel(index) {
  currentLevel = index;
  gameState = "playing";
  nextLevelTimer = 0;
  worldTime = 0;
  roadShift = 0;
  curvePhase = 0;
  obstacles = [];
  messageBox.style.display = "none";

  cars[0].lane = 0;
  cars[1].lane = 1;
  cars[2].lane = 2;
  cars[3].lane = 3;

  for (const car of cars) {
    car.distance = 0;
    car.speed = 0;
    car.boost = 0;
  }

  levelBox.textContent = levels[currentLevel].name;
  updateCarScreenPositions();
}

function bindHold(id, keyName) {
  const el = document.getElementById(id);

  const start = (e) => {
    e.preventDefault();
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

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function maybeSpawnObstacle() {
  const lvl = levels[currentLevel];

  if (Math.random() < lvl.barrierRate) {
    const lane = Math.floor(Math.random() * 4);
    obstacles.push({
      type: "barrier",
      lane,
      y: -40,
      w: 34,
      h: 24,
      speedFactor: rand(0.85, 1.05)
    });
  }

  if (Math.random() < lvl.animalRate) {
    const startSide = Math.random() < 0.5 ? "left" : "right";
    const startLane = startSide === "left" ? -0.6 : 4.6;
    obstacles.push({
      type: "animal",
      laneFloat: startLane,
      targetLane: rand(0.2, 3.8),
      y: rand(60, canvas.height * 0.62),
      w: 26,
      h: 18,
      crossSpeed: rand(0.025, 0.06),
      speedFactor: rand(0.6, 0.95)
    });
  }
}

function updateObstacles(playerSpeed) {
  for (const o of obstacles) {
    o.y += playerSpeed * o.speedFactor + 4;

    if (o.type === "animal") {
      if (o.laneFloat < o.targetLane) o.laneFloat += o.crossSpeed;
      else o.laneFloat -= o.crossSpeed;
    }
  }

  obstacles = obstacles.filter(o => o.y < canvas.height + 50);
}

function obstacleX(o) {
  if (o.type === "barrier") {
    return laneCenterAtY(o.lane, o.y);
  }
  return laneCenterAtY(o.laneFloat, o.y);
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

  if (lvl.deco !== "city") {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 4; i++) {
      const x = ((i * 170 - worldTime * 10) % (canvas.width + 160)) - 80;
      const y = 48 + i * 10;
      ctx.beginPath();
      ctx.arc(x, y, 17, 0, Math.PI * 2);
      ctx.arc(x + 20, y - 8, 18, 0, Math.PI * 2);
      ctx.arc(x + 40, y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#dce9ff";
    for (let i = 0; i < 40; i++) {
      ctx.fillRect((i * 37) % canvas.width, (i * 23) % (canvas.height * 0.35), 2, 2);
    }
  }

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

  if (lvl.deco === "prairie" || lvl.deco === "forest") {
    ctx.fillStyle = lvl.deco === "prairie" ? "#237c39" : "#1c5123";
    for (let i = 0; i < 10; i++) {
      const tx = ((i * 95 - worldTime * 35) % (canvas.width + 70)) - 35;
      ctx.fillRect(tx, canvas.height * 0.28, 6, 24);
      ctx.beginPath();
      ctx.arc(tx + 3, canvas.height * 0.25, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (lvl.deco === "desert") {
    ctx.fillStyle = "#b88035";
    for (let i = 0; i < 8; i++) {
      const dx = ((i * 100 - worldTime * 20) % (canvas.width + 100)) - 50;
      ctx.beginPath();
      ctx.arc(dx, canvas.height * 0.28, 15, Math.PI, 0);
      ctx.arc(dx + 18, canvas.height * 0.27, 20, Math.PI, 0);
      ctx.fill();
    }
  }

  if (lvl.deco === "city") {
    for (let i = 0; i < 8; i++) {
      const bx = i * 70;
      const bh = 55 + (i % 4) * 25;
      ctx.fillStyle = "#243447";
      ctx.fillRect(bx, canvas.height * 0.18, 34, bh);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(bx + 6, canvas.height * 0.2, 4, 4);
      ctx.fillRect(bx + 15, canvas.height * 0.23, 4, 4);
      ctx.fillRect(bx + 10, canvas.height * 0.26, 4, 4);
    }
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

  const stripeSpacing = 70;
  const offset = cars[0].distance % stripeSpacing;
  for (let y = horizonY - stripeSpacing + offset; y < canvas.height + 20; y += stripeSpacing) {
    const t = (y - horizonY) / (canvas.height - horizonY);
    const x = centerX - 5;
    const h = 16 + t * 26;
    ctx.fillStyle = "white";
    ctx.fillRect(x, y, 10, h);
  }

  drawStartLine();
  drawFinishLine();
}

function drawStartLine() {
  const y = canvas.height - 120 + cars[0].distance;
  drawCheckeredLine(y, "DÉPART");
}

function drawFinishLine() {
  const y = canvas.height - 120 - levels[currentLevel].length + cars[0].distance;
  if (y > -50 && y < canvas.height + 50) {
    drawCheckeredLine(y, "ARRIVÉE");
  }
}

function drawCheckeredLine(y, text) {
  const { centerX, horizonY, topWidth, bottomWidth } = getRoadData();
  const t = Math.max(0, Math.min(1, (y - horizonY) / (canvas.height - horizonY)));
  const widthAtY = topWidth + (bottomWidth - topWidth) * t;
  const roadLeft = centerX - widthAtY / 2;
  const cell = Math.max(12, widthAtY / 12);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 12; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#fff" : "#111";
      ctx.fillRect(roadLeft + col * cell, y + row * 10, cell, 10);
    }
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial";
  ctx.fillText(text, roadLeft + widthAtY / 2 - 28, y - 6);
}

function drawCar(car) {
  ctx.save();
  ctx.translate(car.x, car.y);

  ctx.fillStyle = car.color;
  ctx.fillRect(-car.w / 2, -car.h / 2, car.w, car.h);

  ctx.fillStyle = "#d9ecff";
  ctx.fillRect(-9, -18, 18, 12);

  ctx.fillStyle = "#111";
  ctx.fillRect(-15, -22, 5, 16);
  ctx.fillRect(10, -22, 5, 16);
  ctx.fillRect(-15, 6, 5, 16);
  ctx.fillRect(10, 6, 5, 16);

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(-car.w / 2 + 2, -car.h / 2 + 2, 5, car.h - 4);

  if (car.boost > 0) {
    ctx.fillStyle = "#ffb000";
    ctx.fillRect(-7, car.h / 2 - 2, 5, 11);
    ctx.fillRect(2, car.h / 2 - 2, 5, 11);
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
    ctx.fillRect(x - o.w / 2 + 5, y - 4, o.w - 10, 4);
  }

  if (o.type === "animal") {
    ctx.fillStyle = "#5b3a1e";
    ctx.fillRect(x - 10, y - 6, 20, 12);
    ctx.fillRect(x - 8, y - 11, 8, 8);
    ctx.fillRect(x - 8, y + 5, 3, 8);
    ctx.fillRect(x - 1, y + 5, 3, 8);
    ctx.fillRect(x + 5, y + 5, 3, 8);
    ctx.fillRect(x + 10, y + 5, 3, 8);
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
  messageBox.style.display = "block";
  messageBox.textContent = reason + " Recharge la page pour recommencer.";
}

function playerWinLevel() {
  gameState = "won";
  if (currentLevel < levels.length - 1) {
    messageBox.style.display = "block";
    messageBox.textContent = "Niveau gagné. Prochain niveau...";
    nextLevelTimer = 110;
  } else {
    messageBox.style.display = "block";
    messageBox.textContent = "Victoire finale. Tu bats toutes les voitures.";
  }
}

function updatePlayer() {
  const player = cars[0];

  const baseIdle = 3.7;
  const accelSpeed = 6.6;
  const boostExtra = 3.6;

  let targetSpeed = accelPressed ? accelSpeed : baseIdle;

  if (boostPressed && player.boost <= 0) {
    player.boost = 40;
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
  player.x += (laneCenterAtY(player.lane, player.y) - player.x) * 0.22;
}

function updateAI() {
  const lvl = levels[currentLevel];

  for (let i = 1; i < cars.length; i++) {
    const car = cars[i];
    let target = lvl.aiBase[i - 1] + Math.sin(worldTime * 0.04 + i) * 0.22;

    if (Math.random() < 0.01) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      car.lane = Math.max(0, Math.min(3, car.lane + dir));
    }

    for (const o of obstacles) {
      const ox = obstacleX(o);
      const laneX = laneCenterAtY(car.lane, car.y);
      if (Math.abs(ox - laneX) < 18 && o.y > car.y - 90 && o.y < car.y + 40) {
        if (car.lane > 0) car.lane -= 1;
        else if (car.lane < 3) car.lane += 1;
      }
    }

    if (Math.random() < 0.006) {
      car.boost = 18;
    }

    if (car.boost > 0) {
      target += 1.8;
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
  roadShift = Math.sin(curvePhase) * 55 * lvl.curveStrength;
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
      playerLose("Collision. Tu as perdu.");
      return;
    }
  }

  for (let i = 1; i < cars.length; i++) {
    if (cars[i].distance >= levels[currentLevel].length) {
      playerLose("Une voiture ordinateur a gagné. ");
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
