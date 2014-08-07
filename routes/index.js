var fs = require('fs'),
    passport = require('passport'),
    Users = require('../models/users'),
    Conferences = require('../models/conferences'),
    Records = require("../models/records"),
    settings = require('../settings');


module.exports = function (app, ami, confs) {
    "use strict";

    function updateSipUsers() {
        Users.collection.find({}).toArray(function (err, doc) {
            var users = fs.createWriteStream("asterisk/users.conf");
            var extensions = fs.createWriteStream("asterisk/extensions.conf");
            extensions.write("[someuser]\n");
            extensions.write("#include /var/www/t3conf/asterisk/conferences.conf\n\n");

            for (var i = 0; i < doc.length; i = i + 1) {
                users.write("[" + doc[i].username + "]\n");
                users.write("fullname=" + doc[i].firstname + " " + doc[i].lastname + "\n");
                users.write("secret=" + doc[i].password + "\n");
                users.write("qualify=yes\n");
                users.write("type=friend\n");
                users.write("canreinvite=no\n");
                users.write("host=dynamic\n");
                users.write("hassip=yes\n");
                users.write("callwaiting=yes\n");
                users.write("context=someuser\n");
                users.write("\n");

                extensions.write("exten => " + doc[i].sip + ",1,Dial(SIP/" + doc[i].username + ")\n");

                if (i + 1 === doc.length) {
                    users.end();
                    extensions.end();
                    setTimeout(function () {
                        ami.send({action: 'Reload'});
                    }, 1000);
                }
            }
        });
    }

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
                title: "Home",
                username: req.user.username,
                sip: req.user.sip,
                role: req.user.role,
                moderator: req.user.moderator,
                password: req.user.password,
                firstname: req.user.firstname,
                lastname: req.user.lastname
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
     * route /conferences
     * return JSON for current conferences
     */
    app.get('/conferences', function (req, res) {
        res.json(confs);
    });

    /**
     * route /users
     * return JSON for users
     */
    app.get("/users", function (req, res) {

        var from = req.query.from || 0;
        var limit = req.query.limit || 10;
        var search = req.query.search || null;
        var approved = req.query.approved;
        var q;
        var rtn = {};
        var total;

        if (req.session.passport.user) {
            if (req.user.role === "admin" || req.user.moderator && req.user.approved) {
                if (search !== null) {
                    q = Users.find({
                        '$or':[
                            { username: {$regex: search} },
                            { firstname: {$regex: search} },
                            { lastname: {$regex: search} }
                        ]
                    }).skip(from * limit).limit(limit);

                    total = Users.find({username: {$regex: search}}).sort('reg_date');
                    total.exec(function(err, users) {
                        rtn.total = users.length;
                    });
                } else if (search === null && approved == 'false' || approved == undefined) {
                    total = Users.find().sort('reg_date');

                    total.exec(function(err, users) {
                        rtn.total = users.length;
                    });

                    q = Users.find({}).sort('reg_date').skip(from * limit).limit(limit);
                } else if (approved == 'true') {
                    total = Users.find({approved: false}).sort('reg_date');

                    total.exec(function(err, users) {
                        rtn.total = users.length;
                    });

                    q = Users.find({approved: false}).sort('reg_date').skip(from * limit).limit(limit);
                }

                q.exec(function (err, users) {
                    rtn.users = [];
                    if (users && users.length) {
                        for (var i = 0; i < users.length; i = i + 1) {
                            var a = {};
                            a._id = users[i]._id;
                            a.username = users[i].username;
                            a.firstname = users[i].firstname;
                            a.lastname = users[i].lastname;
                            a.role = users[i].role;
                            a.sip = users[i].sip;
                            a.phone = users[i].phone;
                            a.reg_date = users[i].reg_date;
                            a.moderator = users[i].moderator;
                            a.approved = users[i].approved;
                            rtn.users.push(a);
                        }
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

    app.post('/action/getFiles', function (req, res) {
        var from = req.body.start.toString(),
            to = req.body.end.toString();
        Records.collection.find({date: { $gte: from, $lt: to}}).toArray(function (err, doc) {
            if (err) console.log(err);
            res.json(doc);
        });
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

            if (req.user.role === "admin" || req.user.moderator) {
                if (moderator !== undefined && approved !== undefined) {
                    Users.update({_id: _id}, {moderator: moderator}, function (err, update) {
                        res.end("updated");
                    });
                    Users.update({_id: _id}, {approved: approved}, function (err, update) {
                        res.end("updated");
                    });
                } else if (moderator !== undefined) {
                    Users.update({_id: _id}, {moderator: moderator}, function (err, update) {
                        console.log("yes 1");
                        res.end("updated");
                    });
                } else if (approved !== undefined) {
                    Users.update({_id: _id}, {approved: approved}, function (err, update) {
                        res.end("updated");
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

    app.post("/user/update", function (req, res) {
        if (req.session.passport.user) {
            if (req.user.role === "admin") {
                Users.collection.find({
                    username: {
                        '$ne': req.body.username
                    },
                    sip: parseInt(req.body.sip, 10)

                }).toArray(function (err, doc) {
                    if (doc && doc.length) {
                        res.end("SIP is already in use.");
                    } else {
                        Users.findOne({_id: req.body._id}, function (err, user) {
                            console.log(user, req.body.password);
                            user.setPassword(req.body.password, function () {
                                user.save();
                            });
                        });
                        Users.update({_id: req.body._id}, {
                            firstname: req.body.firstname,
                            lastname: req.body.lastname,
                            sip: req.body.sip,
                            phone: req.body.phone,
                            moderator: req.body.moderator,
                            approved: req.body.approved
                        }, function (err, user) {
                            if (err) {
                                console.log(err);
                                return false;
                            }
                            updateSipUsers();
                            res.end(0);
                        });
                    }
                });
            }
        }
    });

    app.post("/user/new", function (req, res) {
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

            if (req.body.password === "") {
                errors.push({error: "Please enter your password!"});
            }

            if (req.body.password_c === "") {
                errors.push({error: "Please enter your password confirm!"});
            }

            if (errors.length) {
                return res.end(errors);
            }

            if (req.body.password !== req.body.password_c) {
                return res.render("Password doesn't match");
            }

            Users.collection.find().sort({$natural:1}).exec(function(err, user) {
                console.log(user.sip);
            });

            Users.collection.find({username: req.body.username}).toArray(function (err, doc) {
                if (doc.length) {
                    return res.end("Username is already in use.");
                } else {
                    Users.register(new Users({
                        username: username,
                        firstname: req.body.firstname,
                        lastname: req.body.lastname,
                        phone: req.body.phone,
                        sip: req.body.sip,
                        password: req.body.password,
                        approved: req.body.approved,
                        moderator: req.body.moderator,
                        role: 'user',
                        reg_date: parseInt(new Date().getTime() / 1000, 10)
                    }), req.body.password, function (err, account) {
                        if (err) {
                            return res.end('error');
                        }
                        updateSipUsers();
                        res.end("ok");
                    });
                }
            });
        });
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
                    error: 'Incorrect username or password'
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

        Users.collection.find().sort({$natural:-1}).toArray(function(err, user) {
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

            var sip = parseInt(user[0].sip, 10) + 1;

            Users.collection.find({username: req.body.username}).toArray(function (err, doc) {
                if (doc.length) {
                    return res.render('register', {
                        title: 'Sign up',
                        username: req.body.username,
                        firstname: req.body.firstname,
                        lastname: req.body.lastname,
                        phone: req.body.phone,
                        error: "Username is already in use."
                    });
                } else {
                    Users.register(new Users({
                        username: username,
                        firstname: req.body.firstname,
                        lastname: req.body.lastname,
                        phone: req.body.ext + req.body.phone,
                        sip: sip,
                        password: req.body.password,
                        approved: false,
                        moderator: false,
                        role: 'user',
                        reg_date: parseInt(new Date().getTime() / 1000, 10)
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
                            updateSipUsers();
                        });
                    });
                }
            });
        });
    });

    app.post('/action/newConference', function (req, res) {
        var name = req.body.name;
        var sip = req.body.sip;
        var pin = req.body.pin;

        Conferences.collection.find({sip: sip}).toArray(function (err, doc) {
            if (doc.length > 0) {
                res.end('false');
                return false;
            }

            Conferences.collection.insert({
                name: name,
                sip: sip,
                pin: pin,
                date: new Date()
            }, function (err) {
                Conferences.collection.find({}).toArray(function (err, doc) {
                    var conferences = fs.createWriteStream("asterisk/conferences.conf");

                    conferences.write("\n");

                    for (var i = 0; i < doc.length; i = i + 1) {
                        if (doc[i].pin) {
                            conferences.write("exten => " + doc[i].sip + ",1,Authenticate(" + doc[i].pin + ")\n");
                        }

                        conferences.write("exten => " + doc[i].name + ",1,Goto(" + doc[i].sip + ", 1)\n");
                        conferences.write("exten => " + doc[i].sip + ",1,Answer()\n");
                        conferences.write("exten => " + doc[i].sip + ",n,Set(CONFBRIDGE(bridge,record_conference)=yes)\n");
                        conferences.write("exten => " + doc[i].sip + ",n,Set(CONFBRIDGE(bridge,record_file)=/var/www/asterisk/records/" + doc[i].name + ".wav)\n");
                        conferences.write("exten => " + doc[i].sip + ",n,ConfBridge(" + doc[i].sip + ",,test.user,test.menu)\n");
                        conferences.write("exten => " + doc[i].sip + ",n,Hangup()\n\n");

                        if (i + 1 === doc.length) {
                            conferences.end();
                            setTimeout(function () {
                                ami.send({action: 'Reload'});
                            }, 1000);
                        }
                    }

                });
            });

        });

        res.end("done");
    });

    /**
     * route /action/removeUser
     * Remove user
     */
    app.post('/action/removeUser', function (req, res) {
        var _id = req.body.id;
        if (req.session.passport.user) {
            if (req.user.role === "admin") {
                Users.find({ _id: _id}).remove(function () {
                    updateSipUsers();
                    res.end();
                });
            }
        }
    });

    app.post('/action/renameRecord', function (req, res) {
        var file = req.body.filename;
        var n_file = req.body.n_filename;
        var date = req.body.date;

        Records.collection.update(
            { date: date },
            { $set: {name: n_file}},
            function (err, result) {
                if (err) throw err;
                console.log(result);
            }
        );

        fs.rename(settings.PROJECT_DIR + '/public/records/' + file + '-' + date + '.wav', settings.PROJECT_DIR + '/public/records/' + n_file + '-' + date + '.wav', function (err) {
            if (err) console.log('ERROR: ' + err);
        });
        res.end('File has been deleted!');
    });

    app.post('/action/clearRecord', function (req, res) {
        var unix = req.body.date;
        var file = req.body.file;
        Records.collection.remove({ date: unix }, function (err) {
            if (!err) {
                console.log(err);
            }
        });
        fs.unlinkSync(settings.PROJECT_DIR + '/public/records/' + file, function (err) {
        });
        res.end('File has been deleted!');
    });

    app.post('/action/clearRecords', function (req, res) {
        Records.collection.remove({}, function (err) {
            if (!err) {
                console.log(err);
            }
        });
        fs.readdir(settings.PROJECT_DIR + '/public/records/', function (err, files) {
            files.forEach(function (filename) {
                fs.unlinkSync('/var/www/t3conf/public/records/' + filename, function (err) {
                });
            });
        });
        res.end('Records has been deleted!');
    });
};