var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Records = new Schema({
    name: String,
    path: String,
    date: Number
});

module.exports = mongoose.model('Records', Records);