const preview = document.getElementById("preview");
const countdownEl = document.getElementById("countdown");
const countdownNumberEl = document.getElementById("countdownNumber");
const statusEl = document.getElementById("status");
const startCameraBtn = document.getElementById("startCameraBtn");
const startSessionBtn = document.getElementById("startSessionBtn");
const pauseBtn = document.getElementById("pauseBtn");
const retakeBtn = document.getElementById("retakeBtn");
const downloadBtn = document.getElementById("downloadBtn");
const boardEl = document.getElementById("filmBoard");
const canvas = document.getElementById("captureCanvas");

let stream;
let capturedImages = [];
let isShooting = false;
let isPaused = false;

const SLOT_COUNT = 9;

const setStatus = (message) => {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function forceGrayscale(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawImageCover(ctx, image, x, y, targetW, targetH) {
  const sourceW = image.naturalWidth || image.videoWidth || image.width;
  const sourceH = image.naturalHeight || image.videoHeight || image.height;

  if (!sourceW || !sourceH) {
    return;
  }

  const scale = Math.max(targetW / sourceW, targetH / sourceH);
  const drawW = sourceW * scale;
  const drawH = sourceH * scale;
  const drawX = x + (targetW - drawW) / 2;
  const drawY = y + (targetH - drawH) / 2;

  ctx.drawImage(image, drawX, drawY, drawW, drawH);
}

function drawFilmEdgeText(ctx, x, y, slotW, slotH, frameBorder) {
  const label = "MONO FILM 2603";
  ctx.save();
  ctx.fillStyle = "#d4bb7d";
  ctx.font = "700 24px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const leftX = x + frameBorder * 0.5;
  const rightX = x + slotW - frameBorder * 0.5;
  const centerY = y + slotH * 0.5;

  ctx.save();
  ctx.translate(leftX, centerY);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(label, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(rightX, centerY);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(label, 0, 0);
  ctx.restore();

  ctx.restore();
}

function refreshButtons() {
  retakeBtn.disabled = isShooting || capturedImages.length === 0;
  downloadBtn.disabled = capturedImages.length !== SLOT_COUNT;
  pauseBtn.disabled = !isShooting || countdownEl.classList.contains("hidden");
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
}

function updateSlot(index, dataUrl) {
  const slot = boardEl.querySelector(`.frame-slot[data-index="${index}"]`);
  slot.innerHTML = "";

  if (!dataUrl) {
    slot.textContent = String(index + 1);
    return;
  }

  const img = new Image();
  img.src = dataUrl;
  img.alt = `${index + 1} shot`;
  slot.append(img);
}

function showLivePreview(index) {
  const slot = boardEl.querySelector(`.frame-slot[data-index="${index}"]`);
  slot.innerHTML = "";

  const live = document.createElement("video");
  live.className = "live-preview";
  live.autoplay = true;
  live.muted = true;
  live.playsInline = true;
  live.srcObject = stream;
  slot.append(live);
}

function captureCurrentFrame() {
  const { videoWidth: width, videoHeight: height } = preview;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(preview, 0, 0, width, height);
  ctx.restore();

  forceGrayscale(ctx, width, height);

  return canvas.toDataURL("image/jpeg", 0.95);
}

async function waitIfPaused() {
  while (isPaused) {
    setStatus("Paused. Press Resume to continue.");
    await wait(200);
  }
}

function resetBoard() {
  capturedImages = [];
  boardEl.querySelectorAll(".frame-slot").forEach((slot, index) => {
    slot.innerHTML = String(index + 1);
  });
  refreshButtons();
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1080 }, height: { ideal: 1440 } },
      audio: false,
    });

    preview.srcObject = stream;
    startCameraBtn.disabled = true;
    startSessionBtn.disabled = false;
    setStatus("Camera is ready! Press Start 9 Shots.");
    refreshButtons();
  } catch (error) {
    setStatus("Camera access failed. Please check browser permissions.");
    console.error(error);
  }
}

