// export function for listening to the socket
module.exports = function (socket, io, channel, confs, web_users, web_users_for_names, ami) {
    var name,
        usernames,
        id = 0;

    socket.channel = channel;

    socket.on("init", function (data) {
        // notify other clients that a new user has joined
        socket.broadcast.emit('user:join', {
            name: data.username
        });

    });

    // broadcast a user's message to other users
    socket.on('send:message', function (data) {
        console.log("send", data)
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
        ami.send({
            action: 'Hangup',
            Channel: "/^SIP/"+data.username+"-.*$/",

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