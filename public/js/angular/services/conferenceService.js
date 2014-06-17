app.factory('conferenceService', [
    '$rootScope',
    '$http',
    '$routeParams',
    '$rootScope',
    'stunService',
    'watchService',
    function($scope, $http, $routeParams, $rootScope, stunService, watchService) {
        $scope.controls = null;

        var config = stunService;

        var self = {
            userToken: uniqueToken()
        };

        var channels = '--', isbroadcaster;
        var isGetNewRoom = true;
        var sockets = [];
        var defaultSocket = {};
        var joinSocket;

        function openDefaultSocket() {
            defaultSocket = config.openSocket({
                onmessage: onDefaultSocketResponse,
                callback: function(socket) {
                    defaultSocket = socket;
                }
            });
        }

        function onDefaultSocketResponse(response) {

            console.log("red", response);

            joinSocket = response.joinSocket;
            if (response.joinSocket) self.joinSocket = response.joinSocket;

            if (response.userToken == self.userToken) return;

            if (isGetNewRoom && response.roomToken && response.broadcaster) config.onRoomFound(response);

            if (response.newParticipant && self.joinedARoom && self.broadcasterid == response.userToken) onNewParticipant(response.newParticipant);

            if (response.userToken && response.joinUser == self.userToken && response.participant && channels.indexOf(response.userToken) == -1) {
                channels += response.userToken + '--';
                openSubSocket({
                    isofferer: true,
                    channel: response.channel || response.userToken,
                    joinSocket: response.joinSocket
                });
            }

            // to make sure room is unlisted if owner leaves
            if (response.left && config.onRoomClosed) {
                config.onRoomClosed(response);
            }
        }

        function openSubSocket(_config) {
            if (!_config.channel) return;
            var socketConfig = {
                channel: _config.channel,
                onmessage: socketResponse,
                onopen: function() {
                    if (isofferer && !peer) initPeer();
                    sockets[sockets.length] = socket;
                }
            };

            socketConfig.callback = function(_socket) {
                socket = _socket;
                this.onopen();
            };

            var socket = config.openSocket(socketConfig),
                isofferer = _config.isofferer,
                gotstream,
                video = document.createElement('video'),
                inner = { },
                peer;

            var peerConfig = {
                attachStream: config.attachStream,
                onICE: function(candidate) {
                    socket.send({
                        userToken: self.userToken,
                        candidate: {
                            sdpMLineIndex: candidate.sdpMLineIndex,
                            candidate: JSON.stringify(candidate.candidate)
                        }
                    });
                },
                onRemoteStream: function(stream) {
                    if (!stream) return;

                    video[moz ? 'mozSrcObject' : 'src'] = moz ? stream : webkitURL.createObjectURL(stream);
                    video.play();

                    video.setAttribute("id", joinSocket || self.joinSocket);

                    _config.stream = stream;

                    onRemoteStreamStartsFlowing();
                }
            };

            function initPeer(offerSDP) {
                if (!offerSDP) {
                    peerConfig.onOfferSDP = sendsdp;
                } else {
                    peerConfig.offerSDP = offerSDP;
                    peerConfig.onAnswerSDP = sendsdp;
                }

                peer = RTCPeerConnection(peerConfig);
            }

            function onRemoteStreamStartsFlowing() {

                if ((video.readyState <= HTMLMediaElement.HAVE_CURRENT_DATA || video.paused )) {
                    gotstream = true;

                    console.log("new part onRemoteStreamStartsFlowing", _config);

                    if (config.onRemoteStream)
                        config.onRemoteStream({
                            video: video,
                            stream: _config.stream,
                            joinSocket: _config.joinSocket
                        });

                    if (isbroadcaster && channels.split('--').length > 3) {
                        /* broadcasting newly connected participant for video-conferencing! */
                        defaultSocket.send({
                            newParticipant: socket.channel,
                            userToken: self.userToken,
                            joinSocket: joinSocket
                        });
                    }

                } else setTimeout(onRemoteStreamStartsFlowing, 50);
            }

            function sendsdp(sdp) {
                socket.send({
                    userToken: self.userToken,
                    sdp: JSON.stringify(sdp)
                });
            }

            function socketResponse(response) {
                if (response.userToken == self.userToken) return;
                if (response.sdp) {
                    inner.sdp = JSON.parse(response.sdp);
                    selfInvoker();
                }

                if (response.candidate && !gotstream) {
                    if (!peer) console.error('missed an ice', response.candidate);
                    else
                        peer.addICE({
                            sdpMLineIndex: response.candidate.sdpMLineIndex,
                            candidate: JSON.parse(response.candidate.candidate)
                        });
                }

                if (response.left) {
                    if (peer && peer.peer) {
                        peer.peer.close();
                        peer.peer = null;
                    }
                }
            }

            var invokedOnce = false;

            function selfInvoker() {
                if (invokedOnce) return;

                invokedOnce = true;

                if (isofferer) peer.addAnswerSDP(inner.sdp);
                else initPeer(inner.sdp);
            }
        }

        function startBroadcasting() {
            defaultSocket && defaultSocket.send({
                roomToken: self.roomToken,
                roomName: self.roomName,
                joinSocket: self.joinSocket,
                broadcaster: self.userToken
            });
            setTimeout(startBroadcasting, 3000);
        }

        function onNewParticipant(channel) {
            if (!channel || channels.indexOf(channel) != -1 || channel == self.userToken) return;
            channels += channel + '--';

            var new_channel = uniqueToken();
            openSubSocket({
                channel: new_channel
            });

            defaultSocket.send({
                participant: true,
                userToken: self.userToken,
                joinUser: channel,
                channel: new_channel,
                joinSocket: joinSocket
            });
        }

        function uniqueToken() {
            var s4 = function() {
                return Math.floor(Math.random() * 0x10000).toString(16);
            };
            return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
        }

        function leave() {
            var length = sockets.length;
            for (var i = 0; i < length; i++) {
                var socket = sockets[i];
                if (socket) {
                    socket.send({
                        left: true,
                        userToken: self.userToken
                    });
                    delete sockets[i];
                }
            }

            // if owner leaves; try to remove his room from all other users side
            if (isbroadcaster) {
                defaultSocket.send({
                    left: true,
                    userToken: self.userToken,
                    roomToken: self.roomToken
                });
            }

            if (config.attachStream) config.attachStream.stop();
        }

        window.onbeforeunload = function() {
            leave();
        };

        openDefaultSocket();

        return {
            createRoom: function(_config) {
                /* _config :
                    {
                        roomName: name,
                        roomPass: pass
                    }
                 */
                self.roomName = _config.roomName || 'Anonymous';
                self.roomToken = uniqueToken();

                watchService.emit("conference:save", {
                    roomName: self.roomName,
                    roomToken: self.roomToken,
                    broadcaster: self.userToken,
                    username: USERNAME
                });

                isbroadcaster = true;
                isGetNewRoom = false;
                startBroadcasting();
            },
            joinRoom: function(_config) {
                /*
                    _config: {
                         roomName: $scope.roomName,
                         roomToken: data.roomToken,
                         joinUser: data.broadcaster,
                         joinSocket: socket.id
                    }
                 */
                self.roomToken = _config.roomToken;
                isGetNewRoom = false;

                watchService.emit("user:join", {
                    roomName: _config.roomName,
                    username: USERNAME
                });

                self.joinedARoom = true;
                self.broadcasterid = _config.joinUser;
                self.joinSocket = _config.joinSocket;

                // send old participants
                openSubSocket({
                    channel: self.userToken
                });

                defaultSocket.send({
                    participant: true,
                    userToken: self.userToken,
                    joinUser: _config.joinUser,
                    joinSocket: _config.joinSocket
                });
            },
            leaveRoom: leave,
            /**
             * draw video in DOM and then call getUserMedia
             * @param callback
             */
            captureUserMedia: function(callback) {
                var container = $("<li></li>").addClass("b-video");
                var video = document.createElement("video");
                var mute = $("<button></button>").html("Mute").addClass("btn btn-sm btn-danger btn-mute").attr("data-switch", true);
                var hide = $("<button></button>").html("Hide").addClass("btn btn-sm btn-danger btn-hide").attr("data-switch", true);

                mute.on("click", function () {
                    if ($scope.controls.getAudioTracks()[0] !== undefined) {
                        $scope.controls.getAudioTracks()[0].enabled = !$(this).data("switch");
                        $(this).removeClass('btn-' + !$(this).data("switch")).addClass('btn-' + $(this).data("switch"));
                        $(this).data("switch", !$(this).data("switch"));
                    }
                });

                hide.on("click", function () {
                    if ($scope.controls.getVideoTracks()[0] !== undefined) {
                        $scope.controls.getVideoTracks()[0].enabled = !$(this).data("switch");
                        $(this).removeClass('btn-' + !$(this).data("switch")).addClass('btn-' + $(this).data("switch"));
                        $(this).data("switch", !$(this).data("switch"));
                    }
                });

                video.setAttribute("autoplay", true);
                video.setAttribute("controls", true);
                video.muted = true;
                video.style.height = "160px";
                video.style.width = "240px";
                video.style.visibility = "visible";

                container.append(video);
                container.append(mute);
                container.append(hide);

                $("#videos-container").prepend(container);

                getUserMedia({
                    video: video,
                    isVideo: true,
                    onsuccess: function (stream) {
                        stunService.attachStream = stream;
                        $scope.controls = stream;
                        video.setAttribute('muted', true);
                        callback();
                    }
                }, function (e) {
                    if (e.name.length > 0) {
                        getUserMedia({
                            video: video,
                            isVideo: false,
                            onsuccess: function (stream) {
                                stunService.attachStream = stream;
                                $scope.controls = stream;
                                video.setAttribute('muted', true);
                                callback();
                            }
                        }, function (e) {
                            console.log(e);
                        });
                    }
                });
            }
        };
    }
]);


