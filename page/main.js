'use strict';
//var createBtn = document.getElementById('createRoom');
//var joinBtn = document.getElementById('joinRoom');
var startBtn = document.getElementById('yoyo');
var stopBtn = document.getElementById('stop');
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
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
     'credential':'a1693180-8f9a-11ea-8742-9646de0e6ccd',
     'username' : '2upAxkES280ExSJQCE2gkzJUkR_9fXUk88poCqtRDDH72A6h_VHAQECPQX1eIhQnAAAAAF6ytrhTaGl2ZW5kcmEzMjM='
     },*/
   {
     'urls': 'turns:bn-turn1.xirsys.com:443?transport=tcp',
     'credential':'a1693180-8f9a-11ea-8742-9646de0e6ccd',
     'username' : '2upAxkES280ExSJQCE2gkzJUkR_9fXUk88poCqtRDDH72A6h_VHAQECPQX1eIhQnAAAAAF6ytrhTaGl2ZW5kcmEzMjM='
   }]
};



var sdpConstraints = {
  offerToReceiveAudio:{
    echoCancellation: true,
    noiseSuppression: true
  },
  offerToReceiveVideo: true
};



//createBtn.addEventListener('click', createRoom);
//joinBtn.addEventListener('click', joinRoom);
startBtn.addEventListener('click', yoyo);
//stopBtn.addEventListener('click', stop);


function createRoom(){

   var room = roomId;
   
   
   if (room !== '') {
   	socket.emit('create or join', room);
   	console.log('Attempted to create room', room);
   	//createBtn.disabled = true;
   	//joinBtn.disabled = true;
   	
   }
   
}

function joinRoom(){
   var room = roomId;
   
   
   if (room !== '') {
   	socket.emit('join a room', room);
   	console.log('Attempted to join room', room);
   	//createBtn.disabled = true;
   	//joinBtn.disabled = true;
   	
   }
   
}

socket.on('created', function(room) {
  console.log('Created room ' + room);
  isInitiator = true;
  maybeStart();
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
  maybeStart();
});

socket.on('joined', function(room) {
  console.log('joined: ' + room);
  isChannelReady = true;
  maybeStart();
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

function yoyo(){navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true
    
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
  try{
  handleRemoteStreamAdded(event);}
  catch{
    console.log('no remote');
  }
  if (isInitiator) {
    maybeStart();
  }
}

var constraints = {
  audio: true,
  video: true
};

console.log('Getting user media with constraints', constraints);

/*if (location.hostname !== 'localhost') {
  requestTurn(
    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}*/

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && isChannelReady && typeof localStream !== 'undefined') {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    try{
    pc.addStream(localStream);
    }catch{
      console.log('No video Stream');
    }
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
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

/*function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}*/

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
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}
