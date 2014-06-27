function conferenceController($scope, $rootScope, $http, watchService, sipService, $routeParams) {
    $rootScope.isCalling = true;
    watchService.on('user:left', function(data) {
        $("#" + data.socketid).parent().remove();
    });

    watchService.on("change:broadcaster", function () {
        watchService.emit("change:broadcaster", {socket: watchService.socketId()});
    });
    watchService.emit("new-channel", {
        channel: $routeParams.name,
        sender: USERNAME
    });

    $("#keypad").modal();

    $scope.sipSendDTMF = function (c) {
        sipService.sipSendDTMF(c);
    };

    sipService.sipCall($routeParams.name, function (connected) {
        if (!connected) {
            setTimeout(function () {
                sipService.sipCall($routeParams.name);
            }, 2000);
        }
    });

    $scope.closeKeyPad = function () {
        $("#keypad").modal('hide');
    }
}

app.controller("conferenceController", ['$scope', '$rootScope', '$http', 'watchService', 'sipService', '$routeParams', conferenceController]);