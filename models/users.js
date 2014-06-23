var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose');

var Users = new Schema({
    username: String,
    firstname: String,
    lastname: String,
    password: String,
    phonoe: String,
    approved: Boolean,
    moderator: Boolean,
    role: String,
    date: Date
});

Users.plugin(passportLocalMongoose);

module.exports = mongoose.model('Users', Users);
