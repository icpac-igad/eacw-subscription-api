/* eslint-disable no-underscore-dangle */
const nock = require('nock');
const Subscription = require('models/subscription');
const { omit } = require('lodash');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { MOCK_USER_IDS, SUBSCRIPTION_TO_UPDATE, ROLES } = require('./utils/test.constants');
const {
    ensureCorrectError, createSubInDB, getUUID, createAuthCases
} = require('./utils/helpers');

chai.should();

const prefix = '/api/v1/subscriptions';

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;
const authCases = createAuthCases(`${prefix}/123`, 'patch');

const updateSubscription = async ({
    userID = ROLES.USER.id,
    datasetID = getUUID(),
    subID,
    defaultSub,
    subToUpdate = SUBSCRIPTION_TO_UPDATE
}) => {
    let subscription = defaultSub;

    if (!subID && !defaultSub) {
        subscription = await createSubInDB(userID, datasetID);
    }

    return requester.patch(`${prefix}/${subID || subscription._id}`)
        .send({ ...subToUpdate, loggedUser: ROLES.USER });
};

describe('Update subscription endpoint', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
        authCases.setRequester(requester);

        await Subscription.deleteMany({}).exec();
    });

    it('Updating subscription without being authenticated should fall', authCases.isLoggedUserRequired());

    it('Updating subscription with being authenticated but with not existing subscription for user should fall', async () => {
        const response = await updateSubscription({ userID: MOCK_USER_IDS[0] });

        response.status.should.equal(404);
        ensureCorrectError(response.body, 'Subscription not found');
    });

    it('Updating subscription should return not found when subscription doesn\'t exist', async () => {
        const response = await updateSubscription({ subID: '41224d776a326fb40f000001' });

        response.status.should.equal(404);
        ensureCorrectError(response.body, 'Subscription not found');
    });

    it('Updating subscription data should return bad request when id is not valid', async () => {
        const response = await updateSubscription({ subID: '123' });

        response.status.should.equal(400);
        ensureCorrectError(response.body, 'ID is not valid');
    });

    it('Updating subscription data should return bad request when datasets are not provided', async () => {
        const response = await updateSubscription({ subToUpdate: omit(SUBSCRIPTION_TO_UPDATE, ['datasets']) });

        response.status.should.equal(400);
        ensureCorrectError(response.body, 'Datasets or datasetsQuery required');
    });

    it('Updating subscription data should return bad request when language doesn\'t provided', async () => {
        const response = await updateSubscription({ subToUpdate: omit(SUBSCRIPTION_TO_UPDATE, ['language']) });

        response.status.should.equal(400);
        ensureCorrectError(response.body, 'Language required');
    });

    it('Updating subscription data should return bad request when resource doesn\'t provided', async () => {
        const response = await updateSubscription({ subToUpdate: omit(SUBSCRIPTION_TO_UPDATE, ['resource']) });

        response.status.should.equal(400);
        ensureCorrectError(response.body, 'Resource required');
    });

    it('Updating subscription data should return bad request when params doesn\'t provided', async () => {
        const response = await updateSubscription({ subToUpdate: omit(SUBSCRIPTION_TO_UPDATE, ['params']) });

        response.status.should.equal(400);
        ensureCorrectError(response.body, 'Params required');
    });

    it('Updating subscription data should be updated', async () => {
        const subscription = await createSubInDB(ROLES.USER.id, getUUID());
        const response = await updateSubscription({ defaultSub: subscription });

        response.status.should.equal(200);
        const { data } = response.body;

        data.type.should.equal('subscription');
        data.id.should.equal(subscription._id.toString());
        data.should.have.property('attributes').and.instanceOf(Object);

        const expectedAttributes = Object.assign(SUBSCRIPTION_TO_UPDATE, {
            createdAt: subscription.createdAt.toISOString(),
            datasetsQuery: [],
            userId: ROLES.USER.id,
        });
        delete expectedAttributes.application;
        data.attributes.should.deep.equal(expectedAttributes);

        const subscriptionFromDB = await Subscription.findOne({ _id: subscription._id });
        const expectedSubscription = {
            ...subscription._doc,
            ...SUBSCRIPTION_TO_UPDATE,
            __v: 1
        };
        const actualSubscription = {
            ...subscriptionFromDB._doc,
            createdAt: subscriptionFromDB.createdAt.toISOString(),
        };

        actualSubscription.should.deep.equal(expectedSubscription);
    });

    it('Updating subscription data providing an invalid language should sanitize the language and update the subscription', async () => {
        const subscription = await createSubInDB(ROLES.USER.id, getUUID());
        const updateData = { ...subscription.toJSON(), language: 'ru' };
        delete updateData._id;
        delete updateData.__v;
        delete updateData.updateAt;
        const response = await updateSubscription({ defaultSub: subscription, subToUpdate: updateData });

        response.status.should.equal(200);
        const { data } = response.body;

        data.type.should.equal('subscription');
        data.id.should.equal(subscription._id.toString());
        data.should.have.property('attributes').and.instanceOf(Object);

        const expectedAttributes = {
            ...updateData,
            createdAt: subscription.createdAt.toISOString(),
            datasetsQuery: [],
            userId: ROLES.USER.id,
            language: 'en',
        };
        delete expectedAttributes.application;
        data.attributes.should.deep.equal(expectedAttributes);

        const subscriptionFromDB = await Subscription.findOne({ _id: subscription._id });
        subscriptionFromDB._doc.should.deep.equal({
            ...subscription.toJSON(),
            ...updateData,
            language: 'en',
        });
    });

    afterEach(async () => {
        await Subscription.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
