/**
 * @module Application
 */
define([
    'framework/BasePage',
    'require.text!templates/desktop/account-creation/create-account.html'
], function(BasePage, TemplateDesktop) {
    /**
     * @class PageCreateAccount
     * @extends BasePage
     */
    var PageCreateAccount = BasePage.extend({
        /**
         * @method initialize
         */
        initialize: function() {
            this.title = 'Sign Up';
        },
        /**
         * @method render
         * @returns {PageCreateAccount}
         */
        render: function() {
            this.$el.html(this.compile(TemplateDesktop));
            this.elements.email = this.$('#create-account-email');
            this.elements.message = this.$('#message');
            this.elements.password = this.$('#create-account-password');
            this.elements.username = this.$('#create-account-username');
            return this;
        },
        /**
         * @method events
         * @returns {Object}
         */
        events: _.extend({}, BasePage.prototype.events, {
            'vclick #button-create': 'handleButtonCreateClicked',
            'vclick #button-skip': 'handleButtonSkipClicked'
        }),
        /**
         * @method handleButtonCreateClicked
         * @param {Event} event
         */
        handleButtonCreateClicked: function(event) {
            event.preventDefault();
            var self = this;
            app.dialogs.show().element('.message-title').text('Creating Account');
            this.disableForm().elements.message.empty();
            app.user.createNew({
                email: this.elements.email.val(),
                name: this.elements.username.val(),
                password: this.elements.password.val()
            }, function() {
                app.api.clearGuest();
                app.reload();
            }, function(error) {
                self.enableForm().elements.message.text(error.responseJSON.message);
                app.dialogs.hide();
            });
        },
        /**
         * @method handleButtonSkipClicked
         * @param {Event} event
         */
        handleButtonSkipClicked: function(event) {
            event.preventDefault();
            var self = this;
            app.dialogs.show().element('.message-title').text('Loading');
            this.disableForm().elements.message.empty();
            app.user.createNew(null, function() {
                app.api.clearGuest();
                app.reload();
            }, function(error) {
                self.enableForm().elements.message.text(error.responseJSON.message);
                app.dialogs.hide();
            });
        }
    });

    return PageCreateAccount;
});