define([
    'require.text!template/login.html',
    'base/View'
], function(template, BaseView) {
    /**
     * @class Login
     */
    var View = BaseView.extend({
        /**
         * @method initialize
         */
        initialize: function() {
            BaseView.prototype.initialize.call(this);
        },
        /**
         * @method renderElements
         */
        renderElements: function() {
            this.elements.loginUsername = this.$('#login-username');
            this.elements.loginPassword = this.$('#login-password');
            this.elements.message = this.$('#message');
        },
        /**
         * @method render
         * @returns {Backbone.View}
         */
        render: function() {
            this.$el.html(_.template(template, skritter.strings));
            this.renderElements();
            return this;
        },
        /**
         * @property {Object} events
         */
        events: {
            'vclick #button-back': 'handleBackClick',
            'vclick #button-next': 'handleLoginClick',
            'keyup #login-password': 'handleEnterPress'
        },
        /**
         * @method handleBackClick
         * @param {Object} event
         */
        handleBackClick: function(event) {
            skritter.router.back();
            event.preventDefault();
        },
        /**
         * @method handleLoginClick
         * @param {Object} event
         */
        handleLoginClick: function(event) {
            this.disableForm();
            this.elements.message.empty();
            var username = this.elements.loginUsername.val();
            var password = this.elements.loginPassword.val();
            this.elements.message.html("<i class='fa fa-spin fa-cog'></i> Signing In");
            skritter.user.login(username, password, _.bind(function(result, status) {
                if (status === 200) {
                    document.location.href = '';
                } else {
                    this.elements.message.text(result.message);
                    this.enableForm();
                }
            }, this));
            event.preventDefault();
        },
        /**
         * @method handleEnterPress
         * @param {Object} event
         */
        handleEnterPress: function(event) {
            if (event.keyCode === 13) {
                this.handleLoginClicked(event);
            } else {
                event.preventDefault();
            }
        }
    });

    return View;
});