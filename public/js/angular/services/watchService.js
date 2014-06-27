app.factory('watchService', ['$rootScope', function ($rootScope) {
    var socket;
    var ROOM_NAME = 'confc';

    return {
        socketId: function () {
          return socket.socket.sessionid;
        },
        connect: function () {
            socket = io.connect(SIGNALING_SERVER, {secure: true});
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
            });
        },
        chatEmit: function (eventName, data, callback) {
            socket.of("/" + ROOM_NAME).emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        },
        chatOn: function (eventName, callback) {
            socket.of("/" + ROOM_NAME).on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        disconnect: function() {
            if (socket)
                socket.disconnect();
        }
    };
}]);