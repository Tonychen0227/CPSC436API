var express = require('express');
var router = express.Router();
const shortid = require('shortid');
let jwt = require('jsonwebtoken');
const Users = require('../mongo/users');
const config = require('../config.js');
const sendinblue = require('sib-api-v3-sdk');
const axios = require('axios');
const fetch = require('fetch-base64');
var fs = require('fs');

var defaultImage = "https://www.myinstants.com/media/instants_images/1340305905201.png";

var FBApi = "https://graph.facebook.com/v3.3/";

var FBApiPictureSuffix = "/picture?height=500&redirect=0";

var mailClient = sendinblue.ApiClient.instance;
var apiKey = mailClient.authentications['api-key'];
apiKey.apiKey = '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';

var apiInstance = new sendinblue.SMTPApi();

var sendSmtpEmail = new sendinblue.SendSmtpEmail(); // SendSmtpEmail | Values to send a transactional email

var validateHtmlContentRoot = config.isProd ? "<h3>Please click this link to confirm your verification for GGPanda!</h3> <br/> <a href='http://cpsc436basketballapi.herokuapp.com/users?validate="
: "<h3>Please click this link to confirm your verification for GGPanda!</h3> <br/> <a href='http://localhost:3001/users?validate=";

var resetHtmlContentRoot = config.isProd ? "<h3>Please click this link to confirm your password reset for GGPanda!</h3> <br/> <a href='http://cpsc436basketballapi.herokuapp.com/users?reset="
: "<h3>Please click this link to confirm your password reset for GGPanda!</h3> <br/> <a href='http://localhost:3001/users?reset=";

var htmlContentTail = "' target='_blank'>Click here! This is not scam I swear </a>";

sendSmtpEmail.sender = { "email":"tony.chen@outlook.com", "name":"GGPanda Basketball"};
sendSmtpEmail.subject = "CPSC436 Basketball: Account Verification";

const sendValidationEmail = (email, token) => {
  sendSmtpEmail.to = [{"email": email}];
  sendSmtpEmail.subject = "CPSC436 Basketball: Account Verification";
  console.log(sendSmtpEmail);
  sendSmtpEmail.htmlContent = validateHtmlContentRoot + token + htmlContentTail;
  apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {
    console.log('API called successfully. Returned data: ' + data);
  }, function(error) {
    console.error(error);
  });
}

const sendResetEmail = (email, token) => {
  sendSmtpEmail.to = [{"email": email}];
  sendSmtpEmail.subject = "CPSC436 Basketball: Password Reset";
  console.log(sendSmtpEmail);
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
      users = success;
      let user = users.filter((function(item)  {
        return item.ValidationToken == req.query.validate;
      }))
      user = user[0];
      if (user) {
        Users.validateOneUser(user._id).then(success => {
          res.json("Validation successful");
        }).catch(err => {
          throw new Error(err);
        })
      }
    }).catch(err => {
      res.statusCode = 401;
      res.send(err.toString());
    })
  } else if (req.query.reset) {
    Users.getUsers().then(success => {
      users = success;
      let sent = false;
      let user = users.filter(function(item) {
        return item.ResetToken == req.query.reset && item.Password != "Facebook";
      })
      user = user[0];
      if (user) {
        Users.resetPWOneUser(user._id).then(success => {
          res.json("Reset successful, please log in with new password and it will set.")
        }).catch(err => {
          throw new Error(err);
        })
      } else {
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
    res.send("Unauthorized");
  }
});

const handleUsernamePasswordLogin = (users, email, password) => {
  // password should already be hashed
  let user = users.filter(function(item) {
    return item.Email == email;
  })
  user = user[0];
  if (user) {
    if (user.Password == password) {
      if (!user.Validated) {
        sendValidationEmail(user.Email, user.ValidationToken);
        throw new Error("Verification email resent");
      }
      let token = jwt.sign({email: email},
        config.secret,
        { expiresIn: '24h' // expires in 24 hours
        }
      );
      user.JWTToken = token;
      user.JWTIssued = new Date().toUTCString();
      Users.updateOneUserJwt(user._id, user.JWTToken, user.JWTIssued).then(success => {
        Users.getUsers().then(succ => {
          let user = succ.filter(function(item) {
            return item.Email == email;
          })
          user = user[0];
          if (user) {
            console.log("RETURNING", user);
            return user;
          } else {
            throw new Error("???");
          }
        }).catch(err => {
          throw new Error(err);
        })
      }).catch(err => {
        next(err);
      })
      return user;
    } else if (user.Password == "") {
      Users.setPWOneUser(user._id, password).then(succ1 => {
        Users.getUsers().then(succ => {
          let user = succ.filter(function(item) {
            return item.Email == email;
          })
          user = user[0];
          if (user) {
            console.log("RETURNING", user);
            return user;
          } else {
            throw new Error("???");
          }
        }).catch(err => {
          throw new Error(err);
        })
      }).catch(err => {
        throw new Error(err);
      })
    } else {
      throw new Error("Unauthorized (incorrect email/password). Is this a Facebook account?");
    }
  } else {
    throw new Error("No corres. email found");
  }
}

const handleJWTLogin = (users, token) => {
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      throw new Error("Invalid token");
    }
  });
  let user = users.filter(function(item) {
    return item.JWTToken == token;
  }) 
  user = user[0];
  if (user) {
    let date = new Date(user.JWTIssued);
    if (new Date() <= date.setDate(date.getDate() + 1)) {
      return user;
    } else {
      throw new Error("Token expired");
    }
  } else {
    throw new Error("No corresponding JWT found");
  }
}

