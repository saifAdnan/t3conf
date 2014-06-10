function createController($scope, $routeParams, conferenceService, watchService, socketService) {
    var conferenceUI = conferenceService;
    var roomName = $routeParams.name;

    watchService.emit("conference:get", {roomName: roomName});

    watchService.on("conference:get", function (data) {
        conferenceService.captureUserMedia(function () {
            conferenceUI.createRoom({
                roomName: $routeParams.name,
                roomPass: data.roomPass
            });

            watchService.emit("change:name", {
                name: USERNAME
            });

        });
    });

    $scope.$on("$destroy", function(){
        watchService.emit("conference:remove", {roomName: roomName});
        window.location.reload();
    });
}

app.controller("createController", ['$scope', '$routeParams', 'conferenceService', 'watchService', 'socketService', createController]);