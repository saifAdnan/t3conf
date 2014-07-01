app.factory('watchService', ['$rootScope', function ($rootScope) {
    var socket = io.connect(SIGNALING_SERVER, {secure: true});

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
            });
        },
        chatEmit: function (eventName, data, room, callback) {
            socket.of("/" + room).emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        },
        chatOn: function (eventName, room,  callback) {
            socket.of("/" + room).on(eventName, function () {
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