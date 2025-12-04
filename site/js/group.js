const webUrl = 'ws://localhost:3001';

const STREAM_ADDRESS = 'http://localhost:3000/recordings/combined.m3u8';

const STREAM_ADDRESS_QUALITY = 'http://localhost:3000/recordings';
                                //hihi dalsi konstanta  (since qualities are stored in separate folders, it need to have the path to the folder, not to the stream)
                                //but STREAM_ADDRESS is still important for AUTO quality selection

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
          ws.send(e.data); // send chunk to server
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
                autoplay: false,
                preload: 'auto',
                controls: true,
                liveui: false,
                html5: {
                    vhs: {
                        overrideNative: true,
                        smoothQualityChange: true
                    }
                }
            });
            
            player.src({
                src: STREAM_ADDRESS,
                type: 'application/x-mpegURL'
            });
            
            //quality handler
            var qualitySelector = document.getElementById('quality-selector');
            qualitySelector.addEventListener('change', function() {
                var selectedQuality = this.value;
                console.log('Quality selected:', selectedQuality);
                
                if (selectedQuality === 'auto') {
                    player.src({
                        src: STREAM_ADDRESS,
                        type: 'application/x-mpegURL'
                    });
                    player.load();
                } else {
                    var qualityUrl = `${STREAM_ADDRESS_QUALITY}/stream_` + selectedQuality + '/playlist.m3u8';
                    player.src({
                        src: qualityUrl,
                        type: 'application/x-mpegURL'
                    });
                    player.load();
                }
            });
            
            //this is for the blue refresh button (refreshes only the player when clicked)
            document.getElementById('refresh-player-button').addEventListener('click', function() {
                console.log('Manually refreshing player...');
                var currentQuality = qualitySelector.value;
                
                if (currentQuality === 'auto') {
                    player.src({
                        src: STREAM_ADDRESS + '?t=' + Date.now(),
                        type: 'application/x-mpegURL'
                    });
                } else {
                    var qualityUrl = `${STREAM_ADDRESS_QUALITY}/stream_` + currentQuality + '/playlist.m3u8?t=' + Date.now();
                    player.src({
                        src: qualityUrl,
                        type: 'application/x-mpegURL'
                    });
                }
                player.load();
            });
            
            var retryInterval = null;
            var lastSuccessTime = Date.now();
            var isPlaying = false;
            
            function startRetryInterval() {             //periodically checks is stream is playing, when it is not, it refreshes the hlsPlayer
                if (retryInterval) return;
                
                console.log('Starting continuous stream check...');
                retryInterval = setInterval(function() {
                    var currentTime = Date.now();
                    
                    if (!isPlaying || (currentTime - lastSuccessTime) > 5000) {
                        console.log('Refreshing stream...');
                        var currentQuality = qualitySelector.value;
                        
                        if (currentQuality === 'auto') {
                            player.src({
                                src: STREAM_ADDRESS + '?t=' + Date.now(),
                                type: 'application/x-mpegURL'
                            });
                        } else {
                            var qualityUrl = `${STREAM_ADDRESS_QUALITY}/stream_` + currentQuality + '/playlist.m3u8?t=' + Date.now();
                            player.src({
                                src: qualityUrl,
                                type: 'application/x-mpegURL'
                            });
                        }
                        player.load();
                    }
                }, 2000);
            }
            
            player.on('playing', function() {       //checks if stream is playing correctly
                console.log('Stream is playing!');
                isPlaying = true;
                lastSuccessTime = Date.now();
            });
            
            player.on('timeupdate', function() {
                lastSuccessTime = Date.now();
            });
            
            player.on('waiting', function() {
                console.log('Stream buffering/waiting...');
                isPlaying = false;
            });
            
            player.on('stalled', function() {
                console.log('Stream stalled...');
                isPlaying = false;
            });
            
            player.on('error', function() {
                console.log('Stream error detected...');
                isPlaying = false;
            });
            
            player.on('pause', function() {
                if (!player.userActive()) {
                    isPlaying = false;
                }
            });
            
            player.on('ended', function() {
                console.log('Stream ended...');
                isPlaying = false;
            });
            
            startRetryInterval();
        });

init();
