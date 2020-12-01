const jsdom = require('jsdom');
const axioRequest = require('../axioRequest')

const { getDOM, submitForm, extractStart } = require('./api');
const educonnect = require('./generics/educonnect');
const querystring = require('querystring');
const http = require('../http');

async function login(url, account, username, password) {
    const jar = new jsdom.CookieJar();
console.log('getDOM');
    let dom = await getDOM({
        url: 'https://www.toutatice.fr/portail/auth/pagemarker/2/MonEspace',
        jar
    });

console.log('submitForm');
    dom = await submitForm({
        dom,
        jar,
        actionRoot: 'https://www.toutatice.fr/wayf/',
        extraParams: {
            // eslint-disable-next-line camelcase
            _saml_idp: 'educonnect'
        }
    });
console.log('educonnect');   
    dom = await educonnect({ dom, jar, url, account, username, password });
console.log(`dom = ${dom}`);

    let redirectURL = dom.window.document.getElementsByTagName('a')[0].href
console.log(`redirectURL = ${redirectURL}`);

console.log('axioRequest');
    let response = await axioRequest({
        url: redirectURL,
        jar
    })

console.log('getOrigin');
    redirectURL = getOrigin(redirectURL) + response.headers.location

    const parsed = querystring.parse(redirectURL.split('?')[1])
    const conversation = parsed.conversation
    const sessionid = parsed.sessionid

    // eslint-disable-next-line max-len
    redirectURL = `${getOrigin(redirectURL)}/idp/Authn/RemoteUser?conversation=${conversation}&redirectToLoaderRemoteUser=0&sessionid=${sessionid}`

console.log('axioRequest');
    response = await axioRequest({
        url: redirectURL,
        jar
    })
    // eslint-disable-next-line max-len
    const remoteUserParsed = response.data.match(/<conversation>(.+)<\/conversation><uidInSession>(.+)<\/uidInSession>/u)

    const remoteUserConversation = remoteUserParsed[1]
    const uidInSession = remoteUserParsed[2]

    // eslint-disable-next-line max-len
    redirectURL = `${getOrigin(redirectURL)}/idp/Authn/RemoteUser?conversation=${remoteUserConversation}&uidInSession=${uidInSession}&sessionid=${sessionid}`

console.log('http');
    response = await http({
        url: redirectURL,
        jar,
        followRedirects: true
    })

console.log('extractStart');
    return extractStart(await getDOM({
        url: `${url}${account.value}.html`,
        jar,
        asIs: true
    }))
}

function getOrigin(url) {
    const noProtocol = url.substring(url.indexOf('/') + 2);
    return url.substring(0, url.indexOf('/')) + '//' + noProtocol.substring(0, noProtocol.indexOf('/'));
}

module.exports = login;
