'use strict';
const express = require('express');
const router = express.Router();
const Schedule = require('../models/schedule');
const User = require('../models/user');
const moment = require('moment-timezone');


/* GET home page. */
router.get('/', function(req, res, next) {
  const title = '予定調整くん';
  if (req.user) {
    Schedule.findAll({
    include: [
        {
            model: User,
            attributes: ['userId', 'username']
        }],
      order: [['"updateAt"', 'DESC']]
    }).then((allSchedules) => {
        console.log('################################################################   allSchedules############' + allSchedules);
        allSchedules.forEach((schedule) => {
            schedule.formattedUpdatedAt = moment(schedule.updateAt).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm')
        });
        const mySchedules =  allSchedules.filter(s => s.createdBy === parseInt(req.user.id));
        res.render(
            'index', {
                title: title,
                user: req.user,
                allSchedules: allSchedules,
                mySchedules: mySchedules,
                });


    });
  } else {
    res.render('index', {title: title, user: req.user});
  }


});

module.exports = router;
