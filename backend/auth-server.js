import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';

import { WebSocketServer } from 'ws';
import { URL } from 'url';
import { spawn } from 'child_process';

const app = express();

const AUTH_PORT = 3000;
const AUTH_IP = 'localhost';

const REC_PORT = 3001;
const REC_IP = 'localhost';

const KEYS_DIR = path.resolve('../keys'); // Cesta k HLS klicum. HLS je momentálně VYPNUTO (HLS stream stejně nejde přes NGINX teď)
                                                                //A ani se zapínat nebude
const OUTPUT_DIR = path.resolve('recordings');  //nechat být

const STREAM_SOURCE = 'http://localhost:3000/recordings/';  //v této directory jsou jednotlivé HLS streamy klientů, 
                                                            // a také se zde pak streamuje výsledný HLS stream (combined.m3u8)
                                                            //tady by efektinve melo byt jako IP AUTH_IP a jako port AUTH_PORT
                                                            //mozna kecam samozrejme ja nevim, ale toto je stejne jak co si deployoval ve čtvrtek
var clients_number = 0;

// Definice uzivatelu
const USERS = { 'student1': 'student1',
                'student2': 'student2',
                'student3': 'student3',
                'student4': 'student4',
                'student5': 'student5',
                'student6': 'student6'
                                    };

// Middleware
app.use(bodyParser.json());

// CORS middleware - allow requests from any origin //POZOR
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Additional headers for HLS streaming
    if (req.url.includes('.m3u8') || req.url.includes('.ts')) {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');
    }
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(session({
    secret: 'TajnyKlicProSession',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 60 * 60 * 1000 }
}));


// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (USERS[username] && USERS[username] === password) {
        req.session.user = username;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Bad credentials' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

// Doruceni klicu
app.get('/keys/:name', (req, res) => {
    if (!req.session.user) {
        res.status(403).send('Not logged in');
        return;
    }

    const keyName = path.basename(req.params.name);
    const keyPath = path.join(KEYS_DIR, keyName);

    if (!fs.existsSync(keyPath)) {
        res.status(404).send('Key not found');
        return;
    }

    const data = fs.readFileSync(keyPath);
    res.set('Content-Type', 'application/octet-stream');
    res.send(data);
});

// Serve recordings directory for HLS playback          //TOTO POZOR 
app.use('/recordings', express.static(OUTPUT_DIR));     //TOTO POZOR

// Spusteni serveru
app.listen(AUTH_PORT, AUTH_IP, () => console.log(`Auth server running on: http://${AUTH_IP}:${AUTH_PORT}`));

//kod pro nahravani
//-------------------------------------------------------------------------------------------

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const wss = new WebSocketServer({ port: REC_PORT });
const clients = new Map(); // clientId -> { ws, fileStream }
let combinedFfmpeg = null; // Track the combined stream process
let connectedClients = []; // Track which clients are connected

