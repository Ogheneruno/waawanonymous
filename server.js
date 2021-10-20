const {globalvariables} = require("./config/configuration");
const express = require('express');
const path = require('path');
const ejs = require('ejs');
const port = process.env.PORT || 5040;
const mongoose = require('mongoose');
const Message = require('./models/Message');
const User = require('./models/User');
const Campaign = require('./models/Campaign');
const logger = require('morgan');
const flash = require ('connect-flash');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const { req, res } = require("express");
const passport = require('passport');
const LocalStraregy = require('passport-local').Strategy
const {isLoggedIn} = require('./config/authorizations');
const randomstring = require('randomstring');

//DB connection
mongoose.connect('mongodb+srv://Ogheneruno:Fresco495@runo.pdvi8.mongodb.net/waawanonymous')
.then((dbconnect) => console.log('Database connection successfully'))
.catch(error => console.log('Database connection error: ', error.message))

const app = express();

passport.use(new LocalStraregy({
    usernameField: 'email',
    passReqToCallback: true
}, async (req, email, password, done) => {
    await User.findOne({email})
    .then(async (user) => {
        if (!user) return done(null, false,req.flash('error-message', 'User not found'));

        await bcrypt.compare(password, user.password, (err, passwordMatch) => { 
            if (err) {
                return err;
            }
            if (!passwordMatch) return done(null, false, req.flash('error-message', 'Password Incorrect'));

            return done(null, user, req.flash('success-message', 'Login Successful'))

        });


    })

}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });


//setting up express
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

//express-session
app.use(cookieParser());
app.use(
    session({
        secret: 'secret*up-and-down',
        resave: true,
        saveUninitialized: true,
        cookie: {
            maxage: Date.now( + 60000)
        },
        store: MongoStore.create({
            mongoUrl: 'mongodb+srv://Ogheneruno:Fresco495@runo.pdvi8.mongodb.net/waawanonymous',
        })
    })
);

app.use(logger('dev'));

//initilize passport
app.use(passport.initialize());
app.use(passport.session());

//use Flash
app.use(flash());

//use Global Variables
app.use(globalvariables);
app.locals.moment = require('moment');

//set views
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
    res.redirect('/user/login')
});

app.get('/user/register', (req, res) => {
    res.render('register');
});

app.post('/user/register', async (req, res) => {
    let {
        email,
        fullName,
        password,
        confirmPassword
    } = req.body;

    if (password !== confirmPassword) {
        req.flash('error-message', 'Passwords do not match');
        return res.redirect('back');
    }

    let userExists = await User.findOne({ email });

    if (userExists) {
        req.flash('error-message', 'Email already exist');
        return res.redirect('back');
    }

    const salt = await bcrypt.genSalt();
    const hashedpassword = await bcrypt.hash(password, salt);

    let newUser = new User({
        email,
        fullName,
        password: hashedpassword
    });

    await newUser.save();

    if (!newUser) {
        req.flash('error-messagee', 'Something went wrong, please try again')
        return res.redirect('back');

    }

    req.flash('success-message', 'Registration successful, you can now login');
    return res.redirect('/user/login');
        
});

app.get('/user/login', (req, res) => {
    if (req.user) return res.redirect('/user/profile');
    res.render('login');
});

app.get('/user/profile', isLoggedIn, async (req, res) => {
    let loggedUser = req.user._id;
    let userCampaigns = await Campaign.find({ user: loggedUser })
    .populate('user messages');
    // console.log(userCampaigns)
    res.render('profile', {userCampaigns});
})

app.post('/user/login', passport.authenticate('local', {
    successRedirect: '/user/profile',
    failureRedirect: '/user/login',
    failureFlash: true,
    seccessFlash: true,
    session: true
}));    

app.get('/campaign/create-campaign', isLoggedIn, (req, res) => {
    res.render('createCampaign');
});

app.post('/campaign/create-campaign', isLoggedIn, async (req, res) => {
    let loggedInUser = req.user;
    let {title} = req.body;
    let campLink = `${req.headers.origin}/campaign/single-campaign/${randomstring.generate()}`;

    let newCampaign = new Campaign ({
        title,
        user: loggedInUser._id,
        link: campLink,
    });

    await newCampaign.save();
    if(!newCampaign) {
        req.flash('error-message', 'An error occurred while creating campaign');
        return res.redirect('back');
    }

    req.flash('success-message', 'Campaign created successfully');
    return res.redirect('back');

});

app.get('/campaign/single-campaign/:campaignId', async (req, res) => {
    let campaignLink = `http://${req.headers.host}/campaign/single-campaign/${req.params.campaignId}`
    // console.log(req.headers)
    const singleCampaign = await Campaign.findOne({link: campaignLink})
    .populate('user');

    if (!singleCampaign) {
        req.flash('error-message', 'Invalid campaign link');
        return res.redirect('/user/login');
    }

    // console.log(singleCampaign.user.fullName)

    res.render('campaignMessage', {singleCampaign})

});

app.post('/campaign/campaign-message/:campaignId', async (req, res, next) => {
    let {message} = req.body;

    if (!message){
        req.flash('error-message', 'Please enter a campaign message');
        return res.redirect('/user/login');
    }

    let campaignExist = await Campaign.findOne({_id: req.params.campaignId});

    if(!campaignExist) {
        req.flash('error-message', 'Campaign not found');
        return res.redirect('back');
    }

    let newMessage = new Message({
        message
    });

    await newMessage.save()
    .then ((data) => {
        campaignExist.messages.push(data._id);
        campaignExist.save();
        console.log('Campaign message created successfully', data);
        req.flash('success-message', 'Message sent successfully');
        res.redirect('back');
})
    .catch ((error) => {
        if (error) {
            req.flash('error-message', error.message)
            res.redirect('/');
        }
    });
});

app.get('/campaign/single-campaign/user/login', (req, res) => {
    res.redirect('/user/login')
});

//delete messages
app.get('/messages/delete-message/:campaignId', async (req, res) => {
    const {campaignId} = req.params;

    const deletedMsg = await Message.findByIdAndDelete(campaignId);
    if (!deletedMsg) {
        req.flash('success-message', 'Campaign message deleted successfully');
        res.redirect('back');
    } else {
        req.flash ('error-message', 'Unable to delete message');
        res.redirect('back');
    }
});

// delete campaign
app.get('/campaigns/delete-campaign/:campaignId', async function (req, res) {
    const {campaignId} = req.params;
    const deleteCampaign = await Campaign.findByIdAndDelete(campaignId);
    res.redirect('back');
});

app.get('/user/logout', (req, res) => {
    req.logOut();

    req.flash('success-message', 'User logged out');
    res.redirect('/user/login');
});



app.listen(port, () => console.log(`Servers Started And Listening On Port::: ${port}`));
