/*
| Provides the http(s) interface for git repositories.
| Does both forwarding git requests as well provides a cgit web interface.
*/

def.abstract = true;

const backend = require( 'git-http-backend' );
const child = require( 'child_process' );
const zlib = require( 'zlib'  );

const Coupling = tim.require( 'Coupling/Self' );
const Http = tim.require( 'Http/Self' );
const Lfs = tim.require( 'Http/Lfs' );
const LfsManager = tim.require( 'Lfs/Manager' );
const Log = tim.require( 'Log/Self' );
const Overleaf = tim.require( 'Overleaf/Self' );
const RepositoryManager = tim.require( 'Repository/Manager' );
const User = tim.require( 'User/Self' );

/*
| Serves a direct git https request.
|
| User is already authenticated
| but not yet verified to have access to the requested repository)
|
| ~req: request
| ~res: result
| ~count: client counter
| ~user: autenticated user
*/
def.static.serve =
	async function( count, req, res, user )
{
/**/if( CHECK )
/**/{
/**/	if( arguments.length !== 4 ) throw new Error( );
/**/	if( user.timtype !== User ) throw new Error( );
/**/}

	const url = req.url;
	const urlSplit = url.split( '/' );

	if( urlSplit[ 1 ] === 'objects' )
	{
		if( !LfsManager.enabled( ) ) return Http.error( res, '404', 'LFS disabled' );
		return await Lfs.object( count, req, res, urlSplit, user );
	}

	let reponame = urlSplit[ 1 ];
	if( !reponame.endsWith( '.git' ) ) return Http.error( res, 401, 'Unauthorized' );

	reponame = reponame.substr( 0, reponame.length - 4 );

	const repo = RepositoryManager.get( reponame );
	if( !repo ) return Http.error( res, 401, 'Unauthorized' );

	const perms = repo.getPermissions( user );
	if( !perms )
	{
		Log.log(
			'https', count,
			'user ' + user.username + ' has no access to ' + repo.path + '.git'
		);
		return Http.error( res, 401, 'Unauthorized' );
	}

	if( urlSplit[ 2 ] === 'info' && urlSplit[ 3 ] === 'lfs' )
	{
		if( !LfsManager.enabled( ) ) return Http.error( res, '404', 'LFS disabled' );
		return await Lfs.info( count, req, res, urlSplit, reponame, user, perms );
	}

	// here user has access to the git!
	Log.log( 'https', count, user.username + ' accesses '+  reponame + '.git' );

	// potentially unzips body stream
	if( req.headers[ 'content-encoding' ] === 'gzip' ) req = req.pipe( zlib.createGunzip( ) );

	req.pipe(
		backend(
			url,
			// FIXME handover perms
			( err, service ) => Self._gitCommand( err, service, res, count, repo, user, perms )
		)
	).pipe( res );
};


/*
| Handles a git command
*/
def.static._gitCommand =
	async function( err, service, res, count, repo, user, perms )
{
	if( err ) { return res.end( err + '\n' ); }
	res.setHeader( 'content-type', service.type );
	const args = service.args.concat( repo.path );
	const cmd = service.cmd;
	switch( cmd )
	{
		case 'git-upload-pack':
			break;
		case 'git-receive-pack':
			if( perms !== 'rw' ) return Http.error( res, 401, 'Access denied' );
			break;
		default:
			return Http.error( res, 400, 'Bad Request' );
	}

	// download from overleaf (if this is not the loopback user)
	let olFlags;
	let couplingFlags;
	if( user.username !== 'git' )
	{
		// downsync happens for receive-pack and upload-pack
		olFlags = await Overleaf.downSync( count, repo.name, cmd === 'git-receive-pack' );
		if( !olFlags )
		{
			return Http.error( res, 500, 'Overleaf sync failed!' );
		}

		couplingFlags  = await Coupling.downSync( count, repo.name, cmd === 'git-receive-pack' );
		if( !couplingFlags )
		{
			return Http.error( res, 500, 'Coupling sync failed!' );
		}
	}

	// spawns the git request
	const ps =
		child.spawn( '/usr/bin/' + cmd, args, { cwd: repo.path } )
		.on( 'close',
			( code, a2 ) =>
		{
			if( user.username !== 'git' && cmd === 'git-receive-pack' )
			{
				if( code === 0 ) Overleaf.upSync( count, repo.name, olFlags );
				else Overleaf.releaseSync( repo.name, olFlags );
			}

			if( user.username !== 'git' && cmd === 'git-receive-pack' )
			{
				if( code === 0 ) Coupling.upSync( count, repo.name, couplingFlags );
				else Coupling.releaseSync( repo.name, couplingFlags );
			}
		} );
	ps.stdout.pipe( service.createStream( ) ).pipe( ps.stdin );
};
