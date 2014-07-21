function dashboardController($scope, $http) {
    "use strict";
    $scope.new = false;
    $scope.users = [];
    $scope.userToEdit = {};
    $scope.title="Edit User";

    $scope.maxSize = 10;
    $scope.totalUsers = 0;
    $scope.limit = 10;
    $scope.currentPage = 0;

    $scope.search = null;

    $http.get("/users", {
        params: {
            from: $scope.currentPage,
            limit: 10
        }
    }).success(function (data) {
       if (data.users) {
           for (var i = 0; i < data.users.length; i++) {
               data.users[i].reg_date = moment.unix(data.users[i].reg_date).format("MMMM D, YYYY H:m");
           }
           $scope.users = data.users;
           $scope.totalUsers = data.total;
       }
    });

    $scope.pageChanged = function() {
        $http.get("/users", {
            params: {
                from: $scope.currentPage - 1,
                limit: $scope.limit,
                search: $scope.search
            }
        }).success(function (data) {
            for (var i = 0; i < data.users.length; i++) {
                data.users[i].reg_date = moment.unix(data.users[i].reg_date).format("MMMM D, YYYY H:m");
            }
            $scope.users = data.users;
            $scope.totalUsers = data.total;
        });
    };

    $scope.findUser = function(e) {
        e.preventDefault();
        $scope.currentPage = 0;

        $http.get("/users", {
            params: {
                from: $scope.currentPage,
                limit: $scope.limit,
                search: $scope.search
            }
        }).success(function (data) {
            for (var i = 0; i < data.users.length; i++) {
                data.users[i].reg_date = moment.unix(data.users[i].reg_date).format("MMMM D, YYYY H:m");
            }

            $scope.users = data.users;
            $scope.totalUsers = data.total;
        });

        return false;
    };


    $scope.deleteUser = function(id, username) {
        if (confirm("Are you sure you want to delete "+username+"?")) {
            for (var i = 0; i < $scope.users.length; i++) {
                if ($scope.users[i]._id === id) {
                    $scope.users.splice(i, 1);
                    $http.post("/action/removeUser", {id: id}).success(function (data) {
                        alert("User " + username + " has been deleted!");
                    });
                    break;
                }
            }
        } else {
            return false;
        }
    };

    $scope.editUser = function(id) {
        for (var i = 0; i < $scope.users.length; i++) {
            if ($scope.users[i]._id === id) {
                $scope.userToEdit = $scope.users[i];
                break;
            }
        }
        $("#edit").modal();
    };

    $scope.updateUser = function(id) {
        for (var i = 0; i < $scope.users.length; i++) {
            if ($scope.users[i]._id === id) {
                $http.post("/users", {
                    id: id,
                    moderator: $scope.users[i].moderator,
                    approved: $scope.users[i].approved
                });
                break;
            }
        }
    };

    $scope.updateSubmit = function(e) {
        e.preventDefault();
        if ($scope.new) {
            $scope.userToEdit.reg_date = new Date();
            $http.post("/user/new", $scope.userToEdit).success(function (data) {
                if (typeof data === "string" && data !== "ok") {
                    $scope.err = data;
                    return false;
                } else {
                    $http.get("/users").success(function (data) {
                        for (var i = 0; i < data.length; i++) {
                            data[i].reg_date = moment.unix(data[i].reg_date).format("MMMM D, YYYY H:m");
                        }
                        $scope.users = data;
                    });
                    alert("User has been successfully added.");
                    $("#edit").modal('hide');
                }
            });
        } else {
            $http.post("/user/update", $scope.userToEdit).success(function (data) {
                if (typeof data === "string" && data !== "") {
                    $scope.err = data;
                    return false;
                } else {
                    alert("User has been successfully updated.");
                    $("#edit").modal('hide');
                }
            });
        }
        return false;
    };

    $scope.newUser = function () {
        $scope.userToEdit = {};
        $scope.title = "New user";
        $scope.new = true;
        $("#edit").modal();
        setTimeout(function() {
            $("#edit").find("#username").focus();
        }, 100);

    };

    $('#edit').on('hidden.bs.modal', function () {
        $scope.err = null;
    });

    $scope.closeEdit = function () {
        $scope.new = false;
        $scope.title="Edit User";
        $("#edit").modal("hide");
    };
}
app.controller('dashboardController', ['$scope', '$http', dashboardController]);