/*
| A simple plain example with no runtime changes to repositories provided.
*/

const gitengine = require( 'gitengine' );
const fs =  require( 'fs/promises' );

// async wrapper
(async function( ) {

//----------------------------------------------------------------------------
// General config
//----------------------------------------------------------------------------

// ssh keys to identify the server (copy from /etc/ssh or make otherwise readable to gitening)
gitengine.config(
	'sshHostKeys',
	[
		await fs.readFile( './ssh/ssh_host_rsa_key' ),
		await fs.readFile( './ssh/ssh_host_ed25519_key' ),
		await fs.readFile( './ssh/ssh_host_ecdsa_key' ),
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
	'sslKeyFile', './ssl/host.key',
	'httpsPort', 8443,
	'httpPort', 8080,
);

// gitengine has a built-in standalone LFS server.
gitengine.config(
	'lfsCatalogDir', './lfs/catalog/',
	'lfsObjectsDir', './lfs/objects/'
);

//----------------------------------------------------------------------------
// User config
//----------------------------------------------------------------------------

// adds a user with plaintext password
gitengine.addUser(
	'username', 'usera',
	'password', 'foobar',
	'group',    'myusers',
);

// adds a user with hashed password (user `openssl passwd -6`)
gitengine.addUser(
	'username', 'userb',
	'passhash', 'shadow',
		'$6$0qNm214ULHFWbh9M$roveknJcpvqYfLJTdLtYAfY.xkbnjBzch1lYu2GtjaDPawCsfGdOgjHQmI90gFqcoc0Z1znweHwTrDjt6Kt6J/',
	'group',    'myusers',
);

// adds a user with a ssh-key
gitengine.addUser(
	'username',      'userc',
	'sshKey',
		'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCtaIeIKvzfLiBv0dQ2l0lXQ5npvdwpPP+DUIBoaEda5Vmi64/HCj3g5uhpMKW+O8fPWDqmRval93yIxm5CExTNucXZ3mkEKli6CRq0P6gvYhUn1TfpOsb6em9Dv3Md/yMDBZ7PN1D1B4rO/Mjvw/TriIqwn5kGLOMSamndEvHVayp79psbzkoT5lXq4TgiYBCtRn30wqwypisdG9cRKGwNb2JfeZFroQXKEjQyUBIhGBoLRr+Pfjmu3U8TfBuNv4NCBTvG4y0rHo5yztHxasLvyhqAlqkbaZIwLPK5ypORHdcTJip9x1HcHfGADr7duo5gdVAcpbU2CBRVcJ8/iHzEnVrVNXcH9vzzIsxKG4lxhbhHSx6Vqn40ATuwVBY0K01L5+sxHQDgN0eM7VLftQDTUtRSWOEhQEIZgm+rhfHjuNgytMQ85OZMKOwaZSE2J3xtV2Hw4EtWFr8d2Yx0/43KhM7ts/9KZoNhNfC1lMuyVPfA2VtKiKOOnj82P3mxt3M= foo@bar',
	'group',    'myusers',
);

//----------------------------------------------------------------------------
// Repository config
//----------------------------------------------------------------------------

// a repository writeable by "usera", readable by all users
// note the example uses process.cwd() to determine the path of the repository
// provide an absolute path here
gitengine.addRepository(
	'name',  'repo-one',
	'path',  process.cwd( ) + '/repos/repo-one.git',
	'user',  'usera', 'rw',
	'group', 'myusers', 'r',
);

// a repository writeable by "usera" and "userc"
gitengine.addRepository(
	'name',  'repo-two',
	'path',  process.cwd( ) + '/repos/repo-two.git',
	'user',  'usera', 'rw',
	'user',  'userc', 'rw',
);

// creates repositories not yet on disk
await gitengine.createRepositories( );

// starts the engine
await gitengine.start( );

} )( );
