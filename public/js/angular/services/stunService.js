app.factory('stunService', ['$http', '$rootScope', '$routeParams', function ($http, $rootScope, $routeParams) {
    var defaultChannel = $routeParams.name,
        table_container = $(".table-rooms");

    var channel = defaultChannel;
    var sender = Math.round(Math.random() * 999999999) + 999999999;

    return {
        openSocket: function (config) {
            var channel = config.channel || defaultChannel;
            var sender = Math.round(Math.random() * 999999999) + 999999999;

            io.connect(SIGNALING_SERVER).emit('new-channel', {
                channel: channel,
                sender: sender
            });

            var socket = io.connect(SIGNALING_SERVER + channel);
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
            console.log("stream remote");
            var container = $("<li></li>").addClass("b-video");
            var video = media.video;

            video.setAttribute('id', media.stream.id);
            video.setAttribute("controls", true);
            video.style.height = "160px";
            video.style.width = "240px";
            video.style.visibility = "visible";

            container.append(video);

            $("#videos-container").prepend(container);
            video.play();
        },
        onRemoteStreamEnded: function (stream) {
            var video = document.getElementById(stream.id);
            if (video) video.parentNode.removeChild(video);
        },
        onRoomFound: function (room) {
            var alreadyExist = table_container.find('.col-sm-10 span:first-child').html();
            if (alreadyExist === room.roomName) return;
            $rootScope.rooms.push(room);
            $rootScope.$apply();
        }
    };
}]);