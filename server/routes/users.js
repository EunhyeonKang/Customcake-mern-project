const express = require("express");
const router = express.Router();
const { User } = require("../models/User");
const { auth } = require("../middleware/auth");
const { OAuth2Client } = require("google-auth-library");
const config = require("../config/key");

//=================================
//             User
//=================================
router.get("/auth", auth, (req, res) => {
  res.status(200).json({
      _id: req.user._id,
      isAdmin: req.user.role === 0 ? false : true,
      isAuth: true,
      email: req.user.email,
      name: req.user.name,
      lastname: req.user.lastname,
      role: req.user.role,
      image: req.user.image,
      company: req.user.company
  });
});

router.post("/register", (req, res) => {

  const user = new User(req.body);

  user.save((err, doc) => {
      // console.log(doc)
      if (err) return res.json({ success: false, err });
      return res.status(200).json({
          success: true
      });
  });
});

router.post("/login", (req, res) => {
  User.findOne({ email: req.body.email }, (err, user) => {
      if (!user)
          return res.json({
              loginSuccess: false,
              message: "Auth failed, account not found"
          });

      user.comparePassword(req.body.password, (err, isMatch) => {
          if (!isMatch)
              return res.json({ loginSuccess: false, message: "Wrong password" });

          user.generateToken((err, user) => {
              if (err) return res.status(400).send(err);
              res.status(200).json({
                  loginSuccess: true, userId: user._id,
                  tokenExp: user.tokenExp, token: user.token,
                  company: user.company
              });
          });
      });
  });
});

router.get("/logout", auth, (req, res) => {
  User.findOneAndUpdate({ _id: req.user._id }, { token: "", tokenExp: "" }, (err, doc) => {
      if (err) return res.json({ success: false, err });
      return res.status(200).send({
          success: true
      });
  });
});

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);
router.post("/googleLogin", (req, res) => {
  const idToken = req.body.tokenId;
  client
    .verifyIdToken({ idToken, audience: config.GOOGLE_CLIENT_ID })
    .then(response => {

      const { email_verified, name, email, jti, given_name } = response.payload;
      if (email_verified) {
        User.findOne({ email }).exec((err, user) => {
          if (user) {
           
            user.generateToken((err, user) => {
              if (err) return res.status(400).send(err);
              res.status(200).json({
                  loginSuccess: true, userId: user._id,
                  tokenExp: user.tokenExp, token: user.token,
                  msg: "로그인에 성공했습니다."
              });
            });
          } else {
            let lastname = given_name;
            let password = jti;
            user = new User({ name, email, lastname, password });
            user.save((err, user) => {
              if (err) {
                return res.status(400).json({
                  loginSuccess: false,
                  error: err
                });
              }
              user.generateToken((err, user) => {
                if (err) return res.status(400).send(err);
                res.status(200).json({
                    loginSuccess: true, userId: user._id,
                    tokenExp: user.tokenExp, token: user.token,
                    msg: "가입에 성공했습니다."
                });
              });
            });
          }
        });
      } else {
        return res.status(400).json({
          error: "Google login failed. Try again."
        });
      }
    });
});
router.get("/usersindex",(req,res)=>{
    User.find({authcheck : ['1','2','3']})
    .exec((err,userindex)=>{
      //console.log(userindex)
      if(err) return res.status(400).send(err);
      res.status(200).json({success:true,userindex})
    })
 })


module.exports = router;

