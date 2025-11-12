const video = document.getElementById('localVideo');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const grayscaleSwitch = document.getElementById('grayscaleSwitch');

// Face detection - canvas overlay
const canvasOverlay = document.getElementById('overlay');
const ctx = canvasOverlay.getContext('2d');

// Uprava videa - canvas
const canvasVideo = document.getElementById('modifiedVideo');
const ctxVideo = canvasVideo.getContext('2d');
const outputStream = canvasVideo.captureStream(30); // 30 snímků/s

var grayScaleEnabled = false;

var mediaRecorder; // MediaRecorder instance
var localStream; // Media stream z kamery

var ws; // Spojeni s WebSocket serverem

async function init() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = localStream;


  // Nastavit velikost canvasů podle velikosti videa
  video.onloadedmetadata = () => {
    canvasVideo.width = video.videoWidth;
    canvasVideo.height = video.videoHeight;

    canvasOverlay.width = video.videoWidth;
    canvasOverlay.height = video.videoHeight;
  };

  await
  faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  await
  faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');

  detectFaces();
}


async function detectFaces() {
  const options = new faceapi.TinyFaceDetectorOptions();

  const detections = await faceapi.detectAllFaces(video, options)
    .withFaceExpressions();

  // Vyčistit canvas
  ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);

  detections.forEach(d => {
  console.log(d.expressions);
  // vykreslení rámečku
    const { x, y, width, height } = d.detection.box;
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
  // vykreslení výrazu obličeje
  const expressions = d.expressions;
  if (expressions.happy > 0.6) {
    ctx.fillStyle = 'green';
    ctx.font = '20px Arial';
    ctx.fillText('SMILE', x, y - 10);
  }
  });

  console.log(detections);
  ctxVideo.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
  if (grayScaleEnabled){


  const frame = ctxVideo.getImageData(0, 0, canvasVideo.width, canvasVideo.height);
  const data = frame.data;
  for (let i = 0; i < data.length; i += 4) {
  const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
  data[i] = data[i + 1] = data[i + 2] = avg;
  }
  ctxVideo.putImageData(frame, 0, 0);
  }
  requestAnimationFrame(detectFaces);
}

function processVideoCanvas() {
  ctxVideo.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
  const frame = ctxVideo.getImageData(0, 0, canvasVideo.width, canvasVideo.height);
  const data = frame.data;
  for (let i = 0; i < data.length; i += 4) {
  const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
  data[i] = data[i + 1] = data[i + 2] = avg;
  }
  ctxVideo.putImageData(frame, 0, 0);
  requestAnimationFrame(processVideoCanvas);
}



function startRecording() {
  mediaRecorder.start(200); // parametr určuje velikost chunku v ms
  console.log('Recording started');

  startBtn.disabled = true;
  stopBtn.disabled = false;
}


function stopRecording() {
  mediaRecorder.stop();
  ws.close();
  startBtn.disabled = false;
  stopBtn.disabled = true;
  console.log('Recording stopped');
}

startBtn.addEventListener('click', () => {
  // Výpočet identifikátoru klienta
  const clientId = 'user' + Math.floor(Math.random() * 1000);
  document.getElementById('clientIdSpan').innerText = clientId;


  ws = new WebSocket('ws://localhost:3000?clientId=' + clientId);
  ws.binaryType = 'arraybuffer';
  ws.onopen = () => {
  mediaRecorder = new MediaRecorder(outputStream, { mimeType: 'video/webm; codecs=vp8' });
  
  mediaRecorder.ondataavailable = e => {
  if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
  ws.send(e.data); // odeslat chunk na server
  }
  };
  startRecording();
  };
});

stopBtn.addEventListener('click', () => {
  stopRecording();
  ws.close();
});

grayscaleSwitch.addEventListener('change', () => {
  if (grayscaleSwitch.checked) {
    grayScaleEnabled = true;
  }
  else {
    grayScaleEnabled = false;
  }

});

init();
