function mainController($scope, $http, $location) {
    $scope.roomName = null;
    $scope.roomNumber = null;
    $scope.isExist = false;
    var readyCallback = function (e) {
        createSipStack(); // see next section
    };
    var errorCallback = function (e) {
        console.error('Failed to initialize the engine: ' + e.message);
    };
    SIPml.init(readyCallback, errorCallback);

    var sipStack;

    var options = '';

    function createSipStack() {

        var eventsListener = function (e) {
            if (e.type == 'started') {
                login();
            }
            else if (e.type == 'i_new_message') { // incoming new SIP MESSAGE (SMS-like)
                acceptMessage(e);
            }
            else if (e.type == 'i_new_call') { // incoming audio/video call
                acceptCall(e);
            }
        };

        sipStack = new SIPml.Stack({
            realm: '46.36.223.131', // mandatory: domain name
            impi: USERNAME, // mandatory: authorization name (IMS Private Identity)
            impu: 'sip:'+USERNAME+'@46.36.223.131', // mandatory: valid SIP Uri (IMS Public Identity)
            password: PASSWORD, // optional
            display_name: FIRSTNAME + ' ' + LASTNAME, // optional
            //websocket_proxy_url: 'ws://ns313841.ovh.net:10062', // optional
            //                outbound_proxy_url: 'udp://198.27.90.199:5060', // optional
            enable_rtcweb_breaker: true, // optional
            events_listener: { events: '*', listener: eventsListener}, // optional: '*' means all events
            sip_headers: [ // optional
                { name: 'User-Agent', value: 'IM-client/OMA1.0 sipML5-v1.0.0.0' },
                { name: 'Organization', value: 'T3leads' }
            ]
        });
    }

    sipStack.start();

    var registerSession;
    var loginListener = function (e) {
        if (e.type == 'connected' && e.session == registerSession) {
            var callSession = sipStack.newSession('call-audiovideo', {
                video_local: document.getElementById('video-local'), // <video id="video-local" .../>
                video_remote: document.getElementById('video-remote'), // <video id="video-remote" .../>
                audio_remote: document.getElementById('audio-remote') // <audio id="audio-remote" .../>
            });
        }
    };
    var login = function () {
        registerSession = sipStack.newSession('register', {
            events_listener: { events: '*', listener: loginListener } // optional: '*' means all events
        });

        registerSession.register();
    }
    $http.get('/rooms').success(function (data) {
        $scope.rooms = data;
    });

    /**
     * before form submit
     */
    $scope.submit = function (e) {
        /*$("#setup-new-room").attr("action", "/room/" + $scope.roomName);*/
        e.preventDefault();
        $http.post("/action/newConference", {
            conf_name: $scope.roomName,
            conf_number: $scope.roomNumber
        }).success(function (data) {
            console.log(data, "done");
        });
        var callSession = sipStack.newSession('call-audiovideo', {
            video_local: document.getElementById('video-local'), // <video id="video-local" .../>
            video_remote: document.getElementById('video-remote'), // <video id="video-remote" .../>
            audio_remote: document.getElementById('audio-remote') // <audio id="audio-remote" .../>
        });
        callSession.call($scope.roomNumber);
        return false;
    };


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

app.controller("mainController", ['$scope', '$http', '$location', mainController]);