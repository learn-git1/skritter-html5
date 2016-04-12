var GelatoDialog = require('gelato/dialog');

/**
 * @class ConfirmGenericConfirm
 * @extends {GelatoDialog}
 */
var ConfirmGenericConfirm = GelatoDialog.extend({
	/**
	 * @method initialize
	 * @param {Object} options
	 */
	initialize: function (options) {
		options = options || {};
		this.dialogBody = options.body || '';
		this.dialogButtonCancel = options.buttonCancel || 'Cancel';
		this.dialogButtonConfirm = options.buttonConfirm || 'Confirm';
		this.dialogTitle = options.title || 'Are you sure?';
	},
	/**
	 * @property events
	 * @type {Object}
	 */
	events: {
		'click #button-cancel': 'handleClickButtonCancel',
		'click #button-confirm': 'handleClickButtonConfirm'
	},
	/**
	 * @property template
	 * @type {Function}
	 */
	template: require('./template'),
	/**
	 * @method render
	 * @returns {ConfirmGenericConfirm}
	 */
	render: function () {
		this.renderTemplate();
		return this;
	},
	/**
	 * @method handleClickButtonCancel
	 * @param {Event} event
	 */
	handleClickButtonCancel: function (event) {
		event.preventDefault();
		this.close();
	},
	/**
	 * @method handleClickButtonConfirm
	 * @param {Event} event
	 */
	handleClickButtonConfirm: function (event) {
		event.preventDefault();
		this.trigger('confirm');
	}
});

module.exports = ConfirmGenericConfirm;
