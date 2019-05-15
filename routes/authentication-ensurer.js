'use strict';

function ensure(req, res, next) {
    if (req.isAuthenticated()) {return next();}
    res.redirect('/login?from=' + req.originalUrl); // 認証がうまくいかなかったときに、どのURLにアクセスしようとしていたかを/loginのクエリに含めた形でリダイレクト
}

module.exports = ensure;
