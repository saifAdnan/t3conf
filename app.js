//Load dependencies
var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    methodOverride = require('method-override'),
    mongoose = require('mongoose'),
    mongoStore = require('connect-mongo')(express),
    LocalStrategy = require('passport-local').Strategy,
    https = require('https'),
    passport = require('passport'),
    Account = require('./models/users'),
    Conferences = require('./models/conferences.js'),
    AsteriskAmi = require('asterisk-ami');

// SSL options
var options = {
    key: fs.readFileSync(__dirname + '/trafficdestination_net.key'),
    cert: fs.readFileSync(__dirname + '/trafficdestination_net.crt'),
    ca: fs.readFileSync(__dirname + '/trafficdestination_net.ca'),
    requestCert: true,
    rejectUnauthorized: false
};

// Asterisk arguments
var asterisk = {
    host: '46.36.223.131',
    username: 'myasterisk',
    password: '123456'
};

// Db options
var db = {
    db: 't3conf',
    host: 'localhost',
    collection: 'usersessions',
    auto_reconnect: true
};

// Set variables
var app = express(),
    conferences = {
        '1111': {
            name: '1111',
            sip: 1111,
            sip_name: 'T3leads (#1)'
        },
        '1112': {
            name: '1112',
            sip: 1112,
            sip_name: 'Sora (#2)'
        },
        '1113': {
            name: '1113',
            sip: 1113,
            sip_name: 'ATC (#3)'
        }
    },
    web_users = {},
    web_users_for_names = {},
    channels = {},
    rooms = [],
    server = https.createServer(options, app),
    io = require('socket.io').listen(server, {
        log: false,
        'transports': ['websocket', 'flashsocket', 'xhr-polling']
    }).set('origins', '*:*'),
    session_conf = {
        db: db,
        secret: 't3conf'
    };

