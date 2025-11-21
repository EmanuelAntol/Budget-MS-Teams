const webUrl = 'ws://localhost:3000';



const dummyImage = document.getElementById('dummyImage');
const micButton = document.getElementById('mic-button');
const videoButton = document.getElementById('camera-button');
const video = document.getElementById('localVideo');
const startBtn = document.getElementById('join-button');
const stopBtn = document.getElementById('quit-button');
var clientToken = localStorage.getItem('clientToken');
var looggedIn = Boolean(localStorage.getItem('loggedIn'));
var mediaRecorder;
var localStream; 
var ws; 
var videoOn = true;
var audioOn = true;

async function init() {
    if (!looggedIn) {
        window.location.href = 'home.html';
    }


    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            console.log('Permission denied by user');
        } else {
            console.log('Error accessing media devices: ' + err.message);
        }
        return;
    }
    video.srcObject = localStream;


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
  mediaRecorder = new MediaRecorder(localStream, { mimeType: 'video/webm; codecs=vp8' });
  
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

micButton.addEventListener('click', () => {
  audioOn = !audioOn;
  localStream.getAudioTracks()[0].enabled = audioOn;
  if (audioOn) {
    micButton.classList.remove('btn-danger');
    micButton.classList.add('btn-success');
  } else {
    micButton.classList.remove('btn-success');
    micButton.classList.add('btn-danger');
  }
});

videoButton.addEventListener('click', () => {
  videoOn = !videoOn;
  localStream.getVideoTracks()[0].enabled = videoOn;
    if (videoOn) {
    videoButton.classList.remove('btn-danger');
    videoButton.classList.add('btn-success');
    video.srcObject = localStream;
    video.style.display = "block";
    dummyImage.style.display = "none";
  } else {
    videoButton.classList.remove('btn-success');
    videoButton.classList.add('btn-danger');
    video.style.display = "none";
    dummyImage.style.display = "block";
  }
});

init();
