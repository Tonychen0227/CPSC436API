var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');
const {ObjectId} = require('mongodb');

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

module.exports.getPost = function(id) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);

      const postsCollection = db.collection('posts');
      postsCollection.find({}).toArray(function(err, docs) {
        if (err != null) {
          reject(err);
          db.close();
        }
        resolve(docs.find(x => x._id == id));
        db.close();
      });
    });
  });
}

module.exports.insertPost = function(postTitle, postBody, userId, userName) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const postsCollection = db.collection('posts');
      post = {
        "userId": userId,
        "userName": userName,
        "postTitle": postTitle,
        "postBody": postBody,
        "comments": [],
        "postedDate": new Date(Date.now()).toLocaleString()
      }
      postsCollection.insert(post, function(err, docs) {
        if (err != null) {
          reject(err);
          db.close();
        }
        postsCollection.find({}).toArray(function(err, docs) {
          resolve(docs);
        });
        db.close();
      });
    });
  });
}

module.exports.insertComment = function(id, body, userId, userName) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const postsCollection = db.collection('posts');
      const newComment = ({
        "id": shortid.generate(),
        "content": body,
        "userId": userId,
        "userName": userName,
        "postedDate": new Date(Date.now()).toLocaleString()
      });
      postsCollection.updateOne({_id: ObjectId(id)}, {$push: {
        "comments": newComment
      }}, function(err, docs) {
        if (err != null) {
          reject(err);
          db.close();
        }
        postsCollection.find({_id: ObjectId(id)}).toArray(function(err, docs) {
          resolve(docs[0]);
        });
        db.close();
      });
    });
  });
}

module.exports.editComment = function(id, commentId, body, userId) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const postsCollection = db.collection('posts');
      postsCollection.find({_id: ObjectId(id)}).toArray(function(err, docs) {
        if (err != null || docs.length == 0) {
          reject("Error encountered or nothing found");
          db.close();
        }
        let existingComments = docs[0].comments;
        const foundIndex = existingComments.findIndex(x => x.id == commentId);
        try {
          if (existingComments[foundIndex].userId.toString() != userId.toString()) {
            reject("Not your comment");
          }
          existingComments[foundIndex].content = body;
          existingComments[foundIndex].editedDate = new Date(Date.now()).toLocaleString();
        } catch {
          reject("Comment not found")
        }
        postsCollection.updateOne({_id: ObjectId(id)}, {$set: {
          "comments": existingComments
        }}, function(err, docs) {
          if (err != null) {
            reject(err);
            db.close();
          }
          postsCollection.find({_id: ObjectId(id)}).toArray(function(err, docs) {
            resolve(docs[0]);
            db.close();
          });
        });
      });
    });
  });
}

module.exports.deleteComment = function(id, commentId, body, userId) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const postsCollection = db.collection('posts');
      postsCollection.find({_id: ObjectId(id)}).toArray(function(err, docs) {
        if (err != null || docs.length == 0) {
          reject(err);
          db.close();
        }
        let existingComments = docs[0].comments;
        const foundIndex = existingComments.findIndex(x => x.id == commentId);
        try {
          if (existingComments[foundIndex].userId.toString() != userId.toString()) {
            reject("Not your comment");
          }
        } catch {
          reject("Comment not found")
        }
        existingComments.splice(foundIndex, 1);
        postsCollection.updateOne({_id: ObjectId(id)}, {$set: {
          "comments": existingComments
        }}, function(err, docs) {
          if (err != null) {
            reject(err);
            db.close();
          }
          postsCollection.find({_id: ObjectId(id)}).toArray(function(err, docs) {
            resolve(docs[0]);
            db.close();
          });
        });
      });
    });
  });
}