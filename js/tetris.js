// 获取主游戏画布和上下文
const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
// 获取预览画布和上下文
const nextCanvas = document.getElementById("nextPiece");
const nextContext = nextCanvas.getContext("2d");

// 定义游戏常量
const BLOCK_SIZE = 20; // 每个方块的大小（像素）
const BOARD_WIDTH = 18; // 游戏板宽度（方块数）- 双倍宽度
const BOARD_HEIGHT = 30; // 游戏板高度（方块数）

// 定义方块颜色数组，null是为了让索引从1开始对应方块类型
const COLORS = [
  null,
  "#FF0D72", // T型方块颜色
  "#0DC2FF", // I型方块颜色
  "#0DFF72", // S型方块颜色
  "#F538FF", // Z型方块颜色
  "#FF8E0D", // L型方块颜色
  "#FFE138", // J型方块颜色
  "#3877FF", // O型方块颜色
];

// 定义所有方块形状的数组
const PIECES = [
  [
    [1, 1, 1], // T型方块
    [0, 1, 0],
  ],
  [
    [0, 2, 0, 0], // I型方块
    [0, 2, 0, 0],
    [0, 2, 0, 0],
    [0, 2, 0, 0],
  ],
  [
    [0, 3, 3], // S型方块
    [3, 3, 0],
  ],
  [
    [4, 4, 0], // Z型方块
    [0, 4, 4],
  ],
  [
    [0, 0, 5], // L型方块
    [5, 5, 5],
  ],
  [
    [6, 0, 0], // J型方块
    [6, 6, 6],
  ],
  [
    [7, 7], // O型方块
    [7, 7],
  ],
];

// 初始化游戏板为二维数组，填充0表示空格
const board = Array(BOARD_HEIGHT)
  .fill()
  .map(() => Array(BOARD_WIDTH).fill(0));

// 玩家状态对象
const player = {
  pos: { x: 0, y: 0 }, // 当前方块位置
  matrix: null, // 当前方块矩阵
  score: 0, // 得分
  level: 1, // 等级
  nextPiece: null, // 下一个方块
};

// 游戏状态变量
let dropCounter = 0; // 下落计数器
let dropInterval = 1000; // 下落间隔（毫秒）
let lastTime = 0; // 上次更新时间
let paused = false; // 暂停状态
let gameOver = false; // 游戏结束状态
let lightPhase = 0; // 边缘光动画相位
let trails = []; // 方块尾迹粒子
let likes = []; // 点赞动画数组
let soundEnabled = true; // 音效开关状态

// 音效系统
const sounds = {
  rotate: new Audio("/images/posts/technology/fangkuai/change.mp3"),
  move: new Audio("/images/posts/technology/fangkuai/move.mp3"),
  clear: new Audio("/images/posts/technology/fangkuai/duang.mp3"),
};

// 播放音效函数
function playSound(soundName) {
  if (!soundEnabled) return; // 如果音效关闭，直接返回

  const sound = sounds[soundName];
  if (sound) {
    sound.currentTime = 0; // 重置播放位置
    sound.play().catch((e) => {
      // 忽略播放错误（用户可能没有交互过页面）
      console.log("音效播放失败:", e);
    });
  }
}

// 绘制单个方块的函数
function drawBlock(x, y, color, ctx = context, borderWidth = 1) {
  ctx.fillStyle = color; // 设置填充颜色
  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE); // 填充方块
  ctx.strokeStyle = "#888"; // 设置边框颜色
  ctx.lineWidth = borderWidth; // 设置边框宽度
  ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE); // 绘制边框
}

// 创建点赞动画
function createLike() {
  const like = {
    x: canvas.width / 2, // 游戏区中央
    y: canvas.height / 2,
    scale: 0,
    alpha: 1,
    rotation: 0,
    life: 0,
    maxLife: 2000, // 2秒
    image: new Image(),
  };

  like.image.src = "/images/posts/technology/fangkuai/zhan.png";
  likes.push(like);
}

