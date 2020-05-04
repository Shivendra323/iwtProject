'use strict';
var os          = require('os');
var express     = require('express');
var https       = require('https');
var app         = express();
var fs          = require('fs');
var socketIO    = require('socket.io');

/*var options = {
   key: fs.readFileSync('ssl/key.pem'),
   cert: fs.readFileSync('ssl/cert.pem')
};*/

/*var servers = https.createServer(options, app).listen(443, function(req, res){
       console.log('HTTPS listening on 443');
});*/

var servers = http.createServer(app).listen(8080, function(req, res){
       console.log('HTTPS listening on 8443');
});

app.use(express.static("page"));

var io = socketIO.listen(servers);
io.sockets.on('connection', function(socket) {
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }
  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

socket.on('create or join', function(room) {
    log('Received request to create room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    }else{
       socket.emit('alreadyRoom', room);
    } 
    
});


socket.on('join a room', function(room) {
    log('Received request to join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');
        
        
    if (numClients === 0) {
      socket.emit('noRoom', room, socket.id);

    }else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      socket.emit('full', room);
    }
});
  
  
    socket.on('bye', function(){
    console.log('received bye');
  });
  
});
  
