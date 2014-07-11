app.factory('sipService', ['$rootScope', function ($rootScope) {
    var sipStack,
        callSession,
        oConfigCall,
        videoLocal = document.getElementById("video_local"),
        videoRemote = document.getElementById("video_remote"),
        audioRemote = document.getElementById("audio_remote"),
        viewVideoLocal, viewVideoRemote,
        isStarted = false,
        chkCounter = 0,
        chkStatus;

    //SIPml5 config
    var sipml5_config = {
        realm: '46.36.223.131',
        impi: USERNAME,
        impu: 'sip:' + USERNAME + '@46.36.223.131',
        password: PASSWORD, // optional
        display_name: FIRSTNAME + ' ' + LASTNAME, // optional
        websocket_proxy_url: 'wss://46.36.223.131:10096/', // optional
        //outbound_proxy_url: 'udp://46.36.223.131:10065 ', // optional
        enable_rtcweb_breaker: true, // optional
        events_listener: { events: '*', listener: eventsListener }, // optional: '*' means all events
        sip_headers: [ // optional
            { name: 'User-Agent', value: 'IM-client/OMA1.0 sipML5-v1.0.0.0' },
            { name: 'Organization', value: 'Doubango Telecom' }
        ]
    };

    $rootScope.status = "Please wait...";
    $rootScope.connected = false;

    function postInit() {
        // check webrtc4all version
        if (SIPml.isWebRtc4AllSupported() && SIPml.isWebRtc4AllPluginOutdated()) {
            if (confirm("Your WebRtc4all extension is outdated ("+SIPml.getWebRtc4AllVersion()+"). A new version with critical bug fix is available. Do you want to install it?\nIMPORTANT: You must restart your browser after the installation.")) {
                window.location = 'http://code.google.com/p/webrtc4all/downloads/list';
                return;
            }
        }

        // check for WebRTC support
        if (!SIPml.isWebRtcSupported()) {
            // is it chrome?
            if (SIPml.getNavigatorFriendlyName() == 'chrome') {
                if (confirm("You're using an old Chrome version or WebRTC is not enabled.\nDo you want to see how to enable WebRTC?")) {
                    window.location = 'http://www.webrtc.org/running-the-demos';
                }
                else {
                    window.location = "index.html";
                }
                return;
            }

            // for now the plugins (WebRTC4all only works on Windows)
            if (SIPml.getSystemFriendlyName() == 'windows') {
                // Internet explorer
                if (SIPml.getNavigatorFriendlyName() == 'ie') {
                    // Check for IE version
                    if (parseFloat(SIPml.getNavigatorVersion()) < 9.0) {
                        if (confirm("You are using an old IE version. You need at least version 9. Would you like to update IE?")) {
                            window.location = 'http://windows.microsoft.com/en-us/internet-explorer/products/ie/home';
                        }
                        else {
                            window.location = "index.html";
                        }
                    }

                    // check for WebRTC4all extension
                    if (!SIPml.isWebRtc4AllSupported()) {
                        if (confirm("webrtc4all extension is not installed. Do you want to install it?\nIMPORTANT: You must restart your browser after the installation.")) {
                            window.location = 'http://code.google.com/p/webrtc4all/downloads/list';
                        }
                        else {
                            // Must do nothing: give the user the chance to accept the extension
                            // window.location = "index.html";
                        }
                    }
                    // break page loading ('window.location' won't stop JS execution)
                    if (!SIPml.isWebRtc4AllSupported()) {
                        return;
                    }
                }
                else if (SIPml.getNavigatorFriendlyName() == "safari" || SIPml.getNavigatorFriendlyName() == "firefox" || SIPml.getNavigatorFriendlyName() == "opera") {
                    if (confirm("Your browser don't support WebRTC.\nDo you want to install WebRTC4all extension to enjoy audio/video calls?\nIMPORTANT: You must restart your browser after the installation.")) {
                        window.location = 'http://code.google.com/p/webrtc4all/downloads/list';
                    }
                    else {
                        window.location = "index.html";
                    }
                    return;
                }
            }
            // OSX, Unix, Android, iOS...
            else {
                if (confirm('WebRTC not supported on your browser.\nDo you want to download a WebRTC-capable browser?')) {
                    window.location = 'https://www.google.com/intl/en/chrome/browser/';
                }
                else {
                    window.location = "index.html";
                }
                return;
            }
        }

        // checks for WebSocket support
        if (!SIPml.isWebSocketSupported() && !SIPml.isWebRtc4AllSupported()) {
            if (confirm('Your browser don\'t support WebSockets.\nDo you want to download a WebSocket-capable browser?')) {
                window.location = 'https://www.google.com/intl/en/chrome/browser/';
            }
            else {
                window.location = "index.html";
            }
            return;
        }

        // FIXME: displays must be per session

        // attachs video displays
        if (SIPml.isWebRtc4AllSupported()) {
            viewVideoLocal = document.getElementById("divVideoLocal");
            viewVideoRemote = document.getElementById("divVideoRemote");
            WebRtc4all_SetDisplays(viewVideoLocal, viewVideoRemote); // FIXME: move to SIPml.* API
        }
        else{
            viewVideoLocal = videoLocal;
            viewVideoRemote = videoRemote;
        }

        if (!SIPml.isWebRtc4AllSupported() && !SIPml.isWebRtcSupported()) {
            if (confirm('Your browser don\'t support WebRTC.\naudio/video calls will be disabled.\nDo you want to download a WebRTC-capable browser?')) {
                window.location = 'https://www.google.com/intl/en/chrome/browser/';
            }
        }

        oConfigCall = {
            audio_remote: audioRemote,
            video_local: viewVideoLocal,
            video_remote: viewVideoRemote,
            bandwidth: { audio:undefined, video:undefined },
            video_size: { minWidth:undefined, minHeight:undefined, maxWidth:undefined, maxHeight:undefined },
            events_listener: { events: '*', listener: eventsListener},
            sip_caps: [
                { name: '+g.oma.sip-im' },
                { name: '+sip.ice' },
                { name: 'language', value: '\"en,fr\"' }
            ]
        };
    }

    function eventsListener (e){
        console.warn(typeof chkStatus, 1);
        if (typeof chkStatus !== 'number') {
            console.warn(typeof chkStatus, 2);
            /*chkStatus = setInterval(function () {
                chkCounter = chkCounter + 1;
                console.warn(chkCounter, e.type);
                if (chkCounter > 1 && isStarted === false) {
                    window.location.reload();
                }
            }, 500);*/
        }

        if(e.type == 'started'){
            isStarted = true;
            window.clearInterval(chkStatus);
            clearInterval(chkStatus);
            login();
        }
        else if(e.type == 'i_new_message'){ // incoming new SIP MESSAGE (SMS-like)
            acceptMessage(e);
        }
        else if(e.type == 'i_new_call'){ // incoming audio/video call
            acceptCall(e);
        }
        else if (e.type== 'connecting') {
            $rootScope.status = "Connecting...";
            $rootScope.$apply();
        }
        else if (e.type == 'connected') {
            $rootScope.status = "Connected";
            $rootScope.connected = true;
            $rootScope.$apply();
            clearInterval(chkStatus);
            window.clearInterval(chkStatus);
        }
    }

    function login(){
        registerSession = sipStack.newSession('register', {
            events_listener: { events: '*', listener: eventsListener }, // optional: '*' means all events
            sip_caps: [
                { name: '+g.oma.sip-im', value: null },
                { name: '+audio', value: null },
                { name: 'language', value: '\"en,fr\"' }
            ]
        });
        registerSession.register();
    }

    function getPVal(PName) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) === PName) {
                return decodeURIComponent(pair[1]);
            }
        }
        return null;
    }

    function preInit() {
        // set default webrtc type (before initialization)
        var s_webrtc_type = getPVal("wt");
        if (s_webrtc_type) {
            if(window.console) {
                window.console.info("s_webrtc_type=" + s_webrtc_type);
            }
            SIPml.setWebRtcType(s_webrtc_type);
        }

        // initialize SIPML5
        SIPml.init(postInit);
    }

    preInit();

    return {
        sipLogin: function () {
            if (sipStack !== undefined) return false;
            sipStack = new SIPml.Stack(sipml5_config);
            sipStack.start();
        },
        sipCall: function (num, cb) {
            if (!$rootScope.connected) {
                if (cb && typeof cb === 'function') return cb(false);
            }
            if (!sipStack) return false;
            callSession = sipStack.newSession('call-audio', {
                video_local: videoLocal,
                video_remote: videoRemote,
                audio_remote: audioRemote,
                events_listener: { events: '*', listener: eventsListener } // optional: '*' means all events
            });
            callSession.call(num);
        },
        sipSendDTMF: function (c){
            if (c === '#') {
                $("#auth").modal('hide');
            }
            if(callSession && c){
                if(callSession.dtmf(c) == 0){
                    try {
                        dtmfTone.play();
                    } catch(e){ }
                }
            }
        },
        sipHangUp: function() {
            if (callSession) {
                callSession.hangup({events_listener: { events: '*', listener: eventsListener }});
            }
        }
    }
}]);