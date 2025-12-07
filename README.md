# Groups
## Team members
- Emanuel Antol : Website frontend and documentation
- Jan Konkolský : Website backend and documentation
- Jiří Kozárek : Hosting, deployment and documentation

### Project Overview
This project's goal was the development of video conferencing software for a minimum of six users. After discussing the requirements as a team, we agreed to implement and deploy an intuitive web-based application enabling up to six participants to communicate with both video and audio. We have named the resulting product <b>Groups</b>. The current version of Groups is deployed and accessible <a href="https://groups.kozina.tech">here</a>.

To achieve this, we leveraged Bootstrap, a frontend toolkit that provides a simple foundation for a responsive website. This approach ensures that Groups is easy to use on any computer and remains accessible on the go via a phone or tablet. NGINX handles website hosting, while FFmpeg and Node.js are used for content processing and the website backend, respectively. 


## Website frontend
As mentioned in the project overview the websites responsive design is achieved mainly by using <a href="https://getbootstrap.com/">Bootstrap</a> fronend toolkit. It enables automatic adjustment of the website layout based on the device screen size. This ensures that users have a consistent and user-friendly experience whether they access the site from a desktop computer, tablet, or smartphone. Specifically, the website uses Bootstrap´s collumn system, navigation bar components, collapsible elements, colors and button styles. A good example of theese elements can be found on the main meeting page on the website, which is also show in the image below.

<p allign="center">
  <img src="/DocImages/meeting.png" width="100%" style="display: inline-block;"/>
</p>

Let’s go through the basic functions of the website:<br>
<b>1 – Navigation bar.</b> Meeting is the main page that is shown in the picture, about takes you to this repository.<br>
<b>2 – Webcam element.</b> The join and quit button are used to start or stop streaming your webcam and audio. You can also turn off your webcam or microphone if you want.<br>
<b>3 – Qualities button.</b> This selector manages the HLS stream quality. You have 5 different options to choose from, 360p, 480p, 720p, 1080p and Auto. Auto selects appropriate video quality based on your internet speed.<br>
<b>4 – Player refresh button.</b> Refreshes the HLS player if anything unexpected happens. Everything should refresh automatically, so this button is here just in case something goes wrong. 



The website also uses <a href="https://videojs.com/">Video.js</a> library to add support for HLS and MPEG-DASH video streaming protocols, which are not natively supported in all web browsers. HLS is used for delivering live streams to users from the server. This allows for adaptive streaming, where the video quality can adjust based on the user´s internet connection, providing a smoother viewing experience. While streams from server to client are handled using HLS protocol, the communication from client to server is done using WebRTC technology. This is because WebRTC enables low-latency audio and video transmission from users to the server. Other website elements such as buttons, login features and forms are implemented using JavaScript and HTML5.

All code related to the website frontend can be found in the <a href="https://github.com/EmanuelAntol/Budget-MS-Teams/tree/main/site">site</a> folder in the project repository.








## Website backend
### Audio and video processing
The backend is built using a Node.js server (auth-server.js). Data from the client (video and audio) is sent through a WebSocket server, which feeds the data into an internal FFmpeg stdin pipe. This FFmpeg instance (let’s call it the client FFmpeg) processes the incoming data into an RTMP stream that is sent to a running Node Media Server. Each client stream includes a unique clientId in its name. When at least one client stream is active, the combining FFmpeg process starts. Its purpose is to combine all active RTMP client streams into a grid layout and produce an HLS stream with four different qualities. This is also where the client username watermark is applied. Whenever the number of connected clients changes (connect or disconnect), the combining FFmpeg process is restarted with the matching grid layout. Combined HLS stream is stored in <a href="https://github.com/EmanuelAntol/Budget-MS-Teams/tree/main/backend/recordings">recordings</a> folder. Each quality has a seperate folder, final adaptive HLS stream is stored in playlist.m3u8 file.

It is really simple to start this service, all that is needed to do is run NGINX in the root folder of the project using
```
.\NGINX
```
command in PowerShell and Node.js server auth-server.js using
```
node .\auth-server.js
```
command, again in PowerShell.

All code related to the website backend can be found in the <a href="https://github.com/EmanuelAntol/Budget-MS-Teams/tree/main/backend">backend</a> folder in the project repository. 
### Authentication
Authentication is really nothing special, it is also done in Node.js server (auth-server.js). The server uses an array of usernames and passwords, which is checked whenever a client attempts to log in. When valid credentials are entered, client successfully logs in. When invalid credentials are entered, client is met with an unfortunate error: <b>Incorrect login or password!</b> It is not something extra secured but it gets the job done for our simple use case.
## Hosting
The entire application is hosted on Jiří's infrastructure. The domain of this app is [groups.kozina.tech](https://groups.kozina.tech). The app runs behind reverse proxy so there are no certificates required to run it. This poses a major security risk if not handled properly! We recommend running this application behind a reverse proxy server or deploying it with your own certificates to ensure security. Deployment required fine-tuning and adjustments throughout the application code. <br>
One of the main ideas was hardware support for decoding and transcoding. This idea was not implemented due to the Italian roots of our code.
