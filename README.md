# Groups
## Team members
- Emanuel Antol : Website frontend and documentation
- Jan Konkolský : Website backend and documentation
- Jiří Kozárek : Hosting, deployment and documentation

### Project Overview
This project's goal was the development of video conferencing software for a minimum of six users. After discussing the requirements as a team, we agreed to implement and deploy an intuitive web-based application enabling up to six participants to communicate with both video and audio. We have named the resulting product <b>Groups</b>. The current version of Groups is deployed and accessible <a href="https://groups.kozarkovi.cz/">here</a>.

To achieve this, we leveraged Bootstrap, a frontend toolkit that provides a simple foundation for a responsive website. This approach ensures that Groups is easy to use on any computer and remains accessible on the go via a phone or tablet. NGINX handles website hosting, while FFmpeg and Node.js are used for content processing and the website backend, respectively. 


## Website frontend
As mentioned in the project overview the websites responsive design is achieved mainly by using <a href="https://getbootstrap.com/">Bootstrap</a> fronend toolkit. It enables automatic adjustment of the website layout based on the device screen size. This ensures that users have a consistent and user-friendly experience whether they access the site from a desktop computer, tablet, or smartphone. Specifically, the website uses Bootstrap´s collumn system, navigation bar components, collapsible elements, colors and button styles. A good example of theese elements can be found on the main meeting page on the website, which is also show in the image below.

<p allign="center">
  <img src="/DocImages/meeting.png" width="100%" style="display: inline-block;"/>
</p>

The website also uses <a href="https://videojs.com/">Video.js</a> library to add support for HLS and MPEG-DASH video streaming protocols, which are not natively supported in all web browsers. HLS is used for delivering live streams to users from the server. This allows for adaptive streaming, where the video quality can adjust based on the user´s internet connection, providing a smoother viewing experience. While streams from server to client are handled using HLS protocol, the communication from client to server is done using WebRTC technology. This is because WebRTC enables low-latency audio and video transmission from users to the server. Other website elements such as buttons, login features and forms are implemented using JavaScript and HTML5.

All code related to the website frontend can be found in the <a href="https://github.com/EmanuelAntol/Budget-MS-Teams/tree/main/site">site</a> folder in the project repository.








## Website backend

### Audio and video processing

### Authentication


## Hosting
Tho entire application is hosted on Jiří's infrastructure. The domain of this app is [groups.kozina.tech](https://groups.kozina.tech). The app runs behind reverse proxy so there are no certificates required to run it. This poses a major security risk if not handled properly! We recommend running this application behind a reverse proxy server or deploying it with your own certificates to ensure security. Deployment required fine-tuning and adjustments throughout the application code.
One of the main ideas was hardware support for decoding and transcoding. This idea was not implemented due to the Italian roots of our code.