// 更新点赞动画
function updateLikes(deltaTime) {
  for (let i = likes.length - 1; i >= 0; i--) {
    const like = likes[i];
    like.life += deltaTime;

    // 气泡Q弹效果：使用弹性函数
    const progress = like.life / like.maxLife;

    // 气泡弹出效果：先快速放大，然后弹性回弹（更明显的效果）
    if (progress < 0.25) {
      // 前25%时间：快速放大到2.5倍（更明显）
      like.scale = (progress / 0.25) * 2.5;
    } else if (progress < 0.5) {
      // 25%-50%时间：弹性回弹到1.3倍
      const bounceProgress = (progress - 0.25) / 0.25;
      like.scale = 2.5 - bounceProgress * bounceProgress * 1.2; // 更大的回弹幅度
    } else if (progress < 0.75) {
      // 50%-75%时间：再次小幅度弹跳
      const bounceProgress = (progress - 0.5) / 0.25;
      like.scale = 1.3 + Math.sin(bounceProgress * Math.PI * 3) * 0.15; // 更明显的弹跳
    } else {
      // 75%-100%时间：逐渐缩小并淡出
      const shrinkProgress = (progress - 0.75) / 0.25;
      like.scale = 1.3 * (1 - shrinkProgress);
    }

    // 去掉旋转效果
    like.rotation = 0;

    // 淡出效果：最后25%时间开始淡出
    if (progress < 0.75) {
      like.alpha = 1;
    } else {
      like.alpha = 1 - (progress - 0.75) / 0.25;
    }

    // 轻微上移：气泡向上飘
    like.y -= deltaTime * 0.05;

    // 移除过期的动画
    if (like.life >= like.maxLife) {
      likes.splice(i, 1);
    }
  }
}

// 绘制点赞动画
function drawLikes() {
  likes.forEach((like) => {
    if (!like.image.complete) return; // 图片未加载完成则跳过

    context.save();
    context.globalAlpha = like.alpha;
    context.translate(like.x, like.y);
    context.rotate(like.rotation);
    context.scale(like.scale, like.scale);

    // 绘制点赞图片
    const imgWidth = 60;
    const imgHeight = 60;
    context.drawImage(
      like.image,
      -imgWidth / 2,
      -imgHeight / 2,
      imgWidth,
      imgHeight
    );

    context.restore();
  });
}

// 绘制整个游戏画面
function draw() {
  // 清除画布，填充黑色背景
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制尾迹粒子（在方块之下）
  drawTrails();

  // 绘制点赞动画
  drawLikes();

  // 去除两侧闪烁光效，仅保留上方尾迹

  // 绘制已固定的方块
  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawBlock(x, y, COLORS[value]);
      }
    });
  });

  // 绘制当前正在下落的方块
  if (player.matrix) {
    player.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          drawBlock(x + player.pos.x, y + player.pos.y, COLORS[value]);
        }
      });
    });

    // 移除方块两侧的线性渐变闪烁效果，仅保留上方尾迹
  }
}

// 碰撞检测函数：检查当前方块是否与游戏板边界或其他方块发生碰撞
function collide() {
  if (!player.matrix) return false;

  // 遍历当前方块的每个位置
  for (let y = 0; y < player.matrix.length; y++) {
    for (let x = 0; x < player.matrix[y].length; x++) {
      if (
        player.matrix[y][x] !== 0 && // 如果当前位置有方块
        (board[y + player.pos.y] === undefined || // 检查是否超出底部边界
          board[y + player.pos.y][x + player.pos.x] === undefined || // 检查是否超出左右边界
          board[y + player.pos.y][x + player.pos.x] !== 0) // 检查是否与其他方块重叠
      ) {
        return true; // 发生碰撞
      }
    }
  }
  return false; // 没有碰撞
}

