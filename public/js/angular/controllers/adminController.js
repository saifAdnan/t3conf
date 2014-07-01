function adminController($scope, $http) {
    "use strict";
    $scope.users = [];
    $scope.moderator = null;

    $http.get("/users").success(function(data) {
        if (!data) return false;
        $scope.users = data.users;
        $scope.moderator = data.moderator;

        $scope.isAdmin = data.isAdmin;

        $.each($scope.users, function(index, user) {
            user.index = index + 1;
            user.isRole = user.role === 'admin' ? true : false;
            user.date = new Date(user.date).toLocaleString();
        });
    });

    /**
     * Set user to moderator
     * @param id
     * @param e
     */
    $scope.setUserModerator = function (id, e) {
        $http.post("/users", {
            id: id,
            moderator: e.target.checked
        }).error(function (err) {
            console.log(err || 'A problem has been occurred!');
        });
    };

    /**
     * Approve user
     * @param id
     * @param e
     */
    $scope.setUserApproved = function (id, e) {
        $http.post("/users", {
            id: id,
            approved: e.target.checked
        }).error(function (err) {
            console.log(err || 'A problem has been occurred!');
        });
    };

    /**
     * remove user
     * @param id
     * @param e
     */
    $scope.removeUser = function (id) {

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

app.controller("adminController", ['$scope', '$http', adminController]);