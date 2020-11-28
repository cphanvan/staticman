import nock from 'nock';
import request from 'supertest';

import config from '../../source/config';
import StaticmanAPI from '../../source/server';

const staticman = new StaticmanAPI().server;
const githubToken = config.get('githubToken');
const supportedApiVersions = [['v1'], ['v2'], ['v3']];

afterEach(() => {
  nock.cleanAll();
});

const _mockFetchGitHubCollaboratorInvitations = () =>
  nock('https://api.github.com', {
    reqheaders: {
      authorization: `token ${githubToken}`,
    },
  })
    .get('/user/repository_invitations')
    .reply(200, [
      {
        id: 123,
        repository: {
          full_name: `johndoe/foobar`,
        },
      },
    ]);

const _mockAcceptGitHubCollaboratorInvitation = () =>
  nock('https://api.github.com', {
    reqheaders: {
      authorization: `token ${githubToken}`,
    },
  })
    .patch('/user/repository_invitations/123')
    .reply(204);

describe.each(supportedApiVersions)('API %s - Connect endpoint', (version) => {
  it('accepts the collaboration invitation and replies with "Staticman connected!"', async () => {
    const reqListInvititations = _mockFetchGitHubCollaboratorInvitations();
    const reqAcceptInvitation = _mockAcceptGitHubCollaboratorInvitation();

    await request(staticman)
      .get(`/${version}/connect/johndoe/foobar`)
      .expect(200)
      .expect('Staticman connected!');
    expect(reqListInvititations.isDone()).toBe(true);
    expect(reqAcceptInvitation.isDone()).toBe(true);
  });

  it('returns a 404 and an error message when collaboration invitation is not found', async () => {
    const reqListInvititations = _mockFetchGitHubCollaboratorInvitations();
    const reqAcceptInvitation = _mockAcceptGitHubCollaboratorInvitation();

    await request(staticman)
      .get(`/${version}/connect/johndoe/anotherrepo`)
      .expect(404)
      .expect('Invitation not found');
    expect(reqListInvititations.isDone()).toBe(true);
    expect(reqAcceptInvitation.isDone()).toBe(false);
  });
});