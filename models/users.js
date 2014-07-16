var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

var Users = new Schema({
    username: String,
    firstname: String,
    lastname: String,
    password: String,
    phone: String,
    sip: Number,
    approved: Boolean,
    moderator: Boolean,
    role: String,
    reg_date: Number
});

Users.plugin(passportLocalMongoose);

module.exports = mongoose.model('Users', Users);