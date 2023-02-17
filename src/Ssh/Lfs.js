/*
| Provides the ssh interface for git repositories.
*/

def.abstract = true;

const LfsManager = tim.require( 'Lfs/Manager' );
const Log = tim.require( 'Log/Self' );
const RepositoryManager = tim.require( 'Repository/Manager' );
const Token = tim.require( 'Lfs/Token/Self' );

/*
| Handles a LFS authentication request
| Gives a token to be used against LFS API.
*/
def.static.serve =
	function( count, cmd, path, user, accept, reject )
{
	Log.log( 'ssh-lfs', count, 'client wants to ' + cmd + ': ' + path );

	const split = path.split( ' ' );
	if( split.length !== 2 )
	{
		Log.log( 'ssh-lfs', count, 'invalid path' );
		return reject( );
	}

	let repoName = split[ 0 ];
	const operation = split[ 1 ];

	if( repoName.endsWith( '.git' ) ) repoName = repoName.substr( 0, repoName.length - 4 );
	while( repoName.startsWith( '/' ) ) repoName = repoName.substr( 1 );
	while( repoName.endsWith( '/' ) ) repoName = repoName.substring( 0, repoName.length - 1 );

	const repo = RepositoryManager.get( repoName );
	if( !repo )
	{
		Log.log( 'ssh-lfs', count, 'repo does not exist' );
		return reject( );
	}

	const perms = repo.getPermissions( user );

	if( !perms )
	{
		Log.log(
			'ssh-lfs', count,
			'user ', user.username + ' has no access to ' + repoName + '.git'
		);
		return reject( );
	}

	switch( operation )
	{
		case 'download':
			break;
		case 'upload':
			if( perms !== 'rw' )
			{
				Log.log(
					'ssh-lfs', count,
					'repo ' + repoName + '.git is readonly to user'
				);
				return reject( );
			}
			break;
		default:
			Log.log( 'ssh-lfs', count, 'invalid operation' );
			return reject( );
	}

	const stream = accept( );
	Log.log(
		'ssh-lfs', count,
		'user ' + user.username + ' lfs authenticated '
		+ repoName + '.git (' + operation + ')'
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
