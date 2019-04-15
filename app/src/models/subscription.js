const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const logger = require('logger');
const co = require('co');

const ALERT_TYPES = ['EMAIL', 'URL'];
const alertPublishers = {};
ALERT_TYPES.forEach(function (type) {
    const typePublisher = require('publishers/' + type.toLowerCase() + 'Publisher');
    alertPublishers[type] = typePublisher;
});

const Layer = require('models/layer');
const AnalysisService = require('services/analysisService');
const AnalysisResultsAdapter = require('adapters/analysisResultsAdapter');
const AnalysisResultsPresenter = require('presenters/analysisResultsPresenter');
const Stadistic = require('models/stadistic');

const Subscription = new Schema({
    name: { type: String, required: false, trim: true },
    confirmed: { type: Boolean, required: false, default: false },
    resource: {
        type: { type: String, trim: true, enum: ALERT_TYPES, default: ALERT_TYPES[0] },
        content: { type: String, trim: true }
    },
    datasets: { type: Array, 'default': [] },
    datasetsQuery: [{
        _id: false,
        id: { type: String, required: false, trim: true },
        type: { type: String, required: false, trim: true },
        lastSentDate: { type: Date, required: true, default: Date.now },
        threshold: { type: Number, required: false, default: 0 },
        historical: [{
            _id: false,
            value: { type: Number, required: false },
            date: { type: Date, required: true, default: Date.now }
        }]
    }],
    params: { type: Schema.Types.Mixed, default: {} },
    userId: { type: String, trim: true, required: false },
    language: { type: String, trim: true, required: false, default: 'en' },
    createdAt: { type: Date, required: true, default: Date.now },
    updateAt: { type: Date, required: false, default: Date.now },
    application: { type: String, required: true, default: 'gfw', trim: true },
    env: { type: String, required: true, default: 'production' }
});

Subscription.methods.publish = function* (layerConfig, begin, end) {
    logger.info('Publishing subscription with data', layerConfig, begin, end);
    let layer = yield Layer.findBySlug(layerConfig.name);
    if (!layer) {
        return;
    }

    let results = yield AnalysisService.execute(
        this, layerConfig.slug, begin, end);
    if (!results) {
        logger.info('Results is null. Returning');
        return;
    }
    logger.debug('Results obtained', results);
    results = AnalysisResultsAdapter.transform(results, layer);
    if (AnalysisResultsAdapter.isZero(results)) {
        logger.info('Not send subscription. Is zero value');
        return false;
    }

    results = yield AnalysisResultsPresenter.render(
        results, this, layer, begin, end);

    yield alertPublishers[this.resource.type].publish(this, results, layer);
    logger.info('Saving statistic');
    yield new Stadistic({ slug: layerConfig.slug }).save();
    return true;

};

module.exports = mongoose.model('Subscription', Subscription);
