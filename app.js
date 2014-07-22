//Load dependencies
var express = require('express'),
    methodOverride = require('method-override'),
    mongoose = require('mongoose'),
    mongoStore = require('connect-mongo')(express),
    LocalStrategy = require('passport-local').Strategy,
    path = require('path'),
    https = require('https'),
    passport = require('passport'),
    Account = require('./models/users'),
    Conferences = require('./models/conferences.js'),
    Records = require('./models/records.js'),
    settings = require('./settings.js'),
    AsteriskAmi = require('asterisk-ami'),
    moment = require('moment-timezone');


// Set variables
var app = express(),
    conferences = settings.CONFERENCES,
    channels ={},
    web_users = {},
    web_users_for_names = {},
    ami = new AsteriskAmi(settings.ASTERISK),
    server, io,
    session_conf = {
        db: settings.DB,
        secret: 't3conf'
    };

var fs = require("fs");
// Logging middleware
app.use(function(request, response, next) {
    console.log(request.url);
    if (request.url.match(/^\/records\//g)) {
        var ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
        ip = '127.0.01' ? ' 212.3.110.42' : ip;
        var key = '1b284d7e50cf94951a56906f239a4655c1b583a1c6da8812ead5cdd2003d02cd';
        client = require('ipinfodb')({ key: key });
        var file = request.url;

        client.geolocate(ip, function (err, res) {
            var n = moment.unix(file.match(/[0-9]{10}/g)[0]).zone(res.timeZone).format('DD-MM-YYYY-H_m')
            response.download(__dirname + '/public' + file, '/records/'+file.match(/[\D\d\s]+-/g)[0]+ n + '.wav');
        });
    } else {
        next();
    }
});

// Development env
if ('development' == app.get('env')) {
    var http = require("http");
    server = http.createServer(app);
    app.use(express.errorHandler());
}

// Production env
if ('production' == app.get("env")) {
    server = https.createServer(settings.SSL, app);
}

// Socket IO
io = require('socket.io').listen(server, settings.IO).set('origins', '*:*');

// Express configuration
app.configure(function () {
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'html');
    app.use(express.static(path.join(__dirname, 'public')));
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
mongoose.connect('mongodb://' + settings.DB.host + '/' + settings.DB.db);

require("./routes/asterisk")(ami, conferences, io);
require("./routes")(app, ami, conferences);

//Socket.io
io.sockets.on('connection', function (socket) {
    require("./routes")(app, ami);
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
});

function onNewNamespace(channel) {
    io.of('/' + channel).on('connection', function (socket) {
        if (io.isConnected) {
            require('./routes/chat.js')(socket, io, channel, conferences, ami, web_users, web_users_for_names);
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