// export function for listening to the socket
module.exports = function (socket, io, channel, rooms) {
    var name,
        usernames,
        id = 0;

    socket.channel = channel;

    socket.on("init", function () {

        for (var i = 0; i < rooms.length; i = i + 1) {
            if (rooms[i].roomName == channel) {
                for (var n in rooms[i].users) {
                    if (n == socket.id) {
                        name = rooms[i].users[n];
                        break;
                    }
                }
            }
        }

        // notify other clients that a new user has joined
        socket.broadcast.emit('user:join', {
            name: name
        });

    });



    // broadcast a user's message to other users
    socket.on('send:message', function (data) {

        if (data.private && data.to && data.roomName) {

            for (var i = 0; i < rooms.length; i = i + 1) {
                if (rooms[i].roomName == channel) {
                    usernames = rooms[i].users;
                    break;
                }
            }

            var id = 0;

            for (var sk in usernames) {
                if (usernames[sk].username == data.to) {
                    id = sk;
                    break;
                }
            }

            if (io.of("/" + channel).sockets[id]) {
                io.of("/" + channel).sockets[id].emit('send:message', {
                    user: name,
                    text: data.message,
                    private: true
                });
            }

        } else {
            socket.broadcast.emit('send:message', {
                user: name,
                text: data.message
            });
        }
    });

    // clean up when a user leaves, and broadcast it to other users
    socket.on('disconnect', function () {
        socket.broadcast.emit('chat:user:left', {
            name: name
        });
    });
};
