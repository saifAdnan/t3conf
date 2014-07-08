function mainController($scope, $http, $location, watchService, sipService, $rootScope) {
    //watchService.disconnect();
    $rootScope.isCalling = false;
    $scope.rooms = null;
    $scope.roomNumber = null;
    $scope.isExist = false;
    $scope.inConference = false;
    $scope.t3leadsActive = false;
    $scope.isMuted = false;
    $scope.filename = null;
    $scope.n_filename = null;
    $scope.n_filename_date = null;

    // Get current conferences on load
    $http.get("/action/confs").success(function (data) {
        $scope.rooms = getValues(data);
    });

    $http.get("/action/getFiles").success(function (data) {
        if (!data.length) $scope.no_files_message = "No records found.";
        for (var i = 0; i < data.length; i++) {
            var d = new Date(data[i].date * 1000);
            d = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear() + ' ' + d.getHours() + ':' + d.getMinutes();

            data[i].ui_date = d;
        }
        $scope.files = data;
    });

    // Watch asterisk conference changes
    watchService.on("user:join", function (data) {
        $scope.rooms = getValues(data);
    });

    // Join coference
    $scope.join = function (num) {
        $location.url('/conference/' + num);
    };

    $scope.mute = function () {
        sipService.sipSendDTMF("1");
        $scope.isMuted = !$scope.isMuted;
    };

    $scope.sipHangUp = function () {
        sipService.sipHangUp();
    };

    $scope.sipCall = function (num) {
        sipService.sipCall(num);
    };

    $scope.rename = function (e, file) {
        $scope.filename = file.name.replace(" ", "");
        $scope.n_filename = file.name.replace(" ", "").split(file.date)[0].replace("-", "");
        $scope.n_filename_date = file.date;
        $("#rename").modal().find("input").focus();
    };

    $scope.closeRenameM = function () {
        $("#rename").modal('hide');
    };

    $scope.changeFilename = function(e) {
        e.preventDefault();
        $http.post("/action/renameRecord", {
            filename: $scope.filename,
            n_filename: $scope.n_filename + '-' + $scope.n_filename_date + '.wav'
        }).success(function (data) {
            window.location.reload();
        });

        return false;
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

    $scope.invite = function () {
        if ($("#invite").length) {
            $("#invite").modal();
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
            $scope.generateSipNumber();
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

    $scope.generateSipNumber = function () {
        $scope.conf_sip = Math.floor(Math.random() * 9000) + 1000;
    };

    $scope.clearRecords = function (e) {
        e.preventDefault();
        if (confirm("Are you sure to delete all records?")) {
            $http.post("/action/clearRecords");
            window.location.reload();
            return false
        } else {
            return false;
        }
    };

    $scope.clearRecord = function (e, filename) {
        e.preventDefault();
        if (confirm("Are you sure to deletethis record?")) {
            $http.post("/action/clearRecord", {filename: filename});
            window.location.reload();
            return false
        } else {
            return false;
        }
    };

    sipService.sipHangUp();
    sipService.sipLogin();
}

app.controller("mainController", ['$scope', '$http', '$location', 'watchService', 'sipService', '$rootScope', mainController]);