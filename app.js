/**
 * Load dependencies
 */
var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    mongoose = require('mongoose'),
    mongoStore = require('connect-mongo')(express),
    LocalStrategy = require('passport-local').Strategy,
    https = require('http'),
    passport = require('passport'),
    Account = require('./models/users'),
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
    channels = {},
    rooms = [],
    server = https.createServer(app),
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
require("./routes")(app, rooms, ami, conferences);

//server listent o port

server.listen(app.get("port")); //1855

var ami = new AsteriskAmi({ host: '46.36.223.131', username: 'myasterisk', password: '123456'});



//Socket.io
io.sockets.on('connection', function (socket) {

    //require("./routes/conference.js")(socket, rooms, app);

    ami.on('ami_data', function (data) {
        console.log(conferences);

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
            var con = {
                User: data.calleridname,
                UserSip: data.calleridnum,
                unId: data.uniqueid
            };

            if (!conferences[data.conference]) conferences[data.conference] = [];
            conferences[data.conference].push(con);
            socket.broadcast.emit("user:join", {confs: conferences});

            console.log('\n\nJOIN', JSON.stringify(conferences));
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
            if (conferences[data.conference] && conferences[data.conference].length) {
                for (var i = 0; i < conferences[data.conference].length; i++) {
                    if (conferences[data.conference][i].UserSip === data.calleridnum) {
                        console.log('\n\nLEFT', JSON.stringify(conferences));
                        if (conferences[data.conference].length === 1) {
                            delete conferences[data.conference];
                            break;
                        } else {
                            conferences[data.conference].splice(i, 1);
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
            ami.send({Action: 'ConfbridgeList', ActionID: data.actionid, conference: data.conference});
            conferences[data.conference] = [];
        } else if (data.event === 'ConfbridgeList') {
            /*
             { event: 'ConfbridgeList',
             actionid: '52277654083445670',
             conference: 'confc',
             calleridnum: '999',
             calleridname: 'Sergey',
             channel: 'SIP/saif-00000104',
             admin: 'No',
             markeduser: 'No',
             muted: 'No' }
             */

            conferences[data.conference]
        }

    });

    ami.connect(function () {
        ami.send({
            action: ' ConfbridgeListRooms'
        });
    });
});

function onNewNamespace(channel, sender) {
    io.of('/' + channel).on('connection', function (socket) {

        if (io.isConnected) {
            require('./routes/chat.js')(socket, io, channel, rooms);
            io.isConnected = false;
            socket.emit('connect', true);
        }

        socket.on('message', function (data) {
            if (data.sender == sender)
                socket.broadcast.emit('message', data.data);
        });

    });
}

app.listen(app.get('port') + 1, function () { //1857
    console.log(("Express server listening on port " + app.get('port')))
});