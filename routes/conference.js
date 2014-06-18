module.exports = function (socket, rooms) {
    "use strict";

    /**
     * Object length
     * @param obj
     * @returns {number}
     */
    function objectLength(obj) {
        var len = obj.length ? --obj.length : 0;
        for (var k in obj) {
            len++;
        }
        return len;
    }

    /**
     * Check if room already exists
     * @param roomName
     * @returns {Boolean}
     */
    function roomIsExist(roomName) {
        for (var i = 0; i < rooms.length; i = i + 1) {
            return rooms[i].roomName === roomName;
        }
        return false;
    }

    /**
     * Conference new
     */
    socket.on("conference:new", function (data) {
        if (!roomIsExist(data.roomName)) {
            socket.emit("conference:roomIsExist", {
                isExist: false,
                roomName: data.roomName
            });
        } else {
            socket.emit("conference:roomIsExist", {isExist: true});
        }
    });

    /**
     * Conference get
     */
    socket.on("conference:get", function (data) {
        if (data.roomName) {
            var isSecure = false;

            socket.emit("conference:get", {
                roomName: data.roomName,
                roomIsSecure: isSecure
            });
        }
    });

    /**
     * Conference enter
     */
    socket.on("conference:enter", function (data) {
        /*if (conferences[data.roomName] === data.roomPass) {
         socket.emit("conference:enter", { enter: true });
         } else {
         socket.emit("conference:enter", { enter: false});
         }*/
    });

    /**
     * Conference remove
     * remove room if users in room ===1
     * remove user if users in room > 1
     */
    socket.on("conference:remove", function (data) {
        var roomName = data.roomName;

        if (roomName && roomName.length > 0) {
            if (rooms.length === 0) return false;
            for (var j = 0; j < rooms.length; j = j + 1) {
                if (rooms[j]) {
                    if (rooms[j].roomName && rooms[j].roomName == roomName) {
                        rooms.splice(j, 1);
                        //delete conferences[roomName];
                        socket.broadcast.emit("rooms:update", {
                            users: [data.username]
                        });
                    }
                }
            }
        }
    });

    /**
     * Conference save
     * push new room in rooms array
     */
    socket.on("conference:save", function (data) {
        data.users = {};
        data.users[socket.id] = {
            username: data.username,
            roomToken: data.roomToken,
            broadcaster: data.broadcaster
        };
        rooms.push(data);

        socket.emit("rooms:update", {
            users: [data.username]
        });
        socket.broadcast.emit("rooms:update", {
            users: [data.username]
        });
    });

    /**
     * User join
     * Add user to room's users
     */
    socket.on("user:join", function (data) {
        /*
         {
         roomName: 'ROOM NAME',
         username: 'USERNAME',
         roomToken: '4db1b4bf-8b08-186d-a311-87402cb7d80d',
         broadcaster: 'c7c3af0-e86b-cdf9-5b26-4cd41be706a'
         }
         */
        for (var i = 0; i < rooms.length; i = i + 1) {
            if (rooms[i].roomName === data.roomName) {
                rooms[i].users[socket.id] = {
                    username: data.username,
                    roomToken: data.roomToken,
                    broadcaster: data.broadcaster
                };
                socket.emit("rooms:update", {
                    users: rooms[i].users
                });
                socket.broadcast.emit("rooms:update", {
                    users: rooms[i].users
                });
                socket.broadcast.emit("user:join", {

                    username: data.username,
                    roomToken: data.roomToken,
                    broadcaster: data.broadcaster,
                    joinSocket: data.joinSocket

                });
                break;
            }
        }
    });

    socket.on("change:broadcaster", function (data) {
        for (var i = 0; i < rooms.length; i = i + 1) {
            if (rooms[i].users[data.socket]) {
                rooms[i].roomToken = rooms[i].users[data.socket].roomToken;
                rooms[i].broadcaster = rooms[i].users[data.socket].broadcaster;
                break;
            }
        }
    });

    /**
     * User left
     * remove it from rooms users
     */
    socket.on('disconnect', function () {
        if (!rooms.length) return false;

        for (var i = 0; i < rooms.length; i = i + 1) {
            if (objectLength(rooms[i].users) === 1 && rooms[i].users[socket.id]) {
                rooms.splice(i, 1);
                socket.broadcast.emit("rooms:update", {});
                break;
            } else {
                if (rooms[i].users[socket.id]) {
                    delete rooms[i].users[socket.id];
                    socket.broadcast.emit("rooms:update", {users: rooms[i].users});
                    socket.broadcast.emit("change:broadcaster", {});
                    break;
                }
            }
        }

        var users = rooms[i] ? rooms[i].users : {};

        socket.broadcast.emit("user:left", {socketid: socket.id});
    });
};