function usersController($scope, roomService, watchService, $http) {
    "use strict";

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
}

app.controller("usersController", ['$scope', 'roomService', 'watchService', '$http', usersController]);