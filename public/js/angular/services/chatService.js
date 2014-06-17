app.factory('chatService', ['$rootScope', function ($rootScope) {
    var socket = io.connect(SIGNALING_SERVER + ROOM_NAME);
    socket.channel = ROOM_NAME;

    return {
        socketId: function () {
            return socket.socket.sessionid;
        },
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
}]);