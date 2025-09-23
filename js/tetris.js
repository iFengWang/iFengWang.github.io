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

// 绘制单个方块的函数
function drawBlock(x, y, color, ctx = context, borderWidth = 1) {
  ctx.fillStyle = color; // 设置填充颜色
  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE); // 填充方块
  ctx.strokeStyle = "#888"; // 设置边框颜色
  ctx.lineWidth = borderWidth; // 设置边框宽度
  ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE); // 绘制边框
}

// 绘制整个游戏画面
function draw() {
  // 清除画布，填充黑色背景
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

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

    // 立即检查消行
    let sweepComplete = false;
    const checkSweep = () => {
      if (!sweepComplete) {
        arenaSweep();
        sweepComplete = true;
        playerReset();
      }
    };

    // 检查是否需要消行
    if (!board.some((row) => row.every((value) => value !== 0))) {
      playerReset(); // 如果不需要消行，直接生成新方块
    } else {
      setTimeout(checkSweep, 0); // 需要消行时，等待动画完成
    }
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

  if (dropCounter > dropInterval) {
    playerDrop();
    dropCounter = 0;
  }

  draw();
  requestAnimationFrame(update);
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
      }
      break;
    case 39: // 右箭头
      if (!gameOver && !paused) {
        playerMove(1);
      }
      break;
    case 40: // 下箭头
      if (!gameOver && !paused) {
        playerDrop();
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

bindButton("btn-left", () => {
  if (!gameOver && !paused) playerMove(-1);
});
bindButton("btn-right", () => {
  if (!gameOver && !paused) playerMove(1);
});
bindButton("btn-down", () => {
  if (!gameOver && !paused) playerDrop();
});
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

// 开始游戏
playerReset();
update();

// 添加消行检测和处理函数
function arenaSweep() {
  let linesCleared = 0;
  let linesToClear = [];

  // 检查需要消除的行
  for (let y = board.length - 1; y >= 0; y--) {
    if (board[y].every((value) => value !== 0)) {
      linesToClear.push(y);
    }
  }

  if (linesToClear.length > 0) {
    // 逐行处理消除动画
    const processLine = (lineIndex) => {
      const y = linesToClear[lineIndex];

      // 单行闪烁动画
      let flashCount = 0;
      const flash = setInterval(() => {
        const row = board[y];
        for (let x = 0; x < row.length; x++) {
          if (row[x] !== 0) {
            context.fillStyle = flashCount % 2 === 0 ? "#FFF" : "#FF0";
            context.fillRect(
              x * BLOCK_SIZE,
              y * BLOCK_SIZE,
              BLOCK_SIZE,
              BLOCK_SIZE
            );
          }
        }
        draw();

        flashCount++;
        if (flashCount >= 4) {
          clearInterval(flash);

          // 除当前行
          const row = board.splice(y, 1)[0];
          board.unshift(row.fill(0));
          linesCleared++;

          // 处理下一行
          if (lineIndex + 1 < linesToClear.length) {
            setTimeout(() => {
              processLine(lineIndex + 1);
            }, 200);
          } else {
            // 所有行处理完毕，更新分数
            const scores = [0, 100, 300, 500, 800];
            player.score += scores[linesCleared] * player.level;

            // 更新等级
            const newLevel = Math.floor(player.score / 1000) + 1;
            if (newLevel !== player.level) {
              player.level = newLevel;
              dropInterval = Math.max(1000 - (player.level - 1) * 50, 100);
            }

            // 更新显示
            document.getElementById("score").textContent = player.score;
            document.getElementById("level").textContent = player.level;
          }
        }
      }, 150);
    };

    // 开始处理第一行
    processLine(0);
  }
}
