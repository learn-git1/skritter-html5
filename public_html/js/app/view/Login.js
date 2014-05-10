/**
 * @module Skritter
 * @submodule View
 * @param templateLogin
 * @author Joshua McFarland
 */
define([
    'require.text!template/login.html'
], function(templateLogin) {
    /**
     * @class Login
     */
    var Login = Backbone.View.extend({
        /**
         * @method initialize
         */
        initialize: function() {
        },
        /**
         * @method render
         * @returns {Backbone.View}
         */
        render: function() {
            document.title = "Skritter - Login";
            this.$el.html(templateLogin);
            return this;
        },
        /**
         * @property {Object} events
         */
        events: {
            'keyup #password': 'handleLoginEnter',
            'vclick #button-home': 'toHome',
            'vclick #button-login': 'login'
        },
        /**
         * @method disableForm
         */
        disableForm: function() {
            this.$(':input').prop('disabled', true);
        },
        /**
         * @method enableForm
         */
        enableForm: function() {
            this.$(':input').prop('disabled', false);
        },
        /**
         * @method handleEnterPressed
         * @param {Object} event
         */
        handleLoginEnter: function(event) {
            if (event.keyCode === 13) {
                this.login(event);
            } else {
                event.preventDefault();
            }
        },
        /**
         * @method toLogin
         * @param {Object} event
         */
        login: function(event) {
            this.disableForm();
            var username = this.$('#username').val();
            var password = this.$('#password').val();
            skritter.user.login(username, password, _.bind(function(result) {
                if (result.statusCode === 200) {
                    skritter.modal.show('download')
                            .set('.modal-title', 'DOWNLOADING ACCOUNT')
                            .progress(100);
                    skritter.user.sync.downloadAccount(function() {
                        document.location.href = '';
                    });
                } else {
                    this.$('#message').html(result.message ? result.message : skritter.nls.login['message-error']);
                    this.enableForm();
                }
            }, this));
            event.preventDefault();
        },
        /**
         * @method remove
         */
        remove: function() {
            this.stopListening();
            this.undelegateEvents();
            this.$el.empty();
        },
        /**
         * @method toHome
         * @param {Object} event
         */
        toHome: function(event) {
            skritter.router.navigate('', {replace: true, trigger: true});
            event.preventDefault();
        }
    });
    
    return Login;
});