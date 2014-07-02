function mainController($scope, $http, $location, watchService, sipService, $rootScope) {
    //watchService.disconnect();
    $rootScope.isCalling = false;
    $scope.rooms = null;
    $scope.roomNumber = null;
    $scope.isExist = false;
    $scope.inConference = false;
    $scope.t3leadsActive = false;

    // Get current conferences on load
    $http.get("/action/confs").success(function (data) {
        $scope.rooms = getValues(data);

        for(var i = 0; i < $scope.rooms.length; i ++) {
            if ($scope.rooms[i].name === '1111') {
                $scope.t3leadsActive = true;
            }
        }

    });

    $http.get("/action/getFiles").success(function (data) {
        if (!data.length) $scope.no_files_message = "No records found.";
        $scope.files = data;
    });

    // Watch asterisk conference changes
    watchService.on("user:join", function (data) {
        $scope.rooms = getValues(data);
        for(var i = 0; i < $scope.rooms.length; i ++) {
            if ($scope.rooms[i].name === '1111') {
                $scope.t3leadsActive = true;
            }
        }
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

    $scope.hangUp = function () {
        sipService.sipHangUp();
        $location.url("/");
    };

    $scope.createConference = function (e) {
        e.preventDefault();

        if ($scope.conf_name === undefined) {
            $scope.nameImportant = true;
            $("#conf_name").focus();
            return false;
        }

        if ($scope.conf_sip === undefined || $scope.conf_sip.toString().length > 4 || $scope.conf_sip.toString().length < 4) {
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
                $location.url("/conference/" + $scope.conf_sip);
            }
        });

        return false;
    };

    sipService.sipHangUp();
    sipService.sipLogin();
}

app.controller("mainController", ['$scope', '$http', '$location', 'watchService', 'sipService', '$rootScope', mainController]);