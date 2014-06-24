function mainController($scope, $http, $location) {
    $scope.roomName = null;
    $scope.roomNumber = null;
    $scope.isExist = false;


    /**
     * Room name - replace %20 to whitespace
     * @param name
     * @returns {String}
     */
    $scope.roomName = function (name) {
        if (name) {
            return name.replace("%20", " ");
        }
    };

    /**
     * Join conference
     * @param e
     * @returns {Function}
     */
    /*$scope.join = function (e) {
        var el = $(e.target);
        $location.url(el.attr('data-href'));
        return false;
    };*/

    $scope.removeUser = function(id) {

        if (confirm("Are you sure to delete this user ?")) {
            $http.post("/action/removeUser", {
                id: id
            }).success(function () {
                for (var i = 0; i < $scope.users.length; i = i + 1) {
                    if ($scope.users[i]._id == id) {
                        $scope.users.splice(i, 1);
                    }
                }
            });
        } else {
            return false;
        }
    };


}

app.controller("mainController", ['$scope', '$http', '$location', mainController]);