var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Records = new Schema({
    name: String,
    date: Date
});

module.exports = mongoose.model('Records', Records);