var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

const config = require('../config.js');

// Connection URL
var url = config.isProd ? 'mongodb://admin:admin@cpsc436-basketball-shard-00-00-kbwxu.mongodb.net:27017,cpsc436-basketball-shard-00-01-kbwxu.mongodb.net:27017,cpsc436-basketball-shard-00-02-kbwxu.mongodb.net:27017/test?ssl=true&replicaSet=CPSC436-Basketball-shard-0&authSource=admin&retryWrites=true&w=majority'
: 'mongodb://localhost';

// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  database = db

  teamsCollection = db.collection('teams')
  db.close();
});

module.exports = {}

module.exports.getTeams = function() {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);

      const teamsCollection = db.collection('teams');
      teamsCollection.find({}).toArray(function(err, docs) {
        if (err != null) {
          reject(err);
          db.close();
        }
        resolve(docs);
        db.close();
      });
    });
  });
}