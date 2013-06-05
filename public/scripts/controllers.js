
'use strict';

/*
	/*
	Controls all pages, is the default shared controller across all views
*/

app.controller("BaseController", ["$http", "$scope", "$rootScope", function ($http, $scope, $rootScope) {
    if ($rootScope.user === undefined) {
        $http.get('/user').success(function (data, status, headers, config) {
            $rootScope.user = data.user;
        });
    }
    $scope.appName = "ChatApp";
}]);


/*
	/
	Controls the index page
*/
app.controller("HomeController", ["$scope", "$location", function ($scope, $location) {
    $scope.message = "Welcome " + ($scope.user === undefined ? "" : $scope.user);

    // go to chatrooms if logged, or login page if not logged in.
    $scope.chatrooms = function () {
        if ($scope.user === undefined) {
            $location.path('/login');
        }
        else {
            $location.path('/chatrooms');
        }
    };
}]);


/*
	/login
	Handles session of users
*/
app.controller("LoginController", ["$http", "$scope", "$location", "socket", "$rootScope", function ($http, $scope, $location, socket, $rootScope) {

    $scope.loginUser = function () {
        if ($scope.user === "admin" || $scope.user === "server") {
            $scope.error = "Can't choose a system name.";
        }
        else if ($scope.user !== undefined && $scope.user.length > 0) {
            // POST user credentials and socket
            $http.post('/login', { user: $scope.user }).success(function (obj) {
                // login successful and name is not taken
                if (obj.data == true) {
                    // set our rootscope as current user and reroute to chatrooms
                    $rootScope.user = $scope.user;
                    $location.path('/chatrooms');
                }
                else {
                    $scope.error = $scope.user + " is taken.";
                }
            }).error(function (data) {
                $scope.error = "error " + data;

            });
        }
        else {
            $scope.error = "Invalid name";
        }
    };
}]);


/*
	/chatrooms
	Handles chatrooms
    No sockets are used here, only http actions
*/
app.controller("ChatroomsController", ["$http", "$scope", "$location", function ($http, $scope, $location) {
    if ($scope.user !== undefined) {

        // get inital chatrooms
        $http.get('/api/chatrooms').success(function (data, status, headers, config) {
            $scope.chatrooms = data.chatrooms;
        });

        setInterval(function () { // get list of chatrooms
            if ($location.path() === '/chatrooms' || $location.path() === '/chatrooms/') {
                $http.get('/api/chatrooms').success(function (data, status, headers, config) {
                    $scope.chatrooms = data.chatrooms;
                });
            }
        }, 5000);


        // add a new chatroom
        $scope.addchatroom = function () {
            if ($scope.name !== undefined && $scope.name.length > 0) {
                // add chatroom with chatroom name
                $http.post('/api/addchatroom', { name: $scope.name }).success(function (data, status, headers, config) {
                    if (data.chatroom !== undefined) {
                        $scope.chatrooms.push(data.chatroom);
                        $location.path('/chatrooms/' + data.chatroom.id);
                    }
                    else if (data.error !== undefined) {
                        $scope.error = data.error;
                    }
                });
            }
            else {
                $scope.error = "Invalid name";
            }
        };

    }
    else {
        $location.path('/chatroom');
    }

}]);


/*
	/chatrooms/:id
	specific chatroom
*/
app.controller("ChatroomController", ["$location", "$scope", "$routeParams", "$http", "socket", function ($location, $scope, $routeParams, $http, socket) {

    // chatroom specific data
    $scope.messages = [];
    $scope.admin = "";
    $scope.memberDetail = "";
    $scope.members = [];
    $scope.showDetail = false;
    var isAdmin = false;

    if ($location.path() == '/chatrooms/' + $routeParams.id) {
        $http.get('/api/chatrooms/' + $routeParams.id).success(function (data) {
            // load all initial data
            var chatroom = data.obj;

            $scope.chatroom = chatroom;
            $scope.admin = chatroom.admin;
            if($scope.admin == $scope.user){
                isAdmin = true;
            }

            // emit we just joined chat
            socket.emit('join:chat', { "user": $scope.user, "room": $scope.chatroom, "id": $routeParams.id, "admin": $scope.admin });
        });
    }

    /*
        Sockets - client
    */

    // get list of members
    socket.on('loadmembers:chat', function (obj) {
        if (obj !== undefined) {
            var members = obj.members;
            var roomid = obj.room;
            members.forEach(function (m, i) {
                if (m.name == $scope.admin && roomid == $routeParams.id) {
                    m.name = "@" + m.name;
                }
            });
     
            $scope.members = members;
        }
    });

    // load messages
    socket.on('loadmessages:chat', function (messages) {
        $scope.messages = messages;
    });

    // update chat with a message and a user
    socket.on('updatemessage:chat', function (message) {
        var is_in = isInMessages(message);
        if (!is_in) {
            $scope.messages.push(message);
        }
    });

    // user disconnected 
    socket.on('disconnect', function () {
        $scope.leave();
    });

    // client was emitted to be disconnected from server
    socket.on('disconnect:user', function () {
        $scope.leave();
    });
    socket.on('leave:user', function() {
        $location.path('/chatrooms');
    });
    /*
        DOM manipulative functions, i.e. AngularJS
    */

    // user leaves
    $scope.leave = function () {
        $scope.admin = "";
        socket.emit('disconnect:user', { user: $scope.user, "room": $scope.chatroom.name });
        $location.path('/chatrooms');
    }

    // send message to chat
    $scope.addMessage = function () {
        if ($scope.message !== undefined && $scope.message.length > 0) {
            var message = $scope.message;
            $scope.message = "";
            var is_in = isInMessages(message);
            if(!is_in){
                addMsg($scope.user, message);
                socket.emit('sendmessage:chat', { user: $scope.user, text: message, room: $scope.chatroom });
            }
        }
        else {
            $scope.error = "Message cant be empty/null";
        }
    };

    // kick member from server if he is not admin
    $scope.kickMember = function () {
        var name = $scope.memberDetail.name;
        var member = $scope.members.findByProp(name, 'name');
        if (name !== $scope.admin) {
            socket.emit('kick:user', { admin: $scope.admin, user: name, room: $scope.chatroom.name });;
        }
    }

    // see details when clicked
    $scope.seeMemberDetail = function () {
        if(isAdmin){
            var name = this.member.name;
            if('@' + $scope.admin !== name){
                var member = $scope.members.findByProp(name, 'name');
                $scope.memberDetail = member;
                if ($scope.admin !== name) {
                    $scope.showDetail = true;
                }
            }
        }
    }

    // hide detail unit
    $scope.hideHeroUnit = function () {
        $scope.showDetail = false;
    }

    /*
        Helper functions
    */
    function isInMessages(message) {
        var isInMessage = false;
        $scope.messages.forEach(function (m, i) {
            if (message.text === m.text) {
                if (message.date === m.date) {
                    isInMessage = true;
                }
            }
        });
        return isInMessage;
    }
    function addMsg(user, msg, d) {
        var message = {
            user: user,
            text: msg,
            date: new Date().toISOString()
        };
        $scope.messages.push(message);
    }

    Array.prototype.findByProp = function (obj, prop) {
        for (var i = 0; i < this.length; i++) {
            var elem = this[i];
            if (obj === elem[prop]) {
                return this[i];
            }
        }
    };

}]);