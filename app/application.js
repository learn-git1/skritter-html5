var GelatoApplication = require('gelato/application');
var Api = require('models/api');
var User = require('models/user');
var Functions = require('functions');
var Router = require('router');

/**
 * @class Application
 * @extends {GelatoApplication}
 */
module.exports = GelatoApplication.extend({
    /**
     * @method initialize
     * @constructor
     */
    initialize: function() {
        window.onerror = this.handleError;
        Raygun.init('VF3L4HPYRvk1x0F5x3hGVg==', {
            excludedHostnames: ['localhost'],
            excludedUserAgents: ['PhantomJS'],
            ignore3rdPartyErrors: true
        }).attach();
        Raygun.setVersion(this.get('version'));
        this.api = new Api();
        this.fn = Functions;
        this.router = new Router();
        this.user = new User();
    },
    /**
     * @property defaults
     * @type {Object}
     */
    defaults: {
        canvasSize: 450,
        date: '{!date!}',
        language: '{!application-language!}',
        lastReviewCheck: moment().unix(),
        name: '{!application-name!}',
        timestamp: '{!timestamp!}',
        version: '{!application-version!}'
    },
    /**
     * @method getLanguage
     * @returns {String}
     */
    getLanguage: function() {
        return this.get('language');
    },
    /**
     * @method handleError
     * @param {String} message
     * @param {String} url
     * @param {Number} line
     * @returns {Boolean}
     */
    handleError: function(message, url, line) {
        console.log(message, url, line);
        $.notify({
            icon: 'fa fa-exclamation-circle',
            title: 'Error',
            message: message
        },{
            type: 'minimalist',
            animate: {
                enter: 'animated fadeInDown',
                exit: 'animated fadeOutUp'
            },
            delay: 5000,
            icon_type: 'class'
        });
        return false;
    },
    /**
     * @method isChinese
     * @returns {Boolean}
     */
    isChinese: function() {
        return this.get('language') === 'zh';
    },
    /**
     * @method isJapanese
     * @returns {Boolean}
     */
    isJapanese: function() {
        return this.get('language') === 'ja';
    },
    /**
     * @method sendRaygunTestError
     */
    sendRaygunTestError: function() {
        try {
            throw new Error('TEST ERROR');
        } catch(error) {
            Raygun.send(error);
        }
    },
    /**
     * @method start
     */
    start: function() {
        this.user.load();
        this.router.start();
    }
});
