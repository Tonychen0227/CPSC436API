var express = require('express');
var router = express.Router();
const shortid = require('shortid');
let jwt = require('jsonwebtoken');
const Users = require('../mongo/users');
const config = require('../config.js');
const sendinblue = require('sib-api-v3-sdk');
const axios = require('axios');
const fetch = require('fetch-base64');

var defaultImage = "https://www.myinstants.com/media/instants_images/1340305905201.png"

var FBApi = "https://graph.facebook.com/v3.3/"

var FBApiPictureSuffix = "/picture?height=500&redirect=0"

var mailClient = sendinblue.ApiClient.instance;
var apiKey = mailClient.authentications['api-key'];
apiKey.apiKey = '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';

var apiInstance = new sendinblue.SMTPApi();

var sendSmtpEmail = new sendinblue.SendSmtpEmail(); // SendSmtpEmail | Values to send a transactional email

var validateHtmlContentRoot = config.isProd ? "<h3>Please click this link to confirm your verification for GGPanda!</h3> <br/> <a href='http://cpsc436basketballapi.herokuapp.com/users?validate="
: "<h3>Please click this link to confirm your verification for GGPanda!</h3> <br/> <a href='http://localhost:3001/users?validate="

var resetHtmlContentRoot = config.isProd ? "<h3>Please click this link to confirm your verification for GGPanda!</h3> <br/> <a href='http://cpsc436basketballapi.herokuapp.com/users?reset="
: "<h3>Please click this link to confirm your password reset for GGPanda!</h3> <br/> <a href='http://localhost:3001/users?reset="

var htmlContentTail = "' target='_blank'>Click here! This is not scam I swear </a>"

sendSmtpEmail.sender = { "email":"tony.chen@outlook.com", "name":"GGPanda Basketball"};
sendSmtpEmail.subject = "CPSC436 Basketball: Account Verification";

const sendValidationEmail = (email, token) => {
  sendSmtpEmail.to = [{"email": email}]
  sendSmtpEmail.subject = "CPSC436 Basketball: Account Verification";
  console.log(sendSmtpEmail)
  sendSmtpEmail.htmlContent = validateHtmlContentRoot + token + htmlContentTail;
  apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {
    console.log('API called successfully. Returned data: ' + data);
  }, function(error) {
    console.error(error);
  });
}

const sendResetEmail = (email, token) => {
  sendSmtpEmail.to = [{"email": email}]
  sendSmtpEmail.subject = "CPSC436 Basketball: Password Reset";
  console.log(sendSmtpEmail)
  sendSmtpEmail.htmlContent = resetHtmlContentRoot + token + htmlContentTail;
  apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {
    console.log('API called successfully. Returned data: ' + data);
  }, function(error) {
    console.error(error);
  });
}

router.get('/', function(req, res, next){
  if (req.query.validate) {
    Users.getUsers().then(success => {
      users = success
      for (var x = 0; x < users.length; x++) {
        if (users[x].ValidationToken == req.query.validate) {
          Users.validateOneUser(users[x]._id).then(success => {
            res.json("Validation successful")
          }).catch(err => {
            throw new Error(err)
          })
        }
      }
    }).catch(err => {
      res.statusCode = 401;
      res.send(err.toString());
    })
  } else if (req.query.reset) {
    Users.getUsers().then(success => {
      users = success
      let sent = false
      for (var x = 0; x < users.length; x++) {
        if (users[x].ResetToken == req.query.reset && users[x].Password != "Facebook") {
          sent = true
          Users.resetPWOneUser(users[x]._id).then(success => {
            res.json("Reset successful, please log in with new password and it will set.")
          }).catch(err => {
            throw new Error(err)
          })
        }
      }
     if (!sent){
        res.statusCode = 401;
        res.send("Invalid reset provided");
      }
    }).catch(err => {
      res.statusCode = 401;
      res.send(err.toString());
    })
  }
  else {
    res.status = 401;
    res.send("Unauthorized")
  }
});

const handleUsernamePasswordLogin = (users, email, password) => {
  // password should already be hashed
  let sent = false
  for (var x = 0; x < users.length; x++) {
    if (users[x].Email == email) {
      if (users[x].Password == password) {
        if (!users[x].Validated) {
          sendValidationEmail(users[x].Email, users[x].ValidationToken)
          throw new Error("Verification email resent")
        }
        let token = jwt.sign({email: email},
          config.secret,
          { expiresIn: '24h' // expires in 24 hours
          }
        );
        users[x].JWTToken = token
        users[x].JWTIssued = new Date().toUTCString()
        sent = true
        Users.updateOneUserJwt(users[x]._id, users[x].JWTToken, users[x].JWTIssued).then(success => {
          Users.getUsers().then(succ => {
            for (var x = 0; x < succ.length; x++) {
              if (succ[x].email == email) {
                return succ[x]
              }
            }
          }).catch(err => {
            throw new Error(err)
          })
        }).catch(err => {
          next(err)
        })
        return users[x]
      } else if (users[x].Password == "") {
        sent = true
        Users.setPWOneUser(users[x]._id, password).then(succ => {
          return users[x]
        }).catch(err => {
          throw new Error(err)
        })
      } else {
        throw new Error("Unauthorized (incorrect email/password). Is this a Facebook account?")
      }
    }
  }
  if (!sent) {
    throw new Error("No corresponding user email found");
  }
}

const handleJWTLogin = (users, token) => {
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      throw new Error("Invalid token")
    }
  });
  for (var x = 0; x < users.length; x++) {
    if (users[x].JWTToken == token) {
      let date = new Date(users[x].JWTIssued)
      if (new Date() <= date.setDate(date.getDate() + 1)) {
        return users[x]
      } else {
        throw new Error("Token expired")
      }
    }
  }
  throw new Error("No corresponding JWT found")
}

