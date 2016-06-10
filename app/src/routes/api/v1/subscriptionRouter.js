'use strict';

var Router = require('koa-router');
var logger = require('logger');
//var StoryValidator = require('validators/storyValidator');
var SubscriptionService = require('services/subscriptionService');
var router = new Router({
  prefix: '/subscriptions'
});

class SubscriptionsRouter {
  static * getSubscription() {
    var user = this.request.query.loggedUser,
        id = this.params.id;

    try {
      this.body = yield SubscriptionService.getSubscriptionForUser(id, user.id);
    } catch (err) {
      logger.error(err);
    }
  }

  static * getSubscriptions() {
    var user = this.request.query.loggedUser;

    try {
      this.body = yield SubscriptionService.getSubscriptionsForUser(user.id);
    } catch (err) {
      logger.error(err);
    }
  }

  static * createSubscription() {
    logger.info('Creating subscription with body', this.request.body);
    try {
      this.body = yield SubscriptionService.createSubscription(this.request.body);
    } catch (err) {
      logger.error(err);
    }
  }

  static * confirmSubscription() {
    logger.info('Confirming subscription by id %s', this.params.id);
    try {
      this.body = yield SubscriptionService.confirmSubscription(
        this.params.id, this.query.loggedUser.id);
    } catch (err) {
      logger.error(err);
    }
  }

  static * updateSubscription() {
    logger.info('Update subscription by id %s', this.params.id);
    try {
      this.body = yield SubscriptionService.updateSubscription(
        this.params.id, this.request.body.loggedUser.id, this.request.body);
    } catch (err) {
      logger.error(err);
    }
  }

  static * unsubscribeSubscription() {
    logger.info('Unsubscribing subscription by id %s', this.params.id);
    let subscription = yield SubscriptionService.deleteSubscriptionById(
      this.params.id, this.query.loggedUser.id);

    if (!subscription) {
      logger.error('Subscription not found');
      this.throw(404, 'Subscription not found');
      return;
    }

    this.body = subscription;
  }

  static * deleteSubscription() {
    logger.info('Deleting subscription by id %s', this.params.id);
    let subscription = yield SubscriptionService.deleteSubscriptionById(
      this.params.id, this.query.loggedUser.id);

    if (!subscription) {
      logger.error('Subscription not found');
      this.throw(404, 'Subscription not found');
      return;
    }

    this.body = subscription;
  }
}

router.post('/', SubscriptionsRouter.createSubscription);
router.get('/', SubscriptionsRouter.getSubscriptions);
router.get('/:id', SubscriptionsRouter.getSubscription);
router.get('/:id/confirm', SubscriptionsRouter.confirmSubscription);
router.get('/:id/unsubscribe', SubscriptionsRouter.unsubscribeSubscription);
router.patch('/:id', SubscriptionsRouter.updateSubscription);
router.delete('/:id', SubscriptionsRouter.deleteSubscription);

module.exports = router;
