const webUrl = 'ws://localhost:3001';
const STREAM_ADDRESS = 'http://localhost:3000/recordings/combined.m3u8';
                  //jako IP by mělo byt IP auth serveru a jako port, port auth serveru
                  //dava mi to tak smysl bo to pouziva stejny port
                  //mozna kecam samozrejme ja nevim, ale toto je stejne jak co si deployoval ve čtvrtek



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

//const token_node = localStorage.getItem("clientToken");
//fetch(`ws:http://localhost:3001/api?clientToken=${token_node}`);       //posila clientToken na node js server
                                                                        //neposia ani posilat nebude



async function init() {


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
  mediaRecorder.start(50); 
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

  /*const socket = new WebSocket("ws://localhost:3001");

  socket.addEventListener("open", () => {
    const token_node = localStorage.getItem("clientToken");
    socket.send(JSON.stringify({ type: "auth", token_node }));
  });*/


  if (looggedIn) {
    ws = new WebSocket('' + webUrl + '?token=' + clientToken);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      const token_node = localStorage.getItem("clientToken");
      ws.send(JSON.stringify({ type: "auth", token_node }));

      mediaRecorder = new MediaRecorder(localStream, { mimeType: 'video/webm; codecs=vp8' });

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data); // odeslat chunk na server
        }
      };
      startRecording();
    };
  }
  else {
    window.location.href = 'home.html'; 
  }
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



document.addEventListener('DOMContentLoaded', function() {
console.log('Initializing video player...');

var player = videojs('hlsPlayer', {
  autoplay: true,
  controls: true,
  liveui: true
});

player.src({
  src: STREAM_ADDRESS,
  type: 'application/x-mpegURL'
});

// Refresh button handler
document.getElementById('refresh-player-button').addEventListener('click', function() {
  console.log('Manually refreshing player...');
  player.src({
      src: STREAM_ADDRESS + '?t=' + Date.now(),
      type: 'application/x-mpegURL'
  });
  player.load();
});

// Refresh player every 2 seconds on error (stream stopped)
player.on('error', function() {
  console.log('Stream error, will retry...');
  setTimeout(function() {
      player.src({
          src: STREAM_ADDRESS + '?t=' + Date.now(),
          type: 'application/x-mpegURL'
      });
      player.load();
  }, 2000);
});
});

init();