// Express configuration
app.configure(function () {
    app.set('port', 2156);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'html');
    app.use(express.static(__dirname));
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(methodOverride());
    app.use(express.cookieParser('t3conf'));
    app.use(express.session({
        secret: session_conf.secret,
        maxAge: new Date(Date.now() + 3600000),
        store: new mongoStore(session_conf.db)
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    app.engine('html', require('hogan-express'));
});

// Passport Configuration
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// Mongo DB
mongoose.connect('mongodb://' + db.host + '/' + db.db);

//server listent o port
server.listen(app.get("port")); //1855

function kickUser(data, i) {
    var chn_l = data.channel;
    var fromPhoneL = false;

    if ((chn_l.split("SIP/zadarma-us").length - 1 ) === 1) {
        chn_l = data.calleridnum;
        fromPhoneL = true;
    } else {
        fromPhoneL = false;
        chn_l = chn_l.split("SIP/")[1].split("-")[0];
    }


    if (fromPhoneL) {
        Account.collection.find({phone: chn_l}).toArray(function (err, doc) {
            if (!doc.length) {
                console.log("no doc", data.calleridnum)
                if (conferences[data.conference].users[i].username === data.calleridnum) {
                    conferences[data.conference].users.splice(i, 1);
                    io.sockets.emit('user:join', conferences);
                    console.log('\n\nLEFT', conferences);
                }
            } else {
                if (conferences[data.conference].users[i].username === doc[0].username) {
                    conferences[data.conference].users.splice(i, 1);
                    io.sockets.emit('user:join', conferences);
                    console.log('\n\nLEFT', conferences);

                }
            }
        });
    } else {
        if (conferences[data.conference].users[i].username === data.calleridnum) {
            conferences[data.conference].users.splice(i, 1);
            io.sockets.emit('user:join', conferences);
            console.log('\n\nLEFT', conferences);
        }
    }

}

var ami = new AsteriskAmi(asterisk);
ami.on('ami_data', function (data) {
    if (data.event === "ConfbridgeJoin") {
        console.log(data);
        /*
         { event: 'ConfbridgeJoin',
         privilege: 'call,all',
         channel: 'SIP/saif-000000cf',
         uniqueid: '1403612248.303',
         conference: 'saif',
         calleridnum: '999',
         calleridname: 'Sergey' }
         */

        /*
         event: 'ConfbridgeJoin',
         privilege: 'call,all',
         channel: 'SIP/zadarma-us-000002ce',
         uniqueid: '1404373038.1445',
         conference: '1113',
         calleridnum: '13108070303',
         calleridname: '13108070303' }
         */

        /*
         unknown number
         { event: 'ConfbridgeLeave',
         privilege: 'call,all',
         channel: 'SIP/zadarma-us-000003bb',
         uniqueid: '1404390608.1766',
         conference: '1111',
         calleridnum: '15244440999',
         calleridname: '15244440999' }

         */

        var chn = data.channel;
        var fromPhone = false;

        if ((chn.split("SIP/zadarma-us").length - 1 ) === 1) {
            chn = data.calleridnum;
            fromPhone = true;
        } else {
            fromPhone = false;
            chn = chn.split("SIP/")[1].split("-")[0];
        }

        var calleridnum = data.calleridnum !== '<unknown>' ? data.calleridnum : chn;

        if (fromPhone) {
            Account.collection.find({phone: calleridnum}).toArray(function (err, doc) {
                var user;
                if (doc.length) {
                    user = {
                        username: doc[0].username,
                        channel: data.channel,
                        sip: doc[0].phone,
                        phone: doc[0].phone
                    };
                } else {
                    user = {
                        username: data.calleridnum,
                        channel: data.channel,
                        sip: 'Unregistered',
                        phone: data.calleridnum
                    }
                }

                if (!conferences[data.conference]) conferences[data.conference] = {};
                if (!conferences[data.conference].users) conferences[data.conference].users = [];

                var n = parseInt(data.conference, 10);

                Conferences.collection.find({sip: n}).toArray(function (err, doc) {
                    if (doc.length > 0) {
                        conferences[data.conference].sip_name = doc[0].name;
                    }
                    conferences[data.conference].users.push(user);
                    io.sockets.emit('user:join', conferences);
                    console.log('\n\nJOIN', conferences);
                });
            });
        } else {
            Account.collection.find({username: calleridnum}).toArray(function (err, doc) {
                if (doc.length) {
                    var user = {
                        username: data.calleridnum !== '<unknown>' ? data.calleridnum : doc[0].username,
                        channel: data.channel,
                        sip: doc[0].sip,
                        phone: doc[0].phone
                    };
                    if (!conferences[data.conference]) conferences[data.conference] = {};
                    if (!conferences[data.conference].users) conferences[data.conference].users = [];

                    var n = parseInt(data.conference, 10);

                    Conferences.collection.find({sip: n}).toArray(function (err, doc) {
                        if (doc.length > 0) {
                            conferences[data.conference].sip_name = doc[0].name;
                        }
                        conferences[data.conference].users.push(user);
                        io.sockets.emit('user:join', conferences);
                        console.log('\n\nJOIN', conferences);
                    });
                }
            });
        }
    } else if (data.event === 'ConfbridgeLeave') {
        console.log(data);
        /*
         { event: 'ConfbridgeLeave',
         privilege: 'call,all',
         channel: 'SIP/test001-000000e2',
         uniqueid: '1403613127.332',
         conference: 'saif',
         calleridnum: 'test001',
         calleridname: 'saif adnan' }
         */

        /* PHONE
         { event: 'ConfbridgeLeave',
         privilege: 'call,all',
         channel: 'SIP/zadarma-us-00000308',
         uniqueid: '1404379140.1524',
         conference: '1111',
         calleridnum: '14244440999',
         calleridname: '14244440999' }
         */
        if (conferences[data.conference] && conferences[data.conference].users && conferences[data.conference].users.length) {
            if (conferences[data.conference].users.length === 1
                && conferences[data.conference].name !== '1111'
                && conferences[data.conference].name !== '1112'
                && conferences[data.conference].name !== '1113'
                ) {
                delete conferences[data.conference];
                io.sockets.emit('user:join', conferences);
                var sip_int = parseInt(data.conference, 10);
                Conferences.remove({'sip': sip_int});
                console.log('\n\nCONF DELETED', conferences);
            } else {
                for (var i = 0; i < conferences[data.conference].users.length; i++) {
                    kickUser(data, i);
                }
            }
        } else if (data.event === 'ConfbridgeListRooms') {
            /*
             { event: 'ConfbridgeListRooms',
             actionid: '32054852577857670',
             conference: 'confc',
             parties: '1',
             marked: '0',
             locked: 'No' }
             */
            if (!conferences[data.conference]) conferences[data.conference] = {};
        }
    }
});

ami.connect(function () {
    ami.send({
        action: ' ConfbridgeListRooms'
    });
});

require("./routes")(app, rooms, ami, conferences);

//Socket.io
io.sockets.on('connection', function (socket) {
    require("./routes")(app, rooms, ami, conferences);
    var initiatorChannel = '';
    if (!io.isConnected) {
        io.isConnected = true;
    }

    socket.on("invite", function (data) {
        var users = data.users;

        for (var i = 0; i < users.length; i++) {
            /*

             ActionID - ActionID for this transaction. Will be returned.
             Channel - Channel name to call.
             Exten - Extension to use (requires Context and Priority)
             Context - Context to use (requires Exten and Priority)
             Priority - Priority to use (requires Exten and Context)
             Application - Application to execute.
             Data - Data to use (requires Application).
             Timeout - How long to wait for call to be answered (in ms.).
             CallerID - Caller ID to be set on the outgoing channel.
             Variable - Channel variable to set, multiple Variable: headers are allowed.
             Account - Account code.
             EarlyMedia - Set to true to force call bridge on early media..
             Async - Set to true for fast origination.
             Codecs - Comma-separated list of codecs to use for this call.

             */
            ami.send({
                Variable: '1222',
                action: 'Originate',
                Channel: 'SIP/' + users[i].username,
                CallerID: data.conf_name,
                Context: 'someuser',
                Exten: data.extension,
                Priority: 1
            });

            ami.send({
                action: 'Originate',
                Channel: 'SIP/zadarma-us/' + users[i].phone,
                CallerID: users[i].phone,
                Account: users[i].sip,
                Context: 'someuser',
                Exten: data.extension,
                Priority: 1
            })
        }
    });

    socket.on('new-channel', function (data) {
        if (!channels[data.channel]) {
            initiatorChannel = data.channel;
        }
        web_users[data.sender] = socket.id;
        web_users_for_names[socket.id] = data.sender;
        channels[data.channel] = data.channel;
        onNewNamespace(data.channel, data.sender);
    });

    socket.on('presence', function (channel) {
        var isChannelPresent = !!channels[channel];
        socket.emit('presence', isChannelPresent);
    });

    socket.on('disconnect', function (channel) {
        /*if (initiatorChannel) {
         delete channels[initiatorChannel];
         }
         socket.emit('leave', true);*/
    });
});

function onNewNamespace(channel, sender) {
    io.of('/' + channel).on('connection', function (socket) {
        if (io.isConnected) {
            require('./routes/chat.js')(socket, io, channel, conferences, web_users, web_users_for_names, ami);
            io.isConnected = false;
            socket.emit('connect', true);
        }
    });
}

app.listen(app.get('port') + 1, function () {
    console.log(("Express server listening on port " + app.get('port')))
});