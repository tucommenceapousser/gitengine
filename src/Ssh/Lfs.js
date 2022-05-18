/*
| Provides the ssh interface for git repositories.
*/

def.abstract = true;

const LfsManager = tim.require( 'GitEngine/Lfs/Manager' );
const Log = tim.require( 'GitEngine/Ssh/Log' );
const RepositoryManager = tim.require( 'GitEngine/Repository/Manager' );
const Token = tim.require( 'GitEngine/Lfs/Token/Self' );

/*
| Handles a LFS authentication request
| Gives a token to be used against LFS API.
*/
def.static.serve =
	function( cmd, path, session, accept, reject )
{
	Log.debug( 'ssh client wants to ' + cmd + ': ' + path );

	const split = path.split( ' ' );
	if( split.length !== 2 )
	{
		Log.debug( 'invalid path' );
		return reject( );
	}

	let repoName = split[ 0 ];
	const operation = split[ 1 ];

	if( repoName.endsWith( '.git' ) ) repoName = repoName.substr( 0, repoName.length - 4 );

	const repo = RepositoryManager.get( repoName );
	if( !repo )
	{
		Log.debug( 'repo does not exist' );
		return reject( );
	}

	const user = session.user;
	const perms = repo.getPermissions( user );

	if( !perms )
	{
		Log.both( 'user ' + user.username + ' has no access to ' + repoName + '.git' );
		return reject( );
	}

	switch( operation )
	{
		case 'download': break;
		case 'upload':
			if( perms !== 'rw' )
			{
				Log.debug( 'repo ' + repoName + '.git is readonly to user' );
				return reject( );
			}
			break;
		default:
			Log.debug( 'invalid operation' );
			reject( );
	}

	const stream = accept( );
	Log.both(
		'user ' + user.username
		+ ' lfs authenticated ' + repoName
		+ '.git (' + operation + ')'
	);
	const token = LfsManager.getUserToken( user.username );

	const auth64 = new Buffer.from( user.username + ':' + token.token ).toString( 'base64' );
	stream.stdout.write(
		JSON.stringify(
			{
				header:
				{
					'Authorization': 'RemoteAuth ' + auth64,
				},
				expires_in: Token.lifetime,
			}
		)
	);
	stream.exit( 0 );
	stream.end( );
};
