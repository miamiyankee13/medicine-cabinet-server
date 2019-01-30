'use strict'
//Import dependencies
const chai = require('chai');
const chaiHttp = require('chai-http');

//Import modules
const { app, runServer, closeServer } = require("../server");
const { TEST_DATABASE_URL } = require('../config');  

//Enable expect style syntax
const expect = chai.expect;

//Enable use of chai-http testing methods
chai.use(chaiHttp);

//Indicate entity being tested
describe('Index Page', function () {

    //Activate server before tests run
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    //Close server after tests run
    after(function() {
        return closeServer();
    });

    //Indicate behavior to be tested
    it('Should GET index.html', function() {
        return chai.request(app).get('/').then(function(res) {
            expect(res).to.have.status(200);
            expect(res).to.be.html;
        });
    });
});