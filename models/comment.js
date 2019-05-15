'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Comment = loader.database.define('comments', {
    scheduleId: { // 予定IDと、ユーザーIDの2つの組み合わせで、主キーとして成立する
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false
    },
    userId: {
        type: Sequelize.INTEGER,
        primaryKey: true, // 予定IDと、ユーザーIDの2つの組み合わせで、主キーとして成立する
        allowNull: false
    },
    comment: {
        type: Sequelize.STRING,
        allowNull: false
    },

}, {
    freezeTableName: true,
    timestamp: false,
});

module.exports = Comment;
