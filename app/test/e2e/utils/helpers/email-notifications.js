const chai = require('chai');
const moment = require('moment');

const AlertUrlService = require('services/alertUrlService');

const should = chai.should();

const assertSubscriptionStatsNotificationEvent = (jsonMessage, sub) => {
    jsonMessage.should.have.property('sender').and.equal('gfw');
    jsonMessage.should.have.property('data').and.be.a('object');
    jsonMessage.data.should.have.property('counter').and.equal(1);
    jsonMessage.data.should.have.property('dataset').and.equal('viirs-active-fires');
    jsonMessage.data.should.have.property('users').and.be.an('array').and.length(1);
    jsonMessage.data.users[0].should.have.property('userId').and.equal(sub.userId);
    jsonMessage.data.users[0].should.have.property('subscriptionId').and.equal(sub.id);
    jsonMessage.data.users[0].should.have.property('email').and.equal(sub.resource.content);
    jsonMessage.should.have.property('recipients').and.be.a('array').and.length(1);
    jsonMessage.recipients[0].should.be.an('object').and.have.property('address')
        .and.have.property('email').and.equal('info@vizzuality.com');
};

const bootstrapEmailNotificationTests = (amount = '1', unit = 'w') => {
    const beginDate = moment().subtract(amount, unit);
    const endDate = moment();
    process.on('unhandledRejection', (error) => should.fail(error));
    return { beginDate, endDate };
};

const validateCommonNotificationParams = (
    jsonMessage,
    beginDate,
    endDate,
    sub,
    lang = 'en',
    areaName = 'Custom Area',
) => {
    jsonMessage.should.have.property('sender').and.equal('gfw');
    jsonMessage.should.have.property('data').and.be.a('object');
    jsonMessage.should.have.property('recipients').and.be.a('array').and.length(1);
    jsonMessage.recipients[0].should.be.an('object')
        .and.have.property('address')
        .and.have.property('email')
        .and.equal('subscription-recipient@vizzuality.com');

    jsonMessage.data.should.have.property('month').and.equal(beginDate.format('MMMM'));
    jsonMessage.data.should.have.property('year').and.equal(beginDate.format('YYYY'));
    jsonMessage.data.should.have.property('week_of').and.equal(`${beginDate.format('DD MMM')}`);
    jsonMessage.data.should.have.property('week_start').and.equal(beginDate.format('DD/MM/YYYY'));
    jsonMessage.data.should.have.property('week_end').and.equal(endDate.format('DD/MM/YYYY'));
    jsonMessage.data.should.have.property('alert_date_begin').and.equal(moment(beginDate).format('YYYY-MM-DD'));
    jsonMessage.data.should.have.property('alert_date_end').and.equal(moment(endDate).format('YYYY-MM-DD'));
    jsonMessage.data.should.have.property('alert_name').and.equal(sub.name);
    jsonMessage.data.should.have.property('selected_area').and.equal(areaName);
    jsonMessage.data.should.have.property('subscriptions_url').and.equal(`http://staging.globalforestwatch.org/my-gfw?lang=${lang}`);
    jsonMessage.data.should.have.property('unsubscribe_url').and.equal(`${process.env.API_GATEWAY_EXTERNAL_URL}/subscriptions/${sub.id}/unsubscribe?redirect=true&lang=${lang}`);
};

