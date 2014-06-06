function chatController($scope, socketService, $routeParams, watchService, $http) {
    var roomName = $routeParams.name;

    $scope.private = false;
    $scope.users = null;
    $scope.to = null;

    $http.get('/action/roomInfo', {roomName: roomName}).success(function (data) {
        $scope.users = data.users;
    });

    $scope.users = [];

    socketService.emit("change:name", {
        name: USERNAME
    });

    socketService.on("change:name", function(data) {
        $scope.users = data.users;
    });

    socketService.on('init', function (data) {
        current_username = USERNAME;
        $scope.name = USERNAME;
        $scope.users = data.users || [];
    });

    socketService.on('send:message', function (message) {
        var mention;
        mention = message.private;
        var message = {
            user: message.user,
            text: message.text
        };

        if(mention) {
            message.me = "active";
        }

        $scope.messages.push(message);

        var to = $(".messages-container").height();

        setTimeout(function() {
            $("#messages").scrollTo(to);
        }, 10);
    });

    watchService.on('user:join', function (data) {
        $scope.messages.push({
            user: $routeParams.name,
            text: 'User ' + data.name + ' has joined.'
        });

        var to = $(".messages-container").height();

        setTimeout(function() {
            $("#messages").scrollTo(to);
        }, 10);
    });

    // add a message to the conversation when a user disconnects or leaves the room
    watchService.on('user:left', function (data) {
        $scope.messages.push({
            user: 'chatroom',
            text: 'User ' + data.name + ' has left.'
        });

        var i, user;
        for (i = 0; i < $scope.users.length; i++) {
            user = $scope.users[i];
            if (user === data.name) {
                $scope.users.splice(i, 1);
                break;
            }
        }
        var to = $(".messages-container").height();

        setTimeout(function() {
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

    $scope.sendMessage = function () {

        socketService.emit('send:message', {
            message: $scope.message,
            roomName: roomName,
            private: $scope.private,
            to: $scope.to
        });

        var messages = {
            user: $scope.name,
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

        setTimeout(function() {
            $("#messages").scrollTo(to);
        }, 10);

        $scope.private = false;
        $("#message").css({
            'padding-left': 12
        }).focus();

    };
}

app.controller("chatController", ['$scope', 'socketService', '$routeParams', 'watchService', '$http', chatController]);