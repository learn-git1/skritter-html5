const BaseSkritterCollection = require('base/BaseSkritterCollection');
const ReviewCollection = require('collections/ReviewCollection');
const VocabCollection = require('collections/VocabCollection');
const ItemModel = require('models/ItemModel');

/**
 * A collection of ItemModels for a user to review related to a specific
 * Vocab they are studying.
 * @class ItemCollection
 * @extends {BaseSkritterCollection}
 */
const ItemCollection = BaseSkritterCollection.extend({

  /**
   * @property model
   * @type {ItemModel}
   */
  model: ItemModel,

  /**
   * @property url
   * @type {String}
   */
  url: 'items',

  /**
   * @method initialize
   * @constructor
   */
  initialize: function(models, options) {
    options = options || {};

    this.reviews = new ReviewCollection(null, {items: this});
    this.vocabs = new VocabCollection(null, {items: this});

    this.cursor = null;
    this.addingState = 'standby';
    this.dueCount = 0;
    this.dueCountState = 'standby';
    this.fetchingState = 'standby';
    this.preloadingState = 'standby';
    this.skipped = false;
    this.sorted = null;
  },

  /**
   * @method addItem
   * @param {Object} [options]
   * @param {Function} callback
   */
  addItem: function(options, callback) {
    let self = this;
    if (this.addingState === 'standby') {
      this.addingState = 'adding';
    } else {
      _.isFunction(callback) && callback();
      return;
    }

    options.listId = options.listId || '';

    $.ajax({
      url: app.getApiUrl() + 'items/add?lists=' + options.listId,
      type: 'POST',
      headers: app.user.session.getHeaders(),
      context: this,
      data: {
        lang: app.getLanguage()
      },
      error: function(error) {
        self.addingState = 'standby';
        callback(error);
      },
      success: function(result) {
        if (result.Items.length) {
          const item = new ItemModel(result.Items[0]);

          item._loaded = false;
          item._queue = true;

          self.unshift(item);
          self.preloadNext();
        }

        self.addingState = 'standby';
        callback(null, result);
      }
    });
  },

  /**
   * @method addItems
   * @param {Object} [options]
   * @param {Function} callback
   */
  addItems: function(options, callback) {
    let self = this;
    let count = 0;
    let results = {items: [], numVocabsAdded: 0};

    options = options || {};
    options.limit = options.limit || 1;

    async.whilst(
      function() {
        return count < options.limit;
      },
      function(callback) {
        app.user.isSubscriptionActive(
          function(active) {
            if (active) {
              count++;

              self.addItem(
                options,
                function(error, result) {
                  if (!error && result) {
                    results.items.push(result);
                    results.numVocabsAdded += result.numVocabsAdded;
                  }

                  callback();
                }
              );
            } else {
              callback(results);
            }
          }
        );
      },
      function() {
        self.updateDueCount();

        callback(null, results);
      }
    );
  },

  /**
   * @method fetchCharacters
   * @returns {Promise}
   */
  fetchCharacters: function() {
    return new Promise(
      (resolve, reject) => {

        // filter out characters which have already been fetched
        const filteredWritings = _.filter(
          this.vocabs.getUniqueWritings(),
          function(value) {
            return !app.user.characters.findWhere({writing: value});
          }
        );

        // stop fetch when no writings needed
        if (!filteredWritings.length) {
          resolve();
          return;
        }

        // fetch characters from server using new v2 api
        app.user.characters.fetch({
          data: {
            languageCode: app.getLanguage(),
            writings: filteredWritings.join('')
          },
          remove: false,
          error: function(error) {
            reject(error);
          },
          success: function() {
            resolve();
          }
        });

      }
    );
  },

  /**
   * @method fetchNext
   * @param {Object} options
   * @returns {Promise}
   */
  fetchNext: function(options) {
    options = options || {};
    options.limit = options.limit || 50;
    options.lists = options.lists || null;
    options.sections = options.sections || null;

    return new Promise(
      (resolve, reject) => {
        if (this.fetchingState === 'fetching') {
          resolve();
          return;
        }

        this.fetchingState = 'fetching';

        async.series(
          [
            (callback) => {
              ScreenLoader.post('Updating cache');

              $.ajax({
                url: app.getApiUrl(2) + 'queue/update',
                type: 'GET',
                headers: app.user.session.getHeaders(),
                data: {
                  languageCode: app.getLanguage()
                },
                error: (error) => callback(error),
                success: () => callback()
              });
            },
            (callback) => {
              ScreenLoader.post('Fetching next');

              $.ajax({
                url: app.getApiUrl(2) + 'queue/next',
                type: 'GET',
                headers: app.user.session.getHeaders(),
                data: {
                  languageCode: app.getLanguage(),
                  limit: options.limit,
                  lists: options.lists,
                  parts: app.user.getFilteredParts().join('|'),
                  sections: options.sections,
                  styles: app.user.getFilteredStyles().join('|')
                },
                error: (error) => {
                  callback(error);
                },
                success: (result) => {
                  this.reset();

                  _.forEach(
                    this.add(result),
                    (model) => {
                      model._queue = true;
                    }
                  );

                  console.log('FETCHED:', result);

                  callback();
                }
              });
            }
          ],
          (error) => {
            if (error) {
              this.fetchingState = 'standby';
              reject(error);
              return;
            }

            // preload stuff because we need it anyways
            this.preloadNext({limit: 5})
              .catch(
                (error) => {
                  this.fetchingState = 'standby';
                  reject(error);
                }
              )
              .then(
                () => {
                  this.fetchingState = 'standby';
                  resolve();
                }
              );
          }
        );

      }
    );
  },

  /**
   * @method getNext
   * @returns {Array}
   */
  getNext: function() {
    const now = moment().unix();
    const parts = app.user.getFilteredParts().join(',');
    const styles = app.user.getFilteredStyles().join(',');

    return _
      .chain(this.getQueue())
      .filter(
        (model) => {

          // check if model has been removed from collection
          if (!model) {
            return false;
          }

          // exclude part not including in user settings
          if (!_.includes(parts, model.get('part'))) {
            return false;
          }

          // exclude style not including in user settings
          if (!_.includes(styles, model.get('style'))) {
            return false;
          }

          // exclude items marked as banned in vocab
          if (model.isBanned()) {
            return false;
          }

          // exclude rune items without stroke data
          if (model.isPartRune() && !model.isCharacterDataLoaded()) {
            console.log('SKIPPING ITEM:', model.id);

            this.skipped = true;

            // exclude the rune item from the local queue
            model._queue = false;

            // request to skip item on the server
            // model.skip();

            return false;
          }

          if (model.isJapanese()) {
            // skip all kana writings when study kana disabled
            if (!app.user.get('studyKana') && model.isPartRune() && model.isKana()) {
              model.set('active', false);
              model.bump();
              model.save();

              return false;
            }
          }

          return model;
        }
      )
      .sortBy(item => -item.getReadiness(now))
      .value();
  },

  /**
   * @method getQueue
   * @returns {Array}
   */
  getQueue: function() {
    return _.filter(this.models, model => model._queue);
  },

  /**
   * @method parse
   * @param {Object} response
   * @returns {Object}
   */
  parse: function(response) {
    this.cursor = response.cursor;
    this.vocabs.add(response.Vocabs);
    this.vocabs.decomps.add(response.Decomps);
    this.vocabs.sentences.add(response.Sentences);
    return response.Items.concat(response.ContainedItems || []);
  },

  /**
   * @method preloadNext
   * @param {Object} [options]
   * @returns {Promise}
   */
  preloadNext: function(options) {
    const now = moment().unix();
    const queue = this.getQueue();

    options = options || {};
    options.limit = options.limit || 10;
    options.silent = options.silent || false;

    // return list of active next item ids
    const itemIds = _
      .chain(queue)
      .filter(model => !model._loaded)
      .sortBy(item => -item.getReadiness(now))
      .map(item => item.id)
      .value()
      .slice(0, options.limit);

    console.log('PRELOADING:', itemIds);

    return new Promise(
      (resolve, reject) => {
        // return successful when no item preloading needed
        if (!itemIds.length) {
          resolve();
          return;
        }

        if (this.preloadingState === 'fetching') {
          resolve();
          return;
        }

        this.preloadingState = 'fetching';

        this.fetch({
          data: {
            ids: itemIds.join('|'),
            include_contained: true,
            include_decomps: true,
            include_heisigs: true,
            include_sentences: false,
            include_strokes: false,
            include_vocabs: true
          },
          remove: false,
          error: (error) => {
            reject(error);
          },
          success: (result) => {
            // mark items that have successfully been loaded from the server
            _.forEach(
              itemIds,
              (itemId) => {
                const item = result.get(itemId);

                if (item) {
                  item._loaded = true;
                }
              }
            );

            console.log('PRELOADED:', itemIds);

            // preload characters for items just added
            this.fetchCharacters()
              .catch(reject)
              .then(
                () => {
                  this.preloadingState = 'standby';

                  if (!options.silent) {
                    this.trigger('preload');
                  }

                  resolve();
                }
              );
          }
        });
      }
    );
  },

  /**
   * @method reset
   * @returns {Items}
   */
  reset: function() {
    this.vocabs.reset();
    return BaseSkritterCollection.prototype.reset.apply(this, arguments);
  },

  /**
   * @method updateDueCount
   */
  updateDueCount: function() {
    if (this.dueCountState === 'fetching') {
      return;
    }

    this.dueCountState = 'fetching';
    let url = app.getApiUrl() + 'items/due';

    if (app.config.useV2Gets.itemsdue) {
      url = app.getApiUrl(2) + 'gae/items/due';
    }

    $.ajax({
      url,
      type: 'GET',
      headers: app.user.session.getHeaders(),
      data: {
        lang: app.getLanguage(),
        languageCode: app.getLanguage(),
        parts: app.user.getFilteredParts().join(','),
        styles: app.user.getFilteredStyles().join(',')
      },
      error: () => {
        this.dueCount = '-';
        this.dueCountState = 'standby';
        this.trigger('update:due-count', this.dueCount);
      },
      success: (result) => {
        let count = 0;

        for (let part in result.due) {
          for (let style in result.due[part]) {
            count += result.due[part][style];
          }
        }

        this.dueCount =  count;
        this.dueCountState = 'standby';
        this.trigger('update:due-count', this.dueCount);
      }
    });
  }

});

module.exports = ItemCollection;
