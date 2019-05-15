'use strict';
const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
    const from = req.query.from; //authentication-ensurer で次を設定＿ログイン失敗時に、login/へのリダイレクトのURLを、login?from=<もともとのURL>という形にする
    if (from) {
        res.cookie('loginFrom', from, {expires: new Date(Date.now() + 600000)}); // ログインページ表示時、どこにアクセスしようとしていたかを、保存期間を10分としてCookieに保存してからログインページを描画するようにする
    }
    res.render('login');
});

module.exports = router;
