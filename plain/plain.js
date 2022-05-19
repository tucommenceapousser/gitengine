/*
| A simple plain example with no runtime changes to repositories provided.
*/

const gitengine = require( 'gitengine' );
const fs =  require( 'fs/promises' );

// async wrapper
(async function( ) {

// ssh keys to identify the server (copy from /etc/ssh or make otherwise readable to gitening)
gitengine.config(
	'sshHostKeys',
	[
        fs.readFile( './ssh/ssh_host_rsa_key' ),
        fs.readFile( './ssh/ssh_host_ed25519_key' ),
        fs.readFile( './ssh/ssh_host_ecdsa_key' ),
	]
);

// demo listens on port 8022, for giteninge to work on standard port 22 allow via authbind
// and if enabled move the standard ssh server out of the way
// (to another port or bind on an alternative IP)
gitengine.config( 'sshPort', 8022 )

// generate a https self signed key like this:
// $ openssl req -newkey rsa:4096 -x509 -sha256 -days 3650 -nodes -outhost.crt -keyout host.key
// or use a real one.
gitengine.config(
	'sslCertFile', './ssl/host.crt',
	'sslKeyFile', './ssl/host.key'
);

} )( );
