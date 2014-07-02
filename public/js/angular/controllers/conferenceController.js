function conferenceController($scope, $rootScope, $http, watchService, sipService, $routeParams) {
    $rootScope.isCalling = true;

    $scope.users = [];
    $scope.selectedUsers = [];

    $http.get("/action/users").success(function(data) {
        $scope.users = data;
    });

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
        if ($("#keypad").length) {
            $("#keypad").modal('hide');
        }
    };

    $scope.closeInvite = function () {
        if ($("#invite").length) {
            $("#invite").modal('hide');
        }
    };

    $scope.invite = function (e) {
        e.preventDefault();
        watchService.emit("invite", {
            users: $scope.selectedUsers,
            extension: $routeParams.name
        });
        $("#invite").modal('hide');
        return false;

    };
}

app.controller("conferenceController", ['$scope', '$rootScope', '$http', 'watchService', 'sipService', '$routeParams', conferenceController]);