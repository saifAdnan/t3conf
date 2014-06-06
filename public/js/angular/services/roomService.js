app.factory('roomService', ['$rootScope', '$routeParams', '$http', function ($rootScope, $routeParams, $http) {
    "use strict";
    return {
        room: {
            roomName: null,
            username: null,
            users: null
        },
        prepForBroadcast: function (room) {
            this.room = room;
            this.broadcastItem();
        },
        prepForUsers: function(users) {
            this.room.users = users;
            this.broadcastItem();
        },
        broadcastItem: function () {
            $rootScope.$broadcast('handleBroadcast');
        },
        getUsers: function () {
            $http.get('/action/roomInfo', {roomName: $routeParams.name}).success(function(data) {
                this.room.users = data.users;
                this.broadcastItem();
            }.bind(this));
        }
    };
}]);