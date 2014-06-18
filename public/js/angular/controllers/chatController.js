function chatController($scope, $rootScope, $http, watchService, roomService) {
    var roomName = ROOM_NAME;

    $scope.enableChat = $rootScope.enableChat;

    $scope.users = null;

    $http.get("/action/roomInfo", {
        roomName: ROOM_NAME
    }).success(function (data) {
        $scope.users = data.users;
    });

    $scope.$on('handleBroadcast', function () {
        $scope.users = roomService.room.users;
    });

    watchService.on("rooms:update", function(data) {
        if (data && data.users) {
            roomService.prepForUsers(data.users);
        }
    });

    $scope.private = false;
    $scope.to = null;

    watchService.chatOn('send:message', function (message) {
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

    watchService.chatOn('user:join', function (data) {
        if (data.name === undefined) return false;
        $scope.messages.push({
            user: {username: 'chatroom'},
            text: 'User ' + data.name.username + ' has joined.'
        });

        var to = $(".messages-container").height();

        setTimeout(function() {
            $("#messages").scrollTo(to);
        }, 10);
    });

    // add a message to the conversation when a user disconnects or leaves the room
    watchService.chatOn('chat:user:left', function (data) {
        if (data.name === undefined) return false;
        $scope.messages.push({
            user: {username: 'chatroom'},
            text: 'User ' + data.name.username + ' has left.'
        });
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

        watchService.chatEmit('send:message', {
            message: $scope.message,
            roomName: roomName,
            private: $scope.private,
            to: $scope.to
        });

        var messages = {
            user: {username: USERNAME},
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

app.controller("chatController", ['$scope', '$rootScope', '$http', 'watchService', 'roomService', chatController]);