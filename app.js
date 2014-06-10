/**
 * Load dependencies
 */
var fs              = require('fs'),
    path            = require('path'),
    express         = require('express'),
    mongoose        = require('mongoose'),
    mongoStore      = require('connect-mongo')(express),
    LocalStrategy   = require('passport-local').Strategy,
    https           = require('http'),
    passport        = require('passport'),
    Account         = require('./models/users');

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
var app             = express(),
    channels        = {},
    rooms           = [],
    usernames       = {},
    conferences     = {},
    server          = https.createServer(app),
    io              = require('socket.io').listen(server, {log: false,'transports': ['websocket', 'flashsocket', 'xhr-polling']}),
    session_conf    = {
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
app.configure(function() {
    app.set('port', 1088);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'html');
    app.use(express.static(__dirname ));
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
require("./routes")(app, rooms);

//server listent o port

server.listen(app.get("port")); //1855

//Socket.io
io.sockets.on('connection', function (socket) {

    require("./routes/conference.js")(socket, rooms, usernames, conferences);

    var initiatorChannel = '';
    if (!io.isConnected) {
        io.isConnected = true;
    }

    socket.on('new-channel', function (data) {
        if (!channels[data.channel]) {
            initiatorChannel = data.channel;
        }
        channels[data.channel] = data.channel;
        onNewNamespace(data.channel, data.sender);
    });

    socket.on('presence', function (channel) {
        var isChannelPresent = !! channels[channel];
        socket.emit('presence', isChannelPresent);
    });

    socket.on('disconnect', function (channel) {
        if (initiatorChannel) {
            delete channels[initiatorChannel];
        }
        socket.emit('leave', true);
    });
});

function onNewNamespace(channel, sender) {
    io.of('/' + channel).on('connection', function (socket) {

        if (io.isConnected) {
            require('./routes/chat.js')(socket, usernames, io, channel);
            io.isConnected = false;
            socket.emit('connect', true);
        }

        socket.on('message', function (data) {
            if (data.sender == sender)
                socket.broadcast.emit('message', data.data);
        });
    });
}

app.listen(app.get('port') + 1, function(){ //1857
    console.log(("Express server listening on port " + app.get('port')))
});