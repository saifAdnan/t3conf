function mainController($scope, $http, $location, watchService) {
    var form = $("#setup-new-room");

    $scope.isExist = false;

    $http.get('/rooms').success(function (data) {
        $scope.rooms = data;
    });

    watchService.on("rooms:update", function () {
        $http.get('/rooms').success(function (data) {
            console.log(data);
            $scope.rooms = data;
        });
    });

    watchService.on("conference:roomIsExist", function(data) {
        if (!data.isExist) {
            $location.url("/room/" + data.roomName);
        } else {
            $scope.isExist = true;
        }
    });

    $scope.users = [];
    $scope.moderator = null;

    $http.get("/users").success(function(data) {
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
     * Form submit
     * @returns {boolean}
     */
    $scope.submit = function (e) {
        e = e || form;
        var conf_name = $("#name");
        var conf_pass = $("#password");

        watchService.emit("conference:new", {
            roomName: conf_name.val(),
            roomPass: conf_pass.val()
        });

        e.preventDefault();
        return false;
    };

    /**
     * Update form action on keyup
     * @param e
     */
    $scope.updateFormAction = function (e) {
        var formAction = e.target.value;
        $("#setup-new-room").attr("action", "/room/" + formAction);
    };

    /**
     * Room name - replace %20 to whitespace
     * @param name
     * @returns {String}
     */
    $scope.roomName = function (name) {
        return name.replace("%20", " ");
    };

    /**
     * Join conference
     * @param e
     * @returns {Function}
     */
    $scope.join = function (e) {
        var el = $(e.target);
        $location.url(el.attr('data-href'));
        return false;
    };

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

app.controller("mainController", ['$scope', '$http', '$location', 'watchService', mainController]);