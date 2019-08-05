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

  usersCollection = db.collection('users');
  db.close();
});

module.exports = {}

module.exports.getUsers = function() {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);

      const usersCollection = db.collection('users');
      usersCollection.find({}).toArray(function(err, docs) {
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

module.exports.insertUser = function(user) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const usersCollection = db.collection('users');
      usersCollection.insert(user, function(err, docs) {
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

module.exports.updateOneUserJwt = function(id, jwt, jwtIssued) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const usersCollection = db.collection('users');
      usersCollection.updateOne({_id: id}, {$set: {
        "JWTToken": jwt,
        "JWTIssued": jwtIssued
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

module.exports.validateOneUser = function(id) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const usersCollection = db.collection('users');
      usersCollection.updateOne({_id: id}, {$set: {
        "Validated": true
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

module.exports.resetPWOneUser = function(id) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const usersCollection = db.collection('users')
      usersCollection.updateOne({_id: id}, {$set: {
        "Password": ""
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

module.exports.setPWOneUser = function(id, password) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const usersCollection = db.collection('users');
      usersCollection.updateOne({_id: id}, {$set: {
        "Password": password,
        "ResetToken": "LoremIpsumDolorSitAmet"
      }}, function(err, docs) {
        if (err != null) {
          reject(err);
          db.close();
        }
        usersCollection.find({_id: id}).toArray(function(err, docs) {
          if (err != null) {
            reject(err);
            db.close();
          }
          resolve(docs);
          db.close();
        });
      });
    });
  });
}

module.exports.updateResetTokenOneUser = function(id) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const usersCollection = db.collection('users');
      let token = shortid.generate();
      usersCollection.updateOne({_id: id}, {$set: {
        "Password": "lol dunce",
        "ResetToken": token
      }}, function(err, docs) {
        if (err != null) {
          reject(err);
          db.close();
        }
        resolve(token);
        db.close();
      });
    });
  });
}

module.exports.resetPWOneUser = function(id) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const usersCollection = db.collection('users')
      usersCollection.updateOne({_id: id}, {$set: {
        "Password": ""
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

module.exports.setBase64OneUser = function(id, base64) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const usersCollection = db.collection('users');
      usersCollection.updateOne({_id: id}, {$set: {
        "ProfileBase64": base64
      }}, function(err, docs) {
        console.log(id, docs);
        if (err != null) {
          reject(err);
          db.close();
        }
        usersCollection.find({_id: id}).toArray(function(err, docs) {
          console.log(docs);
          if (err != null) {
            reject(err);
            db.close();
          }
          resolve(docs[0]);
          db.close();
        });
      });
    });
  });
}

module.exports.setNameTeamOneUser = function(id, name, team) {
  return new Promise(function(resolve, reject) {
    MongoClient.connect(url, function(err, db) {
      assert.equal(null, err);
      const usersCollection = db.collection('users');
      usersCollection.updateOne({_id: id}, {$set: {
        "DisplayName": name,
        "FavoriteTeam": team
      }}, function(err, docs) {
        console.log(id, docs);
        if (err != null) {
          reject(err);
          db.close();
        }
        usersCollection.find({_id: id}).toArray(function(err, docs) {
          console.log(docs);
          if (err != null) {
            reject(err);
            db.close();
          }
          resolve(docs[0]);
          db.close();
        });
      });
    });
  });
}