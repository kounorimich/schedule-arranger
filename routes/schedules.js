'use strict';
const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const uuid = require('uuid');
const Schedule = require('../models/schedule');
const Candidate = require('../models/candidate');
const User = require('../models/user');
const Availability = require('../models/availability');
const Comment = require('../models/comment');
const csrf = require('csurf');
const csrfProtection = csrf({cookie: true})


// 新しい予定作成ページの表示
router.get('/new', authenticationEnsurer, csrfProtection, (req, res, next) => {
    res.render('new', {user: req.user, csrfToken: req.csrfToken()});
});

// スケジュールオブジェクトの作成
router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) => { // postメソッドで/schedulesにアクセスした際、保持している値でインスタンス作成
    const scheduleId = uuid.v4();
    const updateAt = new Date();
    Schedule.create({
        scheduleId: scheduleId,
        scheduleName: req.body.scheduleName.slice(0, 255) || '（名称未設定）',
        memo: req.body.memo,
        createdBy: req.user.id,
        updateAt: updateAt
    }).then(() => {
        createCandidatesAndRedirect(parseCandidateNames(req), scheduleId, res);
    });
});


// 詳細・編集ページ
router.get('/:scheduleId', authenticationEnsurer, (req, res, next) => {
    let storedSchedule = null;
    let storedCandidates = null;
    Schedule.findOne({ // sequelizeオブジェクトを使い、テーブルを結合してユーザー属性を取得
        include: [
            {
                model: User,
                attributes: ['userId', 'username']
            }],
        where: {
            scheduleId: req.params.scheduleId
        },
        order: [['"updateAt"', 'DESC']]
    }).then((schedule) => {
        if (schedule) {
            storedSchedule = schedule;
            return Candidate.findAll({
                where: {scheduleId: schedule.scheduleId},
                order: [['"candidateId"', 'ASC']]
            });
        } else {
            const err = new Error('指定された予定は見つかりません');
            err.status = 404;
            next(err);
        }
    }).then((candidates) => {
        // データベースからその予定のすべての出欠を取得する
        storedCandidates = candidates;
        return Availability.findAll({
            include: [
                {
                    model: User,
                    attributes: ['userId', 'username']
                }
            ],
            where: {scheduleId: storedSchedule.scheduleId},
            order: [[User, 'username', 'ASC'], ['"candidateId"', 'ASC']]

        });
    }).then((availabilities) => {
        // 出欠 MapMap (k: userID, v: availabilityMap(k:candidateID, v: availability))を作成する
        const availabilityMapMap = new Map();
        availabilities.forEach((a) => {
            const map = availabilityMapMap.get(a.user.userId) || new Map(); // includeで結合したので、availabilityからUserモデルにアクセスできる
            map.set(a.candidateId, a.availability);
            availabilityMapMap.set(a.user.userId, map);
        });

        // 閲覧ユーザーと出欠に紐づくユーザーからユーザーMapを作る
        const userMap = new Map(); // k: userId, v: User
        userMap.set(parseInt(req.user.id), { // 閲覧ユーザーをmapにセット
            isSelf: true,
            userId: parseInt(req.user.id),
            username: req.user.username
        });

        availabilities.forEach((a) => {
            userMap.set(a.user.userId, {
                isSelf: parseInt(req.user.id) === a.user.userId, // forで回してるavailabilityのuserが閲覧ユーザーでないかを確認
                userId: a.user.userId,
                username: a.user.username
            });
        });
        // 全ユーザー・全候補日で二重ループして、それぞれの出欠の値がない場合には、「欠席」を設定する
        const users = Array.from(userMap).map((KeyAndValue) => KeyAndValue[1]); // userMapの値の配列を作成

        users.forEach((user) => {
            storedCandidates.forEach((candidate) => { // それぞれのUserのもつ、map(k: candidate, v:availability)
                const map = availabilityMapMap.get(user.userId) || new Map();
                const availability = map.get(candidate.candidateId) || 0; // データベースに値が設定されていなければ（未回答であれば）、 0（欠席)をセット
                map.set(candidate.candidateId, availability);
                availabilityMapMap.set(user.userId, map);
            });
        });

        // コメントの取得
        return Comment.findAll({
            where: {scheduleId: storedSchedule.scheduleId}
        }).then((comments) => {
            const commentMap = new Map(); // key: userId, value: comment
            comments.forEach((comment) => {
                commentMap.set(comment.userId, comment.comment);
            });
            res.render('schedule', {
                user: req.user,
                schedule: storedSchedule,
                candidates: storedCandidates,
                users: users,
                availabilityMapMap: availabilityMapMap,
                commentMap: commentMap
            });
        });
    });
});

