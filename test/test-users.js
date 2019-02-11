'use strict'
//Import dependencies
const mongoose = require('mongoose');
const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const jwt = require('jsonwebtoken');

//Import modules
const { User } = require('../models');
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

//Delete entire DB
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

//Test for /users endpoints
describe('/users endpoints', function() {
    //Declare user fields
    const userName = 'exampleUser'
    const password = 'examplePassword';
    const firstName = 'Babe';
    const lastName = 'Ruth';

    //Declare strain fields
    const strainName = faker.lorem.words();
    const strainType = faker.lorem.word();
    const strainDesc = faker.lorem.sentence();
    const strainFlavor = faker.lorem.word();

    //Activate server before tests run
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    //Delete database before each test
    beforeEach(function() {
        return tearDownDb();
    })

    //Delete database after each test
    afterEach(function() {
        return tearDownDb();
    });

    //Close server after tests tun
    after(function() {
        return closeServer();
    });

    //Tests for /users
    describe('/users', function() {

        //Verify response status, reason, message, & location
        it('Should reject users with missing username', function() {
            return chai.request(app).post('/users').send({password, firstName, lastName}).then(function(res) {
                expect(res).to.have.status(422);
                expect(res.body.reason).to.equal('ValidationError');
                expect(res.body.message).to.equal('Missing Field');
                expect(res.body.location).to.equal('userName');
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });

        //Verify response status, reason, message, & location
        it('Should reject users with missing password', function() {
            return chai.request(app).post('/users').send({userName, firstName, lastName}).then(function(res) {
                expect(res).to.have.status(422);
                expect(res.body.reason).to.equal('ValidationError');
                expect(res.body.message).to.equal('Missing Field');
                expect(res.body.location).to.equal('password');
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });

        //Verify response status, reason, message, & location
        it('Should reject users with non-string username', function() {
            return chai.request(app).post('/users').send({userName: 1234, password, firstName, lastName}).then(function(res) {
                expect(res).to.have.status(422);
                expect(res.body.reason).to.equal('ValidationError');
                expect(res.body.message).to.equal('Incorrect field type: expected string');
                expect(res.body.location).to.equal('userName');
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });

        //Verify response status, reason, message, & location
        it('Should reject users with non-string password', function() {
            return chai.request(app).post('/users').send({userName, password: 1234, firstName, lastName}).then(function(res) {
                expect(res).to.have.status(422);
                expect(res.body.reason).to.equal('ValidationError');
                expect(res.body.message).to.equal('Incorrect field type: expected string');
                expect(res.body.location).to.equal('password');
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });

        //Verify response status, reason, message, & location
        it('Should reject users with non-trimmed username', function() {
            return chai.request(app).post('/users').send({userName: ` ${userName} `, password, firstName, lastName}).then(function(res) {
                expect(res).to.have.status(422);
                expect(res.body.reason).to.equal('ValidationError');
                expect(res.body.message).to.equal('Cannot start or end with whitespace');
                expect(res.body.location).to.equal('userName');
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });

        //Verify response status, reason, message, & location
        it('Should reject users with non-trimmed password', function() {
            return chai.request(app).post('/users').send({userName, password: ` ${password} `, firstName, lastName}).then(function(res) {
                expect(res).to.have.status(422);
                expect(res.body.reason).to.equal('ValidationError');
                expect(res.body.message).to.equal('Cannot start or end with whitespace');
                expect(res.body.location).to.equal('password');
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });

        //Verify response status, reason, message, & location
        it('Should reject users with empty username', function() {
            return chai.request(app).post('/users').send({userName: '', password, firstName, lastName}).then(function(res) {
                expect(res).to.have.status(422);
                expect(res.body.reason).to.equal('ValidationError');
                expect(res.body.message).to.equal('Must be at least 1 characters long');
                expect(res.body.location).to.equal('userName');
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });

        //Verify response status, reason, message, & location
        it('Should reject users with password less than ten characters', function() {
            return chai.request(app).post('/users').send({userName, password: '123456789', firstName, lastName}).then(function(res) {
                expect(res).to.have.status(422);
                expect(res.body.reason).to.equal('ValidationError');
                expect(res.body.message).to.equal('Must be at least 10 characters long');
                expect(res.body.location).to.equal('password');
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });

        //Create initial user, attempt to create duplicate user, & verify response status, reason, message & location
        it('Should reject users with duplicate username', function() {
            return User.create({userName, password, firstName, lastName}).then(function() {
                chai.request(app).post('/users').send({userName, password, firstName, lastName})
            }).then(function(res) {
                expect(res).to.have.status(422);
                expect(res.body.reason).to.equal('ValidationError');
                expect(res.body.message).to.equal('Username already taken');
                expect(res.body.location).to.equal('userName');
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });

        //Create user & verify response status, type, correct fields, & validated password
        it('Should create a new user', function() {
            return chai.request(app).post('/users').send({userName, password, firstName, lastName}).then(function(res) {
                expect(res).to.have.status(201);
                expect(res.body).to.be.a('object');
                expect(res.body).to.include.keys('userName', 'firstName', 'lastName');
                expect(res.body.userName).to.equal(userName);
                expect(res.body.firstName).to.equal(firstName);
                expect(res.body.lastName).to.equal(lastName);
                return User.findOne({userName});
            }).then(function(user) {
                expect(user).to.not.be.null;
                expect(user.firstName).to.equal(firstName);
                expect(user.lastName).to.equal(lastName);
                return user.validatePassword(password);
            }).then(function(passwordIsCorrect) {
                expect(passwordIsCorrect).to.be.true;
            }).catch(function(err) {
                if (err instanceof chai.AssertionError) {
                    throw err;
                }
            });
        });

    });

    //Tests for /users/strains
    describe('users/strains', function() {

        //Login, create strain, & add strain
        it('Should login, create a strain, & add a strain', function() {
            let strainId;

            return createUserAndLogin()
                .then(function(token) {
                    return chai.request(app)
                        .post('/strains')
                        .set('authorization', `Bearer ${token}`)
                        .send({
                            name: strainName, 
                            type: strainType, 
                            description: strainDesc, 
                            flavor: strainFlavor}
                        )
                        .then(function(res) {
                            expect(res).to.have.status(201);
                            expect(res.body).to.be.a('object');
                            strainId = res.body._id;
                        })
                        .then(function() {
                            return chai.request(app)
                                .put(`/users/strains/${strainId}`)
                                .set('authorization', `Bearer ${token}`)
                                .then(function(res) {
                                    expect(res).to.have.status(200);
                                    expect(res.body).to.be.a('object');
                                });
                        })
                        .catch(function(err) {
                            if (err instanceof chai.AssertionError) {
                                throw err;
                            }
                        });
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
        });

        //Login, create strain, add strain, & retreive strains
        it('Should login, create a strain, add a strain, & retreive strains', function() {
            let strainId;

            return createUserAndLogin()
                .then(function(token) {
                    return chai.request(app)
                        .post('/strains')
                        .set('authorization', `Bearer ${token}`)
                        .send({
                            name: strainName, 
                            type: strainType, 
                            description: strainDesc, 
                            flavor: strainFlavor}
                        )
                        .then(function(res) {
                            expect(res).to.have.status(201);
                            expect(res.body).to.be.a('object');
                            strainId = res.body._id;
                        })
                        .then(function() {
                            return chai.request(app)
                                .put(`/users/strains/${strainId}`)
                                .set('authorization', `Bearer ${token}`)
                                .then(function(res) {
                                    expect(res).to.have.status(200);
                                    expect(res.body).to.be.a('object');
                                });
                        })
                        .then(function() {
                            return chai.request(app)
                                .get(`/users/strains/`)
                                .set('authorization', `Bearer ${token}`)
                                .then(function(res) {
                                    expect(res).to.have.status(200);
                                    expect(res.body).to.be.a('object');
                                });
                        })
                        .catch(function(err) {
                            if (err instanceof chai.AssertionError) {
                                throw err;
                            }
                        });
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
            });

        //Login, create strain, add strain, & delete strain
        it('Should login, create a strain, add a strain, & delete a strain', function() {
            let strainId;

            return createUserAndLogin()
                .then(function(token) {
                    return chai.request(app)
                        .post('/strains')
                        .set('authorization', `Bearer ${token}`)
                        .send({
                            name: strainName, 
                            type: strainType, 
                            description: strainDesc, 
                            flavor: strainFlavor}
                        )
                        .then(function(res) {
                            expect(res).to.have.status(201);
                            expect(res.body).to.be.a('object');
                            strainId = res.body._id;
                        })
                        .then(function() {
                            return chai.request(app)
                                .put(`/users/strains/${strainId}`)
                                .set('authorization', `Bearer ${token}`)
                                .then(function(res) {
                                    expect(res).to.have.status(200);
                                    expect(res.body).to.be.a('object');
                            });
                        })
                        .then(function() {
                            return chai.request(app)
                                .delete(`/users/strains/${strainId}`)
                                .set('authorization', `Bearer ${token}`)
                                .then(function(res) {
                                    expect(res).to.have.status(204);
                                });
                        })
                        .catch(function(err) {
                            if (err instanceof chai.AssertionError) {
                                throw err;
                            }
                        });
                })
                .catch(function(err) {
                    if (err instanceof chai.AssertionError) {
                        throw err;
                    }
                });
            });
        });
    });