const express = require('express');
const path = require('path');
const app = express();
const ejs = require('ejs');
const port = process.env.PORT || 5000;
const mongoose = require('mongoose');
const Message = require('./models/Message');

//DB connection
mongoose.connect('mongodb://localhost:27017/waawanonymous')
.then(dbconnect => console.log('Database connection successful'))
.catch(error => console.log('Database connection error: ', error.message))

//setting up express
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'ejs')

app.get('/',(request, response) => {
    //response.send('You have reached the homepage')
    response.render('index');
});

app.get('/about',(request, response) => {
    response.send('About page')
});

app.get('/contacts',(request, response) => {
    response.send('Contact page')
});

app.post('/message/create-message',(request, response) => {
    //console.log('Form Data:::::: ',request.body)
    let {message} = Request.body;

    if (!message){
        return response.redirect('/');
    }

    let newMessage = new Message({
        message
    });

    newMessage.save()
    .then ((data) => console.log('Message created successfully', data))
    .catch (() => console.log('Error creating message'))
    response.redirect('/');
});
app.listen(port, () => console.log(`Servers Started And Listening On Port::: ${port}`));