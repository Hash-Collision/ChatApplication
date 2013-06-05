var express = require('express'),
 app = express(),
 http = require('http'),
 server = http.createServer(app),
 sio = require('socket.io'),
 io = sio.listen(server),
 path = require('path'),
 routes = require('./routes'),
 api = require('./routes/api');

server.listen(3300);

// config

app.configure(function () {
    app.use(express.cookieParser());

    // parse body from post
    app.use(express.bodyParser());

    app.use(express.session({ secret: "my secret" }));

    // to support http delete and http put
    app.use(express.methodOverride());

    // serve statis files
    app.use(express.static(__dirname));

    // run routes, router invokes callback functions that process the request
    app.use(app.router);

    app.use(function (req, res, next) {
        res.locals.user = req.session.user;
        next();
    });
});


/*
    HTTP actions
*/

// get user session variable in json
app.get('/user', api.userDetails);

// login user and add user to our list of current users
app.post('/login', api.login);

// get details of chatroom
app.get('/api/chatrooms/:id', api.chatroom);

// get list of chatrooms and current user as json
app.get('/api/chatrooms', api.chatrooms);

// add a new chatroom
app.post('/api/addchatroom', api.addchatroom);

// catch all handler, check authentication and send a user variable with it
app.get('*', routes.index);


/*
    Sockets - server
*/
io.sockets.on('connection', function (socket) {

    // client joined chatroom
    socket.on('join:chat', function (obj) {
        socket.join(obj.room.name);
        socket.user = obj.user;
        socket.room = obj.room;
        var roomid = obj.id;

        // store in local datastore
        var user = {
            name: socket.user,
            messages: []
        }

        api.addClientToChat(user.name, obj.room.id);

        // load users
        var users = api.getUsersInChat(roomid);
        socket.to(socket.room.name).emit('loadmembers:chat',{members:users, room: obj.room.id});
        socket.broadcast.to(socket.room.name).emit('loadmembers:chat', {members:users, room: obj.room.id});

        if(obj.user !== obj.admin){
            // load messages
            var messages = api.getMessages(roomid);
            socket.to(socket.room.name).emit('loadmessages:chat', messages);
        }
        
        // let user know he joined chat
        var messageToUser = getMsg('admin', 'you have connected too ' + obj.room.name + '.');
        socket.to(socket.room.name).emit('updatemessage:chat', messageToUser);

        // broadcast to users know he joined chatroom
        var messageToUsers = getMsg('admin', socket.user + ' has connected.');
        socket.broadcast.to(obj.room.name).emit('updatemessage:chat', messageToUsers);
    });



    // client send message
    socket.on('sendmessage:chat', function (data) {
        // get users and load again
        var users = api.getUsersInChat(data.room.id);
        socket.to(socket.room.name).emit('loadmembers:chat', {members:users, room: data.room.id});

        // add message
        api.addMessage(data.user, data.text, socket.room.id);
        var message = getMsg(data.user, data.text);
        socket.broadcast.to(socket.room.name).emit('updatemessage:chat', message);
    });



    // client was kicked from chatroom
    socket.on('kick:user', function(obj){
        var admin = obj.admin;
        var userToKick = obj.user;
        var room = obj.room;

        if (admin !== userToKick) {
            
            // remove user from datastore
            api.removeUser(userToKick, socket.room.id);

            // iterate clients and kick desired one
            var clients = io.sockets.clients(room);
            for (c in clients){
                if(clients[c].user === userToKick){
                    clients[c].emit('disconnect:user');
                    break;
                }
            }
        };
    });


    socket.on('disconnect', function () {
        disconnect();
    });

    socket.on('disconnect:user', function(){
        disconnect();
    });




    // get formatted message
    function getMsg(name, msg) {
        return {
            user: name,
            text: msg,
            date: new Date().toISOString()
        }
    }


    // client disconected, by kicking or leaving
    function disconnect(){
        if (socket.user !== undefined && socket.room !== undefined) {
            // user is admin, so we disconnect everyone
            if (socket.room.admin === socket.user) {
                var room = socket.room.name;
                var client = io.sockets.clients(room);

                api.removeAllUsers(socket.room.id);
                api.removeChatroom(room);

                client.forEach(function (c, i) {
                    c.leave(room);
                    c.emit('leave:user');
                });
            }
            else {
                // remove user from datastore
                api.removeUser(socket.user, socket.room.id);
                // send message to users that a user disconnected
                var message = getMsg('admin', socket.user + ' has disconnected.');
                socket.broadcast.to(socket.room.name).emit('updatemessage:chat', message);

                // emit new users lists
                var users = api.getUsersInChat(socket.room.id);
                socket.broadcast.to(socket.room.name).emit('loadmembers:chat', {members:users, room: socket.room.id});

                socket.leave(socket.room.name);
                socket.emit('leave:user');
            }
        }
    }
});
