/**
 * Load dependencies
 */
var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    mongoose = require('mongoose'),
    mongoStore = require('connect-mongo')(express),
    LocalStrategy = require('passport-local').Strategy,
    https = require('https'),
    passport = require('passport'),
    Account = require('./models/users'),
    Conferences = require('./models/conferences.js'),
    AsteriskAmi = require('asterisk-ami');

var options = {
    key: fs.readFileSync(__dirname + '/trafficdestination_net.key'),
    cert: fs.readFileSync(__dirname + '/trafficdestination_net.crt'),
    ca: fs.readFileSync(__dirname + '/trafficdestination_net.ca'),
    requestCert: true,
    rejectUnauthorized: false
};

/**
 * Set variables
 */
var app = express(),
    conferences = {},
    web_users = {},
    web_users_for_names= {},
    channels = {},
    rooms = [],
    server = https.createServer(options, app),
    io = require('socket.io').listen(server, {
        log: false,
        'transports': ['websocket', 'flashsocket', 'xhr-polling']
    }),
    session_conf = {
        db: {
            db: 't3conf',
            host: 'localhost',
            collection: 'usersessions',
            auto_reconnect: true
        },
        secret: 't3conf'
    };

io.set('origins', '*:*');
/**
 * Express configuration
 */
app.configure(function () {
    app.set('port', 2156);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'html');
    app.use(express.static(__dirname));
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.methodOverride());
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

/**
 * Passport Configuration
 */
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// Mongo DB

mongoose.connect('mongodb://localhost/t3conf');

// Require routes

//server listent o port

server.listen(app.get("port")); //1855

var ami = new AsteriskAmi({ host: '46.36.223.131', username: 'myasterisk', password: '123456'});
ami.on('ami_data', function (data) {
    if (data.event === "ConfbridgeJoin") {
        /*
         { event: 'ConfbridgeJoin',
         privilege: 'call,all',
         channel: 'SIP/saif-000000cf',
         uniqueid: '1403612248.303',
         conference: 'saif',
         calleridnum: '999',
         calleridname: 'Sergey' }
         */

        Account.collection.find({username: data.calleridnum}).toArray(function (err, doc) {
            if (doc.length) {
                var user = {
                    username: data.calleridnum,
                    sip: doc[0].sip
                };
                if (!conferences[data.conference]) conferences[data.conference] = {};
                if (!conferences[data.conference].users) conferences[data.conference].users = [];

                Conferences.collection.find({}).toArray(function(err, doc) {
                    console.log(doc, "doc 112");
                });

                Conferences.collection.find({name: data.conference}).toArray(function (err, doc) {
                    console.log(1, doc, data.conference);
                   if (doc.length > 0) {
                       console.log(2);
                       conferences[doc[0].name].name = doc[0].name;
                       conferences[doc[0].name].sip = doc[0].sip;
                   }
                    conferences[data.conference].users.push(user);
                    io.sockets.emit('user:join', conferences);
                    console.log('\n\nJOIN', conferences);
                });
            }
        });
    } else if (data.event === 'ConfbridgeLeave') {
        /*
         { event: 'ConfbridgeLeave',
         privilege: 'call,all',
         channel: 'SIP/test001-000000e2',
         uniqueid: '1403613127.332',
         conference: 'saif',
         calleridnum: 'test001',
         calleridname: 'saif adnan' }
         */
        if (conferences[data.conference] && conferences[data.conference].users && conferences[data.conference].users.length) {
            if (conferences[data.conference].users.length === 1) {
                delete conferences[data.conference];
                io.sockets.emit('user:join', conferences);
                console.log('\n\nCONF DELETED', conferences);
            } else {
                for (var i = 0; i < conferences[data.conference].users.length; i++) {
                    if (conferences[data.conference].users[i].username === data.calleridnum) {
                        conferences[data.conference].users.splice(i, 1);
                        io.sockets.emit('user:join', conferences);
                        console.log('\n\nLEFT', conferences);
                        break;
                    }
                }
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
});

ami.connect(function () {
    ami.send({
        action: ' ConfbridgeListRooms'
    });
});

require("./routes")(app, rooms, ami, conferences);


//Socket.io
io.sockets.on('connection', function(socket) {
    require("./routes")(app, rooms, ami, conferences);
    var initiatorChannel = '';
    if (!io.isConnected) {
        io.isConnected = true;
    }

    socket.on('new-channel', function(data) {
        console.log(data.channel, data.sender, 'saif');
        if (!channels[data.channel]) {
            initiatorChannel = data.channel;
        }
        web_users[data.sender] = socket.id;
        web_users_for_names[socket.id] = data.sender;
        channels[data.channel] = data.channel;
        onNewNamespace(data.channel, data.sender);
    });

    socket.on('presence', function(channel) {
        var isChannelPresent = !! channels[channel];
        socket.emit('presence', isChannelPresent);
    });

    socket.on('disconnect', function(channel) {
        /*if (initiatorChannel) {
         delete channels[initiatorChannel];
         }
         socket.emit('leave', true);*/
    });
});

function onNewNamespace(channel, sender) {
    console.log(channel, 'channel');
    io.of('/' + channel).on('connection', function(socket) {
        if (io.isConnected) {
            require('./routes/chat.js')(socket, io, channel, conferences, web_users, web_users_for_names);
            io.isConnected = false;
            socket.emit('connect', true);
        }
    });
}

app.listen(app.get('port') + 1, function () { //1857
    console.log(("Express server listening on port " + app.get('port')))
});