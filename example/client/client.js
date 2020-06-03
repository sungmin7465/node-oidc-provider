const {Issuer} = require('openid-client');
const readline = require('readline');
const jose = require('jose');
 
rl = readline.createInterface(process.stdin, process.stdout);
rl.setPrompt('client> ');
rl.prompt();
 
const issuer = new Issuer({
    issuer: 'http://localhost:3000',
    device_authorization_endpoint: 'http://localhost:3000/device/auth',
    token_endpoint: 'http://localhost:3000/token',
    registration_endpoint: 'http://localhost:3000/reg',
    jwks_uri : 'http://localhost:3000/jwks',
    userinfo_endpoint: 'http://localhost:3000/me',
});
 
// provider(configuration)에서 feature.initialAccessToken이 설정되어 있는 경우 사용
// var initialAccessToken = 'initial.access.token';
// 사용자 정보를 얻기 위한 access token
var accessToken;

function deviceAuth() {
    rl.question("Input target client id\n", async function(answer) {
        const client = new issuer.Client({
            client_id: answer,
            token_endpoint_auth_method: 'none',
        });
 
        try {
            const handle = await client.deviceAuthorization();
            console.log('User Code: ', handle.user_code);
            console.log('Verification URI: ', handle.verification_uri);
            console.log('Verification URI (complete): ', handle.verification_uri_complete);
            console.log('device_code', handle.device_code);
            console.log('expires_in', handle.expires_in);
    
            const tokenSet = await handle.poll();
            console.log('received tokens %j', tokenSet);
            accessToken = tokenSet;
        } catch (e) {
            console.log(e)
        }
 
    })

}
 
function generateClient() {
    const keystore = new jose.JWKS.KeyStore();
        keystore.generate('EC', 'P-256')
    .then(() => issuer.Client.register({
        grant_types: ['urn:ietf:params:oauth:grant-type:device_code', 'refresh_token'],
        response_types: [],
        redirect_uris: [],
        token_endpoint_auth_method: 'none',
    },
    // {initialAccessToken: initialAccessToken}
    ))
    .then(result => console.log('\ngenerated client', result.metadata))
    .catch(err => console.log(err));
}

function userinfo() {
    if (accessToken == null) {
        console.log('accessToken is null')
        console.log('device command first\n')
        return
    }

    rl.question("Input target client id\n", async function(answer) {
        const client = new issuer.Client({
            client_id: answer,
            token_endpoint_auth_method: 'none',
        });
    
        const userinfo = await client.userinfo(accessToken)
        .catch(err => console.log(err));

        console.log('\nUserInfo Response:');
        console.log('userinfo', userinfo);
    
    })
}
 
rl.on('line', function(line) {
    switch(line.trim()) {
        case 'discover':
            Issuer.discover('http://localhost:3000') // => Promise
            .then(function (result) {
                console.log('Discovered issuer : ', result.issuer, result.metadata);
            });
            break;
        case 'device':
            deviceAuth();
            break;
        case 'genclient':
            generateClient();
            break;
        case 'userinfo':
            userinfo();
            break;
        default:
            console.log('Say what? I might have heard `' + line.trim() + '`');
            break;
        }
    rl.prompt();
}).on('close', function() {
    console.log('Have a great day!');
    process.exit(0);
});