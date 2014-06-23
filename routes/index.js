var fs = require('fs');
var passport = require('passport');
var Users = require('../models/users');

module.exports = function (app, rooms, ami) {
    "use strict";

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Get Requests
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Route /
     * redirect to /login
     */
    app.get('/', function (req, res) {
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
    app.get("/users", function (req, res) {
        if (req.session.passport.user) {
            if (req.user.role === "admin" || req.user.moderator && req.user.approved) {
                Users.find({role: 'user', _id: {'$ne': req.user._id + ''}}, function (err, users) {

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
            } else {
                res.end();
            }
        }
    });

    /**
     * route /login
     * render login.html
     */
    app.get('/login', function (req, res) {
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
    app.get('/register', function (req, res) {
        res.render('register', {
            title: 'Sign up',
        });
    });

    /**
     * route /logout
     * clear cookies and redirect to /login
     */
    app.get('/logout', function (req, res) {
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
        var json;
        for (var i = 0; i < rooms_arr.length; i++) {
            if (rooms_arr[i].name == roomName) {
                json = rooms_arr[i];
                break;
            }
        }
        res.json(json);
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Post Requests
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * route /users
     * set approve and moderator to user
     */
    app.post("/users", function (req, res) {
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
    app.post('/login', function (req, res) {
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
            req.logIn(user, function (err) {
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
    app.post('/register', function (req, res) {
        var username = req.body.username;

        var errors = [];


        Users.collection.find({sip: parseInt(req.body.sip)}).toArray(function (err, doc) {

            if (req.body.username === "") {
                errors.push({error: "Please enter your username!"});
            }

            if (req.body.firstname === "") {
                errors.push({error: "Please enter your first name!"});
            }

            if (req.body.lastname === "") {
                errors.push({error: "Please enter your last name!"});
            }

            if (req.body.phone === "") {
                errors.push({error: "Please enter your phone number!"});
            }


            if (req.body.sip === "") {
                errors.push({error: "please enter SIP number!"});
            }

            if (doc.length > 0) {
                errors.push({error: "SIP number already been registered!"});
            }


            if (req.body.password === "") {
                errors.push({error: "Please enter your password!"});
            }

            if (req.body.password_confirm === "") {
                errors.push({error: "Please enter your password confirm!"});
            }

            if (errors.length) {
                return res.render('register', {
                    title: 'Sign up',
                    username: req.body.username,
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    phone: req.body.phone,
                    error: errors
                });
            }

            if (req.body.password !== req.body.password_confirm) {
                return res.render('register', {
                    title: 'Sign up',
                    username: req.body.username,
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    phone: req.body.phone,
                    error: "Password doesn't match"
                });
            }

            Users.register(new Users({
                username: username,
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                phone: req.body.phone,
                sip: req.body.sip,
                password: req.body.password,
                approved: false,
                moderator: false,
                role: 'user',
                date: new Date().getTime()
            }), req.body.password, function (err, account) {
                if (err) {
                    return res.redirect('/login');
                }
                passport.authenticate('local')(req, res, function () {
                    res.render('login', {
                        title: "Sign in",
                        message: "You have been successfully singed up! Thank you for signing up to T3Conf. Now you can sign in.",
                        username: username
                    });
                    Users.collection.find({}).toArray(function (err, doc) {
                        var users = fs.createWriteStream("asterisk/users.conf");
                        var extensions = fs.createWriteStream("asterisk/extensions.conf");
                        extensions.write("[someuser]\n");

                        for (var i = 0; i < doc.length; i = i + 1) {
                            users.write("[" + doc[i].username + "]\n");
                            users.write("fullname=" + doc[i].firstname + " " + doc[i].lastname + "\n");
                            users.write("secret=" + doc[i].password + "\n");
                            users.write("qualify=yes\n");
                            users.write("type=friend\n");
                            users.write("canreinvite=no\n");
                            users.write("host=dynamic\n");
                            users.write("disallow=all\n");
                            users.write("allow=ulaw\n");
                            users.write("allow=alaw\n");
                            users.write("hassip=yes\n");
                            users.write("callwaiting=yes\n");
                            users.write("context=someuser\n");
                            users.write("nat=force_rport,comedia\n");
                            users.write("\n");


                            extensions.write("exten => "+doc[i].sip+",1,Dial(SIP/"+doc[i].username+")\n");

                            if (i + 1 === doc.length) {
                                users.end();
                                extensions.end();
                                setTimeout(function () {
                                    ami.send({action: 'Reload'});
                                }, 1000);
                            }
                        }

                    });
                });
            });

        });
    });

    app.post('/action/newConference', function (req, res) {
        var conferences = fs.createWriteStream("asterisk/conferences.conf");
        conferences.write("[someuser]\n");
        conferences.write("exten => "+req.body.conf_number+",1,Goto("+req.body.conf_name+",1)\n");
        conferences.write("exten => "+req.body.conf_name+",1,Answer");
        conferences.write("exten => "+req.body.conf_name+",n,ConfBridge("+req.body.conf_name+",test.common,test.user,test.menu)");
        conferences.write("exten => "+req.body.conf_name+",n,Hangup()");
        conferences.end();
        setTimeout(function () {
            ami.send({action: 'Reload'});
        }, 1000);
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
        if (req.session.passport.user) {

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
        } else {
            res.redirect("/login");
        }


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