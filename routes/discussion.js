var express = require('express');
var router = express.Router();
const shortid = require('shortid');
let jwt = require('jsonwebtoken');
const Posts = require('../mongo/posts');
const Users = require('../mongo/users')
const config = require('../config.js');
const axios = require('axios');
const fetch = require('fetch-base64');
const image2base64 = require('image-to-base64');

router.get('/', function(req, res, next){
  Posts.getPosts().then(success => {
    res.json(success);
  }).catch(err => {
    res.statusCode = 401;
    res.send(err.toString());
  })
});

router.post('/', function(req, res, next) {
  Users.getUsers().then(success => {
    users = success;
    if (!req.body) {
      throw new Error("No body supplied");
    }
    if (!req.body.title || req.body.title.length < 10 || req.body.title.length > 75) {
      throw new Error("No title supplied or title is less than 10 characters or larger than 50");
    }
    if (!req.body.body) {
      req.body.body = "";
    }
    if (req.body.token) {
      const user = users.filter(x => x.JWTToken == req.body.token)[0];
      Posts.insertPost(req.body.title, req.body.body, user._id, user.DisplayName)
      .then(succ => {
        res.json(succ);
      })
      .catch(oops => {
        res.statusCode = 401;
        res.send(oops.toString());
      });
    }
    else {
      throw new Error("No authentication supplied");
    }
  }).catch(err => {
    res.statusCode = 401;
    res.send(err.toString());
  })
})

router.get('/:id', function(req, res, next) {
  Posts.getPost(req.params.id).then(success => {
    res.json(success);
  }).catch(err => {
    res.statusCode = 401;
    res.send(err.toString());
  })
})

router.post('/:id', function(req, res, next) {
  Users.getUsers().then(success => {
    users = success;
    if (!req.body) {
      throw new Error("No body supplied");
    }
    if (!req.body.body || req.body.body.length < 10) {
      throw new Error("No comment body supplied or title is less than 10 characters");
    }
    if (req.body.token) {
      const user = users.filter(x => x.JWTToken == req.body.token)[0];
      Posts.insertComment(req.params.id, req.body.body, user._id, user.DisplayName)
      .then(succ => {
        res.json(succ);
      })
      .catch(oops => {
        res.statusCode = 401;
        res.send(oops.toString());
      });
    }
    else {
      throw new Error("No authentication supplied");
    }
  }).catch(err => {
    res.statusCode = 401;
    res.send(err.toString());
  })
})

router.patch('/:postId/comment/:commentId', function(req, res, next) {
  Users.getUsers().then(success => {
    users = success;
    if (!req.body) {
      throw new Error("No body supplied");
    }
    if (!req.body.body || req.body.body.length < 10) {
      throw new Error("No comment body supplied or title is less than 10 characters");
    }
    if (req.body.token) {
      const user = users.filter(x => x.JWTToken == req.body.token)[0];
      Posts.editComment(req.params.postId, req.params.commentId, req.body.body, user._id)
      .then(succ => {
        res.json(succ);
      })
      .catch(oops => {
        res.statusCode = 401;
        res.send(oops.toString());
      });
    }
    else {
      throw new Error("No authentication supplied");
    }
  }).catch(err => {
    res.statusCode = 401;
    res.send(err.toString());
  })
})

router.delete('/:postId/comment/:commentId', function(req, res, next) {
  Users.getUsers().then(success => {
    users = success;
    if (!req.body) {
      throw new Error("No body supplied");
    }
    if (req.body.token) {
      const user = users.filter(x => x.JWTToken == req.body.token)[0];
      Posts.deleteComment(req.params.postId, req.params.commentId, req.body.body, user._id)
      .then(succ => {
        res.json(succ);
      })
      .catch(oops => {
        res.statusCode = 401;
        res.send(oops.toString());
      });
    }
    else {
      throw new Error("No authentication supplied");
    }
  }).catch(err => {
    res.statusCode = 401;
    res.send(err.toString());
  })
})

module.exports = router;
