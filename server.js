'use strict'
//Import dependencies
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');

//Configure mongoose to use ES6 promises
mongoose.Promise = global.Promise;  

//Import modules
const { PORT, DATABASE_URL, CLIENT_ORIGIN } = require('./config');
const { localStrategy, jwtStrategy } = require('./strategies');
const strainsRouter = require('./routers/strains-router');
const usersRouter = require('./routers/users-router');
const authRouter = require('./routers/auth-router');

//Declare new app instance
const app = express();

//Log all requests
app.use(morgan('common'));

//Enable CORS
app.use(
  cors({
    origin: CLIENT_ORIGIN
  })
);

//Enable use of passport authentication strategies
passport.use(localStrategy);
passport.use(jwtStrategy);

//Enable use of routers
app.use('/strains', strainsRouter);
app.use('/users', usersRouter);
app.use('/auth', authRouter);

//Catch all handler if route does not exist
app.use('*', (req, res) => {
  res.status(404).json({ message: "Not found" });
});

//Declare global server object
let server;

//Start server and return a Promise
function runServer(databaseUrl, port = PORT) {
    return new Promise((resolve, reject) => {
      mongoose.connect(
        databaseUrl, { useNewUrlParser: true },
        err => {
          if (err) {
            return reject(err);
          }
          server = app
            .listen(port, () => {
              console.log(`Your app is listening on port ${port}`);
              resolve();
            })
            .on("error", err => {
              mongoose.disconnect();
              reject(err);
            });
        }
      );
    });
}

//Close server and return a Promise
function closeServer() {
    return mongoose.disconnect().then(() => {
      return new Promise((resolve, reject) => {
        console.log("Closing server");
        server.close(err => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    });
}

//Allows access to runServer via 'node server.js' & other test files if imported/exported
if (require.main === module) {
    runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };