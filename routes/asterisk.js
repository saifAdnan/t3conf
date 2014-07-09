var Records = require("../models/records"),
    Account = require("../models/users"),
    Conferences = require("../models/conferences");

module.exports = function (ami, conferences, io) {
    "use strict";

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
                        //console.log('\n\nLEFT', conferences);
                    }
                } else {
                    if (conferences[data.conference].users[i].username === doc[0].username) {
                        conferences[data.conference].users.splice(i, 1);
                        io.sockets.emit('user:join', conferences);
                        //console.log('\n\nLEFT', conferences);

                    }
                }
            });
        } else {
            if (conferences[data.conference].users[i].username === data.calleridnum) {
                conferences[data.conference].users.splice(i, 1);
                io.sockets.emit('user:join', conferences);
                //console.log('\n\nLEFT', conferences);
            }
        }

    }

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

            /*
             From phone number
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
                        //console.log('\n\nJOIN', conferences);
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
                            //console.log('\n\nJOIN', conferences);
                        });
                    }
                });
            }
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
        } else if (data.event === 'VarSet') {
            /*{ event: 'VarSet',
             privilege: 'dialplan,all',
             channel: 'ConfBridgeRecorder/conf-4520-uid-465567982',
             variable: 'MIXMONITOR_FILENAME',
             value: '/var/spool/asterisk/monitor/frt-1404823141.wav',
             uniqueid: '1404823141.282' }
             */
            if (data.variable === 'MIXMONITOR_FILENAME') {
                var file = data.value;
                var reg = new RegExp(/([0-9]{9}.)/g);
                var date = file.match(reg)[0];

                Records.collection.insert({
                    name: file.split('/var/spool/asterisk/monitor/')[1],
                    date: date
                }, function (err) {
                    if (err) console.log(err);
                });
            }
        }
    });

    ami.connect(function () {
        ami.send({
            action: ' ConfbridgeListRooms'
        });
    });
};