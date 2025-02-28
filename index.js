if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const Question = require('./models/question')
const passport = require("passport");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local");
const session = require('express-session');
const User = require("./models/user");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const MongoStore = require('connect-mongo').default;


const dbUrl = process.env.DB_URL || 'mongodb+srv://owner-raghav:password123456@cluster0.gc8q9.mongodb.net/fbla?retryWrites=true&w=majority';
mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => { 
  console.log('Connected to the DB Successfuly!');
}).catch(err => {
  console.log('ERROR: ', err.message);
});
mongoose.set('useCreateIndex', true);


app.set("view engine", "ejs");



app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

const secret = process.env.SECRET || "password";

const store = MongoStore.create({
  mongoUrl: dbUrl,
  secret,
  touchAfter: 24 * 3600
});

store.on("error", function(e){
  console.log("Session Store Error", e);
})

const sessionConfig = {
  store,
  secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24,
    maxAge: 1000 * 60 * 60 * 24
  } 
};
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) =>{
  res.locals.success = req.flash("success");
  res.locals.error = req.flash('error');
  next();
});

app.get("/", async (req, res) => {
  if(!req.isAuthenticated()){
    res.redirect("/register");
  } else {
    res.redirect("/quiz");
  }
});

 
app.get("/register", async (req, res) => {
    res.cookie("numbers", "none");
    res.render("home");
});


app.post("/register", async(req, res)=> {
  try{
    const {username, email, password} = req.body;
    const user = new User({email, username});
    const registeredUser = await User.register(user, password);
    req.flash('success', 'Successfully signed up for BQuiz!');
    console.log("A new user has registered");
    req.flash("Welcome to Bquiz!");
    res.redirect("/login");
  }catch (e){
    if (e.toString().includes('username')) {
      req.flash('error', "That username is already taken.");
    } else if(e.toString().includes('email')) {
      req.flash('error', "An account with that email already exists.");
    };
    res.redirect('/register')
  };
});


app.get("/login", async (req, res) => {
  if(req.isAuthenticated()){
    res.redirect("/quiz");
  } else {
    res.render("./users/login");
  };
});

app.post("/login", passport.authenticate('local', {failureFlash: true, failureRedirect: '/login'}), async (req, res) => {
  res.redirect('/quiz');
  console.log("A user has logged in");
})

app.post("/logout", async (req, res) => {
  if(!req.isAuthenticated()){
    res.redirect("/register");
  } else if(req.isAuthenticated()) {
    req.logout();
    res.redirect("/login");
  }
}); 


app.get("/quiz", async (req, res) => {
  if(!req.isAuthenticated()){
    res.redirect("/register");
  } else{
    res.render("quiz", {username: req.user.username});
    console.log(req.user);
  }
});

app.get("/settings", async(req, res) => {
  if(!req.isAuthenticated()){
    res.redirect("/register");
  } else {
    let currentUserData = await User.findOne({username: req.user.username});
    res.render("settings", {data: currentUserData, username: req.user.username});
  }
});

app.post("/settings", async (req, res) => {
  await User.findOneAndUpdate({username: req.user.username}, {$set: {numOfQuestions: req.body.data}});
  console.log("Updated Successfully");
  // console.log(req.body.data);
});




app.get("/quiz/:topic/info", async( req, res) => {
  if(!req.isAuthenticated()){
    res.redirect("/register");
  }else {
    let numOfQuestionInTopic = await Question.find({topicurl: req.params.topic});
    numOfQuestionInTopic =  Number(numOfQuestionInTopic.length);
    let questions_numbers = [];
    let num_of_questions = Number(req.user.numOfQuestions);
    let i = 0;
    while (i < num_of_questions){
      let number_for_now = Math.random() * numOfQuestionInTopic;
      let question_number = Math.floor(number_for_now)
      if(!questions_numbers.includes(question_number)){
        questions_numbers.push(question_number);
        i++;
      };
    }
    let optionNumbers = [];
    let b = 0;
    while (b < 3){
      let numberToAdd = Math.floor(Math.random() * 4);
      if (!optionNumbers.includes(numberToAdd)) {
        optionNumbers.push(numberToAdd);
        b++;
      }
    }
    let length = questions_numbers.length;
    res.cookie('numbers', questions_numbers);
    res.cookie('optionNumbers', optionNumbers);
    Question.find({topicurl: req.params.topic}).then(q => res.render("testinfo", {questions: q, numbers: req.cookies.numbers, length: length}));
  }
})


app.get("/quiz/:topic/quiz", async (req, res) => {
  if(!req.isAuthenticated()){
    res.redirect("/register");
  } else if(req.isAuthenticated()) {
    
    const questions_to_send = [];
    const question_numbers = req.cookies.numbers;
    let questions = await Question.find({ topicurl: req.params.topic })
    question_numbers.forEach(number => {
      questions_to_send.push(questions[number]);
    });
    let questionsForCookiesFirstThree = [questions_to_send[0],questions_to_send[1],questions_to_send[2]];
    let questionsForCookiesSecondThree = [questions_to_send[3],questions_to_send[4],questions_to_send[5]];
    let questionsForCookiesThirdThree = [questions_to_send[6],questions_to_send[7],questions_to_send[8]];
    let questionsForCookiesFourthThree = [questions_to_send[9],questions_to_send[10],questions_to_send[11]];
    let questionsForCookiesFifthThree = [questions_to_send[12],questions_to_send[13],questions_to_send[14]];
    let questionsForCookiesSixthThree = [questions_to_send[15],questions_to_send[16],questions_to_send[17]];
    let questionsForCookiesSeventhThree = [questions_to_send[18],questions_to_send[19],questions_to_send[20]];
    ////////////////////////////////////////////////
    res.cookie("questionsFirstThree", questionsForCookiesFirstThree);
    res.cookie("questionsSecondThree", questionsForCookiesSecondThree)
    res.cookie("questionsThirdThree", questionsForCookiesThirdThree);
    res.cookie("questionsFourthThree", questionsForCookiesFourthThree);
    res.cookie("questionsFifthThree", questionsForCookiesFifthThree);
    res.cookie("questionsSixthThree", questionsForCookiesSixthThree);
    res.cookie("questionsSeventhThree", questionsForCookiesSeventhThree);
    res.render("test");
  }
})


app.get("/quiz/:topic/results", async(req, res) => {
  if (!req.isAuthenticated()){
    res.redirect("/");
  } else {
    let currentUser =  await User.findOne({username : req.user.username});
    console.log(currentUser);
    history = currentUser.history;
    currentTest = history.slice(-1)[0];
    ids = currentTest[0];
    console.log(ids);
    let questions = [];
    for (const id of ids){
      let currentQuestion = await Question.findOne({_id: id});
      questions.push(currentQuestion);
    }
    res.render("results", {testData: currentUser.history.slice(-1)[0], questionData: questions});
  }
})

app.post("/quiz/:topic/results", async (req, res) => {
  let currentUser = await User.findOne({username : req.user.username});
  currentHistory = currentUser.history;
  currentHistory.push(JSON.parse(req.body.data));
  console.log(currentHistory);
  await User.findOneAndUpdate({username: req.user.username}, {$set: {history: currentHistory}})
  console.log("Redirect");
  res.redirect(`/quiz/${req.params.topic}/results`);
})



//{questions: q, numbers: req.cookies.numbers, optionNumbers: req.cookies.optionNumbers, numberOfQuestions: req.cookies.numbers.length}











const PORT = process.env.PORT || 80

app.listen(PORT, err => {
  if (err) throw err
  console.log(`Listening on port ${PORT}...`);
})