router.post('/login', function(req, res, next) {
  Users.getUsers().then(success => {
    users = success
    if (req.body.email && req.body.password) {
      var result = handleUsernamePasswordLogin(users, req.body.email, req.body.password)
      res.json(result)
    }
    else if (req.body.jwt) {
      var result = handleJWTLogin(users, req.body.jwt)
      res.json(result)
    } else {
      throw new Error("No authentication supplied")
    }
  }).catch(err => {
    res.statusCode = 401;
    res.send(err.toString());
  })
})

const checkRegUser = (users, email, password) => {
  if (!email || !password) {
    throw new Error("Forgot email or password")
  }
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  var match = re.test(email)
  if (!match) {
    throw new Error("Invalid email")
  }
  if (password.length < 8) {
    throw new Error("Password is too short")
  }
  for (var x = 0; x < users.length; x++) {
    if (users[x].Email == email) {
      throw new Error("Email is taken")
    }
  }
  let token = jwt.sign({username: email},
    config.secret,
    { expiresIn: '24h' // expires in 24 hours
    }
  );
  let newDate = new Date()
  
  var userJson = {
    "Email": email,
    "Password": password,
    "JWTToken": token,
    "JWTIssued": newDate.toUTCString(),
    "FavoriteTeam": "",
    "AccountCreated": new Date().toLocaleDateString(),
    "SpecialPermissions": "",
    "ValidationToken": shortid.generate(),
    "Validated": false,
    "ResetToken": shortid.generate(),
    "DisplayName": "I love JavaScript XD",
    "ProfileBase64": ""
  }
  return userJson
}

router.post('/register', function(req, res, next) {
  Users.getUsers().then(success => {
    users = success
    var userJSON = checkRegUser(users, req.body.email, req.body.password);
    userJSON.DisplayName = req.body.displayName != '' ? req.body.displayName : userJSON.DisplayName
    fetch.remote(defaultImage).then((data) => {
      userJSON.ProfileBase64 = data[1].split(',')[1]
      Users.insertUser(userJSON).then(success => {
        console.log("registering");
        sendValidationEmail(success.ops[0].email, success.ops[0].ValidationToken);
        console.log("email sent");
        throw new Error("User registered. Please verify email.")
      }).catch(err => {
        res.statusCode = 500;
        res.send(err.toString());
      })
    //}).catch((reason) => {throw new Error(reason)});
  }).catch(err => {
    res.statusCode = 403;
    res.send(err.toString());
  })
})

router.post('/reset', function(req, res, next) {
  Users.getUsers().then(success => {
    users = success
    if (req.body.email) {
      let sent = false
      for (var x = 0; x < users.length; x++) {
        if (users[x].Email == req.body.email && users[x].Password != "Facebook") {
          sent = true
          if (users[x].Validated) {
            Users.updateResetTokenOneUser(users[x]._id).then(succ => {
              sendResetEmail(req.body.email, succ);
              res.statusCode = 500;
              res.send("Email sent!");
            }).catch(err => {
              console.log(err)
              throw new Error(err)
            })
          } else {
            sendValidationEmail(users[x].Email, users[x].ValidationToken);
            res.statusCode = 401;
            res.send("Cannot reset password on an invalidated account. Validation email resent.");
          }
        }
      }
      if (!sent) {
        res.statusCode = 400;
        res.send("Email not found :( Or account is Facebook");
      }
    } else {
      throw new Error("No Email provided")
    }
  }).catch(err => {
    res.statusCode = 400;
    res.send(err.toString());
  })
})

router.post('/fbLogin', function(req, res, next) {
  if (!req.body.email || !req.body.id || !req.body.token) {
    res.statusCode = 400;
    res.send("You must include email, id, token")
  } else {
    Users.getUsers().then(success => {
      users = success
      for (var x = 0; x < users.length; x++) {
        if (users[x].Email == req.body.email && users[x].Password != "Facebook") {
          res.statusCode = 500;
          res.send("You already have an account with same email.")
          return
        } else if (users[x].Email == req.body.email) {
          res.json(users[x])
          return
        }
      }
      let newUser = {
        "Email": req.body.email,
        "Password": "Facebook",
        "JWTToken": "No token for facebook users",
        "JWTIssued": new Date().toUTCString(),
        "FavoriteTeam": "",
        "AccountCreated": new Date().toLocaleDateString(),
        "SpecialPermissions": {"FBID":  req.body.id},
        "ValidationToken": shortid.generate(),
        "Validated": true,
        "ResetToken": shortid.generate(),
        "DisplayName": "I love JavaScript XD",
        "ProfileBase64": ""
      }
      axios.get(FBApi + req.body.id + '/?access_token=' + req.body.token)
      .then(response => {
        newUser.DisplayName = response.data.name
        axios.get(FBApi + req.body.id + FBApiPictureSuffix)
        .then(response => {
          fetch.remote(response.data.data.url).then((data) => {
            newUser.ProfileBase64 = data[1].split(',')[1]
            Users.insertUser(newUser).then(succ => {
              res.json(newUser)
            }).catch(err => {
              throw new Error(err)
            })
          }).catch((reason) => {throw new Error(reason)});
        })
        .catch(err => {
          throw new Error(err)
        })
      })
      .catch(err => {
        throw new Error(err)
      })
    }).catch(err => {
      res.statusCode = 401;
      res.send(err.toString());
    })
  }
})

module.exports = router;
