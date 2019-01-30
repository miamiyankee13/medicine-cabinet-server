'use strict'
//Import dependencies
const mongoose = require('mongoose');
const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const jwt = require('jsonwebtoken');

//Import modules
const { Strain, User } = require('../models');
const { app, runServer, closeServer } = require('../server');
const { JWT_SECRET, TEST_DATABASE_URL } = require('../config');

//Enable expect style syntax
const expect = chai.expect;

//Enable use of chai-http testing methods
chai.use(chaiHttp);

//Create user & token
const createUserAndLogin = () => {
    const userName = 'exampleUser'
    const password = 'examplePassword';
    const firstName = 'Babe';
    const lastName = 'Ruth';


    return User.hashPassword(password).then(function (password) {
        return User.create({
            userName,
            password,
            firstName,
            lastName
        })
    }).then(function () {
        return chai.request(app).post('/auth/login')
            // .set('authorization', `Bearer ${token}`)
            .send({ userName, password }).then(function (res) {
                expect(res).to.have.status(200);
                expect(res).to.be.a('object');
                const token = res.body.authToken
                expect(token).to.be.a('string');
                const payload = jwt.verify(token, JWT_SECRET, {
                    algorithm: ['HS256']
                });
                return token
            })
    })
}

//Return object of random strain data
function generateStrainData() {
    return {
        name: faker.lorem.words(),
        type: faker.lorem.word(),
        description: faker.lorem.sentence(),
        flavor: faker.lorem.word()
    }
}

//Add 2 randomly generated strains to DB
function seedStrainData() {
    console.info('Seeding strain data');
    const seedData = [];

    for (let i = 0; i < 2; i++) {
        seedData.push(generateStrainData());
    }

    return Strain.insertMany(seedData);
}

//Delete entire DB
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

