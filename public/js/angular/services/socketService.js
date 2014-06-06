app.factory('socketService', ['$rootScope', '$routeParams', function ($rootScope, $routeParams) {
    var channel = $routeParams.name;
    var socket = io.connect(SIGNALING_SERVER + channel);
    socket.channel = channel;

    return {
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