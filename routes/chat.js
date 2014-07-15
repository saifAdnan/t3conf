// export function for listening to the socket
module.exports = function (socket, io, channel, confs, ami) {
    socket.channel = channel;

    // broadcast a user's message to other users
    socket.on('send:message', function (data) {
        console.log("send", data);
        if (data.private && data.to && data.roomName) {
            var socket_id = web_users[data.to];
            if (io.of("/" + channel).sockets[socket_id]) {
                io.of("/" + channel).sockets[socket_id].emit('send:message', {
                    from: data.from,
                    text: data.message,
                    private: true
                });
            }
        } else {
            socket.broadcast.emit('send:message', {
                from: data.from,
                text: data.message
            });
        }
    });

    socket.on("kick", function (data) {
        console.log(data, "kick");
        ami.send({
            action: 'Hangup',
            Channel: data.channel,
        });
        var socket_id = web_users[data.username];
        if (io.of("/" + channel).sockets[socket_id]) {
            io.of("/" + channel).sockets[socket_id].emit('kick:user',{});
        }
    });

    socket.on('disconnect', function () {
        console.log("deleted");
        if (web_users_for_names[socket.id]) {
            var name = web_users_for_names[socket.id];
            socket.broadcast.emit('chat:user:left', {
                name: name
            });
        }
    });
};