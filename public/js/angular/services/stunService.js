app.factory('stunService', ['$http', '$rootScope', function ($http, $rootScope) {
    var defaultChannel = ROOM_NAME,
        table_container = $(".table-rooms");

    var sender = USERNAME;

    return {
        socket: function () {
            return io.connect(SIGNALING_SERVER + channel);
        },
        openSocket: function (config) {
            channel = config.channel || defaultChannel;

            io.connect(SIGNALING_SERVER).emit('new-channel', {
                channel: channel,
                sender: sender
            });

            var socket = this.socket();
            socket.channel = channel;
            socket.on('connect', function () {
                if (config.callback) config.callback(socket);
            });

            socket.send = function (message) {
                socket.emit('message', {
                    sender: sender,
                    data: message
                });
            };

            socket.on('message', config.onmessage);
        },
        onRemoteStream: function (media) {
            var container = $("<li></li>").addClass("b-video");
            var video = media.video;


            video.setAttribute("controls", true);
            video.style.height = "160px";
            video.style.width = "240px";
            video.style.visibility = "visible";

            container.append(video);

            $("#videos-container").prepend(container);
            video.play();
        }/*,
        onRemoveStream: function (stream) {
            console.log("ended", stream);
        }*/,
        onRoomFound: function (room) {
            var alreadyExist = table_container.find('.col-sm-10 span:first-child').html();
            if (alreadyExist === room.roomName) return;
            $rootScope.rooms.push(room);
            $rootScope.$apply();
        }
    };

}]);