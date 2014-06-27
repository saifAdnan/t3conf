function mainController($scope, $http, $location, watchService, sipService, $rootScope) {
    //watchService.disconnect();
    $rootScope.isCalling = false;
    $scope.rooms = null;
    $scope.roomNumber = null;
    $scope.isExist = false;
    $scope.inConference = false;

    // Get current conferences on load
    $http.get("/action/confs").success(function (data) {
        $scope.rooms = getValues(data);
    });

    $http.get("/action/getFiles").success(function (data) {
        console.warn(data);
        $scope.files = data;
    });

    // Watch asterisk conference changes
    watchService.on("user:join", function (data) {
        $scope.rooms = getValues(data);
        console.warn($scope.rooms);
    });

    // Join coference
    $scope.join = function (num) {
        $location.url('/conference/' + num);
    };

    $scope.sipHangUp = function () {
        sipService.sipHangUp();
    };

    $scope.sipCall = function (num) {
        sipService.sipCall(num);
    };

    $scope.toggleKeypad = function () {
        if ($("#keypad").length) {
            $("#keypad").modal();
        }
    };

    $scope.createConference = function (e) {
        e.preventDefault();

        if ($scope.conf_name === undefined) {
            $scope.nameImportant = true;
            $("#conf_name").focus();
            return false;
        }

        if ($scope.conf_sip === undefined) {
            $scope.sipImportant = true;
            $("#conf_sip").focus();
            return false;
        }

        $http.post("/action/newConference", {
            name: $scope.conf_name,
            sip: $scope.conf_sip,
            pin: $scope.conf_pin
        }).success(function (data) {
            if (data === "false") {
                $scope.sipImportant = true;
                $scope.error = "SIP number is already exists. Please choose another SIP number."
            } else {
                $location.url("/conference/" + $scope.conf_name);
            }
        });

        return false;
    };



    sipService.sipLogin();
    sipService.sipHangUp();

}

app.controller("mainController", ['$scope', '$http', '$location', 'watchService', 'sipService', '$rootScope', mainController]);