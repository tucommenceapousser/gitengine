/*
| Provides the ssh interface for git repositories.
*/

def.abstract = true;

const child = require( 'child_process' );

const Log = tim.require( 'Ssh/Log' );
const RepositoryManager = tim.require( 'Repository/Manager' );

/*
| Handles a git request (upload-pack or receive-pack).
*/
def.static.serve =
	function( cmd, path, session, accept, reject )
{
	Log.debug( 'ssh client wants to ' + cmd + ': ' + path );
	if( path[ 0 ] !== '\'' || path[ path.length -1 ] !== '\'' )
	{
		Log.debug( 'path not surrounded by \'' );
		return reject( );
	}
	if( path[ 1 ] !== '/' )
	{
		Log.debug( 'path not absolute' );
		return reject( );
	}
	path = path.substring( 2, path.length - 1 );
	if( path.endsWith( '/' ) ) path = path.substring( 0, path.length - 1 );
	if( path.indexOf( '/' ) >= 0 )
	{
		Log.debug( 'path contains /' );
		return reject( );
	}
	if( path.endsWith( '.git' ) ) path = path.substr( 0, path.length - 4 );
	const repo = RepositoryManager.get( path );
	if( !repo ) { Log.debug( 'repo does not exist' ); return reject( ); }
	const user = session.user;
	const perms = repo.getPermissions( user );
	if( !perms )
	{
		Log.both( 'user ' + user.username + ' has no access to ' + path + '.git' );
		return reject( );
	}

	if( cmd === 'git-receive-pack' && perms !== 'rw' )
	{
		Log.both( 'user ' + user.username + ' has readonly accesses to ' + path + '.git' );
		return reject( );
	}

	const stream = accept( );
	Log.both( 'user ' + user.username + ' accesses ' + path + '.git (' + cmd + ')' );

	const repoPath = repo.path;
	const ps =
		child.spawn( '/usr/bin/' + cmd, [ repoPath ], { cwd: repoPath } )
		.on( 'error', ( err ) => {
			Log.log( 'git spawn error', err );
			stream.exit( 1 );
			stream.end( );
		} )
		.on( 'close', ( code, a2 ) => {
			stream.exit( code );
			stream.end( );
		} );
	ps.stdout.pipe( stream.stdout, { end: false } );
	ps.stderr.pipe( stream.stderr, { end: false } );
	stream.stdin.pipe( ps.stdin, { end: false } );
};
