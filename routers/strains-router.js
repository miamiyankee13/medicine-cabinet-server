'use strict'
//Import dependencies
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');

//Declare JSON parser
const jsonParser = bodyParser.json();

//Import modules
const { Strain } = require('../models');

//Create router instance
const router = express.Router();

//Declare JWT strategy middleware
const jwtAuth = passport.authenticate('jwt', { session: false });

//GET route handler for /strains
//-find all strains, sort by name, & send JSON response
router.get('/', (req, res) => {
    Strain.find().sort({ name: 1 }).then(strains => {
        res.json({ strains: strains.map(strain => strain.serialize())});
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    });
});

//GET route handler for /strains/:id
//-find individual strain by id & send JSON response
router.get('/:id', (req, res) => {
    Strain.findById(req.params.id).then(strain => {
        res.json(strain.serialize());
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    });
});

//POST route handler for /strains
//-validate request body
//-check if strain already exists
//-create strain & send JSON response
router.post('/', jsonParser, jwtAuth, (req, res) => {
    const requiredFields = ['name', 'type', 'description', 'flavor'];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!(field in req.body)) {
            const message = `Missing ${field} in request body`;
            console.error(message);
            return res.status(400).json({ message });
        }
    }

    Strain.findOne({name: req.body.name}).then(strain => {
        if (strain) {
            const message = 'Strain already exists';
            console.error(message);
            return res.status(400).json({ message} );
        } else {
            Strain.create({
                name: req.body.name,
                type: req.body.type,
                description: req.body.description,
                flavor: req.body.flavor
            }).then(strain => {
                res.status(201).json(strain.serialize());
            }).catch(err => {
                console.error(err);
                res.status(500).json({ message: 'Please fill out all fields' });
            });
        }
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Internal server error'});
    });
});

//PUT route handler for /strains/:id
//-validate request id & updateable fields
//-update strain & send JSON response
router.put('/:id', jsonParser, jwtAuth, (req, res) => {
    if (!(req.params.id && req.body._id && req.params.id === req.body._id)) {
        const message = `Request path id ${req.params.id} and request body id ${req.body._id} must match`;
        console.error(message);
        return res.status(400).send(message);
    }

    const toUpdate = {};
    const updateableFields = ['name', 'type', 'description', 'flavor'];

    updateableFields.forEach(field => {
        if (field in req.body) {
            toUpdate[field] = req.body[field];
        }
    });

    Strain.findByIdAndUpdate(req.params.id, { $set: toUpdate }, { new: true }).then(strain => {
        res.status(200).json(strain.serialize());
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    });
});

//DELETE route handler for /strains/:id
//-delete strain & send response status
router.delete('/:id', jwtAuth, (req, res) => {
    Strain.findByIdAndRemove(req.params.id).then(() =>{
        res.status(204).end();
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    });
});

//POST route handler for /strains/:id
//-add comment to strain & send JSON response
router.post('/:id', jsonParser, jwtAuth, (req, res) => {
    const requiredField = 'comment';
        if (!(requiredField in req.body)) {
            const message = `Missing ${requiredField} in request body`;
            console.error(message);
            return res.status(400).json({message});
        }
    
    Strain.updateOne({_id: req.params.id}, { $push: {comments: req.body.comment} }, { new: true }).then(() => {
        res.status(201).json({ message: 'Comment added to strain' });
    }).catch(err => {
        console.error(err);
        res.status(400).json({ message: 'Bad request'});
    });
});

//DELETE route handler for /strains/:id/:commentId
//-delete comment from strain & send response status
router.delete('/:id/:commentId', jwtAuth, (req, res) => {
    Strain.updateOne({_id: req.params.id}, { $pull: {comments: {_id: req.params.commentId} } }, { new: true }).then(() => {
        res.status(204).end();
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Internal server error'});
    })
});

module.exports = router;