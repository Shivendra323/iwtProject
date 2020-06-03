'use strict';

const chatMessages = document.querySelector('.chat-messages');
const msg = document.querySelector('#msg');
var hangUpBtn = document.getElementById('hangUp');
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var receiveChannel = null;
var remoteStream;
var turnReady;
var socket = io.connect();

const { username, roomId, createORjoin} = Qs.parse(window.location.search, {
  ignoreQueryPrefix: true
});

console.log(username, roomId, createORjoin);


if(createORjoin === "Create Room"){
   createRoom();
}

if(createORjoin === "Join Room"){
   joinRoom();
}

var pcConfig = {
  'iceServers': [{
     'urls': 'stun:bn-turn1.xirsys.com'
   },
  /* {
     'urls': 'turn:bn-turn1.xirsys.com:80?transport=udp',
     'credential':'*************************************',
     'username' : '********************************XUk88poCqtRDDH72A6h_VHAQECPQX1eIhQnAAAAAF6ytrhTaGl2ZW5kcmEzMjM='
     },*/
   {
     'urls': 'turns:bn-turn1.xirsys.com:443?transport=tcp',
     'credential':'*************************************',
     'username' : '2upAxkES280ExSJQCE2gkzJUkR_9fXUk88poCqtRDDH72A6h_*******************************'
   }]
};



var sdpConstraints = {
  offerToReceiveAudio:{
    echoCancellation: true,
    noiseSuppression: true,
    channelCount: 2
  },
  offerToReceiveVideo: true
};

hangUpBtn.addEventListener('click', hangup);
hangUpBtn.disabled = true;



function createRoom(){

   var room = roomId;
   
   
   if (room !== '') {
   	socket.emit('create or join', room);
   	console.log('Attempted to create room', room);
   	
   }
   
}

function joinRoom(){
   var room = roomId;
   
   if (room !== '') {
   	socket.emit('join a room', room);
   	console.log('Attempted to join room', room);
   
   }
   
}

socket.on('created', function(room) {
  console.log('Created room ' + room);
  isInitiator = true;
  videoStream();
  maybeStart();
  outputMessage('Welcome to Hii_bol '+ username + '\n Waiting for other member');
  
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
  window.location = "index.html";
});

socket.on('alreadyRoom', function(room) {
  console.log('Already exist Room ' + room );
  window.location = "index.html";
});

socket.on('noRoom', function(room) {
  console.log('not exist Room ' + room );
  window.location = "index.html";
});

socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
  outputMessage('New member.... ');
  
});

socket.on('joined', function(room) {
  console.log('joined: ' + room);
  isChannelReady = true;
  videoStream();
  maybeStart();
 outputMessage('Welcome to Hii_bol '+ username);
 
  
});


socket.on('log', function(array) {
  console.log.apply(console, array);
});



function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}



// This client receives a message
socket.on('message', function(message) {
  console.log('Client received message:', message);
  if (message === 'got user media') {
      maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
    hangUpBtn.disabled = false;
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

function videoStream(){navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    channelCount: 2,
    autoGainControl: true
    
  },
  video: true
}).then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});
}
function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media');
  
  
  if (isInitiator) {
    maybeStart();
  }
}

var constraints = {
  audio: true,
  video: true
};

console.log('Getting user media with constraints', constraints);



function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
      hangUpBtn.disabled = false;
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(pcConfig);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}


function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}


function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
  hangUpBtn.disabled = true;
  window.location = "index.html";
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
  window.location = "index.html";
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Output message to DOM
function outputMessage(msg) {
  const div = document.createElement('div');
  div.classList.add('message');
  div.innerHTML =  msg;
  document.querySelector('.chat-messages').appendChild(div);
}