// 将当前方块合并到游戏板上
function merge() {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        // 将非空方块复制到游戏板对应位置
        board[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

// 随机创建新的方块
function createPiece() {
  // 随机选择一个方块类型
  const piece = PIECES[Math.floor(Math.random() * PIECES.length)];
  // 深拷贝方块数据，避免引用原始数据
  return JSON.parse(JSON.stringify(piece));
}

// 重置玩家状态，生成新方块
function playerReset() {
  // 使用预览的方块或创建新方块
  player.matrix = player.nextPiece || createPiece();
  // 生成下一个预览方块
  player.nextPiece = createPiece();
  // 设置方块初始位置（顶部中间）
  player.pos.y = 0;
  player.pos.x = Math.floor((BOARD_WIDTH - player.matrix[0].length) / 2);

  // 检查游戏是否结束（新方块生成时就发生碰撞）
  if (collide()) {
    gameOver = true;
    alert("游戏结束！得分：" + player.score);
    return;
  }

  // 更新预览区域显示
  drawNextPiece();
}

// 绘制下一个方块的预览
function drawNextPiece() {
  // 清除预览画布
  nextContext.fillStyle = "#000";
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (player.nextPiece) {
    // 计算方块的实际尺寸
    const pieceHeight = player.nextPiece.length;
    const pieceWidth = player.nextPiece[0].length;

    // 特殊处理 I 型方块（检查是否为4x4的矩阵）
    let offsetX, offsetY;
    if (pieceHeight === 4) {
      // I 型方块需要特殊偏移以居中显示
      offsetX = Math.floor((nextCanvas.width / BLOCK_SIZE - 1) / 2);
      offsetY = Math.floor((nextCanvas.height / BLOCK_SIZE - 4) / 2);
    } else {
      // 其他方块使用标准居中计算
      offsetX = Math.floor((nextCanvas.width / BLOCK_SIZE - pieceWidth) / 2);
      offsetY = Math.floor((nextCanvas.height / BLOCK_SIZE - pieceHeight) / 2);
    }

    // 在预览区域绘制方块
    player.nextPiece.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          drawBlock(x + offsetX, y + offsetY, COLORS[value], nextContext);
        }
      });
    });
  }
}

// 移动方块的函数（左右移动）
function playerMove(dir) {
  player.pos.x += dir; // 尝试移动
  if (collide()) {
    player.pos.x -= dir; // 如果发生碰撞，取消移动
  }
}

// 方块下落函数
function playerDrop() {
  player.pos.y++; // 向下移动一格
  if (collide()) {
    player.pos.y--; // 如果发生碰撞，退回上一格
    merge(); // 将方块固定到游戏板上
    // 消行并立即生成新方块
    arenaSweep();
    playerReset();
    return true;
  }
  return false;
}