router.get('/:scheduleId/edit', authenticationEnsurer, csrfProtection, (req, res, next) => {
    Schedule.findOne({
        where: {
            scheduleId: req.params.scheduleId
        }
    }).then((schedule) => {
        if (isMine(req, schedule)) { // 作成者のみが編集フォームを開ける
            Candidate.findAll({
                where: {scheduleId: schedule.scheduleId},
                order: [['"candidateId"', 'ASC']]
            }).then((candidates) => {
                res.render('edit', {
                    user: req.user,
                    schedule: schedule,
                    candidates: candidates,
                    csrfToken: req.csrfToken()
                });
            });
        } else {
            const err = new Error('指定された予定がない、または、予定を変更する権限がありません');
            err.status = 404;
            next(err);
        }
    });
});

function isMine(req, schedule) {
    return schedule && parseInt(schedule.createdBy) === parseInt(req.user.id);
}

router.post('/:scheduleId', authenticationEnsurer, csrfProtection, (req, res, next) => {
    Schedule.findOne({
        where: {
            scheduleId: req.params.scheduleId
        }
    }).then((schedule) => {
        if (isMine(req, schedule)) {
            if (parseInt(req.query.edit) === 1) {
                const updateAt = new Date();
                schedule.update({
                    scheduleId: schedule.scheduleId,
                    scheduleName: req.body.scheduleName.slice(0, 255) || '（名称未設定）',
                    memo: req.body.memo,
                    createdBy: req.user.id,
                    updateAt: updateAt
                }).then((schedule) => {
                    const candidateNames = parseCandidateNames(req);
                    if (candidateNames) {
                        createCandidatesAndRedirect(candidateNames, schedule.scheduleId, res);
                    } else {
                        res.redirect('/schedules/' + schedule.scheduleId);
                    }
                });
            } else if (parseInt(req.query.delete) === 1){
                deleteScheduleAggregate(req.params.scheduleId, () => {
                    res.redirect('/');
                });
            } else {
                const err = new Error('不正なリクエストです');
                err.status = 400;
                next(err);
            }
        } else{
            const err = new Error('指定された予定がない、または、編集する権限がありません');
            err.status = 404;
            next(err);
        }
    });
});

function deleteScheduleAggregate(scheduleId, done, err) { // scheduleIdから、該当するAvailability, Candidate, Scheduleを削除する
    const promiseCommentDestroy = Comment.findAll({
        where: {scheduleId: scheduleId}
    }).then((comments) => {
        return Promise.all(comments.map(c => c.destroy()));
    });

    Availability.findAll({
        where: {scheduleId: scheduleId}
    }).then((availabilities) => {
        const promises = availabilities.map((a) => {
            return a.destroy();
        });
        return Promise.all(promises);
    }).then(() => {
        return Candidate.findAll({
            where: {scheduleId: scheduleId}
        });
    }).then((candidates) => {
        const promises = candidates.map(c => c.destroy());
        return Promise.all(promises)
    }).then(() => {
        return Schedule.findById(scheduleId).then(s => s.destroy());
    }).then(() => {
        if (err) return done(err);
        done();
    });
}

router.deleteScheduleAggregate = deleteScheduleAggregate;

function createCandidatesAndRedirect(candidateNames, scheduleId, res) {
    const candidates = candidateNames.map(c => { // 候補日の文字列を受け取ってcandidateオブジェクトを作成
        return {
            candidateName: c,
            scheduleId: scheduleId
        }
    });
    Candidate.bulkCreate(candidates).then(() => {  // bulkCreateは、オブジェクトの配列を使ってデータベースに行を追加するメソッド
        res.redirect('/schedules/' + scheduleId);
    });
}

function parseCandidateNames(req) { // リクエストのcandidates要素の文字列を改行で区切り、両端のスペースを消して、空文字をフィルターで除去
    return req.body.candidates.trim().split('\n').map((s) => s.trim()).filter(s => s !== "");
}


module.exports = router;


