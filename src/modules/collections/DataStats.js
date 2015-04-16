/**
 * @module Application
 * @submodule Models
 */
define([
    'core/modules/GelatoCollection',
    'modules/models/DataStat'
], function(GelatoCollection, DataStat) {

    /**
     * @class DataStats
     * @extends GelatoModel
     */
    var DataStats = GelatoCollection.extend({
        /**
         * @method initialize
         * @constructor
         */
        initialize: function() {},
        /**
         * @property model
         * @type DataStat
         */
        model: DataStat,
        /**
         * @method comparator
         * @param {DataStat} statA
         * @param {DataStat} statB
         * @returns {Number}
         */
        comparator: function(statA, statB) {
            if (statA.id > statB.id) {
                return -1;
            } else if (statB.id > statA.id) {
                return 1;
            } else {
                return 0;
            }
        },
        /**
         * @method fetch
         * @param {Function} [callbackSuccess]
         * @param {Function} [callbackError]
         */
        fetch: function(callbackSuccess, callbackError) {
            var self = this;
            var dates = this.getMonthDates();
            Async.each(dates, function(date, callback) {
                app.api.fetchStats({
                    start: date
                }, function(result) {
                    app.user.storage.put('stats', result, function() {
                        self.add(result, {merge: true});
                        callback();
                    }, function(error) {
                        callback(error);
                    });
                }, function(error) {
                    callback(error);
                });
            }, function(error) {
                if (error) {
                    if (typeof callbackError === 'function') {
                        callbackError(error);
                    }
                } else {
                    if (typeof callbackSuccess === 'function') {
                        callbackSuccess();
                    }
                }
            });
        },
        /**
         * @method getMonthDates
         * @returns {Array}
         */
        getMonthDates: function() {
            var dates = [];
            var baseDate = new Date();
            var baseDateString = Moment().format('YYYY-MM-');
            var baseDateToday = Moment().format('YYYY-MM-DD');
            var baseDateYesterday = Moment().subtract(1, 'day').format('YYYY-MM-DD');
            var downloadedDates = this.pluck('date');
            var lastDateOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
            for (var i = 1; i < lastDateOfMonth; i ++) {
                var date = null;
                if (i < 10) {
                    date = baseDateString + '0' + i;
                } else {
                    date = baseDateString + i;
                }
                if (date === baseDateToday ||
                    date === baseDateYesterday ||
                    downloadedDates.indexOf(date) === -1) {
                    dates.push(date);
                }
            }
            return dates;
        },
        /**
         * @method getTotalCharactersLearned
         * @returns {Number}
         */
        getTotalCharactersLearned: function() {
            return this.at(0).get('char').rune.learned.all;
        },
        /**
         * @method getTotalWordsLearned
         * @returns {Number}
         */
        getTotalWordsLearned: function() {
            return this.at(0).get('word').rune.learned.all;
        },
        /**
         * @method load
         * @param {Function} callbackSuccess
         * @param {Function} callbackError
         * @returns {DataStats}
         */
        load: function(callbackSuccess, callbackError) {
            var self = this;
            Async.series([
                function(callback) {
                    app.user.storage.all('stats', function(result) {
                        self.add(result, {merge: true, silent: true});
                        callback();
                    }, function(error) {
                        callback(error);
                    });
                },
                function(callback) {
                    self.fetch();
                    callback();
                }
            ], function(error) {
                if (error) {
                    callbackError(error);
                } else {
                    callbackSuccess();
                }
            });
            return this;
        }
    });

    return DataStats;

});