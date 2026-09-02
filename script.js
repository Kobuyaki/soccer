const canvas = document.getElementById('field');
const ctx = canvas.getContext('2d');

const scoreAEl = document.getElementById('score-a');
const scoreBEl = document.getElementById('score-b');
const turnIndicatorEl = document.getElementById('turn-indicator');

const FRICTION = 0.95; // 摩擦係数
const GOAL_HEIGHT = 160;
const MIN_DRAG_DISTANCE = 40; // ★最小ひっぱり距離（これ未満は無効）

let scoreA = 0;
let scoreB = 0;
let currentTurn = 'A'; // 'A' (青) または 'B' (赤)
let selectedPiece = null;
let dragStart = null;
let isMoving = false;

class Piece {
    constructor(x, y, radius, color, team = null) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = radius;
        this.color = color;
        this.team = team;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        ctx.closePath();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= FRICTION;
        this.vy *= FRICTION;

        if (Math.abs(this.vx) < 0.05) this.vx = 0;
        if (Math.abs(this.vy) < 0.05) this.vy = 0;

        const goalTop = (canvas.height - GOAL_HEIGHT) / 2;
        const goalBottom = goalTop + GOAL_HEIGHT;

        // 上下の壁
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -1;
        } else if (this.y + this.radius > canvas.height) {
            this.y = canvas.height - this.radius;
            this.vy *= -1;
        }

        // 左右の壁（★ここを変更）
        if (this.team !== null) {
            // 【選手（駒）の場合】
            // ゴールエリア関係なく、左右の壁すべてで跳ね返る（画面外に出ないようにする）
            if (this.x - this.radius < 0) {
                this.x = this.radius;
                this.vx *= -1;
            } else if (this.x + this.radius > canvas.width) {
                this.x = canvas.width - this.radius;
                this.vx *= -1;
            }
        } else {
            // 【ボールの場合】
            // ゴールエリア以外では跳ね返り、ゴールエリアならそのまま通過（ゴール）する
            if (this.x - this.radius < 0) {
                if (this.y < goalTop || this.y > goalBottom) {
                    this.x = this.radius;
                    this.vx *= -1;
                }
            } else if (this.x + this.radius > canvas.width) {
                if (this.y < goalTop || this.y > goalBottom) {
                    this.x = canvas.width - this.radius;
                    this.vx *= -1;
                }
            }
        }
    }
}

let ball;
let pieces = [];

function initGame() {
    pieces = [];
    // ボール（中央）
    ball = new Piece(canvas.width / 2, canvas.height / 2, 12, '#878787', null);

    // チームA (青) の配置 (左側)
    // 一発ゴールを防ぐため、ボールとの直線上にFWとCBを配置するダイヤモンド型
    const posA = [
        { x: 80,  y: 250 }, // GK: ゴール前
        { x: 180, y: 250 }, // CB: 中央の守備（最後の砦）
        { x: 280, y: 150 }, // MF(上): 斜めからのシュートコースを塞ぐ
        { x: 280, y: 350 }, // MF(下): 斜めからのシュートコースを塞ぐ
        { x: 340, y: 250 }  // FW: ボールの目の前（相手の直射を防ぐ壁）
    ];
    posA.forEach(p => pieces.push(new Piece(p.x, p.y, 20, '#0066ff', 'A')));

    // チームB (赤) の配置 (右側)
    const posB = [
        { x: 720, y: 250 }, // GK
        { x: 620, y: 250 }, // CB
        { x: 520, y: 150 }, // MF(上)
        { x: 520, y: 350 }, // MF(下)
        { x: 460, y: 250 }  // FW
    ];
    posB.forEach(p => pieces.push(new Piece(p.x, p.y, 20, '#ff3333', 'B')));
}

function handleCollisions() {
    const allObjects = [ball, ...pieces];

    for (let i = 0; i < allObjects.length; i++) {
        for (let j = i + 1; j < allObjects.length; j++) {
            const p1 = allObjects[i];
            const p2 = allObjects[j];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);

            if (dist < p1.radius + p2.radius) {
                const overlap = (p1.radius + p2.radius) - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                p1.x -= nx * overlap / 2;
                p1.y -= ny * overlap / 2;
                p2.x += nx * overlap / 2;
                p2.y += ny * overlap / 2;

                const kx = p1.vx - p2.vx;
                const ky = p1.vy - p2.vy;
                const p = 2 * (nx * kx + ny * ky) / 2;

                p1.vx -= p * nx;
                p1.vy -= p * ny;
                p2.vx += p * nx;
                p2.vy += p * ny;
            }
        }
    }
}

