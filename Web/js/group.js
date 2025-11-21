const webUrl = 'ws://localhost:3000';


const video = document.getElementById('localVideo');
const startBtn = document.getElementById('join-button');
const stopBtn = document.getElementById('quit-button');
var clientToken = localStorage.getItem('clientToken');
var looggedIn = Boolean(localStorage.getItem('loggedIn'));
var mediaRecorder; // MediaRecorder instance
var localStream; // Media stream z kamery
var ws; // Spojeni s WebSocket serverem
var videoOn = true;
var audioOn = true;

async function init() {
    if (!looggedIn) {
        window.location.href = 'home.html';
    }


    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = localStream;


    video.onloadedmetadata = () => {
    canvasVideo.width = video.videoWidth;
    canvasVideo.height = video.videoHeight;
  };


}


function startRecording() {
  mediaRecorder.start(200); 
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

  ws = new WebSocket('' + webUrl + '?token=' + clientToken);
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
