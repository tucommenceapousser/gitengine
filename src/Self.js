// FIXME change to non-tim

def.abstract = true;

const Http = tim.require( 'Http/Self' );
const LfsFile = tim.require( 'Lfs/File/Self' );
const LfsManager = tim.require( 'Lfs/Manager' );
const Ssh = tim.require( 'Ssh/Self' );
const PassHashOverlay = tim.require( 'passlock:PassHash/Overlay' );
const PassHashLdap = tim.require( 'passlock:PassHash/Ldap' );
const PassHashPlain = tim.require( 'passlock:PassHash/Plain' );
const PassHashShadow = tim.require( 'passlock:PassHash/Shadow' );
const Repository = tim.require( 'Repository/Self' );
const RepositoryManager = tim.require( 'Repository/Manager' );
const SshKey = tim.require( 'passlock:SshKey' );
const SshKeyList = tim.require( 'passlock:SshKey/List' );
const StringGroup = tim.require( 'tim:string/group' );
const StringSet = tim.require( 'tim:string/set' );
const User = tim.require( 'User/Self' );
const UserManager = tim.require( 'User/Manager' );

/*
| True if initalized.
*/
let _init;

/*
| Parses a shadow ldap string.
*/
function parseLdapString( str )
{
	if( !str.startsWith( '{SSHA}' ) ) throw new Error( 'not a ldap hash' );
	return PassHashLdap.create( 'ssha', str.substr( 6 ) );
}

/*
| Parses a shadow passhash string.
*/
function parseShadowString( str )
{
	if( str[ 0 ] !== '$' ) throw new Error( 'not a shadow hash' );
	const split = str.split( '$' );
	if( split[ 1 ] !== '6' ) throw new Error( 'unsupported shadow hash' );
	return(
		PassHashShadow.create(
			'salt', split[ 2 ],
			'hash', split[ 3 ]
		)
	);
}

/*
| Adds a repository
|
| ~args:
|    'description'   [STRING]
|      description of the repository (shown in CGIT).
|
|    'group'         [STRING] ["r" or "rw"]
|      adds a groups permission to this repository (read only or read/write).
|
|    'name'          [STRING]
|      unique name of the repository (handle for gitengine).
|
|    'path'          [STRING]
|      path of the repository on local filesystem.
|
|    'user'          [STRING]
|      adds a user permission to this repository (read only or read/write).
*/ 
def.static.addRepository =
	function( ...args )
{
	if( !_init ) Self._init( );
	let description;
	let groups = StringGroup.Empty;
	let name;
	let path;
	let users = StringGroup.Empty;

	for( let a = 0, alen = args.length; a < alen; a += 2 )
	{
		let arg = args[ a + 1 ];

		switch( args[ a ] )
		{
			case 'description':
			{
				if( typeof( arg ) !== 'string' ) throw new Error( 'description not a string' );
				description = arg;
				continue;
			}
			case 'group':
			{
				if( typeof( arg ) !== 'string' ) throw new Error( 'groupname not a string' );
				let perm = args[ ++a + 1 ];
				if( perm !== 'r' && perm !== 'rw' ) throw new Error( 'invalid permissions' );
				groups = groups.set( arg, perm );
				continue;
			}
			case 'name':
			{
				if( typeof( arg ) !== 'string' ) throw new Error( 'name not a string' );
				name = arg;
				continue;
			}
			case 'path':
			{
				if( typeof( arg ) !== 'string' ) throw new Error( 'path not a string' );
				path = arg;
				continue;
			}
			case 'user':
			{
				if( typeof( arg ) !== 'string' ) throw new Error( 'username not a string' );
				let perm = args[ ++a + 1 ];
				if( perm !== 'r' && perm !== 'rw' ) throw new Error( 'invalid permissions' );
				users = users.set( arg, perm );
				continue;
			}
		}
	}

	RepositoryManager.set(
		Repository.create(
			'description', description,
			'groups', groups,
			'name', name,
			'path', path,
			'users', users,
		)
	);
};

/*
| Adds an user.
|
| ~args:
|   'group'    [string]
|     adds the user to this group.
|
|   'password' [string]
|     adds a plain password for this user.
|
|   'passhash' ['ldap'/'shadow'] [string]
|     adds a ldap/shadow hashed password for this user.
|
|   'sshkey'   [string]
|     adds a sshkey for this user.
|
|   'username' [string]
|     username of the user / REQUIRED.
*/
def.static.addUser =
	function( ...args )
{
	if( !_init ) Self._init( );
	let username;
	let sshKeys = SshKeyList.Empty;
	let groups = StringSet.create( ); // FIXME .Empty
	let passhash = PassHashOverlay.Empty;

	for( let a = 0, alen = args.length; a < alen; a += 2 )
	{
		let arg = args[ a + 1 ];
		switch( args[ a ] )
		{
			case 'group':
			{
				if( typeof( arg ) !== 'string' ) throw new Error( 'groupname not a string' );
				groups = groups.add( arg );
				continue;
			}
			case 'password':
			{
				passhash = passhash.create( 'plain', PassHashPlain.Password( arg ) );
				continue;
			}
			case 'passhash':
			case 'passHash':
			{
				const hash = args[ ++a + 1 ];
				switch( arg )
				{
					case 'shadow':
						passhash = passhash.create( 'shadow', parseShadowString( hash ) );
						continue;
					case 'ldap':
						passhash = passhash.create( 'ldap', parseLdapString( hash ) );
						continue;
					default: throw new Error( 'invalid passhash algorithm: ' + arg );
				}
			}
			case 'sshKey':
			{
				let key;
				if( typeof( arg ) === 'string' ) key = SshKey.FromLine( arg );
				else if( arg.timtype === SshKey ) key = arg;
				else throw new Error( 'invalid key: ' + arg );

				sshKeys = sshKeys.append( key );
				continue;
			}
			case 'username':
			{
				if( typeof( arg ) !== 'string' ) throw new Error( 'username not a string' );
				username = arg;
				continue;
			}
			default: throw new Error( 'unknown option: ' + args[ a ] );
		}
	}

	UserManager.set(
		User.create(
			'groups', groups,
			'passhash', passhash,
			'sshKeys', sshKeys,
			'username', username,
		)
	);
};

