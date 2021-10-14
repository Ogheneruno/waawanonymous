const mongoose = require('mongoose');
const {Schema} = mongoose;
const userSchema = new Schema({
    email:{
        type: String
    },
    fullName:{
        type: String
    },
    password:{
        type: String
    },
    canpaigns: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'campaign'
    }]
},{timestamps:true});

const User = mongoose.model('user', userSchema);

module.exports = User;