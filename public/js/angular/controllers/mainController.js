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
    $scope.isAdmin = $rootScope.role === "admin" ? true : false;


    $rootScope.inConference = false;

    function records(data) {
        if (!data.length) {
            $scope.no_files_message = true;
        } else {
            $scope.no_files_message = false;
        }
        for (var i = 0; i < data.length; i++) {
            var d = new Date(data[i].date * 1000);
            data[i].time = d.getHours() + ':' + d.getMinutes();
            d = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() + '-' + d.getHours() + '_' + d.getMinutes();
            data[i].ui_date = d;
            data[i].i_name = data[i].name + '-' +  d;
        }
        $scope.files = data;
    }

    $scope.dateStart = moment(new Date()).subtract("days", 1).unix();
    $scope.dateEnd = moment(new Date()).unix();

    $timeout(function () {
        $http.get("/conferences").success(function (data) {
            $scope.rooms = getValues(data);
        });
    }, 100);

    $http.post("/action/getFiles", {
        start: $scope.dateStart,
        end: $scope.dateEnd
    }).success(function (data) {
       records(data);
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
        $scope.filename = file.name;
        $scope.n_filename = file.name.replace("-", "");
        $scope.n_filename_date = file.date;
        $("#rename").modal().find("input").focus();
    };

    $scope.closeRenameM = function () {
        $("#rename").modal('hide');
    };

    $scope.changeFilename = function (e) {
        e.preventDefault();

        $http.post("/action/renameRecord", {
            filename: $scope.filename,
            date: $scope.n_filename_date,
            n_filename: $scope.n_filename
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
            $http.post("/action/clearRecord", {
                file: file.name + "-" + file.date + ".wav",
                date: file.date
            });
            window.location.reload();
            return false
        } else {
            return false;
        }
    };

    sipService.sipHangUp();

    sipService.sipLogin();

    $('#reportrange').daterangepicker(
        {
            startDate: moment().subtract('days', 29),
            endDate: moment(),
            timePicker: false,
            minDate: '01/01/2012',
            maxDate: '12/31/2014',
            ranges: {
                'Today': [moment(), moment()],
                'Yesterday': [moment().subtract('days', 1), moment().subtract('days', 1)],
                'Last 7 Days': [moment().subtract('days', 6), moment()],
                'This Month': [moment().startOf('month'), moment().endOf('month')],
                'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
            },
            opens: 'left',
            buttonClasses: ['btn'],
            applyClass: 'btn-small btn-info btn-block',
            cancelClass: 'btn-small btn-default btn-block',
            format: 'MM/DD/YYYY',
            separator: ' to ',
            locale: {
                applyLabel: 'Submit',
                fromLabel: 'From',
                toLabel: 'To',
                customRangeLabel: 'Custom Range',
                daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
                monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
                firstDay: 1
            }
        },
        function (start, end) {
            $http.post('/action/getFiles', {
                start: start.unix(),
                end: end.unix()
            }).success(function (data) {
                records(data);
            });

            $('#reportrange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
        }
    );

    $('#reportrange span').html(moment.unix($scope.dateStart).format('MMMM D, YYYY') + ' - ' + moment.unix($scope.dateEnd).format('MMMM D, YYYY'));

}

app.controller("mainController", ['$scope', '$http', '$location', 'watchService', 'sipService', '$rootScope', '$timeout', mainController]);