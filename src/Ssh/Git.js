/*
| Provides the ssh interface for git repositories.
*/

def.abstract = true;

const child = require( 'child_process' );

const Coupling = tim.require( 'Coupling/Self' );
const Log = tim.require( 'Log/Self' );
const RepositoryManager = tim.require( 'Repository/Manager' );
const User = tim.require( 'User/Self' );

/*
| Handles a git request (upload-pack or receive-pack).
|
| ~count: client counter
| ~cmd: ssh command
| ~path: path of ssh command
| ~user: authenticated user
| ~accept: accept call of ssh2 library
| ~reject: reject call of ssh2 library
*/
def.static.serve =
	async function( count, cmd, path, user, accept, reject )
{
/**/if( CHECK )
/**/{
/**/	if( arguments.length !== 6 ) throw new Error( );
/**/	if( user.timtype !== User ) throw new Error( );
/**/}

	Log.log( 'ssh-git', count, 'client wants to ' + cmd + ': ' + path );
	if( path[ 0 ] !== '\'' || path[ path.length -1 ] !== '\'' )
	{
		Log.log( 'ssh-git', count, 'path not surrounded by \'' );
		return reject( );
	}
	if( path[ 1 ] !== '/' )
	{
		Log.log( 'ssh-git', count, 'path not absolute' );
		return reject( );
	}
	path = path.substring( 2, path.length - 1 );
	if( path.endsWith( '/' ) ) path = path.substring( 0, path.length - 1 );
	if( path.indexOf( '/' ) >= 0 )
	{
		Log.log( 'ssh-git', count, 'path contains /' );
		return reject( );
	}
	if( path.endsWith( '.git' ) ) path = path.substr( 0, path.length - 4 );
	const repo = RepositoryManager.get( path );
	if( !repo ) { Log.log( 'ssh-git', count, 'repo does not exist' ); return reject( ); }
	const perms = repo.getPermissions( user );
	if( !perms )
	{
		Log.log(
			'ssh-git', count,
			'user ' + user.username + ' has no access to ' + path + '.git'
		);
		return reject( );
	}

	if( cmd === 'git-receive-pack' && perms !== 'rw' )
	{
		Log.log(
			'ssh-git', count,
			'user ' + user.username + ' has readonly accesses to ' + path + '.git'
		);
		return reject( );
	}

	const stream = accept( );
	Log.log(
		'ssh-git', count,
		'user ' + user.username + ' accesses ' + path + '.git (' + cmd + ')'
	);

	// download from overleaf (if this is not the loopback user)
	if( user.username !== 'git' )
	{
		const dsResult = await Coupling.downSync( count, path );
		if( !dsResult )
		{
			try
			{
				const msg = 'ERR Remote coupling failed';
				const len = ( '0000' + ( msg.length + 4 ).toString( 16 ) ).slice( -4 );
				stream.stdout.write( len + msg );
				//stream.exit( );
				return;
			}
			catch( e ) { return; }
		}
	}

	Log.log( 'ssh-git', count, 'spawning', user.username, cmd );
	const repoPath = repo.path;
	const ps =
		child.spawn( '/usr/bin/' + cmd, [ repoPath ], { cwd: repoPath } )
		.on( 'error', ( err ) => {
			Log.log( 'ssh-git', count, 'git spawn error', err );
			stream.exit( 1 );
			stream.end( );
		} )
		.on( 'close', ( code, a2 ) => {
			Log.log( 'ssh-git', count, 'git spawn close', code );
			stream.exit( code );
			stream.end( );

			if( user.username !== 'git' && cmd === 'git-receive-pack' )
			{
				if( code === 0 ) Coupling.upSync( count, path );
			}
		} );

	// I do not know why end: false was here, it could lead to hanged processes
	// when a fetch is done on a repository without commits

	// it's needed after all otherwise empty pushes fail.. better fix needed for both cases

	//ps.stdout.pipe( stream.stdout, { end: false } );
	//ps.stderr.pipe( stream.stderr, { end: false } );
	//stream.stdin.pipe( ps.stdin, { end: false } );

	ps.stdout.pipe( stream.stdout, { end: false } );
	ps.stderr.pipe( stream.stderr, { end: false } );
	stream.stdin.pipe( ps.stdin, { } );
};