/*
| Changes the configuration of gitengine.
|
| ~args:
|   'ip'     [string],
|     sets the IP to listen to.
|
|   'ips'    [ [string], [string], .. ]
|     sets the IPs to listen to.
|
|   'lfsCatalogDir'
|     set the LFS catalog dir (leveldb).
|
|   'lfsObjectsDir'
|     set the LFS objects dir.
|
|	'receiveCallBack'
|     calls this function after git-receive.
|
|   'sshPort'   [number],
|     sets the ssh port to listen to.
|
|   'sslCertFile'   [string],
|     path to SSL cert file.
|
|   'sslKeyFile'   [string],
|     path to SSL key file.
*/
def.static.config =
	function( ...args )
{
	for( let a = 0, alen = args.length; a < alen; a += 2 )
	{
		let arg = args[ a + 1 ];
		switch( args[ a ] )
		{
			case 'ip':
				if( typeof( arg ) !== 'string' ) throw new Error( 'ip not a string' );
				Http.setIPs( [ arg ] );
				Ssh.setIPs( [ arg ] );
				break;

			case 'ips':
				if( !Array.isArray( arg ) ) throw new Error( 'ips not an array' );
				for( let ip of arg )
				{
					if( typeof( ip ) !== 'string' ) throw new Error( 'ip not a string' );
				}
				Http.setIPs( arg );
				Ssh.setIPs( arg );
				break;

			case 'receiveCallback':
				RepositoryManager.receiveCallback( arg );
				break;

			case 'sshPort':
				if( typeof( arg ) !== 'number' ) throw new Error( 'port not a number' );
				Ssh.setPort( arg );
				break;

			case 'lfsCatalogDir':
				if( typeof( arg ) !== 'string' ) throw new Error( 'lfsCatalogDir not a string' );
				if( !arg.endsWith( '/' ) ) throw new Error( 'lfsCatalogDir must end with "/"' );
				LfsManager.setCatalogDir( arg );
				break;

			case 'lfsObjectsDir':
				if( typeof( arg ) !== 'string' ) throw new Error( 'lfsObjectsDir not a string' );
				if( !arg.endsWith( '/' ) ) throw new Error( 'lfsObjectsDir must end with "/"' );
				LfsFile.setObjectsDir( arg );
				break;

			case 'sslCertFile':
				if( typeof( arg ) !== 'string' ) throw new Error( 'sslCertFile not a string' );
				Http.setSslCertFile( arg );
				break;

			case 'sslKeyFile':
				if( typeof( arg ) !== 'string' ) throw new Error( 'sslKeyFile not a string' );
				Http.setSslKeyFile( arg );
				break;

			default: throw new Error( 'unknown option: ' + args[ a ] );
		}
	}
};

/*
| Initializes missing repositories to disk.
*/
def.static.createRepositories =
	async function( )
{
	await RepositoryManager.createRepositories( );
};

/*
| Removes a repository.
| It will not be deleted from disk.
*/
def.static.removeRepository =
	function( name )
{
	if( !_init ) Self._init( );
	RepositoryManager.remove( name );
};

/*
| Returns an immutable copy of repository data.
*/
def.static.repositories =
	function( )
{
	if( !_init ) Self._init( );
	return RepositoryManager.repositories( );
};

/*
| Returns an immutable copy of users data.
*/
def.static.users =
	function( )
{
	if( !_init ) Self._init( );
	return UserManager.users( );
};

/*
| Reads in branches for a repository (or all)
|
| ~name: name of repository to read branches for
|        if undefined reads in branches for all repositories.
*/
def.static.readBranches =
	async function( name )
{
	await RepositoryManager.readBranches( name );
};

/*
| Removes a repository.
| It will not be deleted from disk.
*/
def.static.removeUser =
	function( username )
{
	if( !_init ) Self._init( );
	UserManager.remove( username );
};

/*
| Starts the gitengine.
*/
def.static.start =
	async function( )
{
	if( !_init ) Self._init( );

	await RepositoryManager.createRepositories( );
	await LfsManager.start( );
	await Http.start( );
	await Ssh.start( );
};

/*
| Initialized the gitengine.
*/
def.static._init =
	function( )
{
	_init = true;
	UserManager.init( );
	RepositoryManager.init( );
};
