'use strict'
//Import strategies
const { Strategy: LocalStrategy} = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

//Import modules
const { User } = require('./models');
const { JWT_SECRET } = require('./config');

//Create strategy to validate user information
const localStrategy = new LocalStrategy(
    {
        usernameField: 'userName', //'userName' !== 'username'
        passwordField: 'password',
    },
    (userName, password, callback) => {
    let user;
    User.findOne({ userName: userName}).then(_user => {
        user = _user;
        if (!user) {
            console.log('no user found');
            return Promise.reject({
                reason: 'LoginError',
                message: 'Incorrect username or password'
            });
        }
        return user.validatePassword(password);
    }).then(isValid => {
        if (!isValid) {
            return Promise.reject({
                reason: 'LoginError',
                message: 'Incorrect username or password'
            });
        }
        return callback(null, user);
    }).catch(err => {
        if (err.reason === 'LoginError') {
            return callback(null, false, err);
        }
        return callback(err, false);
    });
});

//Create strategy to validate jwt information
const jwtStrategy = new JwtStrategy(
    {
        secretOrKey: JWT_SECRET,
        jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
        algorithms: ['HS256'],
    }, 
    (payload, done) => {
        done(null, payload.user);
    }
);

module.exports = { localStrategy, jwtStrategy };