function checkGoal() {
    const goalTop = (canvas.height - GOAL_HEIGHT) / 2;
    const goalBottom = goalTop + GOAL_HEIGHT;

    if (ball.y > goalTop && ball.y < goalBottom) {
        if (ball.x < 0) {
            scoreB++;
            alert('赤 (チームB) ゴール！');
            resetPositions();
        } else if (ball.x > canvas.width) {
            scoreA++;
            alert('青 (チームA) ゴール！');
            resetPositions();
        }
    }
    scoreAEl.textContent = `青 (チームA): ${scoreA}`;
    scoreBEl.textContent = `赤 (チームB): ${scoreB}`;
}

function resetPositions() {
    initGame();
}

function drawField() {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    const goalTop = (canvas.height - GOAL_HEIGHT) / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, goalTop, 10, GOAL_HEIGHT);
    ctx.fillRect(canvas.width - 10, goalTop, 10, GOAL_HEIGHT);
}

// 操作イベント
// 操作イベント
// mousedown はキャンバス内のみで発火させるので canvas のまま
// スマホでのドラッグ中に画面がスクロールしてしまうのを防ぐ
canvas.style.touchAction = 'none';

// 操作イベント（pointer イベントを使うことで、マウスとスマホのタッチ両方に対応できます）
canvas.addEventListener('pointerdown', (e) => {
    if (isMoving) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    pieces.forEach(p => {
        if (p.team === currentTurn) {
            const dist = Math.hypot(p.x - mx, p.y - my);
            if (dist < p.radius) {
                selectedPiece = p;
                dragStart = { x: mx, y: my };
            }
        }
    });
});

// キャンバス外でも指の動きを追従できるように window に対して設定
window.addEventListener('pointermove', (e) => {
    if (!selectedPiece) return;
    const rect = canvas.getBoundingClientRect();
    dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});

window.addEventListener('pointerup', () => {
    if (selectedPiece && dragStart) {
        const dx = selectedPiece.x - dragStart.x;
        const dy = selectedPiece.y - dragStart.y;
        const distance = Math.hypot(dx, dy); // 引っ張った距離

        // 距離が MIN_DRAG_DISTANCE 以上の時だけショット発動
        if (distance >= MIN_DRAG_DISTANCE) {
            selectedPiece.vx = dx * 0.15;
            selectedPiece.vy = dy * 0.15;
            isMoving = true; // 有効ショットの時のみ移動フラグを立てる
        }

        // 選択状態を解除
        selectedPiece = null;
        dragStart = null;
    }
});

// 画面外に指が出たまま離された・キャンセルされた場合の保険
window.addEventListener('pointercancel', () => {
    selectedPiece = null;
    dragStart = null;
});

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawField();

    const allObjects = [ball, ...pieces];
    allObjects.forEach(obj => obj.update());
    handleCollisions();
    checkGoal();

    allObjects.forEach(obj => obj.draw());

    // ひっぱるガイド線（無効距離の時は赤色、有効距離なら黄色で表示）
    if (selectedPiece && dragStart) {
        const dx = selectedPiece.x - dragStart.x;
        const dy = selectedPiece.y - dragStart.y;
        const distance = Math.hypot(dx, dy);

        ctx.beginPath();
        // console.log(selectedPiece.x + "," + selectedPiece.y + "," + dragStart.x + "," + dragStart.y)
        ctx.moveTo(selectedPiece.x, selectedPiece.y);
        ctx.lineTo(dragStart.x + 2 * dx, dragStart.y + 2 * dy);
        // 短すぎる場合は赤線にして分かりやすく
        ctx.strokeStyle = (distance >= MIN_DRAG_DISTANCE) ? '#ffff00' : '#ff4444';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    if (isMoving) {
        const stillMoving = allObjects.some(obj => obj.vx !== 0 || obj.vy !== 0);
        if (!stillMoving) {
            isMoving = false;
            currentTurn = (currentTurn === 'A') ? 'B' : 'A';
            turnIndicatorEl.textContent = `現在のターン: ${currentTurn === 'A' ? '青 (チームA)' : '赤 (チームB)'}`;
            turnIndicatorEl.style.color = (currentTurn === 'A') ? '#4da6ff' : '#ff6666';
        }
    }

    requestAnimationFrame(gameLoop);
}

initGame();
gameLoop();