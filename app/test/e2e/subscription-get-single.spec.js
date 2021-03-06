/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const Subscription = require('models/subscription');
const { omit } = require('lodash');
const chai = require('chai');
const { createRequest } = require('./utils/test-server');
const { MOCK_USER_IDS, ROLES } = require('./utils/test.constants');
const {
    ensureCorrectError, createSubInDB, getUUID, createAuthCases
} = require('./utils/helpers');

const should = chai.should();

const prefix = '/api/v1/subscriptions/';

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let subscription;
const authCases = createAuthCases('123', 'get');

describe('Get subscription by id endpoint', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        subscription = await createRequest(prefix, 'get');
        authCases.setRequester(subscription);

        await Subscription.deleteMany({}).exec();
    });

    it('Getting subscription by id without provide loggedUser should fall', authCases.isLoggedUserRequired());

    it('Getting subscription by id with provide loggedUser as not valid json string should fall', authCases.isLoggedUserJSONString());

    it('Getting subscription by id with provide loggedUser as not an object json string should fall', authCases.isLoggedUserJSONObject());

    it('Getting subscription by id with being authenticated but with not existing subscription for user should fall', async () => {
        const createdSubscription = await createSubInDB(MOCK_USER_IDS[0], getUUID());

        const response = await subscription
            .get(createdSubscription._id)
            .query({ loggedUser: JSON.stringify(ROLES.USER) })
            .send();

        response.status.should.equal(404);
        ensureCorrectError(response.body, 'Subscription not found');
    });

    it('Getting subscription by id should return not found when subscription doesn\'t exist', async () => {
        await createSubInDB(MOCK_USER_IDS[0], getUUID());
        const response = await subscription
            .get('41224d776a326fb40f000001')
            .query({ loggedUser: JSON.stringify(ROLES.USER) })
            .send();

        response.status.should.equal(404);
        ensureCorrectError(response.body, 'Subscription not found');
    });

    it('Getting subscription by id should return bad request when id is not valid', async () => {
        await createSubInDB(MOCK_USER_IDS[0], getUUID());
        const response = await subscription
            .get('123')
            .query({ loggedUser: JSON.stringify(ROLES.USER) })
            .send();

        response.status.should.equal(400);
        ensureCorrectError(response.body, 'ID is not valid');
    });

    it('Getting subscription by id should return the subscription (happy case)', async () => {
        const createSubscription = await createSubInDB(ROLES.USER.id, getUUID());

        const response = await subscription
            .get(createSubscription._id)
            .query({ loggedUser: JSON.stringify(ROLES.USER) })
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.instanceOf(Object);
        const { data } = response.body;

        data.type.should.equal('subscription');
        data.id.should.equal(createSubscription._id.toString());
        data.should.have.property('attributes').and.instanceOf(Object);

        // omit fields which are not present to user from response body and convert the createdAt to ISO string
        const expectedSubscription = omit({
            // eslint-disable-next-line no-underscore-dangle
            ...createSubscription._doc,
            createdAt: createSubscription.createdAt.toISOString(),
        }, ['_id', 'updateAt', 'application', '__v']);

        data.attributes.should.deep.equal(expectedSubscription);
    });

    it('Getting a subscription by id as an ADMIN even when not the owner of the subscription should return the subscription (ADMIN override)', async () => {
        const sub = await createSubInDB(ROLES.USER.id, getUUID());

        const response = await subscription.get(sub._id).query({ loggedUser: JSON.stringify(ROLES.ADMIN) }).send();
        response.status.should.equal(200);
        response.body.should.have.property('data').and.instanceOf(Object);
        const { data } = response.body;

        data.type.should.equal('subscription');
        data.id.should.equal(sub._id.toString());
        data.should.have.property('attributes').and.instanceOf(Object);

        // omit fields which are not present to user from response body and convert the createdAt to ISO string
        const expectedSubscription = omit({
            // eslint-disable-next-line no-underscore-dangle
            ...sub._doc,
            createdAt: sub.createdAt.toISOString(),
        }, ['_id', 'updateAt', 'application', '__v']);

        data.attributes.should.deep.equal(expectedSubscription);
    });

    afterEach(async () => {
        await Subscription.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
