//Load dependencies
var express = require('express'),
    methodOverride = require('method-override'),
    mongoose = require('mongoose'),
    mongoStore = require('connect-mongo')(express),
    LocalStrategy = require('passport-local').Strategy,
    https = require('http'),
    passport = require('passport'),
    Account = require('./models/users'),
    Conferences = require('./models/conferences.js'),
    Records = require('./models/records.js'),
    settings = require('./settings.js'),
    AsteriskAmi = require('asterisk-ami');

// Set variables
var app = express(),
    conferences = settings.CONFERENCES,
    web_users = {},
    web_users_for_names = {},
    channels = {},
    rooms = [],
    ami = new AsteriskAmi(settings.ASTERISK),
    server, io,
    session_conf = {
        db: settings.DB,
        secret: 't3conf'
    };

if ('development' == app.get('env')) {
    server = https.createServer(app)
    app.use(express.errorHandler());
} else {
    server = https.createServer(settings.SSL, app);
}

console.log(app.get('env'));

// Socket IO
io = require('socket.io').listen(server, settings.IO).set('origins', '*:*');

// Express configuration
app.configure(function () {
    app.set('views', settings.PROJECT_DIR + '/views');
    app.set('view engine', 'html');
    app.use(express.static(settings.PROJECT_DIR));
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

if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

// Passport Configuration
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// Mongo DB
mongoose.connect('mongodb://' + settings.DB.host + '/' + settings.DB.db);

require("./routes/asterisk")(ami, conferences, io);
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

//Server listen o port
server.listen(settings.PORT);

// App listen to port
app.listen(settings.PORT + 1, function () {
    console.log(("Express server listening on port " + settings.PORT))
});