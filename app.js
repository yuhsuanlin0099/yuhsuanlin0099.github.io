(function () {
  "use strict";
  if (window.__POSE_SAKURA_STAGE2_CAPSULE_V5__) return;
  window.__POSE_SAKURA_STAGE2_CAPSULE_V5__ = true;

  /*** ================== 關卡設定 ================== ***/
  // 第一階段：20 秒
  var STAGE1 = {
    id: 1,
    name: "第一階段",
    DURATION_MS: 20000,
    SPAWN_BASE_PER_S: 0.6,
    SPAWN_MAX_PER_S: 2.0,
    VY_MIN: 1.8,
    VY_MAX: 3.2,
    VX_RANGE: 0.6,
  };
  // 第二階段：40 秒（更快）
  var STAGE2 = {
    id: 2,
    name: "第二階段",
    DURATION_MS: 40000,
    SPAWN_BASE_PER_S: 1.6,
    SPAWN_MAX_PER_S: 3.2,
    VY_MIN: 3.5,
    VY_MAX: 5.2,
    VX_RANGE: 1.1,
  };
  var MAX_ACTIVE_PETALS = 3;
  var STAGE1_COUNTDOWN_MS = 3000;
  var STAGE2_PREP_MS = 1200;
  var GOOD_GIF_MS = 5000; // 結束顯示 good.gif 5 秒

  /*** ============== 第二階段掉落「間距」控制 ============== ***/
  // 與上一片花瓣中心的最小水平距離（第二階段）
  var STAGE2_MIN_X_GAP_FRAC = 0.3; // 30% 螢幕寬
  // 與當前「場上其他花瓣」中心需保持的最小距離（第二階段）
  var STAGE2_ACTIVE_GAP_FRAC = 0.22; // 22% 螢幕寬
  // 需要強制偏向邊緣時的「邊緣帶」寬度
  var STAGE2_EDGE_BAND_FRAC = 0.12; // 12% 螢幕寬
  var lastSpawnCX = NaN; // 上一次生成的中心 x（用於第二階段間距）

  /*** ============== 命中與可視化（放寬版） ============== ***/
  var PALM_ALPHA_WAIT = 0.28;
  var PALM_ALPHA_PLAY = 0.38;
  var CAPSULE_DRAW_SCALE = 1.0;
  var PALM_HIT_SCALE = 1.25;
  var LATENCY_PAD_PER_PX_SPEED = 0.12;
  var MAX_LATENCY_PAD = 28;
  var PETAL_HIT_SCALE = 1.12;

  /*** ============== 啟動手勢門檻 ============== ***/
  var HOLD_CIRCLE_MS = 700;
  var MIN_DET_SCORE = 0.15;
  var HEAD_TOL_PX = 8;
  var SHOULDER_MARGIN_SCALE = 0.2;
  var SHOULDER_MARGIN_MIN = 16;
  var SHOULDER_MARGIN_MAX = 54;
  var WRIST_MIN_SCORE = 0.15;
  var ELBOW_MIN_SCORE = 0.15;

  /*** ================== DOM ================== ***/
  var camBg = document.getElementById("camBg");
  var dbgCanvas = document.getElementById("debugCanvas");
  var guideCanvas = document.getElementById("guideCanvas");
  var statusEl = document.getElementById("status");
  var scoreEl = document.getElementById("score");
  var timeEl = document.getElementById("timeLeft");
  var msgEl = document.getElementById("message");
  var readyRing = document.getElementById("readyRing");
  var readyWrap = document.getElementById("readyWrap");
  var layer = document.getElementById("gameLayer");
  var fxLayer = document.getElementById("fxLayer");
  var poseStatusEl = document.getElementById("poseStatus");
  var distStatusEl = document.getElementById("distStatus");

  var camDiag = document.getElementById("camDiag");
  var camStateEl = document.getElementById("camState");
  var vidStateEl = document.getElementById("vidState");
  var trkStateEl = document.getElementById("trkState");
  var vidSizeEl = document.getElementById("vidSize");

  /*** ================== 狀態 ================== ***/
  var gameState = "waiting";
  var currentStage = STAGE1;
  var poseNet, pose;
  var handpose,
    hands = [];
  var score = 0;
  var stageStartTs = 0;
  var lastFrameTs = 0,
    lastSpawnTs = 0;
  var stage1CountdownActive = false;

  var vidW = 640,
    vidH = 480,
    scaleS = 1,
    offX = 0,
    offY = 0;
  var debugOn = false;
  var petals = [];

  /*** ================== 相機 ================== ***/
  function startCamera() {
    return new Promise(function (resolve) {
      try {
        camBg.setAttribute("playsinline", "");
        camBg.setAttribute("webkit-playsinline", "");
        camBg.setAttribute("muted", "");
        camBg.muted = true;
        camBg.playsInline = true;
        camBg.webkitPlaysInline = true;

        navigator.mediaDevices
          .getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          })
          .then(function (stream) {
            camBg.srcObject = stream;
            return camBg.play().catch(function () {});
          })
          .then(function () {
            if (camBg.readyState >= 2) {
              onReady();
              resolve(true);
            } else
              camBg.onloadedmetadata = function () {
                onReady();
                resolve(true);
              };
            setTimeout(function () {
              if (camBg.readyState < 2 || camBg.paused)
                showCamActivateButton(resolve);
            }, 1500);
          })
          .catch(function (err) {
            statusEl.textContent =
              "相機啟動失敗：" + err.name + " - " + err.message;
            showCamActivateButton(resolve);
          });
      } catch (e) {
        statusEl.textContent = "相機錯誤：" + e.message;
        showCamActivateButton(resolve);
      }
    });
  }
  function onReady() {
    vidW = camBg.videoWidth || 640;
    vidH = camBg.videoHeight || 480;
    computeCoverMapping();
    camDiag.style.display = "block";
    updateCamDiag();
    startCamHealthLoop();
    try {
      Object.assign(msgEl.style, {
        background: "transparent",
        backdropFilter: "none",
        boxShadow: "none",
        border: "none",
      });
    } catch (_e) {}
  }
  function showCamActivateButton(resolve) {
    if (document.getElementById("camKick")) return;
    var btn = document.createElement("button");
    btn.id = "camKick";
    btn.textContent = "點一下啟用相機";
    Object.assign(btn.style, {
      position: "fixed",
      inset: "0",
      margin: "auto",
      width: "260px",
      height: "64px",
      zIndex: 9,
      borderRadius: "14px",
      border: "0",
      fontWeight: "800",
      fontSize: "18px",
      boxShadow: "0 10px 26px rgba(0,0,0,0.25)",
    });
    btn.onclick = function () {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        .then(function (s) {
          camBg.srcObject = s;
          return camBg.play();
        })
        .then(function () {
          return new Promise(function (res) {
            camBg.onloadedmetadata = res;
          });
        })
        .then(function () {
          onReady();
          btn.remove();
          if (resolve) resolve(true);
        })
        .catch(function (err) {
          alert("啟動相機失敗：" + err.message);
        });
    };
    document.body.appendChild(btn);
  }
  function computeCoverMapping() {
    var sw = window.innerWidth,
      sh = window.innerHeight;
    var sx = sw / vidW,
      sy = sh / vidH;
    scaleS = Math.max(sx, sy);
    offX = (sw - vidW * scaleS) / 2;
    offY = (sh - vidH * scaleS) / 2;
    dbgCanvas.width = sw;
    dbgCanvas.height = sh;
    guideCanvas.width = sw;
    guideCanvas.height = sh;
  }
  function updateCamDiag() {
    var s = camBg.srcObject;
    var active = !!(s && s.active);
    var tracks = s ? s.getVideoTracks() : [];
    camStateEl.innerHTML = active
      ? '<span class="ok">active</span>'
      : '<span class="bad">inactive</span>';
    vidStateEl.innerHTML =
      !camBg.paused && camBg.readyState >= 2
        ? '<span class="ok">playing</span>'
        : '<span class="bad">paused</span>';
    trkStateEl.textContent = tracks.length
      ? tracks[0].readyState + " / " + tracks[0].label
      : "none";
    vidSizeEl.textContent =
      (camBg.videoWidth || 0) + "×" + (camBg.videoHeight || 0);
  }
  var __camHealTimer = null,
    __restartLock = false;
  function startCamHealthLoop() {
    if (__camHealTimer) return;
    __camHealTimer = setInterval(function () {
      updateCamDiag();
      if (camBg.readyState < 2 || camBg.paused) tryRestartCamera();
    }, 2000);
  }
  function tryRestartCamera() {
    if (__restartLock) return;
    __restartLock = true;
    setTimeout(function () {
      __restartLock = false;
    }, 1500);
    var s = camBg.srcObject;
    var needNew = !(s && s.active);
    var p = Promise.resolve();
    if (needNew) {
      p = navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then(function (st) {
          camBg.srcObject = st;
        });
    }
    p.then(function () {
      return camBg.play().catch(function () {});
    })
      .then(updateCamDiag)
      .catch(function () {});
  }

  /*** ============== 座標轉換（鏡像） ============== ***/
  function toScreen(xRaw, yRaw) {
    var x = offX + xRaw * scaleS;
    var y = offY + yRaw * scaleS;
    return { x: window.innerWidth - x, y: y };
  }
  function rawKP(name, min) {
    if (!pose) return null;
    var m = typeof min === "number" ? min : MIN_DET_SCORE;
    var arr = pose.keypoints;
    for (var i = 0; i < arr.length; i++) {
      var p = arr[i];
      if (p.part === name) return p.score >= m ? p.position : null;
    }
    return null;
  }
  function kp(name, min) {
    var r = rawKP(name, min);
    return r ? toScreen(r.x, r.y) : null;
  }

  /*** ============== p5 生命週期 ============== ***/
  function setup() {
    var c = createCanvas(1, 1);
    c.canvas.style.display = "none";
    computeCoverMapping();
    startCamera().then(function () {
      poseNet = ml5.poseNet(camBg, function () {
        statusEl.textContent = "狀態：模型就緒（PoseNet+HandPose｜膠囊命中）";
      });
      poseNet.on("pose", function (rs) {
        if (rs && rs[0]) pose = rs[0].pose;
      });
      handpose = ml5.handpose(camBg, {}, function () {});
      handpose.on("predict", function (results) {
        hands = results || [];
      });
    });
    window.addEventListener("resize", computeCoverMapping);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") tryRestartCamera();
    });
    camBg.addEventListener("pause", tryRestartCamera);
    camBg.addEventListener("stalled", tryRestartCamera);
    camBg.addEventListener("ended", tryRestartCamera);
    window.addEventListener("keydown", function (e) {
      if ((e.key || "").toLowerCase() === "d") {
        debugOn = !debugOn;
        dbgCanvas.style.display = debugOn ? "block" : "none";
      }
    });
  }
  function draw() {
    var now = performance.now();
    if (!lastFrameTs) lastFrameTs = now;
    var dt = Math.min(40, now - lastFrameTs);
    lastFrameTs = now;
    var gctx = guideCanvas.getContext("2d");
    gctx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    drawPalmGuides(
      gctx,
      gameState === "playing" || gameState === "playing_stage2"
        ? PALM_ALPHA_PLAY
        : PALM_ALPHA_WAIT
    );
    updateDistanceHUD();
    if (!pose) {
      updateReadyUI(0);
      return;
    }

    if (gameState === "waiting") {
      var s = updateStartRaisedHands(true);
      updatePoseHUD(s);
      if (s.progress >= 1) startStage1();
    } else if (gameState === "playing" || gameState === "playing_stage2") {
      updateGame(now, dt);
    } else if (gameState === "prep_stage2") {
      timeEl.textContent = (STAGE2.DURATION_MS / 1000).toFixed(1);
    }
    if (debugOn) drawDebug();
  }
  window.setup = setup;
  window.draw = draw;

  /*** ============== 距離 HUD ============== ***/
  var DIST_PCT_NEAR = 0.19,
    DIST_PCT_GOOD_MIN = 0.11,
    DIST_PCT_GOOD_MAX = 0.17;
  function estimateDistanceClass() {
    var ls = kp("leftShoulder", MIN_DET_SCORE),
      rs = kp("rightShoulder", MIN_DET_SCORE);
    if (!ls || !rs) return { cls: "unknown", pct: 0 };
    var span = Math.abs(ls.x - rs.x);
    var pct = span / window.innerWidth;
    var cls = "far";
    if (pct > DIST_PCT_NEAR) cls = "near";
    else if (pct >= DIST_PCT_GOOD_MIN && pct <= DIST_PCT_GOOD_MAX) cls = "good";
    else cls = "far";
    return { cls: cls, pct: pct };
  }
  function updateDistanceHUD() {
    if (!distStatusEl) return;
    var e = estimateDistanceClass();
    if (e.cls === "good")
      distStatusEl.innerHTML = '<span class="ok">合適（~2 公尺）</span>';
    else if (e.cls === "near")
      distStatusEl.innerHTML = '<span class="bad">太近，退後一些</span>';
    else if (e.cls === "far")
      distStatusEl.innerHTML = '<span class="warn">太遠，靠近一些</span>';
    else distStatusEl.textContent = "—";
  }

  /*** ======= 頭頂/肩線/每手最高點 ======= ***/
  function getHeadTopY() {
    var names = ["leftEye", "rightEye", "nose", "leftEar", "rightEar"];
    var ys = [];
    for (var i = 0; i < names.length; i++) {
      var r = rawKP(names[i], MIN_DET_SCORE);
      if (r) ys.push(toScreen(r.x, r.y).y);
    }
    if (!ys.length) return null;
    return Math.min.apply(null, ys);
  }
  function getShoulderInfo(headYFallback) {
    var lsR = rawKP("leftShoulder", MIN_DET_SCORE),
      rsR = rawKP("rightShoulder", MIN_DET_SCORE);
    var ls = lsR ? toScreen(lsR.x, lsR.y) : null;
    var rs = rsR ? toScreen(rsR.x, rsR.y) : null;
    var span = ls && rs ? Math.abs(ls.x - rs.x) : window.innerWidth * 0.22;
    var lineY =
      ls && rs
        ? Math.min(ls.y, rs.y)
        : headYFallback != null
        ? headYFallback + 80
        : null;
    var margin = Math.max(
      SHOULDER_MARGIN_MIN,
      Math.min(SHOULDER_MARGIN_MAX, span * SHOULDER_MARGIN_SCALE)
    );
    return { ls: ls, rs: rs, span: span, lineY: lineY, margin: margin };
  }
  function handTopY(side) {
    var wR = rawKP(side + "Wrist", MIN_DET_SCORE);
    var eR = rawKP(side + "Elbow", MIN_DET_SCORE);
    var sR = rawKP(side + "Shoulder", MIN_DET_SCORE);
    var candidates = [];
    if (wR) candidates.push(toScreen(wR.x, wR.y).y);
    if (eR && sR) {
      var e = toScreen(eR.x, eR.y),
        s = toScreen(sR.x, sR.y);
      var upper = Math.hypot(e.x - s.x, e.y - s.y);
      candidates.push(e.y - Math.max(upper * 0.9, 28));
    } else if (eR) {
      var e2 = toScreen(eR.x, eR.y);
      candidates.push(e2.y - 24);
    }
    if (!candidates.length) return null;
    return Math.min.apply(null, candidates);
  }

  /*** ============ 開局手勢（雙手過頭） ============ ***/
  var holdStart = null;
  function updateStartRaisedHands(wantDetail) {
    var headY = getHeadTopY();
    var leftY = handTopY("left");
    var rightY = handTopY("right");
    if (headY == null || leftY == null || rightY == null) {
      holdStart = null;
      updateReadyUI(0);
      return wantDetail
        ? { progress: 0, ok: false, headY, leftY, rightY }
        : { progress: 0, ok: false };
    }
    var shoulder = getShoulderInfo(headY);
    var thrHead = headY - HEAD_TOL_PX;
    var thrShoulder =
      (shoulder.lineY != null ? shoulder.lineY : headY + 80) - shoulder.margin;
    var aboveHead = leftY < thrHead && rightY < thrHead;
    var aboveShoulders = leftY < thrShoulder && rightY < thrShoulder;
    var ok = aboveHead && aboveShoulders;
    if (ok) {
      if (!holdStart) holdStart = performance.now();
    } else {
      holdStart = null;
    }
    var prog = holdStart
      ? Math.min(1, (performance.now() - holdStart) / HOLD_CIRCLE_MS)
      : 0;
    updateReadyUI(prog);
    return wantDetail
      ? {
          progress: prog,
          ok,
          headY,
          thrHead,
          shoulderY: shoulder.lineY,
          thrShoulder,
          leftY,
          rightY,
        }
      : { progress: prog, ok };
  }
  function updateReadyUI(p) {
    readyRing.style.setProperty("--deg", Math.floor(p * 360) + "deg");
  }
  function updatePoseHUD(s) {
    if (!poseStatusEl) return;
    if (s.progress >= 1)
      poseStatusEl.innerHTML = '<span class="ok">觸發成功！</span>';
    else if (s.ok)
      poseStatusEl.innerHTML =
        '<span class="ok">雙手過頭，保持… ' +
        Math.round(s.progress * 100) +
        "%</span>";
    else poseStatusEl.innerHTML = '<span class="bad">請雙手高舉過頭</span>';
  }

  /*** ============ 手部幾何（膠囊 & 碗形） ============ ***/
  function getPalmCapsules() {
    var out = [];
    if (hands && hands.length) {
      for (var i = 0; i < hands.length; i++) {
        var lm = hands[i].landmarks || hands[i].keypoints || [];
        if (!lm || lm.length < 18) continue;
        function rawPt(idx) {
          var p = lm[idx];
          return Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y };
        }
        var w = rawPt(0),
          p5 = rawPt(5),
          p9 = rawPt(9),
          p13 = rawPt(13),
          p17 = rawPt(17);
        var root = {
          x: (p5.x + p9.x + p13.x + p17.x) / 4,
          y: (p5.y + p9.y + p13.y + p17.y) / 4,
        };
        var A = toScreen(w.x, w.y),
          B = toScreen(root.x, root.y);
        var width = dist2D(toScreen(p5.x, p5.y), toScreen(p17.x, p17.y));
        var r = Math.max(18, width * 0.45);
        out.push({
          ax: A.x,
          ay: A.y,
          bx: B.x,
          by: B.y,
          r: r,
          rDraw: r * CAPSULE_DRAW_SCALE,
        });
      }
    }
    var sides = ["left", "right"];
    for (var s = 0; s < sides.length; s++) {
      var w2 = kp(sides[s] + "Wrist", WRIST_MIN_SCORE),
        e2 = kp(sides[s] + "Elbow", ELBOW_MIN_SCORE);
      if (w2 && e2) {
        var segLen = Math.hypot(w2.x - e2.x, w2.y - e2.y);
        var r2 = clamp(segLen * 0.22, 18, 42);
        out.push({
          ax: e2.x,
          ay: e2.y,
          bx: w2.x,
          by: w2.y,
          r: r2,
          rDraw: r2 * CAPSULE_DRAW_SCALE,
        });
      }
    }
    return out;
  }
  function getBowlCapsule() {
    var wl = kp("leftWrist", WRIST_MIN_SCORE),
      wr = kp("rightWrist", WRIST_MIN_SCORE);
    if (!(wl && wr)) return null;
    var dx = wr.x - wl.x,
      dy = wr.y - wl.y,
      d = Math.hypot(dx, dy);
    if (d < 20) return null;
    var vertTol = d * 0.18;
    if (Math.abs(dy) > vertTol) return null;
    var r = clamp(d * 0.28, 20, 80);
    return {
      ax: wl.x,
      ay: wl.y,
      bx: wr.x,
      by: wr.y,
      r: r,
      rDraw: r * CAPSULE_DRAW_SCALE,
      bowl: true,
    };
  }
  function dist2D(a, b) {
    var dx = a.x - b.x,
      dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function pointSegDist2(px, py, ax, ay, bx, by) {
    var dx = bx - ax,
      dy = by - ay;
    var len2 = dx * dx + dy * dy;
    if (len2 === 0) {
      var dx0 = px - ax,
        dy0 = py - ay;
      return dx0 * dx0 + dy0 * dy0;
    }
    var t = ((px - ax) * dx + (py - ay) * dy) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    var nx = ax + t * dx,
      ny = ay + t * dy;
    var ex = px - nx,
      ey = py - ny;
    return ex * ex + ey * ey;
  }
  function circleCapsuleHit(cx, cy, prevCx, prevCy, ax, ay, bx, by, Rsum) {
    var sx = prevCx,
      sy = prevCy,
      ex = cx,
      ey = cy;
    var steps = 5;
    for (var t = 0; t <= steps; t++) {
      var u = t / steps;
      var x = sx + (ex - sx) * u,
        y = sy + (ey - sy) * u;
      if (pointSegDist2(x, y, ax, ay, bx, by) <= Rsum * Rsum) return true;
    }
    return false;
  }
  function drawPalmGuides(ctx, alpha) {
    var capsules = getPalmCapsules();
    var bowl = getBowlCapsule();
    if (bowl) capsules.push(bowl);
    if (!capsules.length) return;
    ctx.save();
    for (var i = 0; i < capsules.length; i++) {
      var c = capsules[i];
      var w = (c.rDraw || c.r) * 2;
      ctx.globalAlpha = Math.min(1, alpha + 0.15);
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(c.ax, c.ay);
      ctx.lineTo(c.bx, c.by);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = c.bowl
        ? "rgba(255,182,193,0.85)"
        : "rgba(255,192,203,0.8)";
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(c.ax, c.ay);
      ctx.lineTo(c.bx, c.by);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.bowl
        ? "rgba(255,120,150,0.95)"
        : "rgba(255,110,140,0.95)";
      ctx.beginPath();
      ctx.arc((c.ax + c.bx) / 2, (c.ay + c.by) / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /*** ================== 櫻花 ================== ***/
  function spawnPetal() {
    var active = 0;
    for (var i = 0; i < petals.length; i++) if (!petals[i].hit) active++;
    if (active >= MAX_ACTIVE_PETALS) return;

    var wrap = document.createElement("div");
    wrap.className = "petal";
    var r = Math.random();
    if (r < 0.33) wrap.classList.add("small");
    else if (r > 0.66) wrap.classList.add("large");

    var img = document.createElement("img");
    if (Math.random() < 0.5) {
      img.src = "sakura_01.svg";
      wrap.classList.add("p1");
    } else {
      img.src = "sakura_02.svg";
      wrap.classList.add("p2");
    }
    var dur = (2.2 + Math.random() * 2.2).toFixed(2) + "s";
    var delay = (-Math.random() * 1.8).toFixed(2) + "s";
    img.style.animationDuration = dur;
    img.style.animationDelay = delay;
    wrap.appendChild(img);
    layer.appendChild(wrap);

    // 尺寸
    var w = wrap.classList.contains("large")
      ? 96
      : wrap.classList.contains("small")
      ? 56
      : 80;
    var y = -120;
    var vy =
      currentStage.VY_MIN +
      Math.random() * (currentStage.VY_MAX - currentStage.VY_MIN);
    var vx = (Math.random() * 2 - 1) * currentStage.VX_RANGE;
    var radius = w * 0.5;

    // ===== 決定「中心 x」：第二階段加大間距 =====
    var sw = window.innerWidth;
    var xc; // center-x
    if (currentStage.id === 2) {
      var minGap = sw * STAGE2_MIN_X_GAP_FRAC;
      var activeGap = sw * STAGE2_ACTIVE_GAP_FRAC;
      var band = sw * STAGE2_EDGE_BAND_FRAC;

      // 嘗試多次隨機取樣，確保與「上一個生成點」與「現有花瓣」距離夠大
      var ok = false,
        tries = 0;
      while (!ok && tries++ < 10) {
        xc = w / 2 + Math.random() * (sw - w);
        // 與上一個生成點距離
        var gapOK = isNaN(lastSpawnCX) || Math.abs(xc - lastSpawnCX) >= minGap;
        // 與場上其他花瓣距離
        var othersOK = true;
        for (var i = 0; i < petals.length; i++) {
          if (petals[i].hit) continue;
          var oc = petals[i].x + petals[i].w / 2;
          if (Math.abs(xc - oc) < activeGap) {
            othersOK = false;
            break;
          }
        }
        ok = gapOK && othersOK;
      }
      // 若仍不 OK，強制放到另一側邊緣帶
      if (!ok) {
        if (!isNaN(lastSpawnCX) && lastSpawnCX < sw / 2) {
          // 上次在左側 → 放右側邊緣帶
          var minR = Math.max(sw - band - w / 2, w / 2);
          var maxR = sw - w / 2;
          xc = minR + Math.random() * Math.max(1, maxR - minR);
        } else {
          // 上次在右側或未知 → 放左側邊緣帶
          var minL = w / 2;
          var maxL = Math.min(band + w / 2, sw - w / 2);
          xc = minL + Math.random() * Math.max(1, maxL - minL);
        }
      }
    } else {
      // 第一階段正常隨機
      xc = w / 2 + Math.random() * (sw - w);
    }

    var x = xc - w / 2;
    lastSpawnCX = xc;

    wrap.style.transform = "translate(" + x + "px," + y + "px)";
    petals.push({
      el: wrap,
      x: x,
      y: y,
      prevX: x,
      prevY: y,
      vy: vy,
      vx: vx,
      radius: radius,
      w: w,
      h: w,
      hit: false,
    });
  }

  function updateSpawns(now) {
    var t = (now - stageStartTs) / currentStage.DURATION_MS;
    t = Math.max(0, Math.min(1, t));
    var rate =
      currentStage.SPAWN_BASE_PER_S +
      (currentStage.SPAWN_MAX_PER_S - currentStage.SPAWN_BASE_PER_S) *
        Math.pow(t, 0.65);
    var interval = 1000 / rate;
    var active = 0;
    for (var i = 0; i < petals.length; i++) if (!petals[i].hit) active++;
    if (active < MAX_ACTIVE_PETALS && now - lastSpawnTs >= interval) {
      spawnPetal();
      lastSpawnTs = now;
    }
  }

  function updatePetals(dt) {
    var palms = getPalmCapsules();
    var bowl = getBowlCapsule();
    if (bowl) palms.push(bowl);
    for (var i = petals.length - 1; i >= 0; i--) {
      var p = petals[i];
      if (p.hit) continue;
      var f = dt / 16.67;
      p.prevX = p.x;
      p.prevY = p.y;
      p.y += p.vy * f;
      p.x += p.vx * f;
      p.el.style.transform = "translate(" + p.x + "px," + p.y + "px)";

      var cx = p.x + p.w / 2,
        cy = p.y + p.h / 2;
      var prevCx = p.prevX + p.w / 2,
        prevCy = p.prevY + p.h / 2;

      var speed = Math.hypot(p.x - p.prevX, p.y - p.prevY);
      var latencyPad = Math.min(
        MAX_LATENCY_PAD,
        speed * LATENCY_PAD_PER_PX_SPEED
      );

      var scored = false;
      for (var k = 0; k < palms.length; k++) {
        var C = palms[k];
        var effR = C.r * PALM_HIT_SCALE + latencyPad;
        var Rsum = p.radius * PETAL_HIT_SCALE + effR;

        if (
          circleCapsuleHit(cx, cy, prevCx, prevCy, C.ax, C.ay, C.bx, C.by, Rsum)
        ) {
          onHit(p, i, cx, cy);
          scored = true;
          break;
        }
        if (!scored) {
          var nearPad = 6;
          if (
            pointSegDist2(cx, cy, C.ax, C.ay, C.bx, C.by) <=
            (Rsum + nearPad) * (Rsum + nearPad)
          ) {
            onHit(p, i, cx, cy);
            scored = true;
            break;
          }
        }
      }
      if (scored) continue;
      if (p.y > window.innerHeight + 120) {
        p.el.remove();
        petals.splice(i, 1);
      }
    }
  }
  function onHit(p, idx, cx, cy) {
    p.hit = true;
    p.el.classList.add("hit");
    score++;
    scoreEl.textContent = String(score);
    createScoreFx(cx, cy);
    setTimeout(function () {
      p.el.remove();
      petals.splice(idx, 1);
    }, 220);
  }
  function createScoreFx(x, y) {
    var fx = document.createElement("div");
    fx.className = "score-fx";
    fx.textContent = "+1";
    fx.style.left = x + "px";
    fx.style.top = y + "px";
    fxLayer.appendChild(fx);
    setTimeout(function () {
      fx.remove();
    }, 900);
  }

  /*** ================== 遊戲流程 ================== ***/
  function startStage1() {
    currentStage = STAGE1;
    gameState = "playing";
    stageStartTs = performance.now();
    lastSpawnTs = 0;
    lastFrameTs = 0;
    lastSpawnCX = NaN; // 重置生成點記錄
    score = 0;
    scoreEl.textContent = "0";
    stage1CountdownActive = false;
    readyWrap.style.display = "none";
    msgEl.style.display = "none";
    statusEl.textContent = "狀態：" + currentStage.name + "（手掌接櫻花）";
    clearPetals();
    fxLayer.innerHTML = "";
  }
  function showStage1Countdown(leftMs) {
    var sec = Math.max(1, Math.ceil(leftMs / 1000));
    msgEl.style.display = "block";
    msgEl.innerHTML =
      '<div style="font-size:64px;font-weight:900;line-height:1;margin-bottom:6px;">' +
      sec +
      "</div>" +
      "<div>即將進入 <b>LEVEL 2</b></div>";
    msgEl.style.background = "transparent";
  }
  function enterLevel2Prep() {
    gameState = "prep_stage2";
    currentStage = STAGE2;
    clearPetals();
    stage1CountdownActive = false;
    msgEl.style.display = "block";
    msgEl.style.background = "transparent";
    msgEl.innerHTML =
      '<div style="font-size:56px;font-weight:900;line-height:1">LEVEL 2</div>';
    statusEl.textContent = "狀態：準備 " + currentStage.name;
    setTimeout(startStage2, STAGE2_PREP_MS);
  }
  function startStage2() {
    msgEl.style.display = "none";
    gameState = "playing_stage2";
    stageStartTs = performance.now();
    lastSpawnTs = 0;
    lastFrameTs = 0;
    lastSpawnCX = NaN; // 切換階段時也重置，避免第一顆就被限制
    statusEl.textContent = "狀態：" + currentStage.name + "（更快！遠距掉落）";
    clearPetals();
    fxLayer.innerHTML = "";
  }
  function endGame() {
    gameState = "gameover";
    statusEl.textContent = "狀態：結束";
    msgEl.style.background = "transparent";
    // good.gif 縮小（原 60vw → 32vw）
    msgEl.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;gap:12px">' +
      '<img src="good.gif" alt="Good!" style="max-width:32vw;max-height:32vh"/>' +
      '<div style="font-size:28px;font-weight:800">總分：<span>' +
      score +
      "</span></div>" +
      "</div>";
    msgEl.style.display = "block";
    readyWrap.style.display = "none";
    clearPetals();
    setTimeout(resetToWaiting, GOOD_GIF_MS);
  }
  function resetToWaiting() {
    score = 0;
    scoreEl.textContent = "0";
    timeEl.textContent = (STAGE1.DURATION_MS / 1000).toFixed(1);
    currentStage = STAGE1;
    gameState = "waiting";
    msgEl.style.display = "none";
    readyWrap.style.display = "block";
    fxLayer.innerHTML = "";
    clearPetals();
  }
  function updateGame(now, dt) {
    var leftMs = Math.max(0, currentStage.DURATION_MS - (now - stageStartTs));
    timeEl.textContent = (leftMs / 1000).toFixed(1);

    if (gameState === "playing") {
      if (leftMs <= STAGE1_COUNTDOWN_MS && leftMs > 0) {
        if (!stage1CountdownActive) stage1CountdownActive = true;
        showStage1Countdown(leftMs);
      }
      updateSpawns(now);
      updatePetals(dt);
      if (leftMs <= 0) {
        enterLevel2Prep();
        return;
      }
    } else if (gameState === "playing_stage2") {
      updateSpawns(now);
      updatePetals(dt);
      if (leftMs <= 0) {
        endGame();
        return;
      }
    }
  }
  function clearPetals() {
    for (var i = 0; i < petals.length; i++) {
      try {
        petals[i].el.remove();
      } catch (_e) {}
    }
    petals.length = 0;
  }

  /*** ================== 除錯（D鍵） ================== ***/
  function drawDebug() {
    var ctx = dbgCanvas.getContext("2d");
    ctx.clearRect(0, 0, dbgCanvas.width, dbgCanvas.height);
    if (pose) {
      var list = [
        "leftShoulder",
        "rightShoulder",
        "leftElbow",
        "rightElbow",
        "leftWrist",
        "rightWrist",
        "nose",
        "leftEye",
        "rightEye",
        "leftEar",
        "rightEar",
      ];
      var map = {};
      for (var i = 0; i < list.length; i++) {
        var r = rawKP(list[i], MIN_DET_SCORE);
        if (r) {
          var s = toScreen(r.x, r.y);
          map[list[i]] = s;
        }
      }
      ctx.strokeStyle = "rgba(0,255,255,0.9)";
      ctx.lineWidth = 3;
      function line(a, b) {
        if (map[a] && map[b]) {
          ctx.beginPath();
          ctx.moveTo(map[a].x, map[a].y);
          ctx.lineTo(map[b].x, map[b].y);
          ctx.stroke();
        }
      }
      line("leftShoulder", "rightShoulder");
      line("leftShoulder", "leftElbow");
      line("leftElbow", "leftWrist");
      line("rightShoulder", "rightElbow");
      line("rightElbow", "rightWrist");
    }
    var headY = getHeadTopY();
    var sh = getShoulderInfo(headY);
    var thrHead = headY != null ? headY - HEAD_TOL_PX : null;
    var thrShoulder =
      sh.lineY != null ? sh.lineY : headY != null ? headY + 80 : null;
    if (thrHead != null) {
      ctx.strokeStyle = "rgba(46,204,113,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, thrHead);
      ctx.lineTo(window.innerWidth, thrHead);
      ctx.stroke();
    }
    if (thrShoulder != null) {
      var y = thrShoulder - sh.margin;
      ctx.strokeStyle = "rgba(241,196,15,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(window.innerWidth, y);
      ctx.stroke();
    }
    var caps = getPalmCapsules();
    var bowl = getBowlCapsule();
    if (bowl) caps.push(bowl);
    for (var j = 0; j < caps.length; j++) {
      var c = caps[j];
      var eff = c.r * PALM_HIT_SCALE;
      ctx.strokeStyle = c.bowl
        ? "rgba(255,215,0,0.85)"
        : "rgba(255,215,0,0.95)";
      ctx.lineWidth = eff * 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(c.ax, c.ay);
      ctx.lineTo(c.bx, c.by);
      ctx.stroke();
    }
  }
})();
