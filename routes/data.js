var express = require('express');
var router = express.Router();
const Games = require('../mongo/games');
const Players = require('../mongo/players');
const Teams = require('../mongo/teams');
const config = require('../config.js');
var fs = require('fs');

router.get('/getGames', function(req, res, next) {
    Games.getGames().then(success => {
        console.log("Get Games");
        res.json(success);
    }).catch(err => {
        console.log(err);
        res.statusCode = 500;
        res.send(err.toString());
    });
});

router.get('/getPlayers', function(req, res, next) {
    Players.getPlayers().then(success => {
        console.log("Get Players");
        res.json(success);
    }).catch(err => {
        console.log(err);
        res.statusCode = 500;
        res.send(err.toString());
    });
});

router.get('/getTeams', function(req, res, next) {
    Teams.getTeams().then(success => {
        console.log("Get Teams");
        res.json(success);
    }).catch(err => {
        console.log(err);
        res.statusCode = 500;
        res.send(err.toString());
    });
});

module.exports = router;