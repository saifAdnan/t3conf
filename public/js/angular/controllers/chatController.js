function chatController($scope, chatService) {
    var roomName = ROOM_NAME;

    $scope.private = false;
    $scope.to = null;

    chatService.emit("change:name", {
        name: USERNAME
    });

    chatService.on('init', function (data) {
        current_username = USERNAME;
        $scope.name = USERNAME;
    });

    chatService.on('send:message', function (message) {
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

    chatService.on('user:join', function (data) {
        $scope.messages.push({
            user: ROOM_NAME,
            text: 'User ' + data.name + ' has joined.'
        });

        var to = $(".messages-container").height();

        setTimeout(function() {
            $("#messages").scrollTo(to);
        }, 10);
    });

    // add a message to the conversation when a user disconnects or leaves the room
    chatService.on('chat:user:left', function (data) {
        $scope.messages.push({
            user: 'chatroom',
            text: 'User ' + data.name + ' has left.'
        });

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

        chatService.emit('send:message', {
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

app.controller("chatController", ['$scope', 'chatService', chatController]);