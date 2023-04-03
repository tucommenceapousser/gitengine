/*
| FIXME
*/

def.abstract = true;

import { Self as CGit } from '{Https/CGit}';
import { Self as Coupling } from '{Coupling/Self}';
import { Self as CouplingRepositoryManager } from '{Coupling/Repository/Manager}';
import { Self as Https } from '{Https/Self}';
import { Self as LfsFile } from '{Lfs/File/Self}';
import { Self as LfsManager } from '{Lfs/Manager}';
import { Self as Log } from '{Log/Self}';
import { Self as Ssh } from '{Ssh/Self}';
import { Self as PassHashOverlay } from '{passlock:PassHash/Overlay}';
import { Self as PassHashLdap } from '{passlock:PassHash/Ldap}';
import { Self as PassHashPlain } from '{passlock:PassHash/Plain}';
import { Self as PassHashShadow } from '{passlock:PassHash/Shadow}';
import { Self as Repository } from '{Repository/Self}';
import { Self as RepositoryManager } from '{Repository/Manager}';
import { Self as SshKey } from '{passlock:SshKey}';
import { Self as SshKeyList } from '{passlock:SshKey/List}';
import { Self as StringGroup } from '{ti2c:string/group}';
import { Self as StringSet } from '{ti2c:string/set}';
import { Self as User } from '{User/Self}';
import { Self as UserManager } from '{User/Manager}';

