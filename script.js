const preview = document.getElementById("preview");
const countdownEl = document.getElementById("countdown");
const statusEl = document.getElementById("status");
const startCameraBtn = document.getElementById("startCameraBtn");
const startSessionBtn = document.getElementById("startSessionBtn");
const retakeBtn = document.getElementById("retakeBtn");
const downloadBtn = document.getElementById("downloadBtn");
const stripEl = document.getElementById("photoStrip");
const canvas = document.getElementById("captureCanvas");

let stream;
let capturedImages = [];
let isShooting = false;

const setStatus = (message) => {
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
    setStatus("카메라 준비 완료! 4컷 촬영 시작 버튼을 눌러주세요.");
    startSessionBtn.disabled = false;
    startCameraBtn.disabled = true;
  } catch (error) {
    setStatus("카메라 접근에 실패했습니다. 브라우저 권한을 확인해주세요.");
    console.error(error);
  }
}

function clearStrip() {
  capturedImages = [];
  stripEl.querySelectorAll(".slot").forEach((slot, index) => {
    slot.innerHTML = String(index + 1);
  });
  downloadBtn.disabled = true;
}

function showImageAtSlot(index, dataUrl) {
  const slot = stripEl.querySelector(`.slot[data-index="${index}"]`);
  const img = new Image();
  img.src = dataUrl;
  img.alt = `${index + 1}번째 촬영 사진`;
  slot.innerHTML = "";
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
  ctx.drawImage(preview, 0, 0, width, height);
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.95);
}

async function runFourCutSession() {
  if (!stream || isShooting) {
    return;
  }

  isShooting = true;
  clearStrip();
  startSessionBtn.disabled = true;
  retakeBtn.disabled = true;

  for (let i = 0; i < 4; i += 1) {
    setStatus(`${i + 1}번째 촬영 준비...`);

    for (let sec = 3; sec > 0; sec -= 1) {
      countdownEl.textContent = sec;
      countdownEl.classList.remove("hidden");
      await wait(1000);
    }

    countdownEl.classList.add("hidden");
    const shot = captureCurrentFrame();
    capturedImages.push(shot);
    showImageAtSlot(i, shot);
    setStatus(`${i + 1}번째 촬영 완료!`);
    await wait(500);
  }

  setStatus("촬영 완료! 결과 저장 버튼으로 인생네컷을 저장하세요.");
  downloadBtn.disabled = false;
  retakeBtn.disabled = false;
  startSessionBtn.disabled = false;
  isShooting = false;
}

function downloadStrip() {
  if (capturedImages.length !== 4) {
    return;
  }

  const stripCanvas = document.createElement("canvas");
  const width = 900;
  const padding = 40;
  const slotHeight = 1000;
  const headerHeight = 110;
  const footerHeight = 110;
  const height = headerHeight + footerHeight + slotHeight * 4 + padding * 5;

  stripCanvas.width = width;
  stripCanvas.height = height;

  const ctx = stripCanvas.getContext("2d");
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#202020";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PHOTO BOOTH", width / 2, 74);

  const drawPromises = capturedImages.map(
    (src) =>
      new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = src;
      }),
  );

  Promise.all(drawPromises).then((images) => {
    images.forEach((img, index) => {
      const y = headerHeight + padding + index * (slotHeight + padding);
      ctx.drawImage(img, padding, y, width - padding * 2, slotHeight);
    });

    ctx.fillStyle = "#202020";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(new Date().toLocaleDateString("ko-KR"), width / 2, height - 42);

    const link = document.createElement("a");
    link.href = stripCanvas.toDataURL("image/jpeg", 0.95);
    link.download = `photo-booth-${Date.now()}.jpg`;
    link.click();
  });
}

startCameraBtn.addEventListener("click", startCamera);
startSessionBtn.addEventListener("click", runFourCutSession);
retakeBtn.addEventListener("click", () => {
  clearStrip();
  setStatus("다시 찍기를 준비했어요. 4컷 촬영 시작을 눌러주세요.");
  retakeBtn.disabled = true;
});
downloadBtn.addEventListener("click", downloadStrip);
