function mainController($scope, $http, $location, watchService, sipService, $rootScope, $timeout) {
    $rootScope.inCall = false;
    $scope.rooms = null;
    $scope.roomNumber = null;
    $scope.isExist = false;
    $scope.t3leadsActive = false;
    $scope.isMuted = false;
    $scope.filename = null;
    $scope.n_filename = null;
    $scope.n_filename_date = null;

    $rootScope.inConference = false;

    $timeout(function () {
        $http.get("/conferences").success(function (data) {
            $scope.rooms = getValues(data);
        });
    }, 100);

    $http.get("/action/getFiles").success(function (data) {
        if (!data.length) $scope.no_files_message = "No records found.";
        for (var i = 0; i < data.length; i++) {
            var d = new Date(data[i].date * 1000);
            data[i].time = d.getHours() + ':' + d.getMinutes();
            d = d.getDate() + '/' + (d.getMonth()+1) + '/' + d.getFullYear() + '-' + d.getHours() + '_' + d.getMinutes();
            data[i].ui_date = d;
            data[i].name = data[i].name  + d;
        }
        $scope.files = data;
    });

    watchService.disconnect();

    watchService.on("user:join", function (data) {
        $scope.rooms = getValues(data);
    });

    watchService.on("user:leave", function (data) {
        $scope.rooms = getValues(data);
    });

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
        $scope.filename = file.name.match(/^[\D\d\s]+?-/g)[0].replace("-", "") +"-"+file.date+".wav";
        $scope.n_filename = file.name.match(/^[\D\d]+?-/g)[0].replace("-", "");
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
        var keypad = $("#keypad");

        if (keypad.length) {
            keypad.modal();
        }
    };

    $scope.hangUp = function () {
        sipService.sipHangUp();
        $location.url("/");
    };

    $scope.invite = function () {
        var invite = $("#invite");
        if (invite.length) {
            invite.modal();
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

    $scope.clearRecord = function (e, file) {
        e.preventDefault();
        if (confirm("Are you sure to delete this record?")) {
            $http.post("/action/clearRecord", {filename: file.name.match(/^[\D\d\s]+?-/g)[0].replace("-", "") +"-"+file.date+".wav"});
            window.location.reload();
            return false
        } else {
            return false;
        }
    };

    sipService.sipHangUp();

    sipService.sipLogin();
}

app.controller("mainController", ['$scope', '$http', '$location', 'watchService', 'sipService', '$rootScope', '$timeout', mainController]);