router.post('/login', function(req, res, next) {
  Users.getUsers().then(success => {
    users = success;
    if (req.body.email && req.body.password) {
      let result = handleUsernamePasswordLogin(users, req.body.email, req.body.password);
      console.log("API RESULT" + result);
      res.json(result);
    }
    else if (req.body.jwt) {
      let result = handleJWTLogin(users, req.body.jwt);
      res.json(result);
    } else {
      throw new Error("No authentication supplied");
    }
  }).catch(err => {
    res.statusCode = 401;
    res.send(err.toString());
  })
})

const checkRegUser = (users, email, password) => {
  if (!email || !password) {
    throw new Error("Forgot email or password");
  }
  let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  let match = re.test(email);
  if (!match) {
    throw new Error("Invalid email");
  }
  if (password.length < 8) {
    throw new Error("Password is too short");
  }
  let user = users.filter(function(item) {
    return item.Email == email;
  })
  user = user[0];
  if (user) {
    throw new Error("Email is taken");
  }
  let token = jwt.sign({username: email},
    config.secret,
    { expiresIn: '24h' // expires in 24 hours
    }
  );
  let newDate = new Date();
  
  let userJson = {
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
  };
  return userJson;
}

router.post('/register', function(req, res, next) {
  Users.getUsers().then(success => {
    users = success;
    let userJSON = checkRegUser(users, req.body.email, req.body.password);
    userJSON.DisplayName = req.body.displayName != '' ? req.body.displayName : userJSON.DisplayName;
    fetch.remote(defaultImage).then((data) => {
      userJSON.ProfileBase64 = data[1].split(',')[1];
      Users.insertUser(userJSON).then(success => {
        sendValidationEmail(success.ops[0].Email, success.ops[0].ValidationToken);
        throw new Error("User registered. Please verify email.");
      }).catch(err => {
        res.statusCode = 500;
        res.send(err.toString());
      })
    }).catch((reason) => {throw new Error(reason)});
  }).catch(err => {
    res.statusCode = 403;
    res.send(err.toString());
  })
})

router.post('/reset', function(req, res, next) {
  Users.getUsers().then(success => {
    users = success;
    if (req.body.email) {
      let user = users.filter(function(item) {
        console.log(item.Email == req.body.email);
        console.log(item.Password != "Facebook");
        return item.Email == req.body.email && item.Password != "Facebook";
      })
      user = user[0];
      if (user) {
          if (user.Validated) {
            Users.updateResetTokenOneUser(user._id).then(succ => {
              sendResetEmail(req.body.email, succ);
              res.statusCode = 500;
              res.send("Email sent!");
            }).catch(err => {
              console.log(err);
              throw new Error(err);
            })
          } else {
            sendValidationEmail(user.Email, user.ValidationToken);
            res.statusCode = 401;
            res.send("Cannot reset password on an invalidated account. Validation email resent.");
          }
      } else {
          res.statusCode = 400;
          res.send("Email not found :( Or account is Facebook");
        }
    } else {
      throw new Error("No Email provided");
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
      users = success;
      let user = users.filter(function(item) {
        return item.Email == req.body.email && item.Password != "Facebook";
      })
      user = user[0];
      let userEmail = users.filter(function(item) {
        return item.Email == req.body.email;
      })
      userEmail = userEmail[0];
      userEmail = userEmail[0];
      if (user) {
        res.statusCode = 500;
        res.send("You already have an account with same email.");
        return;
      } else if (userEmail) {
        res.json(user);
        return;
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
      };
      axios.get(FBApi + req.body.id + '/?access_token=' + req.body.token)
      .then(response => {
        newUser.DisplayName = response.data.name;
        console.log(response.data);
        axios.get(FBApi + req.body.id + FBApiPictureSuffix)
        .then(response => {
          /*
          console.log(response.data.data.url)
          axios.get(response.data.data.url, {'Content-Type': 'image/jpeg'}).then(result => {
            let bitmap = fs.readFileSync(result.data);
            let data = new Buffer(bitmap).toString('base64');
            console.log(data)
            newUser.ProfileBase64 = data;
            */
            Users.insertUser(newUser).then(succ => {
              res.json(newUser);
            }).catch(err => {
              throw new Error(err);
            })
            /*
          }).catch(err => {
            throw new Error(err);
          })
          */
          
        })
        .catch(err => {
          throw new Error(err);
        })
      })
      .catch(err => {
        throw new Error(err);
      })
    }).catch(err => {
      res.statusCode = 401;
      res.send(err.toString());
    })
  }
})

module.exports = router;
