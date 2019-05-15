var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var session = require('express-session');
var passport = require('passport');

// Sequelize用に、モデルの読み込んで、エンティティ同士の関係を定義しておく
var User = require('./models/user');
var Schedule = require('./models/schedule');
var Availability = require('./models/availability');
var Candidate = require('./models/candidate');
var Comment = require('./models/comment');

User.sync().then(() => { // sync関数で、Userモデルに合わせたテーブルを作成→作成終了後に実行する内容を無名関数で記述
  Schedule.belongsTo(User, {foreignKey: 'createdBy'});
  Schedule.sync();
  Comment.belongsTo(User, {foreignKey: 'userId'});
  Comment.sync();
  Availability.belongsTo(User, {foreignKey: 'userId'});
  Candidate.sync().then(() => {
    Availability.belongsTo(Candidate, {foreignKey: 'candidateId'});
    Availability.sync();
  });
});


var GitHubStrategy = require('passport-github2').Strategy;
var GITHUB_CLIENT_ID =  process.env.GITHUB_CLIENT_ID || '93fcdbc30b34008408dd';
var GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '2c6676a3b9bacb442011a82924530c59e43b18b6';



passport.serializeUser(function(user, done) { // 認証されたユーザーの情報をそのまま全てオブジェクトとして保存
  done(null, user); // （エラー、結果）
});

passport.deserializeUser(function(obj, done) { // 保存されたデータをユーザーの情報として読み出す処理
  done(null, obj);
});

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: process.env.HEROKU_URL ? process.env.HEROKU_URL + 'auth/github/callback' : 'http://localhost:8000/auth/github/callback'
},
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
      User.upsert({
        userId: profile.id,
        username: profile.username
      }).then(() => {
        done(null, profile);
      });
    })
  }
));

var indexRouter = require('./routes/index'); // 後述のapp.use('/', indexRouter)とセット
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var schedulesRouter = require('./routes/schedules');
var availabilitiesRouter = require('./routes/availabilities');
var commentsRouter = require('./routes/comments');

var app = express(); // プロジェクト全体をインスタンス化。慣例でappという変数にする。
app.use(helmet()); // 使用するミドルウェアをuseで設定。


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug'); // ここでpugファイルを宣言しているので、拡張子を省略してファイル指定できる

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'))); // staticファイルのディレクトリを指定

app.use(session({secret: '9ebb861e868a2003', resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter); // use関数は、引数の型を判定して、パスがある場合はＵＲＬを限定してミドルウェアを適用する
app.use('/login', loginRouter); // URLが/loginのときは、loginRouterに任せる
app.use('/logout', logoutRouter);
app.use('/schedules', schedulesRouter);
app.use('/schedules', availabilitiesRouter);
app.use('/schedules', commentsRouter);

app.get('/auth/github', // このURLにGETリクエストがあったときの処理
    passport.authenticate('github', {scope: ['user:email']}),
    function(req, res) {
});

app.get('/auth/github/callback',
    passport.authenticate('github', {failureRedirect: '/login'}),
    function(req, res) {
      var loginFrom = req.cookies.loginFrom;
      // オープンリダイレクト脆弱性対策
      if (loginFrom &&
        !loginFrom.includes('http://') && // DNSを取得した後はloginfromがホスト名を含んだURLになっているかのチェックを加えたほうが良い？？？
        !loginFrom.includes('https://')) {
        res.clearCookie('loginFrom');
        res.redirect(loginFrom);
      } else {
        res.redirect('/');
      }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
