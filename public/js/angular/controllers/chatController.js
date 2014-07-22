function chatController($scope, $rootScope, $http, watchService, $routeParams, $location) {
    var roomName = $routeParams.name;
    $scope.username = USERNAME;
    $scope.moderator = null;

    $scope.conf_name = null;
    $scope.conf_sip = roomName;

    $scope.msgErr = false;
    $scope.enableChat = true;
    $scope.users = null;
    $scope.private = false;
    $scope.to = null;

    $scope.isAdmin = ROLE === "admin" ? true : false;

    watchService.on("user:join", function (data) {
        $scope.rooms = getValues(data);
        $rootScope.inCall = true;
        for (var i = 0; i < $scope.rooms.length; i++) {
            if ($scope.rooms[i].name === $routeParams.name) {
                $scope.users = $scope.rooms[i].users;
                for(var j = 0; j < $scope.rooms[i].users.length; j++) {
                    if ($scope.rooms[i].users[j].username === USERNAME) {
                        $rootScope.inCall = true;
                    }
                }
            }
        }
    });

    watchService.on("user:leave", function (data) {
        $scope.rooms = getValues(data);

        for (var i = 0; i < $scope.rooms.length; i++) {
            if ($scope.rooms[i].name === $routeParams.name) {
                $scope.users = $scope.rooms[i].users;
            }
        }
    });

    $http.get("/users").success(function (data) {
        if (!data) return false;
        $scope.moderator = MODERATOR;

    });


    watchService.chatEmit("init", {
        username: USERNAME
    });

    watchService.chatOn('send:message', roomName, function (message) {
        console.warn(message);
        var mention;
        mention = message.private;
        var message = {
            from: message.from,
            text: message.text
        };

        if (mention) {
            message.me = "active";
        }

        $scope.messages.push(message);

        var to = $(".messages-container").height();

        setTimeout(function () {
            $("#messages").scrollTo(to);
        }, 10);
    });

    watchService.chatOn('user:join', function (data) {
        if (data.name === undefined) return false;
        $scope.messages.push({
            from: 'CONFERENCE ROOM',
            text: 'User ' + data.name + ' has joined.'
        });

        var to = $(".messages-container").height();

        setTimeout(function () {
            $("#messages").scrollTo(to);
        }, 10);
    });

    // add a message to the conversation when a user disconnects or leaves the room
    watchService.chatOn('chat:user:left', function (data) {
        if (data.name === undefined) return false;
        $scope.messages.push({
            from: 'CONFERENCE ROOM',
            text: 'User ' + data.name + ' has left.'
        });
        var to = $(".messages-container").height();


        setTimeout(function () {
            $("#messages").scrollTo(to);
        }, 10);
    });

    // ==============================

    $scope.mention = function (name) {
        $scope.private = true;
        $scope.to = name;
        setTimeout(function () {
            $("#message").css({
                'padding-left': $("#user-tag").width() + 10
            }).focus();
        }, 10);
    };

    $scope.clearPrivate = function () {
        $scope.private = false;
        $("#message").css({
            'padding-left': 12
        }).focus();
    };

    $scope.messages = [];

    watchService.chatOn("kick:user", roomName, function () {
        $location.url("/");
    });

    $scope.kick = function (username, channel) {
        console.log(username, $scope.users, 'username');
        watchService.chatEmit("kick", {
            username: username,
            channel: channel
        }, roomName);
    };

    $scope.sendMessage = function () {
        if ($scope.message === "" || !$scope.message) {
            $scope.msgErr = true;
            $scope.$apply();
            return false;
        }
        $scope.msgErr = false;

        watchService.chatEmit('send:message', {
            message: $scope.message,
            roomName: roomName,
            private: $scope.private,
            from: USERNAME,
            to: $scope.to
        }, roomName);

        var messages = {
            from: USERNAME,
            text: $scope.message,
            local: true
        };

        // add the message to our model locally
        if ($scope.private) {
            messages.private = true;
            messages.to = $scope.to;
        }
        $scope.messages.push(messages);

        // clear message box
        $scope.message = '';

        var to = $(".messages-container").height();

        setTimeout(function () {
            $("#messages").scrollTo(to);
        }, 10);

        $scope.private = false;
        $("#message").css({
            'padding-left': 12
        }).focus();

    };
}
app.controller("chatController", ['$scope', '$rootScope', '$http', 'watchService', '$routeParams', '$location', chatController]);
