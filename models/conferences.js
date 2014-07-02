var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Conferences = new Schema({
    name: String,
    sip: Number,
    pin: String,
    date: Date
});

module.exports = mongoose.model('Conferences', Conferences);