wss.on('connection', (ws, req) => {
  // Temporary handler for authentication
  const authHandler = (msg, isBinary) => {
    if (isBinary) return;

    try {
      const data = JSON.parse(msg.toString());
      if (data.type === "auth") {
        ws.clientId = data.token_node;
        const clientId = ws.clientId;
        console.log(`✅ Client connected: ${clientId}`);
        clients_number += 1;
        connectedClients.push(clientId); // Track which client connected
        console.log(`Current number of clients: ${clients_number}`); //testovaci
        console.log(`Connected clients: ${connectedClients.join(', ')}`);

        // Check if we should start combined stream
        switch (clients_number) {
          case 1:
            console.log("Only 1 client connected. Waiting for stream to initialize...");
            
            // Wait for stream to be ready before copying
            setTimeout(() => {
              // Check if we still have exactly 1 client (user might have disconnected)
              if (clients_number !== 1 || connectedClients.length !== 1) {
                console.log("Client count changed during timeout, skipping single stream start");
                return;
              }
              
              console.log(`Starting single stream copy for ${connectedClients[0]}...`);
              
              // Copy single stream without re-encoding - use whichever client is connected
              const firstClientStream = `${STREAM_SOURCE}stream_${connectedClients[0]}.m3u8`;
              console.log(`Source stream: ${firstClientStream}`);
              
              combinedFfmpeg = spawn('ffmpeg', [
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
                '-i', firstClientStream,
                '-c', 'copy',
                '-f', 'hls',
                '-hls_time', '0.5',
                '-hls_list_size', '2',
                '-hls_flags', 'delete_segments+append_list',
                '-start_number', '0',
                '-hls_segment_filename', path.join(OUTPUT_DIR, 'combined_%03d.ts'),
                path.join(OUTPUT_DIR, 'combined.m3u8')
              ]);

              combinedFfmpeg.stdout.on('data', data => console.log(`Combined FFmpeg (copy) stdout: ${data}`));
              combinedFfmpeg.stderr.on('data', data => console.log(`Combined FFmpeg (copy): ${data}`));
              combinedFfmpeg.on('close', code => {
                console.log(`Combined FFmpeg (copy) process exited with ${code}`);
                combinedFfmpeg = null;
              });
              combinedFfmpeg.on('error', (err) => {
                console.error(`Combined FFmpeg (copy) process error:`, err);
              });
            }, 3000); // Wait 3 seconds for stream to initialize
            break;

          case 2:
          case 3:
          case 4:
          case 5:
          case 6:
            console.log(`${clients_number} clients connected. Waiting for streams to initialize...`);
            
            // Wait for streams to be ready before merging
            setTimeout(() => {
              // Verify client count hasn't changed
              if (connectedClients.length < 2) {
                console.log("Not enough clients, skipping grid layout");
                return;
              }
              
              console.log(`Starting combined stream grid with ${connectedClients.length} clients: ${connectedClients.join(', ')}`);
              
              // Kill existing combined ffmpeg if it exists
              if (combinedFfmpeg) {
                console.log("Stopping existing combined stream...");
                combinedFfmpeg.kill('SIGTERM');
                
                // Wait for process to die, then clean up and start merge
                setTimeout(() => {
                  startGridLayout();
                }, 1000);
              } else {
                // No existing process, start immediately
                startGridLayout();
              }
              
              function startGridLayout() {
                // Clean up old segments
                try {
                  const files = fs.readdirSync(OUTPUT_DIR);
                  files.forEach(file => {
                    if (file.startsWith('combined_') && (file.endsWith('.ts') || file.endsWith('.m3u8'))) {
                      fs.unlinkSync(path.join(OUTPUT_DIR, file));
                    }
                  });
                } catch (err) {
                  console.error('Error cleaning up combined files:', err);
                }
                
                // Build ffmpeg command dynamically
                const ffmpegArgs = [];
                
                // Add inputs for each connected client
                connectedClients.forEach(clientId => {
                  ffmpegArgs.push(
                    '-reconnect', '1',
                    '-reconnect_streamed', '1',
                    '-reconnect_delay_max', '5',
                    '-analyzeduration', '10000000',
                    '-probesize', '10000000',
                    '-i', `${STREAM_SOURCE}stream_${clientId}.m3u8`
                  );
                });
                
                // Build filter_complex based on number of clients
                let filterComplex = '';
                let audioMerge = '';
                const numClients = connectedClients.length;
                
                // Normalize FPS and scale for each input
                for (let i = 0; i < numClients; i++) {
                  filterComplex += `[${i}:v]fps=25,scale=640:480[v${i}];`;
                }
                
                // Create grid layout based on number of clients
                if (numClients === 2) {
                  // 2x1 grid (side by side)
                  filterComplex += `[v0][v1]hstack=inputs=2[v]`;
                } else if (numClients === 3) {
                  // 2x2 grid with blank space
                  filterComplex += `[v0][v1]hstack=inputs=2[row1];`;
                  filterComplex += `[v2]pad=1280:480[row2];`;
                  filterComplex += `[row1][row2]vstack=inputs=2[v]`;
                } else if (numClients === 4) {
                  // 2x2 grid
                  filterComplex += `[v0][v1]hstack=inputs=2[row1];`;
                  filterComplex += `[v2][v3]hstack=inputs=2[row2];`;
                  filterComplex += `[row1][row2]vstack=inputs=2[v]`;
                } else if (numClients === 5) {
                  // 3x2 grid with blank space
                  filterComplex += `[v0][v1][v2]hstack=inputs=3[row1];`;
                  filterComplex += `[v3][v4]hstack=inputs=2[row2a];`;
                  filterComplex += `[row2a]pad=1920:480[row2];`;
                  filterComplex += `[row1][row2]vstack=inputs=2[v]`;
                } else if (numClients === 6) {
                  // 3x2 grid
                  filterComplex += `[v0][v1][v2]hstack=inputs=3[row1];`;
                  filterComplex += `[v3][v4][v5]hstack=inputs=3[row2];`;
                  filterComplex += `[row1][row2]vstack=inputs=2[v]`;
                }
                
                // Build audio merge
                audioMerge = connectedClients.map((_, i) => `[${i}:a]`).join('');
                audioMerge += `amerge=inputs=${numClients}[a]`;
                
                filterComplex += `;${audioMerge}`;
                
                // Add filter_complex and output options
                ffmpegArgs.push(
                  '-filter_complex', filterComplex,
                  '-map', '[v]',
                  '-map', '[a]',
                  '-c:v', 'libx264',
                  '-preset', 'ultrafast',
                  '-tune', 'zerolatency',
                  '-g', '50',
                  '-keyint_min', '25',
                  '-c:a', 'aac',
                  '-ac', '2',
                  '-ar', '48000',
                  '-b:a', '128k',
                  '-f', 'hls',
                  '-hls_time', '0.5',
                  '-hls_list_size', '2',
                  '-hls_flags', 'delete_segments+append_list',
                  '-start_number', '0',
                  '-hls_segment_filename', path.join(OUTPUT_DIR, 'combined_%03d.ts'),
                  path.join(OUTPUT_DIR, 'combined.m3u8')
                );
                
                console.log('Starting ffmpeg with grid layout...');
                combinedFfmpeg = spawn('ffmpeg', ffmpegArgs);

                combinedFfmpeg.stderr.on('data', data => console.log(`Combined FFmpeg: ${data}`));
                combinedFfmpeg.on('close', code => {
                  console.log(`Combined FFmpeg process exited with ${code}`);
                  combinedFfmpeg = null;
                });
                combinedFfmpeg.on('error', (err) => {
                  console.error(`Combined FFmpeg process error:`, err);
                });
              }
            }, 2000); // Wait 2 seconds for streams to initialize
            break;
        }

        // Prepare file for saving video
        const filename = path.join(OUTPUT_DIR, `client_${clientId}.mp4`);

        // Start ffmpeg process
        const ffmpeg = spawn('ffmpeg', [
          '-f', 'webm',
          '-i', 'pipe:0',
          '-c:v', 'libx264',
          '-preset', 'superfast',
          '-tune', 'zerolatency',
          '-c:a', 'aac',
          '-f', 'hls',
          '-hls_time', '0.5',
          '-hls_list_size', '2',
          '-hls_flags', 'split_by_time',        //delete_segments+split_by_time
          '-hls_segment_filename', path.join(OUTPUT_DIR, `stream_${clientId}-%d.ts`),
          path.join(OUTPUT_DIR, `stream_${clientId}.m3u8`)
        ]);

        ffmpeg.on('error', (err) => {
          console.error(`FFmpeg process error for ${clientId}:`, err);
        });

        ffmpeg.stderr.on('data', data => console.log(`FFmpeg (${clientId}): ${data}`));
        ffmpeg.on('close', code => console.log(`FFmpeg process for ${clientId} exited with ${code}`));

        clients.set(clientId, { ws, ffmpeg });

        // Remove this handler
        ws.off('message', authHandler);

        // Add handler for binary data
        ws.on('message', (chunk, isBinary) => {
          if (isBinary || chunk instanceof Buffer || chunk instanceof ArrayBuffer) {
            ffmpeg.stdin.write(Buffer.from(chunk));
          }
        });

        ws.on('close', () => {
          console.log(`❌ Client disconnected: ${clientId}`);
          ffmpeg.stdin.end();
          clients.delete(clientId);
          clients_number -= 1;
          
          // Remove from connected clients list
          connectedClients = connectedClients.filter(id => id !== clientId);
          console.log(`Current number of clients: ${clients_number}`); //testovaci
          console.log(`Remaining clients: ${connectedClients.join(', ')}`);

          // Handle combined stream based on remaining clients
          switch (clients_number) {
            case 0:
              if (combinedFfmpeg) {
                console.log("No clients remaining. Stopping combined stream...");
                try {
                  combinedFfmpeg.kill('SIGKILL'); // Force kill instead of SIGTERM
                  combinedFfmpeg = null;
                } catch (err) {
                  console.error("Error killing combined ffmpeg:", err);
                }
              }
              break;
            
            case 1:
              if (combinedFfmpeg) {
                console.log(`Only 1 client remaining (${connectedClients[0]}). Restarting with single stream copy...`);
                try {
                  combinedFfmpeg.kill('SIGKILL');
                } catch (err) {
                  console.error("Error killing combined ffmpeg:", err);
                }
                combinedFfmpeg = null;
              }
              
              // Wait a bit for the process to die and clean up old segments
              setTimeout(() => {
                // Verify we still have exactly 1 client
                if (clients_number !== 1 || connectedClients.length !== 1) {
                  console.log(`Client count changed during timeout, skipping restart (clients_number: ${clients_number}, connectedClients: ${connectedClients.length})`);
                  return;
                }
                
                console.log("Cleaning up old combined segments...");
                
                // Delete old combined files
                try {
                  const files = fs.readdirSync(OUTPUT_DIR);
                  files.forEach(file => {
                    if (file.startsWith('combined_') && (file.endsWith('.ts') || file.endsWith('.m3u8'))) {
                      fs.unlinkSync(path.join(OUTPUT_DIR, file));
                    }
                  });
                } catch (err) {
                  console.error('Error cleaning up combined files:', err);
                }
                
                console.log(`Starting single stream copy for ${connectedClients[0]}...`);
                
                // Copy remaining client's stream without re-encoding
                const remainingClientStream = `${STREAM_SOURCE}stream_${connectedClients[0]}.m3u8`;
                
                combinedFfmpeg = spawn('ffmpeg', [
                  '-reconnect', '1',
                  '-reconnect_streamed', '1',
                  '-reconnect_delay_max', '5',
                  '-i', remainingClientStream,
                  '-c', 'copy',
                  '-f', 'hls',
                  '-hls_time', '0.5',
                  '-hls_list_size', '2',
                  '-hls_flags', 'delete_segments+append_list',
                  '-start_number', '0',
                  '-hls_segment_filename', path.join(OUTPUT_DIR, 'combined_%03d.ts'),
                  path.join(OUTPUT_DIR, 'combined.m3u8')
                ]);

                combinedFfmpeg.stderr.on('data', data => console.log(`Combined FFmpeg (copy): ${data}`));
                combinedFfmpeg.on('close', code => {
                  console.log(`Combined FFmpeg (copy) process exited with ${code}`);
                  combinedFfmpeg = null;
                });
                combinedFfmpeg.on('error', (err) => {
                  console.error(`Combined FFmpeg (copy) process error:`, err);
                });
              }, 2500);
              break;
            
            default:
              // For 2-6 clients, restart the grid layout
              if (combinedFfmpeg && clients_number >= 2) {
                console.log(`${clients_number} clients remaining. Restarting grid layout...`);
                try {
                  combinedFfmpeg.kill('SIGKILL');
                } catch (err) {
                  console.error("Error killing combined ffmpeg:", err);
                }
                combinedFfmpeg = null;
              }
              
              // Wait and restart with new grid layout
              if (clients_number >= 2) {
                setTimeout(() => {
                  // Verify client count is still >= 2
                  if (clients_number < 2 || connectedClients.length < 2) {
                    console.log(`Not enough clients during timeout, skipping grid restart (clients_number: ${clients_number}, connectedClients: ${connectedClients.length})`);
                    return;
                  }
                  
                  console.log("Cleaning up old combined segments...");
                  
                  // Delete old combined files
                  try {
                    const files = fs.readdirSync(OUTPUT_DIR);
                    files.forEach(file => {
                      if (file.startsWith('combined_') && (file.endsWith('.ts') || file.endsWith('.m3u8'))) {
                        fs.unlinkSync(path.join(OUTPUT_DIR, file));
                      }
                    });
                  } catch (err) {
                    console.error('Error cleaning up combined files:', err);
                  }
                  
                  // Trigger the same grid layout logic as in connection
                  console.log(`Restarting combined stream grid with ${connectedClients.length} clients: ${connectedClients.join(', ')}`);
                  
                  // Build ffmpeg command dynamically (same as in case 2-6)
                  const ffmpegArgs = [];
                  
                  connectedClients.forEach(clientId => {
                    ffmpegArgs.push(
                      '-reconnect', '1',
                      '-reconnect_streamed', '1',
                      '-reconnect_delay_max', '5',
                      '-analyzeduration', '10000000',
                      '-probesize', '10000000',
                      '-i', `${STREAM_SOURCE}stream_${clientId}.m3u8`
                    );
                  });
                  
                  let filterComplex = '';
                  let audioMerge = '';
                  const numClients = connectedClients.length;
                  
                  for (let i = 0; i < numClients; i++) {
                    filterComplex += `[${i}:v]fps=25,scale=640:480[v${i}];`;
                  }
                  
                  if (numClients === 2) {
                    filterComplex += `[v0][v1]hstack=inputs=2[v]`;
                  } else if (numClients === 3) {
                    filterComplex += `[v0][v1]hstack=inputs=2[row1];`;
                    filterComplex += `[v2]pad=1280:480[row2];`;
                    filterComplex += `[row1][row2]vstack=inputs=2[v]`;
                  } else if (numClients === 4) {
                    filterComplex += `[v0][v1]hstack=inputs=2[row1];`;
                    filterComplex += `[v2][v3]hstack=inputs=2[row2];`;
                    filterComplex += `[row1][row2]vstack=inputs=2[v]`;
                  } else if (numClients === 5) {
                    filterComplex += `[v0][v1][v2]hstack=inputs=3[row1];`;
                    filterComplex += `[v3][v4]hstack=inputs=2[row2a];`;
                    filterComplex += `[row2a]pad=1920:480[row2];`;
                    filterComplex += `[row1][row2]vstack=inputs=2[v]`;
                  } else if (numClients === 6) {
                    filterComplex += `[v0][v1][v2]hstack=inputs=3[row1];`;
                    filterComplex += `[v3][v4][v5]hstack=inputs=3[row2];`;
                    filterComplex += `[row1][row2]vstack=inputs=2[v]`;
                  }
                  
                  audioMerge = connectedClients.map((_, i) => `[${i}:a]`).join('');
                  audioMerge += `amerge=inputs=${numClients}[a]`;
                  filterComplex += `;${audioMerge}`;
                  
                  ffmpegArgs.push(
                    '-filter_complex', filterComplex,
                    '-map', '[v]',
                    '-map', '[a]',
                    '-c:v', 'libx264',
                    '-preset', 'ultrafast',
                    '-tune', 'zerolatency',
                    '-g', '50',
                    '-keyint_min', '25',
                    '-c:a', 'aac',
                    '-ac', '2',
                    '-ar', '48000',
                    '-b:a', '128k',
                    '-f', 'hls',
                    '-hls_time', '0.5',
                    '-hls_list_size', '2',
                    '-hls_flags', 'delete_segments+append_list',
                    '-start_number', '0',
                    '-hls_segment_filename', path.join(OUTPUT_DIR, 'combined_%03d.ts'),
                    path.join(OUTPUT_DIR, 'combined.m3u8')
                  );
                  
                  combinedFfmpeg = spawn('ffmpeg', ffmpegArgs);

                  combinedFfmpeg.stderr.on('data', data => console.log(`Combined FFmpeg: ${data}`));
                  combinedFfmpeg.on('close', code => {
                    console.log(`Combined FFmpeg process exited with ${code}`);
                    combinedFfmpeg = null;
                  });
                  combinedFfmpeg.on('error', (err) => {
                    console.error(`Combined FFmpeg process error:`, err);
                  });
                }, 2500);
              }
              break;
          }
        });
      }
    } catch (err) {
      console.error("Invalid JSON message:", err);
    }
  };

  ws.on("message", authHandler);
});

console.log(`WebSocket server running on ws://${REC_IP}:${REC_PORT}`);