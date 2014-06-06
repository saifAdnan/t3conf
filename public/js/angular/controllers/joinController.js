function joinController($scope, $http, $routeParams, conferenceService, watchService, roomService, socketService) {
    var conferenceUI = conferenceService;
    var authModal = $('#auth');
    var notFound = $("#not_found");
    var roomName = $routeParams.name;

    roomService.broadcastItem();

    $scope.secure = false;
    $scope.pass = null;

    watchService.emit("conference:get", {roomName: $routeParams.name});

    watchService.on("conference:get", function (data) {
        if (data.notFound) {
            notFound.modal({
                backdrop: 'static',
                keyboard: false
            });
        }
        console.log(data);
        if (data.roomIsSecure) {
            $scope.secure = true;
            authModal.modal({
                backdrop: 'static',
                keyboard: false
            });
        } else {
            $http.get('/action/roomInfo', {name: roomName}).success(function(data) {
                conferenceService.captureUserMedia(function () {
                    conferenceUI.joinRoom({
                        roomToken: data.roomToken,
                        joinUser:  data.broadcaster,
                        users: data.users
                    });
                    roomService.getUsers();
                });

            });
        }

    });

    watchService.on("conference:enter", function (data) {
        if (data.enter) {
            authModal.modal('hide');
            $scope.secure = false;
            $http.get('/action/roomInfo', {name: roomName}).success(function(data) {
                conferenceService.captureUserMedia(function () {
                    conferenceUI.joinRoom({
                        roomToken: data.roomToken,
                        joinUser:  data.broadcaster,
                        users: data.users
                    });
                    roomService.getUsers();
                });
            });
        } else {
            authModal.find("input").select();
            $scope.error = true;
        }
    });

    authModal.on("shown.bs.modal", function () {
        $(this).find("input").select();
    });

    $scope.enter = function() {
        watchService.emit("conference:enter", {
            roomPass: $scope.pass,
            roomName: $routeParams.name
        });
    };

    $scope.$on("$destroy", function(){
        window.location.reload();
    });
}

app.controller("joinController", ['$scope', '$http', '$routeParams', 'conferenceService', 'watchService', 'roomService', 'socketService', joinController]);