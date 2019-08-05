var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

var shortid = require('shortid');
const config = require('../config.js');

// Connection URL
var url = config.isProd ? 'mongodb://admin:admin@cpsc436-basketball-shard-00-00-kbwxu.mongodb.net:27017,cpsc436-basketball-shard-00-01-kbwxu.mongodb.net:27017,cpsc436-basketball-shard-00-02-kbwxu.mongodb.net:27017/test?ssl=true&replicaSet=CPSC436-Basketball-shard-0&authSource=admin&retryWrites=true&w=majority'
: 'mongodb://localhost';

// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  database = db;

  postsCollection = db.collection('posts');

  db.close();
});

module.exports = {}

module.exports.getPosts = function() {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);

      const postsCollection = db.collection('posts');
      postsCollection.find({}).toArray(function(err, docs) {
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

module.exports.insertPost = function(post) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const postsCollection = db.collection('posts');
      postsCollection.insert(post, function(err, docs) {
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

module.exports.insertComment = function(id, body, userId, existingComments) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const postsCollection = db.collection('posts');
      existingComments.push({
        "content": body,
        "userId": userId,
        "postedDate": new Date(Date.now()).toLocaleString();
      })
      postsCollection.updateOne({_id: id}, {$set: {
        "comments": existingComments
      }}, function(err, docs) {
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