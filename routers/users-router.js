'use strict'
//Import dependencies
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');

//Declare JSON parser
const jsonParser = bodyParser.json();

//Import modules
const { User } = require('../models');

//Create router instance
const router = express.Router();

//Declare JWT strategy middleware
const jwtAuth = passport.authenticate('jwt', { session: false });

//POST route handler to register a new user
//-validate userName & password fields
//-check if userName already exists
//-hash password, create user & send JSON response
router.post('/', jsonParser, (req, res) => {
    const requiredFields = ['userName', 'password'];
    const missingField = requiredFields.find(field => !(field in req.body));

    if (missingField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Missing Field',
            location: missingField
        });
    }

    const stringFields = ['userName', 'password', 'firstName', 'lastName'];
    const nonStringField = stringFields.find(field => 
        field in req.body && typeof req.body[field] !== 'string'
    );

    if (nonStringField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Incorrect field type: expected string',
            location: nonStringField
        });
    }

    const explicitlyTrimmedFields = ['userName', 'password'];
    const nonTrimmedField = explicitlyTrimmedFields.find(field =>
        req.body[field].trim() !== req.body[field]
    );

    if (nonTrimmedField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Cannot start or end with whitespace',
            location: nonTrimmedField
        });
    }

    const sizedFields = {
        userName: {
            min: 1
        },
        password: {
            min: 10,
            max: 72
        }
    };

    const tooSmallField = Object.keys(sizedFields).find(field => 
        'min' in sizedFields[field] && req.body[field].trim().length < sizedFields[field].min  
    );

    const tooLargeField = Object.keys(sizedFields).find(field =>
        'max' in sizedFields[field] && req.body[field].trim().length > sizedFields[field].max
    );

    if (tooSmallField || tooLargeField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: tooSmallField ? `Must be at least ${sizedFields[tooSmallField].min} characters long` : 
            `Must be at most ${sizedFields[tooLargeField].max} characters long`,
            location: tooSmallField || tooLargeField
        });
    }

    let {userName, password, firstName = '', lastName = ''} = req.body;
    firstName = firstName.trim();
    lastName = lastName.trim();
    
    return User.find({userName}).countDocuments().then(count => {
        if (count > 0) {
            return Promise.reject({
                code: 422,
                reason: 'ValidationError',
                message: 'username already taken',
                location: 'userName'
            });
        }
        return User.hashPassword(password);
    }).then(hash => {
        return User.create({
            userName,
            password: hash,
            firstName,
            lastName
        });
    }).then(user => {
        return res.status(201).json(user.serialize());
    }).catch(err => {
        console.error(err);
        if (err.reason === 'ValidationError') {
            return res.status(err.code).json(err)
        }
        res.status(500).json({ message: 'Internal server error' });
    });
});

//GET route handler for all user's strains
//-find current user & return array of strains
//-send JSON response
router.get('/strains', jwtAuth, (req, res) => {
    User.findOne({userName: req.user.userName}, "strains").then(result => {
        res.status(200).json(result);
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    });
});

//PUT route handler for adding a strain to a user
//-find current user & add strain to array of strains
//-send JSON response
router.put('/strains/:id', jwtAuth, (req, res) => {
    User.updateOne({userName: req.user.userName}, { $push: { strains: req.params.id } }, { new: true }).then(() => {
        res.status(200).json({ message: 'Strain added to user' });
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    });
});

//DELETE route handler for removing a strain from a user
//-find current user & remove strain from array of strains
//-send JSON response
router.delete('/strains/:id', jwtAuth, (req, res) => {
    User.updateOne({userName: req.user.userName}, { $pull: { strains: req.params.id} }, { new: true }).then(() => {
        res.status(204).end();
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    })
});


module.exports = router;