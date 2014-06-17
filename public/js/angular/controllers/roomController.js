function roomController($scope, $http, conferenceService, stunService, watchService) {
    $scope.isPost = IS_POST;
    $scope.roomName = ROOM_NAME;
    $scope.roomPass = ROOM_PASS;

    if ($scope.isPost) {
        conferenceService.captureUserMedia(function () {
            conferenceService.createRoom({
                roomName: $scope.roomName,
                roomPass: $scope.roomPass,
                joinSocket: watchService.socketId()
            });
        });
    } else {
        $http.get("/action/roomInfo", {
            roomName: $scope.roomName
        }).success(function(data) {
            conferenceService.captureUserMedia(function () {
                conferenceService.joinRoom({
                    roomName: $scope.roomName,
                    roomToken: data.roomToken,
                    joinUser: data.broadcaster,
                    joinSocket: watchService.socketId()
                });
            });
        });
    }

    watchService.on('user:left', function(data) {
        console.log(data);
        $("#" + data.socketid).parent().remove();
    });
}

app.controller("roomController", ['$scope', '$http', 'conferenceService', 'stunService','watchService', 'chatService', roomController]);