// 修改旋转函数
function rotate(matrix) {
  // 处理特殊情况：长条形方块（I型方块）
  if (matrix.length === 4) {
    const N = matrix.length;
    const rotated = Array(N)
      .fill()
      .map(() => Array(N).fill(0));

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        rotated[x][N - 1 - y] = matrix[y][x];
      }
    }
    return rotated;
  }

  // 处理其他形状的方块
  const N = matrix.length;
  const M = matrix[0].length;
  const rotated = Array(M)
    .fill()
    .map(() => Array(N).fill(0));

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < M; x++) {
      rotated[x][N - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
}

// 游戏主循环
function update(time = 0) {
  if (gameOver || paused) return;

  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  lightPhase += deltaTime * 0.004; // 控制光效速度
  emitTrailParticles(deltaTime);
  updateTrails(deltaTime);
  updateLikes(deltaTime); // 更新点赞动画

  if (dropCounter > dropInterval) {
    playerDrop();
    dropCounter = 0;
  }

  draw();
  requestAnimationFrame(update);
}

// drawPieceGlow 已删除（去掉方块两侧闪烁的线性渐变效果）

// 生成尾迹粒子
function emitTrailParticles(deltaTime) {
  if (!player.matrix) return;
  // 根据时间发射，保证不同帧率下效果一致
  const particlesPerMs = 0.12; // 每毫秒发射率（提升至原来的2倍）
  const count = Math.max(1, Math.floor(deltaTime * particlesPerMs));

  const rows = player.matrix.length;
  const cols = player.matrix[0].length;
  const px = player.pos.x * BLOCK_SIZE;
  const py = player.pos.y * BLOCK_SIZE;
  const pw = cols * BLOCK_SIZE;

  const color = getCurrentPieceColor();

  for (let i = 0; i < count; i++) {
    const x = px + Math.random() * pw; // 顶边任意位置
    const y = py - 2 - Math.random() * 8; // 顶边上方少许像素
    const vx = (Math.random() - 0.5) * 0.9; // 稍加强左右漂移
    const vy = -0.6 - Math.random() * 0.8; // 向上更快（尾迹更明显）
    trails.push(createParticle(x, y, vx, vy, color));
  }
}

function createParticle(x, y, vx, vy, color) {
  return {
    x,
    y,
    vx,
    vy,
    color: color || "#ffffff",
    life: 0,
    maxLife: 800 + Math.random() * 400, // 更持久
    alpha: 0.5, // 更亮
    size: 0.75 + Math.random() * 1.0, // 尺寸缩小至原来的约1/4
  };
}

// 更新并绘制尾迹粒子（在背景与方块之间绘制）
function drawTrails() {
  context.save();
  context.globalCompositeOperation = "lighter";
  for (let i = 0; i < trails.length; i++) {
    const p = trails[i];
    const a = Math.max(0, p.alpha * (1 - p.life / p.maxLife));
    if (a <= 0) continue;
    // 使用粒子颜色的淡色雾感
    context.fillStyle = applyAlphaToHex(p.color, a);
    // 纵向拉伸形成尾线感，并添加轻微模糊光晕
    context.shadowColor = applyAlphaToHex(p.color, a * 0.8);
    context.shadowBlur = 3;
    const h = p.size * 3.5; // 随尺寸同比缩小
    context.fillRect(p.x, p.y - h, p.size, h);
  }
  context.restore();
}

function updateTrails(deltaTime) {
  for (let i = trails.length - 1; i >= 0; i--) {
    const p = trails[i];
    const k = deltaTime / 16.7;
    p.x += p.vx * k;
    p.y += p.vy * k;
    p.life += deltaTime;
    if (p.life >= p.maxLife) trails.splice(i, 1);
  }
}

// 获取当前方块的主颜色
function getCurrentPieceColor() {
  if (!player.matrix) return "#ffffff";
  for (let y = 0; y < player.matrix.length; y++) {
    for (let x = 0; x < player.matrix[y].length; x++) {
      const v = player.matrix[y][x];
      if (v) return COLORS[v] || "#ffffff";
    }
  }
  return "#ffffff";
}

// 将十六进制颜色与透明度合成 rgba 字符串
function applyAlphaToHex(hex, a) {
  // 期望 hex 如 #RRGGBB
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${a})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${a})`;
}

// 键盘控制
document.addEventListener("keydown", (event) => {
  // Avoid interfering with typing in inputs/textareas
  const interactiveTags = ["INPUT", "TEXTAREA", "SELECT"];
  if (interactiveTags.includes(event.target.tagName)) return;

  // Prevent page from scrolling on game control keys
  if ([32, 37, 38, 39, 40].includes(event.keyCode)) {
    event.preventDefault();
  }
  switch (event.keyCode) {
    case 37: // 左箭头
      if (!gameOver && !paused) {
        playerMove(-1);
        playSound("move");
      }
      break;
    case 39: // 右箭头
      if (!gameOver && !paused) {
        playerMove(1);
        playSound("move");
      }
      break;
    case 40: // 下箭头
      if (!gameOver && !paused) {
        playerDrop();
        playSound("move");
      }
      break;
    case 38: // 上箭头
      if (!gameOver && !paused) {
        const originalMatrix = JSON.parse(JSON.stringify(player.matrix));
        const rotated = rotate(player.matrix);
        const originalX = player.pos.x;
        const originalY = player.pos.y;

        player.matrix = rotated;

        // 如果旋转后发生碰撞，尝试调整位置
        let offset = 0;
        let success = false;

        // 尝试不同的水平偏移
        for (let i = 0; i < 2; i++) {
          offset = i * (offset <= 0 ? 1 : -1);
          player.pos.x += offset;

          if (!collide()) {
            success = true;
            break;
          }
          player.pos.x = originalX;

          // 尝试向上移动一格
          player.pos.y--;
          if (!collide()) {
            success = true;
            break;
          }
          player.pos.y = originalY;
        }

        // 如果所有尝试都失败，恢复原始状态
        if (!success) {
          player.matrix = originalMatrix;
          player.pos.x = originalX;
          player.pos.y = originalY;
        } else {
          // 旋转成功时播放音效
          playSound("rotate");
        }
      }
      break;
    case 32: // 空格键
      paused = !paused;
      if (!paused) {
        lastTime = performance.now();
        update();
      }
      break;
  }
  draw();
});

// Touch/mouse buttons -> same actions as keyboard
function bindButton(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", (e) => {
    e.preventDefault();
    handler();
    draw();
  });
  // support touchstart for faster response on mobile
  el.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      handler();
      draw();
    },
    { passive: false }
  );
}

// 长按辅助：在按住按钮时持续触发 handler
function bindHold(id, handler, interval = 120) {
  const el = document.getElementById(id);
  if (!el) return;
  let timer = null;
  let startTimer = null;
  const start = (e) => {
    e.preventDefault();
    if (timer) return;
    // 延迟一小段时间再开始长按，避免与单次点击冲突
    startTimer = setTimeout(() => {
      timer = setInterval(() => {
        handler();
        draw();
      }, interval);
    }, 200); // 200ms 后开始长按
  };
  const stop = (e) => {
    if (startTimer) {
      clearTimeout(startTimer);
      startTimer = null;
    }
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
  el.addEventListener("mousedown", start);
  el.addEventListener("touchstart", start, { passive: false });
  window.addEventListener("mouseup", stop);
  window.addEventListener("mouseleave", stop);
  window.addEventListener("touchend", stop);
  window.addEventListener("touchcancel", stop);
}

const safeLeft = () => {
  if (!gameOver && !paused) {
    playerMove(-1);
    playSound("move");
  }
};
const safeRight = () => {
  if (!gameOver && !paused) {
    playerMove(1);
    playSound("move");
  }
};
const safeDown = () => {
  if (!gameOver && !paused) {
    playerDrop();
    playSound("move");
  }
};

bindButton("btn-left", safeLeft);
bindButton("btn-right", safeRight);
bindButton("btn-down", safeDown);

// 启用长按：左右移动与下落连续触发
bindHold("btn-left", safeLeft, 90);
bindHold("btn-right", safeRight, 90);
bindHold("btn-down", safeDown, 70);
bindButton("btn-up", () => {
  if (!gameOver && !paused) {
    const originalMatrix = JSON.parse(JSON.stringify(player.matrix));
    const rotated = rotate(player.matrix);
    const originalX = player.pos.x;
    const originalY = player.pos.y;
    player.matrix = rotated;
    let offset = 0;
    let success = false;
    for (let i = 0; i < 2; i++) {
      offset = i * (offset <= 0 ? 1 : -1);
      player.pos.x += offset;
      if (!collide()) {
        success = true;
        break;
      }
      player.pos.x = originalX;
      player.pos.y--;
      if (!collide()) {
        success = true;
        break;
      }
      player.pos.y = originalY;
    }
    if (!success) {
      player.matrix = originalMatrix;
      player.pos.x = originalX;
      player.pos.y = originalY;
    } else {
      // 旋转成功时播放音效
      playSound("rotate");
    }
  }
});

bindButton("btn-pause", () => {
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    update();
  }
});

// 音效开关按钮
bindButton("btn-sound", () => {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById("btn-sound");
  if (btn) {
    btn.textContent = soundEnabled ? "音效开关" : "音效关闭";
  }
});

// 开始游戏
playerReset();
update();

// 添加消行检测和处理函数
function arenaSweep() {
  // 立即、稳定地清除满行（无动画），避免索引位移导致漏删
  let linesCleared = 0;
  for (let y = board.length - 1; y >= 0; y--) {
    if (board[y].every((v) => v !== 0)) {
      board.splice(y, 1); // 删除该行
      board.unshift(Array(BOARD_WIDTH).fill(0)); // 顶部补一空行
      linesCleared++;
      y++; // 由于上移，保持 y 指向当前新下移的一行，继续检测
    }
  }

  if (linesCleared > 0) {
    const scores = [0, 100, 300, 500, 800];
    player.score += scores[linesCleared] * player.level;
    const newLevel = Math.floor(player.score / 1000) + 1;
    if (newLevel !== player.level) {
      player.level = newLevel;
      dropInterval = Math.max(1000 - (player.level - 1) * 50, 100);
    }
    const scoreEl = document.getElementById("score");
    const levelEl = document.getElementById("level");
    if (scoreEl) scoreEl.textContent = player.score;
    if (levelEl) levelEl.textContent = player.level;

    // 触发点赞动画
    createLike();

    // 播放消行音效
    playSound("clear");
  }
}