function undoLastShot() {
  if (isShooting || capturedImages.length === 0) {
    return;
  }

  const removedIndex = capturedImages.length - 1;
  capturedImages.pop();
  updateSlot(removedIndex, null);
  setStatus(`Shot ${removedIndex + 1} removed. You can continue shooting.`);
  startSessionBtn.disabled = !stream;
  refreshButtons();
}

function togglePause() {
  if (!isShooting || countdownEl.classList.contains("hidden")) {
    return;
  }
  isPaused = !isPaused;
  setStatus(isPaused ? "Paused. Press Resume to continue." : "Resumed.");
  refreshButtons();
}

async function runNineCutSession() {
  if (!stream || isShooting) {
    return;
  }

  isShooting = true;
  isPaused = false;
  startSessionBtn.disabled = true;
  refreshButtons();

  for (let i = capturedImages.length; i < SLOT_COUNT; i += 1) {
    showLivePreview(i);
    setStatus(`${i + 1} / 9 get ready...`);

    countdownEl.classList.remove("hidden");
    refreshButtons();

    for (let sec = 3; sec > 0; sec -= 1) {
      await waitIfPaused();
      countdownNumberEl.textContent = sec;
      await wait(1000);
    }

    countdownEl.classList.add("hidden");
    refreshButtons();
    await waitIfPaused();

    const shot = captureCurrentFrame();
    capturedImages[i] = shot;
    updateSlot(i, shot);
    setStatus(`${i + 1} / 9 captured`);
    await wait(250);
  }

  isShooting = false;
  isPaused = false;
  startSessionBtn.disabled = false;
  setStatus("All 9 shots captured! Press Save Result.");
  refreshButtons();
}

function buildNineCutBlob() {
  return new Promise((resolve) => {
    if (capturedImages.length !== SLOT_COUNT) {
      resolve(null);
      return;
    }

    const out = document.createElement("canvas");
    const width = 1200;
    const margin = 30;
    const gap = 24;
    const slotW = Math.floor((width - margin * 2 - gap * 2) / 3);
    const slotH = Math.floor((slotW * 4) / 3);
    const frameBorder = 10;
    const innerGap = 10;
    const height = margin * 2 + slotH * 3 + gap * 2;

    out.width = width;
    out.height = height;

    const ctx = out.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    const drawPromises = capturedImages.map(
      (src) =>
        new Promise((imgResolve) => {
          const image = new Image();
          image.onload = () => imgResolve(image);
          image.src = src;
        }),
    );

    Promise.all(drawPromises).then((images) => {
      images.forEach((image, idx) => {
        const row = Math.floor(idx / 3);
        const col = idx % 3;
        const x = margin + col * (slotW + gap);
        const y = margin + row * (slotH + gap);

        ctx.fillStyle = "#f2f2f2";
        ctx.fillRect(x, y, slotW, slotH);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + innerGap, y + innerGap, slotW - innerGap * 2, slotH - innerGap * 2);
        ctx.clip();
        drawImageCover(ctx, image, x + innerGap, y + innerGap, slotW - innerGap * 2, slotH - innerGap * 2);
        ctx.restore();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = frameBorder;
        ctx.strokeRect(x + frameBorder * 0.5, y + frameBorder * 0.5, slotW - frameBorder, slotH - frameBorder);
        drawFilmEdgeText(ctx, x, y, slotW, slotH, frameBorder);
      });

      out.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
    });
  });
}

function triggerDownload(blob) {
  const filename = `nine-cut-${Date.now()}.jpg`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function downloadResult() {
  const blob = await buildNineCutBlob();
  if (!blob) {
    return;
  }

  const file = new File([blob], `nine-cut-${Date.now()}.jpg`, { type: "image/jpeg" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Film Photo Booth" });
      setStatus("In the share sheet, choose Save Image to store it in your gallery.");
      return;
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error(error);
      }
    }
  }

  triggerDownload(blob);
  setStatus("File download has started.");
}

resetBoard();
setStatus("Please press Start Camera to get ready.");
startCameraBtn.addEventListener("click", startCamera);
startSessionBtn.addEventListener("click", runNineCutSession);
pauseBtn.addEventListener("click", togglePause);
retakeBtn.addEventListener("click", undoLastShot);
downloadBtn.addEventListener("click", downloadResult);
