'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Availability = loader.database.define('availabilities', {
    candidateId: {
        type: Sequelize.INTEGER,
        primaryKey: true, // 候補日IDと、ユーザーIDの2つの組み合わせで、主キーとして成立する
        allowNull: false
    },
    userId: {
        type: Sequelize.INTEGER,
        primaryKey: true, // 候補日IDと、ユーザーIDの2つの組み合わせで、主キーとして成立する
        allowNull: false
    },
    availability: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    scheduleId: { // 検索性を高めるため、予定IDも含めておく
        type: Sequelize.UUID,
        allowNull: false
    }
}, {
    freezeTableName: true,
    timestamp: false,
    indexes: [
        {
            fields: ['scheduleId']
        }
    ]
});

module.exports = Availability;
