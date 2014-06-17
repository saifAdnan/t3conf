var passport = require('passport');
var Users = require('../models/users');

module.exports = function (app, rooms, socket) {
    "use strict";

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Get Requests
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Route /
     * redirect to /login
     */
    app.get('/', function(req, res) {
        if (req.session.passport.user && req.user.approved) {
            res.render("index", {
                partials: {
                    yield: 'home.html'
                },
                title: "Home",
                username: req.user.username
            });
        } else {
            if (req.user) {
                res.redirect("/login?approved=false");
            } else {
                res.redirect("/login");
            }
        }

    });

    /**
     * route /rooms
     * return JSON for current conferences
     */
    app.get('/rooms', function (req, res) {
        var rooms_arr = rooms;
        res.json(rooms_arr);
    });

    /**
     * route /users
     * return JSON for users
     */
    app.get("/users", function(req, res) {
        if (req.session.passport.user) {
            if (req.user.role === "admin" || req.user.moderator && req.user.approved) {
                Users.find({role: 'user', _id : {'$ne': req.user._id + ''}}, function (err, users) {

                    var rtn = {};
                    rtn.moderator = req.user.moderator;
                    rtn.isAdmin = req.user.role == "admin" ? true : false;
                    rtn.users = [];

                    for (var i = 0; i < users.length; i = i + 1) {
                        var a = {};
                        a.username = users[i].username;
                        a.firstname = users[i].firstname,
                        a.lastname = users[i].lastname,
                        a._id = users[i]._id;
                        a.role = users[i].role;
                        a.date = users[i].date;
                        if (req.user.role === "admin") {
                            a.moderator = users[i].moderator;
                        }
                        a.approved = users[i].approved;
                        rtn.users.push(a);
                    }

                    res.json(rtn);
                });
            }
        }
    });

    /**
     * route /login
     * render login.html
     */
    app.get('/login', function(req, res) {
        if (req.session.passport.user && req.query.approved !== "false") {
            res.redirect("/");
        }

        var options = {
            title: 'Sign in',
        };

        if (req.query.approved === "false") {
            options.error = "You do not have permission to view this page! \n Please wait for approval"
        }
        res.render('login', options);
    });

    /**
     * route /register
     * render register.html
     */
    app.get('/register', function(req, res) {
        res.render('register', {
            title: 'Sign up',
        });
    });

    /**
     * route /logout
     * clear cookies and redirect to /login
     */
    app.get('/logout', function(req, res) {
        req.logout();
        res.clearCookie('remember');
        res.redirect('/login');
    });

    /**
     * /action/roomInfo
     * return room info JSON
     */
    app.get('/action/roomInfo', function (req, res) {
        var roomName = req.body.roomName;
        var rooms_arr = rooms;
        for (var i = 0; i < rooms_arr.length; i++) {
            if (rooms_arr[i].name == roomName) {
                res.json(rooms_arr[i]);
            }
        }
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Post Requests
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * route /users
     * set approve and moderator to user
     */
    app.post("/users", function(req, res) {
        if (req.session.passport.user) {
            var _id = req.body.id,
                approved = req.body.approved,
                moderator = req.body.moderator;

            if (req.user.role === "admin") {
                if (moderator !== undefined) {
                    Users.update({_id: _id}, {moderator: moderator}, function (err, update) {
                        res.json(_id);
                    });
                } else if (approved !== undefined) {
                    Users.update({_id: _id}, {approved: approved}, function (err, update) {
                        res.json(_id);
                    });
                }
            } else {
                if (req.user.moderator) {
                    if (approved !== undefined) {
                        Users.update({_id: _id}, {approved: approved}, function (err, update) {
                            res.json(_id);
                        });
                    }
                }
            }
        }
    });

    /**
     * route /login
     * login authorization
     */
    app.post('/login', function(req, res) {
        passport.authenticate('local', function (err, user) {
            if (err) {
                console.log(err);
                return false;
            }

            if (!user) {
                return res.render('login', {
                    title: 'Sign in',
                    layout: false,
                    error: 'Incorrect email or password'
                });
            }
            req.logIn(user, function(err) {
                var minute = 60 * 1000 * 24 * 7;
                if (req.body.remember) {
                    res.cookie('remember', 1, { maxAge: minute });
                }
                return res.redirect('/');
            });
        })(req, res);
    });

    /**
     * route /register
     * register new user
     */
    app.post('/register', function(req, res) {
        var username = req.body.username;

        Users.register(new Users({
            username : username,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            approved: false,
            moderator: false,
            role: 'user',
            date: new Date().getTime()
        }), req.body.password, function(err, account) {
            if (err) {
                return res.redirect('/login');
            }
            passport.authenticate('local')(req, res, function () {
                res.render('login', {
                    title: "Sign in",
                    message: "You have been successfully singed up! Thank you for signing up to T3Conf. Now you can sign in.",
                    username: username
                });
            });
        });
    });

    /**
     * route /action/removeUser
     * Remove user
     */
    app.post('/action/removeUser', function (req, res) {
        var _id = req.body.id;

        Users.find({ _id: _id}).remove(function () {
            res.end();
        });

    });

    /**
     * route /room/:name
     * render room.html
     */
    app.post('/room/:name', function (req, res) {
        var roomName = req.body.conf_name,
            roomPass = req.body.conf_pass,
            username = req.user.username;

        res.render("index", {
            title: 'Room ' + roomName,
            isPost: true,
            roomName: roomName,
            roomPass: roomPass,
            username: username,
            partials: {
                yield: 'room.html'
            }
        });

    });

    app.get('/room/:name', function (req, res) {
        var roomName = req.params.name,
            username = req.user.username;

        res.render("index", {
            title: 'Room ' + roomName,
            isPost: false,
            roomName: roomName,
            username: username,
            partials: {
                yield: 'room.html'
            }
        });


    });

    app.post("/conference/save", function (req, res) {
        rooms.push(req.body);

        socket.emit("rooms:update", {
            users: [req.body.username]
        });

        socket.broadcast.emit("rooms:update", {
            users: [req.body.username]
        });
    });
};