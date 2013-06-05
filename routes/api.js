

// local data kept in memory
var data = {
    chatrooms: [],
    chatroomUsers: [],
    users: []
};


/*
	Public interfaces exposed to handle basic routing and api calls to datastore
*/

// publicly exposed functions, mostly CRUD
// names are self-explanatory

exports.userDetails = function (req, res) {
    res.json({
        user: req.session.user
    });
};

exports.addchatroom = function (req, res) {
    var name = req.body.name;
    if (name !== undefined) {
        var exists = false;
        data.chatrooms.forEach(function (chat, i) {
            if (chat.name == name) {
                exists = true;
            }
        });

        if (!exists) {
            var id = getChatroomId();
            var chatroom = {
                id: id,
                name: req.body.name,
                date: new Date().toISOString(),
                admin: req.session.user
            }
            data.chatrooms.push(chatroom);
            res.json({
                chatroom: chatroom
            });
        }
        else {
            res.json({
                error: "There is a chatroom already with that name"
            });
        }
    }
    else {
        res.json({
            error: "Name is undefined."
        });
    }

};

exports.removeAllUsers = function (room) {
    data.chatroomUsers.forEach(function (cu, i) {
        if (cu.room == room) {
            data.chatroomUsers.splice(i, 1);
        }
    });
};

exports.removeChatroom = function (room) {
    data.chatrooms.forEach(function (c, i) {
        if (c.name == room) {
            data.chatrooms.splice(i, 1);
        }
    });
};

exports.removeUserFromChat = function (user, roomid) {
    chatroomUsers.forEach(function (cu, i) {
        if (cu.user == user && cu.id == roomid) {
            chatroomUsers.splice(i, 1);
        }
    });
};

exports.login = function (req, res) {
    var user = req.body.user;

    if (!userExists(user)) {
        req.session.user = user;
        addUser({ name: user, messages: [] });
        res.json({ data: true });
    }
    else {
        res.json({ data: false });
    }
};

exports.removeUser = function (user, roomid) {
    data.chatroomUsers.forEach(function (cu, i) {
        if (cu.user == user && cu.room == roomid) {
            data.chatroomUsers.splice(i, 1);
        }
    });
}
exports.getUsersInChat = function (id) {
    var users = getUsersInChat(id);
    return users;
}

exports.addClientToChat = function (user, chatroom) {
    data.chatroomUsers.push({
        user: user,
        room: chatroom
    });

}
exports.getMessages = function (roomid) {
    return getMessages(roomid);
}
exports.removeChatroom = function (name) {
    data.chatrooms.forEach(function (chatroom, i) {
        if (chatroom.name == name) {
            data.chatrooms.splice(i, 1);
        }
    });
}
exports.addMessage = function (name, message, roomid) {
    data.users.forEach(function (u, i) {
        if (u.name == name) {
            u.messages.push({ text: message, date: new Date().toISOString(), room: roomid });
        }
    });
}

exports.chatrooms = function (req, res) {
    var chats = [];
    // cleanup chatrooms with no users
    data.chatroomUsers.forEach(function (cu, i) {
        data.chatrooms.forEach(function (c, ii) {
            if (cu.room == c.id) {
                chats.push(c);
            }
        });
    });


    res.json({
        chatrooms: data.chatrooms
    });
};
exports.chatroom = function (req, res) {
    var id = req.params.id;
    var chat = getChatroom(id);
    var u = getUsersInChat(id);

    res.json({
        obj: chat,
        users: u
    });
};




// private functions
function getMessages(roomid) {
    var users = getUsersInChat(roomid);
    var userMessages = [];
    var userMessage;
    data.users.forEach(function (user, i) {
        user.messages.forEach(function (msg, ii) {
            if(msg.room == roomid){
            userMessage = {
                user: user.name,
                text: msg.text,
                date: msg.date,
                room: msg.room
            }
            userMessages.push(userMessage);
            }
        });
    });
    return userMessages;
}

function checkAuth(req, res, next) {
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        next();
    }
}

function getChatroom(id) {
    var chatroom;
    data.chatrooms.forEach(function (chat, i) {
        if (chat.id == id) {
            chatroom = chat;
        }
    });
    return chatroom;
}

function getChatrooms() {
    return data.chatrooms;
}

function addUser(user) {
    data.users.push(user);
}

function getUser(name) {
    var u;
    data.users.forEach(function (user, i) {
        if (user.name == name) {
            u = user;
        }
    });
    return u;
}

function userExists(name) {
    var user = getUser(name);
    if (user === undefined) {
        return false;
    }
    else {
        return true;
    }
}

function getUsersInChat(id) {
    var users = [];
    var chatroomUsers = [];
    data.chatroomUsers.forEach(function (uu, ii) {
        if (uu.room == id) {
            chatroomUsers.push(uu);
        }
    });

    data.users.forEach(function (user, i) {
        chatroomUsers.forEach(function (uu, ii) {
            if (uu.user === user.name) {
                users.push(user);
            }
        });
    });

    return users;
}

function getChatroomId() {
    return data.chatrooms.length + 1;
}

// logger functions, logs everything in datastore with the function it was called from
function logDatastore(func) {
    console.log("Logdatastore called: " + new Date());
    console.log("From function " + func);

    console.log("Chatrooms:");
    console.log(data.chatrooms);

    console.log("Chatroom users:");
    console.log(data.chatroomUsers);

    console.log("Users:");
    console.log(data.users);
}