const loginView = document.getElementById("loginView");
const scanView = document.getElementById("scanView");
const passView = document.getElementById("passView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutButton = document.getElementById("logout");
const startScanButton = document.getElementById("startScan");
const stopScanButton = document.getElementById("stopScan");
const manualSerial = document.getElementById("manualSerial");
const lookupManual = document.getElementById("lookupManual");
const video = document.getElementById("video");
const addVisit = document.getElementById("addVisit");
const redeem = document.getElementById("redeem");
const backToScan = document.getElementById("backToScan");

const serialValue = document.getElementById("serialValue");
const visitsValue = document.getElementById("visitsValue");
const statusValue = document.getElementById("statusValue");
const updatedValue = document.getElementById("updatedValue");

let currentSerial = null;
let mediaStream = null;
let scanInterval = null;

function show(view) {
  [loginView, scanView, passView].forEach((panel) => panel.classList.add("hidden"));
  view.classList.remove("hidden");
}

async function login(email, password) {
  const response = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const formData = new FormData(loginForm);

  try {
    await login(formData.get("email"), formData.get("password"));
    loginForm.reset();
    logoutButton.classList.remove("hidden");
    show(scanView);
  } catch (err) {
    loginError.textContent = "Login failed";
  }
});

logoutButton.addEventListener("click", async () => {
  await fetch("/auth/logout", { method: "POST" });
  logoutButton.classList.add("hidden");
  show(loginView);
});

async function lookupPass(serial) {
  const response = await fetch(`/passes/${encodeURIComponent(serial)}`);
  if (!response.ok) {
    alert("Pass not found");
    return;
  }

  const data = await response.json();
  currentSerial = data.serialNumber;
  serialValue.textContent = data.serialNumber;
  visitsValue.textContent = data.visits;
  statusValue.textContent = data.status;
  updatedValue.textContent = new Date(data.updatedAt).toLocaleString();
  show(passView);
}

lookupManual.addEventListener("click", () => {
  const serial = manualSerial.value.trim();
  if (serial) {
    lookupPass(serial);
  }
});

async function startScan() {
  if (!("BarcodeDetector" in window)) {
    alert("Barcode scanner not supported. Use manual entry.");
    return;
  }

  const detector = new BarcodeDetector({ formats: ["qr_code"] });

  mediaStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
  });
  video.srcObject = mediaStream;
  await video.play();

  scanInterval = setInterval(async () => {
    try {
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0) {
        const serial = barcodes[0].rawValue;
        stopScan();
        lookupPass(serial);
      }
    } catch (err) {
      console.error(err);
    }
  }, 500);
}

function stopScan() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  video.srcObject = null;
}

startScanButton.addEventListener("click", () => {
  startScan().catch((err) => {
    console.error(err);
    alert("Unable to access camera");
  });
});

stopScanButton.addEventListener("click", stopScan);

addVisit.addEventListener("click", async () => {
  if (!currentSerial) return;
  const response = await fetch(`/passes/${currentSerial}/add_visit`, {
    method: "POST"
  });
  if (response.ok) {
    lookupPass(currentSerial);
  }
});

redeem.addEventListener("click", async () => {
  if (!currentSerial) return;
  const response = await fetch(`/passes/${currentSerial}/redeem`, {
    method: "POST"
  });
  if (response.ok) {
    lookupPass(currentSerial);
  }
});

backToScan.addEventListener("click", () => {
  currentSerial = null;
  show(scanView);
});

show(loginView);
