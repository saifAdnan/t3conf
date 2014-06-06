"use strict";

/**
 * Array for rooms names
 * @type {Array}
 */
var conferences = {};

function objectLength(obj) {
    var len = obj.length ? --obj.length : 0;
    for (var k in obj) {
        len++;
    }
    return len;
}

module.exports = function (socket, rooms, usernames) {
    /**
     * Check if room already exists
     * @param roomName
     * @returns {Boolean}
     */
    var roomIsExist = function(roomName) {
        for (var i = 0; i < rooms.length; i = i + 1) {
            return rooms[i].roomName === roomName;
        }
        return false;
    };

    /**
     * Conference new
     */
    socket.on("conference:new", function(data) {
        if (!roomIsExist(data.roomName)) {
            conferences[data.roomName] = data.roomPass;
            socket.emit("conference:roomIsExist", {
                isExist: false,
                roomName: data.roomName
            });
        } else {
            socket.emit("conference:roomIsExist", {isExist: true});
        }
    });

    socket.on("conference:get", function(data) {
        if (data.roomName) {
            var isSecure = false;

            if (objectLength(conferences) === 0) {
                socket.emit("conference:get", {
                    notFound: true
                });
                return false;
            }

            if (conferences[data.roomName]) {
                isSecure = true;
            }

            socket.emit("conference:get", {
                roomName: data.roomName,
                roomIsSecure: isSecure
            });
        }
    });

    socket.on("conference:enter", function(data) {
        if (conferences[data.roomName] === data.roomPass) {
            socket.emit("conference:enter", { enter: true });
        } else {
            socket.emit("conference:enter", { enter: false});
        }
    });



    /**
     * Conference remove
     * remove room if users in room ===1
     * remove user if users in room > 1
     */
    socket.on("conference:remove", function(data) {
        var username = data.username,
            roomName = data.roomName;

        if (roomName && roomName.length > 0) {
            for (var j =0; j < rooms.length; j = j + 1) {
                if (rooms[j].roomName && rooms[j].roomName == roomName) {
                    rooms.splice(j, 1);
                    delete conferences[roomName];
                    socket.broadcast.emit("rooms:update", {
                        users: [data.username]
                    });
                }
            }
            for (var i = 0; i < rooms.length; i = i + 1) {
                if (rooms[i].roomName && rooms[i].roomName == roomName) { //&& rooms[i].users && rooms[i].users.length === 1
                    rooms.splice(i, 1);
                    delete conferences[roomName];
                    //console.log(roomName + " - Conference has been removed!");
                }/* else {
                    *//**
                     * if users count > 1 then we remove the leaver
                     *//*
                    if (rooms[i].users) {
                        for (var j = 0; j < rooms[i].users.length; j++) {
                            if (rooms[socket.id] == username) {
                                delete rooms[j].users[socket.id];
                                socket.broadcast.emit("rooms:update", {
                                    users: rooms[j].users
                                });
                            }
                        }
                    }
                }*/
            }
        }
    });

    /**
     * Conference save
     * push new room in rooms array
     */
    socket.on("conference:save", function (data) {
        data.users = {};
        data.users[socket.id] = data.username;
        usernames[data.username] = socket.id;
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
        for (var i = 0; i < rooms.length; i = i + 1) {
            if (rooms[i].roomName === data.roomName) {
                rooms[i].users[socket.id] = data.username;
                usernames[data.username] = socket.id;
                //console.log("user - " + data.username + " has joined the room " + data.roomName);
                socket.broadcast.emit("rooms:update", {
                    users: rooms[i].users
                });
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
            delete rooms[i].users[socket.id];
            break;
        }
        socket.broadcast.emit("rooms:update", {
           users: rooms[i].users
        });
    });
};