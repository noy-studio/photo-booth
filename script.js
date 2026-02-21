const preview = document.getElementById("preview");
const countdownEl = document.getElementById("countdown");
const statusEl = document.getElementById("status");
const startCameraBtn = document.getElementById("startCameraBtn");
const startSessionBtn = document.getElementById("startSessionBtn");
const retakeBtn = document.getElementById("retakeBtn");
const downloadBtn = document.getElementById("downloadBtn");
const boardEl = document.getElementById("filmBoard");
const canvas = document.getElementById("captureCanvas");

let stream;
let capturedImages = [];
let isShooting = false;

const SLOT_COUNT = 9;

const setStatus = (message) => {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1080 }, height: { ideal: 1440 } },
      audio: false,
    });

    preview.srcObject = stream;
    startCameraBtn.disabled = true;
    startSessionBtn.disabled = false;
    retakeBtn.disabled = capturedImages.length === 0;
    setStatus("Camera is ready! Press Start 9 Shots.");
  } catch (error) {
    setStatus("Camera access failed. Please check browser permissions.");
    console.error(error);
  }
}

function refreshButtons() {
  retakeBtn.disabled = isShooting || capturedImages.length === 0;
  downloadBtn.disabled = capturedImages.length !== SLOT_COUNT;
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

function captureCurrentFrame() {
  const { videoWidth: width, videoHeight: height } = preview;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.filter = "grayscale(1) contrast(1.12)";
  ctx.drawImage(preview, 0, 0, width, height);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.95);
}

function resetBoard() {
  capturedImages = [];
  boardEl.querySelectorAll(".frame-slot").forEach((slot, index) => {
    slot.innerHTML = String(index + 1);
  });
  refreshButtons();
}

function undoLastShot() {
  if (isShooting || capturedImages.length === 0) {
    return;
  }

  const removedIndex = capturedImages.length - 1;
  capturedImages.pop();
  updateSlot(removedIndex, null);
  setStatus(`Shot ${removedIndex + 1} removed. You can continue shooting.`);
  refreshButtons();
  startSessionBtn.disabled = !stream;
}

async function runNineCutSession() {
  if (!stream || isShooting) {
    return;
  }

  isShooting = true;
  startSessionBtn.disabled = true;
  refreshButtons();

  for (let i = capturedImages.length; i < SLOT_COUNT; i += 1) {
    setStatus(`${i + 1} / 9 get ready...`);

    for (let sec = 3; sec > 0; sec -= 1) {
      countdownEl.textContent = sec;
      countdownEl.classList.remove("hidden");
      await wait(1000);
    }

    countdownEl.classList.add("hidden");
    const shot = captureCurrentFrame();
    capturedImages[i] = shot;
    updateSlot(i, shot);
    setStatus(`${i + 1} / 9 captured`);
    await wait(250);
  }

  setStatus("All 9 shots captured! Press Save Result.");
  isShooting = false;
  startSessionBtn.disabled = false;
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
        ctx.drawImage(image, x + 10, y + 10, slotW - 20, slotH - 20);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 8;
        ctx.strokeRect(x + 2, y + 2, slotW - 4, slotH - 4);
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
startCameraBtn.addEventListener("click", startCamera);
startSessionBtn.addEventListener("click", runNineCutSession);
retakeBtn.addEventListener("click", undoLastShot);
downloadBtn.addEventListener("click", downloadResult);
