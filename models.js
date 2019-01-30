'use strict'
//Import dependencies
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

//Configure mongoose to use ES6 promises & createIndex
mongoose.Promise = global.Promise;    
mongoose.set('useCreateIndex', true)

//Declare schema for comments model
const commentSchema = mongoose.Schema({
    content: { type: String, required: true },
    author: { type: String, required: true }
});

//Declare schema for strains
const strainSchema = mongoose.Schema({
    name: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    description: { type: String, required: true},
    flavor: { type: String, required: true },
    comments: [commentSchema]
});

//Declare schema for users
const userSchema = mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    userName: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    strains: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Strain'}]
});

//Declare pre-hook middlewate to populate "strains" from reference
userSchema.pre('find', function(next) {
    this.populate('strains');
    next();
});

userSchema.pre('findOne', function(next) {
    this.populate('strains');
    next();
});

//Create serialize method for users to control data shown to client
userSchema.methods.serialize = function() {
    return {
        _id: this.id,
        firstName: this.firstName,
        lastName: this.lastName,
        userName: this.userName,
        strains: this.strains
    }
};

//Create password validation method for users
userSchema.methods.validatePassword = function(password) {
    return bcrypt.compare(password, this.password);
};

//Create password hash method for users
userSchema.statics.hashPassword = function(password) {
    return bcrypt.hash(password, 10);
};

//Create serialze method for strains to control data shown to client
strainSchema.methods.serialize = function() {
    return {
        _id: this.id,
        name: this.name,
        type: this.type,
        description: this.description,
        flavor: this.flavor,
        comments: this.comments
    }
};

//Create mongoose models
const Strain = mongoose.model('Strain', strainSchema);
const User = mongoose.model('User', userSchema);

module.exports = { Strain, User};