//Tests for /strains endpoints
describe('/strains API resource', function() {

    //Activate server before tests run
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    //Delete & create new data before each test
    beforeEach(function() {
        return tearDownDb().then(seedStrainData);
    });

    //Delete databse after each test
    afterEach(function() {
        return tearDownDb();
    });

    //Close server after tests run
    after(function() {
        return closeServer();
    });

    //Tests for /strains GET
    describe('GET endpoint', function() {

        //Verify response status, type, & count
        it('Should return all existing strains', function() {
            let res;
            return chai.request(app).get('/strains').then(function(_res) {
                res = _res;
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                return Strain.countDocuments();
            }).then(function(count) {
                expect(res.body.strains).to.have.lengthOf(count);
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });

        //Verify response is an array of objects & each object has expected fields
        it('Should return strains with correct fields', function() {
            let resStrain;
            return chai.request(app).get('/strains').then(function(res) {
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.strains).to.be.a('array');
                expect(res.body.strains).to.have.lengthOf.at.least(1);
                
                res.body.strains.forEach(function(strain) {
                    expect(strain).to.be.a('object');
                    expect(strain).to.include.keys('_id', 'name', 'type', 'description', 'flavor');
                });

                resStrain = res.body.strains[0];
                return Strain.findById(resStrain._id);
            }).then(function(strain) {
                expect(resStrain._id).to.equal(strain.id);
                expect(resStrain.name).to.equal(strain.name);
                expect(resStrain.type).to.equal(strain.type);
                expect(resStrain.description).to.equal(strain.description);
                expect(resStrain.flavor).to.equal(strain.flavor);
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });
    });

    //Tests for /strains POST
    describe('POST endpoint', function() {

        //Create a strain & verify request was successful/response has correct fields
        it('Should add new strain', function() {

            return createUserAndLogin().then(function(token) {
                    const newStrain = generateStrainData();
                    return chai.request(app).post('/strains').set('authorization', `Bearer ${token}`).send(newStrain).then(function(res) {
                        expect(res).to.have.status(201);
                        expect(res).to.be.json;
                        expect(res.body).to.be.a('object');
                        expect(res.body).to.include.keys('_id', 'name', 'type', 'description', 'flavor');
                        expect(res.body._id).to.not.be.null;
                        expect(res.body.name).to.equal(newStrain.name);
                        expect(res.body.type).to.equal(newStrain.type);
                        expect(res.body.description).to.equal(newStrain.description);
                        expect(res.body.flavor).to.equal(newStrain.flavor);
                        return Strain.findById(res.body._id);
                    }).then(function(strain) {
                        expect(strain.name).to.equal(newStrain.name);
                        expect(strain.type).to.equal(newStrain.type);
                        expect(strain.description).to.equal(newStrain.description);
                        expect(strain.flavor).to.equal(newStrain.flavor);
                    })
                }).catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
            });

        it('Should add new strain & add a comment', function() {
            let strainId;
            return createUserAndLogin().then(function(token) {
                const newStrain = generateStrainData();
                return chai.request(app).post('/strains').set('authorization', `Bearer ${token}`).send(newStrain).then(function(res) {
                    expect(res).to.have.status(201);
                    strainId = res.body._id;
                }).then(function() {
                    return chai.request(app).post(`/strains/${strainId}`).set('authorization', `Bearer ${token}`).send({comment: { content: 'Test', author: 'Author'}}).then(function(res) {
                        expect(res).to.have.status(201);
                        expect(res.body).to.be.a('object');
                    })
                })
                }).catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
            });
        });

    //Tests for /strains PUT
    describe('PUT endpoint', function() {

        //Update a strain & verify it was updated correctly in DB
        it('Should update a strain', function() {
            return createUserAndLogin().then(function(token) {
                    const toUpdate = {
                        name: 'Updated Strain',
                        type: 'Sativa',
                        description: 'Blue Hot Flames',
                        flavor: 'Peanut Butter'
                    }
        
                    return Strain.findOne().then(function(strain) {
                        toUpdate._id = strain._id;
                        return chai.request(app).put(`/strains/${strain._id}`).set('authorization', `Bearer ${token}`).send(toUpdate).then(function(res) {
                            expect(res).to.have.status(200);
                            return Strain.findById(toUpdate._id);
                        }).then(function(strain) {
                            expect(strain.name).to.equal(toUpdate.name);
                            expect(strain.type).to.equal(toUpdate.type);
                            expect(strain.description).to.equal(toUpdate.description);
                            expect(strain.flavor).to.equal(toUpdate.flavor);
                        })
                    })
                }).catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });          
            });
        });

    //Tests for /strains DELETE
    describe('DELETE endpoint', function() {

        //Delete a strain & verify response status/strain does not exist in DB
        it('Should delete a strain', function() {
            let strain;

            return createUserAndLogin().then(function(token) {
                    return Strain.findOne().then(function(_strain) {
                        strain = _strain;
                        return chai.request(app).delete(`/strains/${strain._id}`).set('authorization', `Bearer ${token}`);
                    }).then(function(res) {
                        expect(res).to.have.status(204);
                        return Strain.findById(strain._id);
                    }).then(function(_strain) {
                        expect(_strain).to.be.null;
                    })
                }).catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                })
             });

        it('Should add new strain, add a comment, & delete a comment', function() {
            let strainId;
            let commentId;

            return createUserAndLogin().then(function(token) {
                const newStrain = generateStrainData();
                return chai.request(app).post('/strains').set('authorization', `Bearer ${token}`).send(newStrain).then(function(res) {
                    expect(res).to.have.status(201);
                    strainId = res.body._id;
                }).then(function() {
                    return chai.request(app).post(`/strains/${strainId}`).set('authorization', `Bearer ${token}`).send({comment: { content: 'Test', author: 'Author'}}).then(function(res) {
                        expect(res).to.have.status(201);
                        expect(res.body).to.be.a('object');
                    })
                }).then(function() {
                    return chai.request(app).get(`/strains/${strainId}`).then(function(res) {
                        expect(res).to.have.status(200);
                        commentId = res.body.comments[0]._id;
                    })
                }).then(function() {
                    return chai.request(app).delete(`/strains/${strainId}/${commentId}`).set('authorization', `Bearer ${token}`).then(function(res) {
                        expect(res).to.have.status(204);
                    })
                })
            }).catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });
    });
});