const validateGLADAlertsAndPriorityAreas = (jsonMessage, beginDate, endDate, sub, geostoreId) => {
    jsonMessage.data.should.have.property('layerSlug').and.equal('glad-alerts');
    // eslint-disable-next-line max-len
    jsonMessage.data.downloadUrls.should.have.property('csv').and.equal(`${process.env.API_GATEWAY_EXTERNAL_URL}/glad-alerts/download/?period=${moment(beginDate).format('YYYY-MM-DD')},${moment(endDate).format('YYYY-MM-DD')}&gladConfirmOnly=False&aggregate_values=False&aggregate_by=False&geostore=${geostoreId}&format=csv`);
    // eslint-disable-next-line max-len
    jsonMessage.data.downloadUrls.should.have.property('json').and.equal(`${process.env.API_GATEWAY_EXTERNAL_URL}/glad-alerts/download/?period=${moment(beginDate).format('YYYY-MM-DD')},${moment(endDate).format('YYYY-MM-DD')}&gladConfirmOnly=False&aggregate_values=False&aggregate_by=False&geostore=${geostoreId}&format=json`);
    jsonMessage.data.should.have.property('priority_areas').and.deep.equal({
        intact_forest: 6,
        primary_forest: 7,
        peat: 8,
        protected_areas: 9,
        plantations: 10,
        other: 11
    });

    jsonMessage.data.should.have.property('alerts').and.have.length(6).and.deep.equal([
        { alert_type: 'GLAD', date: '10/10/2019 00:10 UTC' },
        { alert_type: 'GLAD', date: '11/10/2019 00:10 UTC' },
        { alert_type: 'GLAD', date: '12/10/2019 00:10 UTC' },
        { alert_type: 'GLAD', date: '13/10/2019 00:10 UTC' },
        { alert_type: 'GLAD', date: '14/10/2019 00:10 UTC' },
        { alert_type: 'GLAD', date: '15/10/2019 00:10 UTC' },
    ]);

    jsonMessage.data.should.have.property('alert_count').and.equal(51);
    jsonMessage.data.should.have.property('value').and.equal(51);
    jsonMessage.data.should.have.property('alert_link').and.equal(AlertUrlService.generate(
        sub,
        {
            name: 'umd_as_it_happens',
            slug: 'glad-alerts',
            subscription: true,
            datasetId: 'bfd1d211-8106-4393-86c3-9e1ab2ee1b9b',
            layerId: '8e4a527d-1bcd-4a12-82b0-5a108ffec452'
        },
        beginDate,
        endDate,
    ));
};

const validateVIIRSAlertsAndPriorityAreas = (jsonMessage, beginDate, endDate, sub, geostoreId) => {
    jsonMessage.data.should.have.property('layerSlug').and.equal('viirs-active-fires');
    // eslint-disable-next-line max-len
    jsonMessage.data.downloadUrls.should.have.property('csv').and.equal(`${process.env.API_GATEWAY_EXTERNAL_URL}/viirs-active-fires/download/?period=${moment(beginDate).format('YYYY-MM-DD')},${moment(endDate).format('YYYY-MM-DD')}&aggregate_values=False&aggregate_by=False&geostore=${geostoreId}&format=csv`);
    // eslint-disable-next-line max-len
    jsonMessage.data.downloadUrls.should.have.property('json').and.equal(`${process.env.API_GATEWAY_EXTERNAL_URL}/viirs-active-fires/download/?period=${moment(beginDate).format('YYYY-MM-DD')},${moment(endDate).format('YYYY-MM-DD')}&aggregate_values=False&aggregate_by=False&geostore=${geostoreId}&format=json`);
    jsonMessage.data.should.have.property('priority_areas').and.deep.equal({
        intact_forest: 41,
        primary_forest: 41,
        peat: 1171,
        protected_areas: 1640,
        plantations: 81,
        other: 258,
    });

    jsonMessage.data.should.have.property('alerts').and.have.length(6).and.deep.equal([
        { alert_type: 'VIIRS', date: '10/10/2019 00:10 UTC' },
        { alert_type: 'VIIRS', date: '11/10/2019 00:10 UTC' },
        { alert_type: 'VIIRS', date: '12/10/2019 00:10 UTC' },
        { alert_type: 'VIIRS', date: '13/10/2019 00:10 UTC' },
        { alert_type: 'VIIRS', date: '14/10/2019 00:10 UTC' },
        { alert_type: 'VIIRS', date: '15/10/2019 00:10 UTC' },
    ]);

    jsonMessage.data.should.have.property('value').and.equal(3232);
    jsonMessage.data.should.have.property('alert_count').and.equal(3232);

    jsonMessage.data.should.have.property('alert_link').and.equal(AlertUrlService.generate(
        sub,
        {
            name: 'viirs_fires_alerts',
            slug: 'viirs-active-fires',
            subscription: true,
            datasetId: '1d3ccf9b-102e-4c0b-b2ea-2abcc712e194',
            layerId: '93e33932-3959-4201-b8c8-6ec0b32596e0'
        },
        beginDate,
        endDate,
    ));
};