/*
| Directory of the gitengine.
*/
let _dir;

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
| Adds a repository.
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
	let couplingBranch;
	let couplingDir;
	let couplingUrl;
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
			case 'couplingBranch':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'couplingBranch not a string' );
				}
				couplingBranch = arg;
				continue;
			}

			case 'couplingDir':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'couplingDir not a string' );
				}
				couplingDir = arg;
				continue;
			}

			case 'couplingUrl':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'couplingUrl not a string' );
				}

				couplingUrl = arg;
				continue;
			}

			case 'description':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'description not a string' );
				}
				description = arg;
				continue;
			}

			case 'group':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'groupname not a string' );
				}
				let perm = args[ ++a + 1 ];
				if( perm !== 'r' && perm !== 'rw' )
				{
					throw new Error( 'invalid permissions' );
				}
				groups = groups.set( arg, perm );
				continue;
			}

			case 'name':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'name not a string' );
				}
				name = arg;
				continue;
			}

			case 'path':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'path not a string' );
				}
				path = arg;
				continue;
			}

			case 'user':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'username not a string' );
				}
				let perm = args[ ++a + 1 ];
				if( perm !== 'r' && perm !== 'rw' )
				{
					throw new Error( 'invalid permissions' );
				}
				users = users.set( arg, perm );
				continue;
			}
		}
	}

	RepositoryManager.set(
		Repository.create(
			'couplingBranch', couplingBranch,
			'couplingDir', couplingDir,
			'couplingUrl', couplingUrl,
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
|	'cgit',  [string],
|     Enables the cgit interface in this subpath.
|     If '/' everything is cgit.
|     default: off.
|
|   'httpPort'   [number],
|     Sets the http port to listen to (it will only forward traffic to https).
|     Set false to disable.
|     default: 80
|
|   'httpsPort'   [number],
|     Sets the https port to listen to.
|     Set false to disable.
|     default: 443
|
|   'ip'  [string],
|     Sets the IP to listen to.
|     default: '0.0.0.0'
|
|   'ips'  [ [string], [string], .. ]
|     Sets the IPs to listen to.
|     default: [ '0.0.0.0' ]
|
|   'lfsCatalogDir'  [string]
|     Sets the LFS catalog dir (leveldb).
|
|   'lfsObjectsDir'  [string]
|     Sets the LFS objects dir.
|
|   'loopbackName'     [string]
|     Sets the loopback hostname to use for coupling.
|     Has to be in SSL Common Name certificate.
|     default: 'localhost'
|
|	'receiveCallBack'  [function]
|     Calls this function after git-receive.
|
|	'sshHostKeys' [ [sshHostKey] [sshHostKey] ]
|     Sets host ssh key(s):
|
|   'sshPort'   [number],
|     Sets the ssh port to listen to.
|
|   'sslCertFile'   [string],
|     Sets the path to SSL cert file.
|
|   'sslKeyFile'   [string],
|     Sets the path to SSL key file.
*/
def.static.config =
	function( ...args )
{
	for( let a = 0, alen = args.length; a < alen; a += 2 )
	{
		let arg = args[ a + 1 ];
		switch( args[ a ] )
		{
			case 'cgit':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'cgit not a string' );
				}

				if( !arg.startsWith( '/' ) || !arg.endsWith( '/' ) )
				{
					throw new Error( 'cgit must start and end with "/"' );
				}

				Https.setCGitPath( arg );
				CGit.setPath( arg );
				break;
			}

			case 'cgitConfDir':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'cgitConfDir not a string' );
				}

				if( !arg.endsWith( '/' ) )
				{
					throw new Error( 'cgitConfDir must end with "/"' );
				}

				CGit.setConfDir( arg );
				break;
			}

			case 'httpPort':
			{
				if( typeof( arg ) !== 'number' )
				{
					throw new Error( 'httpPort not a number' );
				}

				Https.setHttpPort( arg );
				break;
			}

			case 'httpsPort':
			{
				if( typeof( arg ) !== 'number' )
				{
					throw new Error( 'httpsPort not a number' );
				}

				Https.setHttpsPort( arg );
				break;
			}

			case 'ip':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'ip not a string' );
				}

				Https.setIPs( [ arg ] );
				Ssh.setIPs( [ arg ] );
				break;
			}

			case 'ips':
			{
				if( !Array.isArray( arg ) )
				{
					throw new Error( 'ips not an array' );
				}

				for( let ip of arg )
				{
					if( typeof( ip ) !== 'string' )
					{
						throw new Error( 'ip not a string' );
					}
				}
				Https.setIPs( arg );
				Ssh.setIPs( arg );
				break;
			}

			case 'lfsCatalogDir':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'lfsCatalogDir not a string' );
				}

				if( !arg.endsWith( '/' ) )
				{
					throw new Error( 'lfsCatalogDir must end with "/"' );
				}

				LfsManager.setCatalogDir( arg );
				break;
			}

			case 'lfsObjectsDir':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'lfsObjectsDir not a string' );
				}

				if( !arg.endsWith( '/' ) )
				{
					throw new Error( 'lfsObjectsDir must end with "/"' );
				}
				LfsFile.setObjectsDir( arg );
				break;
			}

			case 'loopbackName':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'loopbackName not a string' );
				}

				Coupling.setLoopbackName( arg );
				break;
			}

			case 'receiveCallback':
			{
				RepositoryManager.receiveCallback( arg );
				break;
			}

			case 'sshHostKeys':
			{
				if( !Array.isArray( arg ) )
				{
					throw new Error( 'sshHostKeys not an Array' );
				}
				Ssh.setHostKeys( arg );
				break;
			}

			case 'sshPort':
			{
				if( typeof( arg ) !== 'number' )
				{
					throw new Error( 'port not a number' );
				}
				Ssh.setPort( arg );
				break;
			}

			case 'sslCertFile':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'sslCertFile not a string' );
				}
				Https.setSslCertFile( arg );
				break;
			}

			case 'sslKeyFile':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'sslKeyFile not a string' );
				}
				Https.setSslKeyFile( arg );
				break;
			}

			case 'yagit':
			{
				if( typeof( arg ) !== 'string' )
				{
					throw new Error( 'yagit not a string' );
				}

				if( !arg.startsWith( '/' ) || !arg.endsWith( '/' ) )
				{
					throw new Error( 'yagit must start and end with "/"' );
				}

				Https.setYagitPath( arg );
				//CGit.setPath( arg );
				break;
			}


			default:
				throw new Error( 'unknown option: ' + args[ a ] );
		}
	}
};

/*
| Initializes missing repositories to disk.
|
| ~extraCreator: if defined calls this function for every
|                new repository created.
|                extraCreator( name, path );
*/
def.static.createRepositories =
	async function( extraCreator )
{
	await RepositoryManager.createRepositories( extraCreator );
};

/*
| Logs through the gitengines logging system.
*/
def.static.log =
	function( facility, ...args )
{
	Log.log( facility, '-', ...args );
};

/*
| Removes a repository.
| It will not be deleted from disk.
*/
def.static.removeRepository =
	function( name )
{
	RepositoryManager.remove( name );
};

/*
| Returns immutable data of all repositories.
*/
def.static.repositories =
	function( )
{
	return RepositoryManager.repositories( );
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
	UserManager.remove( username );
};

/*
| Starts the gitengine.
*/
def.static.start =
	async function( )
{
	await RepositoryManager.start( );
	await LfsManager.start( );
	await Https.start( _dir );
	await Ssh.start( );
};

/*
| Returns immutable data of all users.
*/
def.static.users =
	function( )
{
	return UserManager.users( );
};

/*
| Initializes the gitengine.
*/
def.static._init =
	function( dir )
{
	_dir = dir;

	UserManager.init( );
	RepositoryManager.init( );
	CouplingRepositoryManager.init( );
};
