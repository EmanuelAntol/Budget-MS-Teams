const video = document.getElementById('localVideo');
const startBtn = document.getElementById('join-button');
const stopBtn = document.getElementById('quit-button');



var mediaRecorder; // MediaRecorder instance
var localStream; // Media stream z kamery
var ws; // Spojeni s WebSocket serverem

async function init() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  video.srcObject = localStream;


  // Nastavit velikost canvasů podle velikosti videa
  video.onloadedmetadata = () => {
    canvasVideo.width = video.videoWidth;
    canvasVideo.height = video.videoHeight;
  };

}








function startRecording() {
  mediaRecorder.start(200); // parametr určuje velikost chunku v ms

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

init();