const validateMonthlySummaryAlertsAndPriorityAreas = (jsonMessage, beginDate, endDate, sub) => {
    jsonMessage.data.should.have.property('layerSlug').and.equal('monthly-summary');
    jsonMessage.data.should.have.property('priority_areas').and.deep.equal({
        intact_forest: 47,
        primary_forest: 48,
        peat: 1179,
        protected_areas: 3298,
        plantations: 182,
        other: 1812,
    });

    jsonMessage.data.should.have.property('alerts').and.have.length(12).and.deep.equal([
        { alert_type: 'GLAD', date: '10/10/2019 00:10 UTC' },
        { alert_type: 'GLAD', date: '11/10/2019 00:10 UTC' },
        { alert_type: 'GLAD', date: '12/10/2019 00:10 UTC' },
        { alert_type: 'GLAD', date: '13/10/2019 00:10 UTC' },
        { alert_type: 'GLAD', date: '14/10/2019 00:10 UTC' },
        { alert_type: 'GLAD', date: '15/10/2019 00:10 UTC' },
        { alert_type: 'VIIRS', date: '10/10/2019 00:10 UTC' },
        { alert_type: 'VIIRS', date: '11/10/2019 00:10 UTC' },
        { alert_type: 'VIIRS', date: '12/10/2019 00:10 UTC' },
        { alert_type: 'VIIRS', date: '13/10/2019 00:10 UTC' },
        { alert_type: 'VIIRS', date: '14/10/2019 00:10 UTC' },
        { alert_type: 'VIIRS', date: '15/10/2019 00:10 UTC' },
    ]);

    jsonMessage.data.should.have.property('alert_count').and.equal(3283);
    jsonMessage.data.should.have.property('value').and.equal(3283);

    jsonMessage.data.should.have.property('alert_link').and.equal(AlertUrlService.generate(
        sub,
        {
            name: 'monthly-summary',
            slug: 'monthly-summary',
            subscription: true,
            datasetId: '1d3ccf9b-102e-4c0b-b2ea-2abcc712e194',
            layerId: '93e33932-3959-4201-b8c8-6ec0b32596e0'
        },
        beginDate,
        endDate,
    ));

    jsonMessage.data.should.have.property('viirs_days_count').and.equal(30);
    jsonMessage.data.should.have.property('viirs_day_start').and.equal(beginDate.format('DD/MM/YYYY'));
    jsonMessage.data.should.have.property('viirs_day_end').and.equal(endDate.format('DD/MM/YYYY'));
    jsonMessage.data.should.have.property('location').and.equal(sub.name);
};

const validateGLADSpecificParams = (jsonMessage, beginDate, endDate, sub, frequency) => {
    jsonMessage.data.should.have.property('glad_frequency').and.equal(frequency);
    jsonMessage.data.should.have.property('glad_count').and.equal(51);
};

const validateVIIRSSpecificParams = (jsonMessage, beginDate, endDate, sub, frequency) => {
    jsonMessage.data.should.have.property('viirs_frequency').and.equal(frequency);
    jsonMessage.data.should.have.property('viirs_count').and.equal(3232);
};

const validateGLADNotificationParams = (
    jsonMessage,
    beginDate,
    endDate,
    sub,
    lang = 'en',
    frequency = 'average',
    areaName = 'Custom Area',
    geostoreId = '423e5dfb0448e692f97b590c61f45f22',
) => {
    validateCommonNotificationParams(jsonMessage, beginDate, endDate, sub, lang, areaName);
    validateGLADSpecificParams(jsonMessage, beginDate, endDate, sub, frequency);
    validateGLADAlertsAndPriorityAreas(jsonMessage, beginDate, endDate, sub, geostoreId);
};

const validateVIIRSNotificationParams = (
    jsonMessage,
    beginDate,
    endDate,
    sub,
    lang = 'en',
    frequency = 'average',
    areaName = 'Custom Area',
    geostoreId = '423e5dfb0448e692f97b590c61f45f22',
) => {
    validateCommonNotificationParams(jsonMessage, beginDate, endDate, sub, lang, areaName);
    validateVIIRSSpecificParams(jsonMessage, beginDate, endDate, sub, frequency);
    validateVIIRSAlertsAndPriorityAreas(jsonMessage, beginDate, endDate, sub, geostoreId);
};

const validateMonthlySummaryNotificationParams = (
    jsonMessage,
    beginDate,
    endDate,
    sub,
    lang = 'en',
    frequency = 'average',
    areaName = 'Custom Area',
) => {
    validateCommonNotificationParams(jsonMessage, beginDate, endDate, sub, lang, areaName);
    validateGLADSpecificParams(jsonMessage, beginDate, endDate, sub, frequency);
    validateVIIRSSpecificParams(jsonMessage, beginDate, endDate, sub, frequency);
    validateMonthlySummaryAlertsAndPriorityAreas(jsonMessage, beginDate, endDate, sub);
};

module.exports = {
    assertSubscriptionStatsNotificationEvent,
    bootstrapEmailNotificationTests,
    validateGLADNotificationParams,
    validateVIIRSNotificationParams,
    validateMonthlySummaryNotificationParams,
};