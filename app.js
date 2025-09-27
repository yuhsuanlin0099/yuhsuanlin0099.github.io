/* app.js — Sakura Catch (V13)
 * Fixes:
 *  - 開局種子花瓣，避免看起來「沒開始」
 *  - 自動建立 #gameLayer/#fxLayer（缺少時），並設定 z-index
 *  - 開始時自動關閉 debug 與清理殘影
 *  - 保留 V12：重力 + 脫困微推、L1/L2 速度差、Pose 暫失仍繼續遊戲
 */

(function () {
  ("use strict");
  if (window.__SAKURA_MPPOSE_V13__) return;
  window.__SAKURA_MPPOSE_V13__ = true;

  /*** ================== 遊戲參數 ================== ***/
  // ★ Level 1 更慢（約為舊 L1 的 1/2）
  var STAGE1 = {
    id: 1,
    name: "第一階段",
    DURATION_MS: 20000, // 時長不變
    SPAWN_BASE_PER_S: 0.25, // ← 原 0.5 的一半
    SPAWN_MAX_PER_S: 0.6, // ← 原 1.2 的一半
    VY_MIN: 0.6, // ← 原 1.2 的一半
    VY_MAX: 1.0, // ← 原 2.0 的一半
    VX_RANGE: 0.25, // ← 原 0.5 的一半（橫向擺動更小）
    GRAVITY: 0.018, // ← 原 0.035 的一半（落下更慢更順）
  };

  // ★ Level 2 採用「舊 Level 1」的速度參數（讓兩關有明顯差異）
  var STAGE2 = {
    id: 2,
    name: "第二階段",
    DURATION_MS: 40000, // 時長不變
    SPAWN_BASE_PER_S: 0.7, // 舊 L1
    SPAWN_MAX_PER_S: 1.2, // 舊 L1
    VY_MIN: 1.2, // 舊 L1
    VY_MAX: 2.0, // 舊 L1
    VX_RANGE: 0.5, // 舊 L1
    GRAVITY: 0.05, // 舊 L1
  };

  var MAX_ACTIVE_PETALS = 3;
  var STAGE1_COUNTDOWN_MS = 3000;
  var STAGE2_PREP_MS = 1200;
  var GOOD_GIF_MS = 5000;

  var STAGE2_MIN_X_GAP_FRAC = 0.3,
    STAGE2_ACTIVE_GAP_FRAC = 0.22,
    STAGE2_EDGE_BAND_FRAC = 0.12;
  var lastSpawnCX = NaN;

  var PALM_ALPHA_WAIT = 0.28,
    PALM_ALPHA_PLAY = 0.38,
    CAPSULE_DRAW_SCALE = 1.0;
  var PALM_HIT_SCALE = 1.25,
    WRIST_ONLY_HIT_BOOST = 1.18,
    BOWL_HIT_BOOST = 1.1,
    PETAL_HIT_SCALE = 1.12;
  var LATENCY_PAD_PER_PX_SPEED = 0.12,
    MAX_LATENCY_PAD = 28,
    TRACE_STEPS = 7;

  var HOLD_CIRCLE_MS = 900,
    HEAD_TOL_PX = 14;
  var SHOULDER_MARGIN_SCALE = 0.24,
    SHOULDER_MARGIN_MIN = 16,
    SHOULDER_MARGIN_MAX = 60;

  var MIN_POSE_VIS = 0.3;
  var HIT_WRIST_MIN_VIS = 0.15,
    HIT_ELBOW_MIN_VIS = 0.15;

  var startArmed = false,
    lowHandsStartTs = null,
    ARMED_REQUIRE_LOW_MS = 500;

  var HIT_SND_SRC = "notification.mp3",
    HIT_SND_POOL_N = 6,
    hitSoundPool = [];
  function initHitSounds() {
    try {
      for (var i = 0; i < HIT_SND_POOL_N; i++) {
        var a = new Audio(HIT_SND_SRC);
        a.preload = "auto";
        a.volume = 0.85;
        hitSoundPool.push(a);
      }
      document.addEventListener("pointerdown", primeAudioOnce, { once: true });
      document.addEventListener("touchstart", primeAudioOnce, { once: true });
      document.addEventListener("keydown", primeAudioOnce, { once: true });
    } catch (e) {}
  }
  function primeAudioOnce() {
    try {
      var a = hitSoundPool[0];
      if (!a) return;
      a.play()
        .then(function () {
          a.pause();
          a.currentTime = 0;
        })
        .catch(function () {});
    } catch (e) {}
  }
  function playHitSound() {
    for (var i = 0; i < hitSoundPool.length; i++) {
      var ch = hitSoundPool[i];
      if (ch.paused) {
        try {
          ch.currentTime = 0;
          ch.play().catch(function () {});
        } catch (e) {}
        return;
      }
    }
    try {
      var b = new Audio(HIT_SND_SRC);
      b.preload = "auto";
      b.volume = 0.85;
      hitSoundPool.push(b);
      b.play().catch(function () {});
    } catch (e) {}
  }

  /*** ================== DOM ================== ***/
  var camBg = document.getElementById("camBg"),
    dbgCanvas = document.getElementById("debugCanvas"),
    guideCanvas = document.getElementById("guideCanvas");
  var statusEl = document.getElementById("status"),
    scoreEl = document.getElementById("score"),
    timeEl = document.getElementById("timeLeft"),
    msgEl = document.getElementById("message");
  var readyRing = document.getElementById("readyRing"),
    readyWrap = document.getElementById("readyWrap");
  var layer = document.getElementById("gameLayer"),
    fxLayer = document.getElementById("fxLayer");
  var poseStatusEl = document.getElementById("poseStatus"),
    distStatusEl = document.getElementById("distStatus");
  var camDiag = document.getElementById("camDiag"),
    camStateEl = document.getElementById("camState"),
    vidStateEl = document.getElementById("vidState"),
    trkStateEl = document.getElementById("trkState"),
    vidSizeEl = document.getElementById("vidSize");

  function ensureLayer() {
    // gameLayer
    if (!layer || !layer.appendChild)
      layer = document.getElementById("gameLayer");
    if (!layer || !layer.appendChild) {
      var d = document.createElement("div");
      d.id = "gameLayer";
      Object.assign(d.style, {
        position: "fixed",
        inset: "0",
        pointerEvents: "none",
        zIndex: 6,
      });
      document.body.appendChild(d);
      layer = d;
    } else {
      if (!layer.style.position) layer.style.position = "fixed";
      if (!layer.style.inset) layer.style.inset = "0";
      layer.style.pointerEvents = "none";
      if (!layer.style.zIndex) layer.style.zIndex = 6;
    }
    // fxLayer
    if (!fxLayer || !fxLayer.appendChild)
      fxLayer = document.getElementById("fxLayer");
    if (!fxLayer || !fxLayer.appendChild) {
      var f = document.createElement("div");
      f.id = "fxLayer";
      Object.assign(f.style, {
        position: "fixed",
        inset: "0",
        pointerEvents: "none",
        zIndex: 7,
      });
      document.body.appendChild(f);
      fxLayer = f;
    } else {
      if (!fxLayer.style.position) fxLayer.style.position = "fixed";
      if (!fxLayer.style.inset) fxLayer.style.inset = "0";
      fxLayer.style.pointerEvents = "none";
      if (!fxLayer.style.zIndex) fxLayer.style.zIndex = 7;
    }
  }

  /*** ================== 狀態 ================== ***/
  var gameState = "waiting",
    currentStage = STAGE1;
  var mpPose = null,
    mpHands = null,
    pumpOn = false;
  var posePix = null,
    lastPoseTs = 0;
  var lastHands = [],
    lastHandsTs = 0,
    HANDS_KEEP_MS = 180;
  var score = 0,
    stageStartTs = 0,
    lastFrameTs = 0,
    lastSpawnTs = 0,
    stage1CountdownActive = false;
  var vidW = 640,
    vidH = 480,
    scaleS = 1,
    offX = 0,
    offY = 0,
    debugOn = false,
    petals = [];

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
          primeAudioOnce();
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
      sh = window.innerHeight,
      sx = sw / vidW,
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
    var s = camBg.srcObject,
      active = !!(s && s.active),
      tracks = s ? s.getVideoTracks() : [];
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
    var s = camBg.srcObject,
      needNew = !(s && s.active),
      p = Promise.resolve();
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

  /*** ================== 座標轉換（鏡像） ================== ***/
  function toScreen(xRaw, yRaw) {
    var x = offX + xRaw * scaleS,
      y = offY + yRaw * scaleS;
    return { x: window.innerWidth - x, y: y };
  }

  /*** ================== MediaPipe Pose / Hands ================== ***/
  var POSE_IDX = {
    nose: 0,
    leftEye: 2,
    rightEye: 5,
    leftEar: 7,
    rightEar: 8,
    leftShoulder: 11,
    rightShoulder: 12,
    leftElbow: 13,
    rightElbow: 14,
    leftWrist: 15,
    rightWrist: 16,
  };

  function setup() {
    var c = createCanvas(1, 1);
    c.canvas.style.display = "none";
    computeCoverMapping();
    initHitSounds();
    ensureLayer();
    startCamera().then(function () {
      mpPose = new Pose({
        locateFile: (f) => "https://cdn.jsdelivr.net/npm/@mediapipe/pose/" + f,
      });
      mpPose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      mpPose.onResults(onPoseResults);

      mpHands = new Hands({
        locateFile: (f) => "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" + f,
      });
      mpHands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      mpHands.onResults(onHandsResults);

      if (!pumpOn) {
        pumpOn = true;
        pumpModels();
      }
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
        if (!debugOn) {
          var ctx = dbgCanvas.getContext("2d");
          ctx.clearRect(0, 0, dbgCanvas.width, dbgCanvas.height);
        }
      }
    });
  }
  window.setup = setup;

  async function pumpModels() {
    try {
      if (camBg && camBg.readyState >= 2) {
        if (mpPose) await mpPose.send({ image: camBg });
        if (mpHands) await mpHands.send({ image: camBg });
      }
    } catch (e) {}
    if (pumpOn) requestAnimationFrame(pumpModels);
  }

  function onPoseResults(results) {
    posePix = null;
    if (results && results.poseLandmarks && results.poseLandmarks.length) {
      var lm = results.poseLandmarks,
        arr = [];
      for (var i = 0; i < lm.length; i++) {
        arr.push({
          x: lm[i].x * vidW,
          y: lm[i].y * vidH,
          v: typeof lm[i].visibility === "number" ? lm[i].visibility : 1,
        });
      }
      posePix = arr;
      lastPoseTs = performance.now();
    }
  }
  function onHandsResults(results) {
    var list = [];
    if (
      results &&
      results.multiHandLandmarks &&
      results.multiHandLandmarks.length
    ) {
      for (var i = 0; i < results.multiHandLandmarks.length; i++) {
        var lm = results.multiHandLandmarks[i];
        var handed =
          (results.multiHandedness &&
            results.multiHandedness[i] &&
            results.multiHandedness[i].label) ||
          "";
        var arr = [];
        for (var j = 0; j < lm.length; j++) {
          arr.push({ x: lm[j].x * vidW, y: lm[j].y * vidH });
        }
        list.push({ label: handed, landmarks: arr });
      }
    }
    lastHands = list;
    lastHandsTs = performance.now();
  }

  /*** ================== Pose 取點（像素→螢幕） ================== ***/
  function poseRaw(name, minVis) {
    if (!posePix) return null;
    var idx = POSE_IDX[name];
    if (idx == null) return null;
    var p = posePix[idx];
    if (!p) return null;
    var m = typeof minVis === "number" ? minVis : MIN_POSE_VIS;
    if (p.v != null && p.v < m) return null;
    return { x: p.x, y: p.y };
  }
  function rawKP(name, minVis) {
    return poseRaw(name, minVis);
  }
  function kp(name, minVis) {
    var r = poseRaw(name, minVis);
    return r ? toScreen(r.x, r.y) : null;
  }

  /*** ================== 距離 HUD ================== ***/
  var DIST_PCT_NEAR = 0.19,
    DIST_PCT_GOOD_MIN = 0.11,
    DIST_PCT_GOOD_MAX = 0.17;
  function estimateDistanceClass() {
    var ls = kp("leftShoulder", MIN_POSE_VIS),
      rs = kp("rightShoulder", MIN_POSE_VIS);
    if (!ls || !rs) return { cls: "unknown", pct: 0 };
    var span = Math.abs(ls.x - rs.x),
      pct = span / window.innerWidth,
      cls = "far";
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

  /*** ================== 頭/肩/手高（Pose + Hands wrist 備援） ================== ***/
  var SHOULDER_MARGIN_MIN = 16,
    SHOULDER_MARGIN_MAX = 60,
    SHOULDER_MARGIN_SCALE = 0.24;
  function getHeadTopY() {
    var names = ["leftEye", "rightEye", "nose", "leftEar", "rightEar"],
      ys = [];
    for (var i = 0; i < names.length; i++) {
      var r = rawKP(names[i], MIN_POSE_VIS);
      if (r) ys.push(toScreen(r.x, r.y).y);
    }
    if (!ys.length) return null;
    return Math.min.apply(null, ys);
  }
  function getShoulderInfo(headYFallback) {
    var lsR = rawKP("leftShoulder", MIN_POSE_VIS),
      rsR = rawKP("rightShoulder", MIN_POSE_VIS);
    var ls = lsR ? toScreen(lsR.x, lsR.y) : null,
      rs = rsR ? toScreen(rsR.x, rsR.y) : null;
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
  function getRecentHands(maxMs) {
    if (performance.now() - lastHandsTs <= (maxMs || HANDS_KEEP_MS))
      return lastHands;
    return [];
  }
  function mpWristY(side) {
    var hs = getRecentHands();
    if (!hs || !hs.length) return null;
    var want = side === "left" ? "Left" : "Right";
    var best = null;
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (!h.label) continue;
      if (h.label.indexOf(want) === 0 && h.landmarks && h.landmarks[0]) {
        var w = h.landmarks[0];
        var sy = toScreen(w.x, w.y).y;
        best = best == null ? sy : Math.min(best, sy);
      }
    }
    return best;
  }
  function handTopY(side) {
    var candidates = [],
      wR = rawKP(side + "Wrist", MIN_POSE_VIS),
      eR = rawKP(side + "Elbow", MIN_POSE_VIS),
      sR = rawKP(side + "Shoulder", MIN_POSE_VIS);
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
    var mpY = mpWristY(side);
    if (mpY != null) candidates.push(mpY);
    if (!candidates.length) return null;
    return Math.min.apply(null, candidates);
  }

  /*** ================== 起始流程（arming 鎖存） ================== ***/
  function handsClearlyDown(headY, leftY, rightY, shoulder) {
    var base =
      shoulder.lineY != null
        ? shoulder.lineY
        : headY != null
        ? headY + 80
        : window.innerHeight * 0.35;
    var downThr = base + Math.max(10, (shoulder.margin || 24) * 0.25);
    return (
      leftY != null && rightY != null && leftY > downThr && rightY > downThr
    );
  }
  function updateStartArming() {
    var headY = getHeadTopY(),
      leftY = handTopY("left"),
      rightY = handTopY("right"),
      shoulder = getShoulderInfo(headY);
    if (handsClearlyDown(headY, leftY, rightY, shoulder)) {
      if (!lowHandsStartTs) lowHandsStartTs = performance.now();
      if (
        !startArmed &&
        performance.now() - lowHandsStartTs >= ARMED_REQUIRE_LOW_MS
      )
        startArmed = true;
    } else {
      lowHandsStartTs = null;
    }
  }

  var holdStart = null;
  function updateStartRaisedHands(wantDetail) {
    var headY = getHeadTopY(),
      leftY = handTopY("left"),
      rightY = handTopY("right"),
      shoulder = getShoulderInfo(headY);
    if (
      leftY == null ||
      rightY == null ||
      (headY == null && shoulder.lineY == null)
    ) {
      holdStart = null;
      updateReadyUI(0);
      return wantDetail
        ? { progress: 0, ok: false, armed: startArmed }
        : { progress: 0, ok: false, armed: startArmed };
    }
    var thrHead = headY != null ? headY - HEAD_TOL_PX : null;
    var thrShoulder =
      (shoulder.lineY != null
        ? shoulder.lineY
        : headY != null
        ? headY + 80
        : null) - (shoulder.margin || 0);
    var okByShoulder = leftY < thrShoulder && rightY < thrShoulder;
    var okStrict =
      thrHead == null
        ? okByShoulder
        : okByShoulder && leftY < thrHead && rightY < thrHead;
    var gateOk = startArmed && okStrict;
    if (gateOk) {
      if (!holdStart) holdStart = performance.now();
    } else holdStart = null;
    var prog = holdStart
      ? Math.min(1, (performance.now() - holdStart) / HOLD_CIRCLE_MS)
      : 0;
    updateReadyUI(prog);
    return wantDetail
      ? { progress: prog, ok: gateOk, armed: startArmed }
      : { progress: prog, ok: gateOk, armed: startArmed };
  }
  function updateReadyUI(p) {
    readyRing.style.setProperty("--deg", Math.floor(p * 360) + "deg");
  }
  function updatePoseHUD(s) {
    if (!poseStatusEl) return;
    if (!s.armed)
      poseStatusEl.innerHTML = '<span class="warn">請先放下雙手</span>';
    else if (s.progress >= 1 && s.ok)
      poseStatusEl.innerHTML = '<span class="ok">觸發成功！</span>';
    else if (s.ok)
      poseStatusEl.innerHTML =
        '<span class="ok">雙手過頭，保持… ' +
        Math.round(s.progress * 100) +
        "%</span>";
    else poseStatusEl.innerHTML = '<span class="bad">請雙手高舉過頭</span>';
  }

  /*** ================== 手掌/前臂/捧碗膠囊 ================== ***/
  function dist2D(a, b) {
    var dx = a.x - b.x,
      dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function getPalmCapsules() {
    var out = [],
      hlist = getRecentHands();
    if (hlist && hlist.length) {
      for (var i = 0; i < hlist.length; i++) {
        var lm = hlist[i].landmarks || [];
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
          kind: "palm",
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
      var w2 = kp(sides[s] + "Wrist", HIT_WRIST_MIN_VIS),
        e2 = kp(sides[s] + "Elbow", HIT_ELBOW_MIN_VIS);
      if (w2 && e2) {
        var segLen = Math.hypot(w2.x - e2.x, w2.y - e2.y);
        var r2 = clamp(segLen * 0.24, 18, 48);
        out.push({
          kind: "wrist",
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
    var wl = kp("leftWrist", HIT_WRIST_MIN_VIS),
      wr = kp("rightWrist", HIT_WRIST_MIN_VIS);
    if (!(wl && wr)) return null;
    var dx = wr.x - wl.x,
      dy = wr.y - wl.y,
      d = Math.hypot(dx, dy);
    if (d < 20) return null;
    var vertTol = d * 0.2;
    if (Math.abs(dy) > vertTol) return null;
    var r = clamp(d * 0.3, 22, 86);
    return {
      kind: "bowl",
      ax: wl.x,
      ay: wl.y,
      bx: wr.x,
      by: wr.y,
      r: r,
      rDraw: r * CAPSULE_DRAW_SCALE,
      bowl: true,
    };
  }

  /*** ================== 幾何工具（碰撞） ================== ***/
  function pointSegDist2(px, py, ax, ay, bx, by) {
    var dx = bx - ax,
      dy = by - ay,
      len2 = dx * dx + dy * dy;
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
      ey = cy,
      steps = TRACE_STEPS;
    for (var t = 0; t <= steps; t++) {
      var u = t / steps,
        x = sx + (ex - sx) * u,
        y = sy + (ey - sy) * u;
      if (pointSegDist2(x, y, ax, ay, bx, by) <= Rsum * Rsum) return true;
    }
    return false;
  }
  function drawPalmGuides(ctx, alpha) {
    var capsules = getPalmCapsules(),
      bowl = getBowlCapsule();
    if (bowl) capsules.push(bowl);
    if (!capsules.length) return;
    ctx.save();
    for (var i = 0; i < capsules.length; i++) {
      var c = capsules[i],
        w = (c.rDraw || c.r) * 2;
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
    ensureLayer();
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
    var dur = (2.2 + Math.random() * 2.2).toFixed(2) + "s",
      delay = (-Math.random() * 1.8).toFixed(2) + "s";
    img.style.animationDuration = dur;
    img.style.animationDelay = delay;
    wrap.appendChild(img);
    layer.appendChild(wrap);
    var w = wrap.classList.contains("large")
      ? 96
      : wrap.classList.contains("small")
      ? 56
      : 80;
    var y = -120,
      vy =
        currentStage.VY_MIN +
        Math.random() * (currentStage.VY_MAX - currentStage.VY_MIN),
      vx = (Math.random() * 2 - 1) * currentStage.VX_RANGE;
    var radius = w * 0.5;
    var sw = window.innerWidth,
      xc;
    if (currentStage.id === 2) {
      var minGap = sw * STAGE2_MIN_X_GAP_FRAC,
        activeGap = sw * STAGE2_ACTIVE_GAP_FRAC,
        band = sw * STAGE2_EDGE_BAND_FRAC,
        ok = false,
        tries = 0;
      while (!ok && tries++ < 10) {
        xc = w / 2 + Math.random() * (sw - w);
        var gapOK = isNaN(lastSpawnCX) || Math.abs(xc - lastSpawnCX) >= minGap;
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
      if (!ok) {
        if (!isNaN(lastSpawnCX) && lastSpawnCX < sw / 2) {
          var minR = Math.max(sw - band - w / 2, w / 2),
            maxR = sw - w / 2;
          xc = minR + Math.random() * Math.max(1, maxR - minR);
        } else {
          var minL = w / 2,
            maxL = Math.min(band + w / 2, sw - w / 2);
          xc = minL + Math.random() * Math.max(1, maxL - minL);
        }
      }
    } else {
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
      stillFrames: 0,
    });
  }
  function updateSpawns(now) {
    var t = (now - stageStartTs) / currentStage.DURATION_MS;
    t = Math.max(0, Math.min(1, t));
    var rate =
      currentStage.SPAWN_BASE_PER_S +
      (currentStage.SPAWN_MAX_PER_S - currentStage.SPAWN_BASE_PER_S) *
        Math.pow(t, 0.65);
    var interval = 1000 / rate,
      active = 0;
    for (var i = 0; i < petals.length; i++) if (!petals[i].hit) active++;
    if (active < MAX_ACTIVE_PETALS && now - lastSpawnTs >= interval) {
      spawnPetal();
      lastSpawnTs = now;
    }
  }
  function updatePetals(dt) {
    var palms = getPalmCapsules(),
      bowl = getBowlCapsule();
    if (bowl) palms.push(bowl);
    for (var i = petals.length - 1; i >= 0; i--) {
      var p = petals[i];
      if (p.hit) continue;
      var f = dt / 16.67;

      if (currentStage.GRAVITY) p.vy += currentStage.GRAVITY * f;

      p.prevX = p.x;
      p.prevY = p.y;
      p.y += p.vy * f;
      p.x += p.vx * f;
      p.el.style.transform = "translate(" + p.x + "px," + p.y + "px)";

      var mv = Math.hypot(p.x - p.prevX, p.y - p.prevY);
      if (mv < 0.5) p.stillFrames++;
      else p.stillFrames = 0;
      if (p.stillFrames > 10) {
        p.vy += 1.2;
        p.vx += (Math.random() - 0.5) * 0.4;
        p.stillFrames = 0;
      }

      var cx = p.x + p.w / 2,
        cy = p.y + p.h / 2,
        prevCx = p.prevX + p.w / 2,
        prevCy = p.prevY + p.h / 2;
      var speed = Math.hypot(p.x - p.prevX, p.y - p.prevY),
        latencyPad = Math.min(
          MAX_LATENCY_PAD,
          speed * LATENCY_PAD_PER_PX_SPEED
        );
      var scored = false;
      var palmsAll = palms;
      for (var k = 0; k < palmsAll.length; k++) {
        var C = palmsAll[k];
        var effR = C.r * PALM_HIT_SCALE + latencyPad;
        if (C.kind === "wrist") effR *= WRIST_ONLY_HIT_BOOST;
        if (C.kind === "bowl") effR *= BOWL_HIT_BOOST;
        var Rsum = p.radius * PETAL_HIT_SCALE + effR;
        if (
          circleCapsuleHit(cx, cy, prevCx, prevCy, C.ax, C.ay, C.bx, C.by, Rsum)
        ) {
          onHit(p, i, cx, cy);
          scored = true;
          break;
        }
        if (!scored) {
          var nearPad = 8;
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
    playHitSound();
    createScoreFx(cx, cy);
    setTimeout(function () {
      p.el.remove();
      petals.splice(idx, 1);
    }, 220);
  }
  function createScoreFx(x, y) {
    ensureLayer();
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
  function seedPetals(n) {
    for (var i = 0; i < n; i++) spawnPetal();
    lastSpawnTs = performance.now();
  }

  function startStage1() {
    ensureLayer();
    currentStage = STAGE1;
    gameState = "playing";
    stageStartTs = performance.now();
    lastSpawnTs = 0;
    lastFrameTs = 0;
    lastSpawnCX = NaN;
    score = 0;
    scoreEl.textContent = "0";
    stage1CountdownActive = false;
    readyWrap && (readyWrap.style.display = "none");
    msgEl && (msgEl.style.display = "none");
    statusEl &&
      (statusEl.textContent = "狀態：" + currentStage.name + "（手掌接櫻花）");
    clearPetals();
    fxLayer && (fxLayer.innerHTML = "");

    // ★ 開始時關掉 debug 並清除殘影
    if (debugOn) {
      debugOn = false;
      dbgCanvas.style.display = "none";
      var c = dbgCanvas.getContext("2d");
      c.clearRect(0, 0, dbgCanvas.width, dbgCanvas.height);
    }

    // 解鎖觸發狀態
    startArmed = false;
    lowHandsStartTs = null;
    holdStart = null;

    // ★ 種子花瓣（立即可見）
    seedPetals(2);
  }
  function showStage1Countdown(leftMs) {
    var sec = Math.max(1, Math.ceil(leftMs / 1000));
    msgEl.style.display = "block";
    msgEl.innerHTML =
      '<div style="font-size:64px;font-weight:900;line-height:1;margin-bottom:6px;">' +
      sec +
      "</div><div>即將進入 <b>LEVEL 2</b></div>";
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
    statusEl && (statusEl.textContent = "狀態：準備 " + currentStage.name);
    setTimeout(startStage2, STAGE2_PREP_MS);
  }
  function startStage2() {
    msgEl.style.display = "none";
    gameState = "playing_stage2";
    stageStartTs = performance.now();
    lastSpawnTs = 0;
    lastFrameTs = 0;
    lastSpawnCX = NaN;
    statusEl &&
      (statusEl.textContent =
        "狀態：" + currentStage.name + "（更快！遠距掉落）");
    clearPetals();
    fxLayer && (fxLayer.innerHTML = "");

    // ★ 種子花瓣（L2 立即更有感）
    seedPetals(2);
  }
  function endGame() {
    gameState = "gameover";
    statusEl && (statusEl.textContent = "狀態：結束");
    msgEl.style.background = "transparent";
    msgEl.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;gap:12px"><img src="good.gif" alt="Good!" style="max-width:32vw;max-height:32vh"/><div style="font-size:28px;font-weight:800">總分：<span>' +
      score +
      "</span></div></div>";
    msgEl.style.display = "block";
    readyWrap && (readyWrap.style.display = "none");
    clearPetals();
    setTimeout(resetToWaiting, GOOD_GIF_MS);
  }
  function resetToWaiting() {
    score = 0;
    scoreEl.textContent = "0";
    timeEl && (timeEl.textContent = (STAGE1.DURATION_MS / 1000).toFixed(1));
    currentStage = STAGE1;
    gameState = "waiting";
    msgEl && (msgEl.style.display = "none");
    readyWrap && (readyWrap.style.display = "block");
    fxLayer && (fxLayer.innerHTML = "");
    clearPetals();
    startArmed = false;
    lowHandsStartTs = null;
    holdStart = null;
  }
  function updateGame(now, dt) {
    var leftMs = Math.max(0, currentStage.DURATION_MS - (now - stageStartTs));
    timeEl && (timeEl.textContent = (leftMs / 1000).toFixed(1));
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

  /*** ================== p5 draw loop ================== ***/
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

    if (!posePix) {
      if (gameState === "waiting") {
        updateReadyUI(0);
        if (debugOn) drawDebug();
        return;
      }
      // 遊戲中：就算 Pose 暫失也照樣更新
    }

    if (gameState === "waiting") {
      updateStartArming();
      var s = updateStartRaisedHands(true);
      updatePoseHUD(s);
      if (s.progress >= 1 && s.ok) startStage1();
    } else if (gameState === "playing" || gameState === "playing_stage2") {
      updateGame(now, dt);
    } else if (gameState === "prep_stage2") {
      timeEl && (timeEl.textContent = (STAGE2.DURATION_MS / 1000).toFixed(1));
    }

    if (debugOn) drawDebug();
  }
  window.draw = draw;

  /*** ================== 除錯（D鍵） ================== ***/
  function drawDebug() {
    var ctx = dbgCanvas.getContext("2d");
    ctx.clearRect(0, 0, dbgCanvas.width, dbgCanvas.height);
    var parts = [
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
    for (var i = 0; i < parts.length; i++) {
      var r = rawKP(parts[i], MIN_POSE_VIS);
      if (r) {
        var s = toScreen(r.x, r.y);
        map[parts[i]] = s;
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

    var headY = getHeadTopY(),
      sh = getShoulderInfo(headY),
      thrHead = headY != null ? headY - HEAD_TOL_PX : null,
      thrShoulder =
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

    var caps = getPalmCapsules(),
      bowl = getBowlCapsule();
    if (bowl) caps.push(bowl);
    for (var j = 0; j < caps.length; j++) {
      var c = caps[j],
        eff =
          c.r *
          PALM_HIT_SCALE *
          (c.kind === "wrist"
            ? WRIST_ONLY_HIT_BOOST
            : c.kind === "bowl"
            ? BOWL_HIT_BOOST
            : 1);
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

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "16px sans-serif";
    var handsNow = getRecentHands();
    ctx.fillText("hands:" + (handsNow ? handsNow.length : 0), 12, 24);
  }
})();
