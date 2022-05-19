/*
| Provides the http(s) interface for git repositories.
| Does both forwarding git requests as well provides a cgit web interface.
*/

def.abstract = true;

const backend = require( 'git-http-backend' );
const child = require( 'child_process' );
const zlib = require( 'zlib'  );

const RepositoryManager = tim.require( 'Repository/Manager' );
const Http = tim.require( 'Http/Self' );
const Lfs = tim.require( 'Http/Lfs' );
const LfsManager = tim.require( 'Lfs/Manager' );

/*
| Handles a git command
*/
def.static._gitCommand =
	function( err, service, res, repo, perms )
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

	// spawns the git request
	const ps =
		child.spawn(
			'/usr/bin/' + cmd,
			args, { cwd: repo.path }
		);
	ps.stdout.pipe( service.createStream( ) ).pipe( ps.stdin );
};

/*
| Serves a direct git https request.
|
| User is already authenticated
| but not yet verified to have access to the requested repository)
*/
def.static.serve =
	async function( req, res, user )
{
	const url = req.url;
	const urlSplit = url.split( '/' );

	if( urlSplit[ 1 ] === 'objects' )
	{
		if( !LfsManager.enabled( ) ) return Http.error( res, '404', 'LFS disabled' );
		return await Lfs.object( req, res, urlSplit, user );
	}

	let reponame = urlSplit[ 1 ];
	if( !reponame.endsWith( '.git' ) ) return Http.error( res, 401, 'Unauthorized' );

	reponame = reponame.substr( 0, reponame.length - 4 );

	const repo = RepositoryManager.get( reponame );
	if( !repo ) return Http.error( res, 401, 'Unauthorized' );

	const perms = repo.getPermissions( user );
	if( !perms )
	{
		console.log( 'user ' + user.username + ' has no access to ' + repo.path + '.git' );
		return Http.error( res, 401, 'Unauthorized' );
	}

	if( urlSplit[ 2 ] === 'info' && urlSplit[ 3 ] === 'lfs' )
	{
		if( !LfsManager.enabled( ) ) return Http.error( res, '404', 'LFS disabled' );
		return await Lfs.info( req, res, urlSplit, reponame, user, perms );
	}

	// here user has access to the git!
	console.log( user.username + ' accesses '+  reponame + '.git' );

	// potentially unzips body stream
	if( req.headers[ 'content-encoding' ] === 'gzip' ) req = req.pipe( zlib.createGunzip( ) );

	req.pipe(
		backend(
			url,
			// FIXME handover perms
			( err, service ) => Self._gitCommand( err, service, res, repo, perms )
		)
	).pipe( res );
};
