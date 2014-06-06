function usersController($scope, roomService, watchService) {
    "use strict";

    $scope.users = null;

    $scope.$on('handleBroadcast', function () {
        $scope.users = roomService.room.users;
    });

    watchService.on("rooms:update", function(data) {
        roomService.prepForUsers(data.users);
    });
}

app.controller("usersController", ['$scope', 'roomService', 'watchService', usersController]);