var fs = require("fs");

module.exports = {
    PORT: 2156,
    PROJECT_DIR : __dirname,
    SSL: {
        key: fs.readFileSync(__dirname + '/trafficdestination_net.key'),
        cert: fs.readFileSync(__dirname + '/trafficdestination_net.crt'),
        ca: fs.readFileSync(__dirname + '/trafficdestination_net.ca'),
        requestCert: true,
        rejectUnauthorized: false
    },
    ASTERISK: {
        host: '46.36.223.131',
        username: 'myasterisk',
        password: '123456'
    },
    DB: {
        db: 't3conf',
        host: 'localhost',
        collection: 'usersessions',
        auto_reconnect: true
    },
    IO: {
        log: false,
        'transports': ['websocket', 'flashsocket', 'xhr-polling']
    },
    CONFERENCES: {
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
    }
};
