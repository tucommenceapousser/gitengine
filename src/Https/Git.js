/*
| Provides the http(s) interface for git repositories.
| Does both forwarding git requests as well provides a cgit web interface.
*/

def.abstract = true;

import backend from 'git-http-backend';
import child from 'child_process';
import zlib from 'zlib';

import { Self as Coupling          } from '{Coupling/Self}';
import { Self as Https             } from '{Https/Self}';
import { Self as Lfs               } from '{Https/Lfs}';
import { Self as LfsManager        } from '{Lfs/Manager}';
import { Self as Log               } from '{Log/Self}';
import { Self as RepositoryManager } from '{Repository/Manager}';
import { Self as User              } from '{User/Self}';

/*
| Serves a direct git https request.
|
| User is already authenticated
| but not yet verified to have access to the requested repository)
|
| ~count: client counter
| ~req: request
| ~res: result
| ~urlSplit: url splitted into parts
| ~user: autenticated user
*/
def.static.serve =
	async function( count, req, res, urlSplit, user )
{
/**/if( CHECK )
/**/{
/**/	if( arguments.length !== 5 ) throw new Error( );
/**/	if( user.ti2ctype !== User ) throw new Error( );
/**/}

	if( urlSplit[ 1 ] === 'objects' )
	{
		if( !LfsManager.enabled( ) ) return Https.error( res, '404', 'LFS disabled' );
		return await Lfs.object( count, req, res, urlSplit, user );
	}

	let reponame = urlSplit[ 1 ];
	if( !reponame.endsWith( '.git' ) ) return Https.error( res, 401, 'Unauthorized' );

	reponame = reponame.substr( 0, reponame.length - 4 );

	const repo = RepositoryManager.get( reponame );
	if( !repo ) return Https.error( res, 401, 'Unauthorized' );

	const perms = repo.getPermissions( user );
	if( !perms )
	{
		Log.log(
			'https-git', count,
			'user ' + user.username + ' has no access to ' + repo.path + '.git'
		);
		return Https.error( res, 401, 'Unauthorized' );
	}

	if( urlSplit[ 2 ] === 'info' && urlSplit[ 3 ] === 'lfs' )
	{
		if( !LfsManager.enabled( ) ) return Https.error( res, '404', 'LFS disabled' );
		return await Lfs.info( count, req, res, urlSplit, reponame, user, perms );
	}

	// here user has access to the git!
	Log.log( 'https-git', count, user.username + ' accesses '+  reponame + '.git' );

	// potentially unzips body stream
	if( req.headers[ 'content-encoding' ] === 'gzip' ) req = req.pipe( zlib.createGunzip( ) );

	req.pipe(
		backend(
			req.url,
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
			if( perms !== 'rw' ) return Https.error( res, 401, 'Access denied' );
			break;
		default:
			return Https.error( res, 400, 'Bad Request' );
	}

	// download from overleaf (if this is not the loopback user)
	if( user.username !== 'git' )
	{
		// downsync happens for receive-pack and upload-pack
		const dsResult =
			await Coupling.downSync( count, repo.name );
		if( !dsResult )
		{
			return Https.error( res, 500, 'Coupling sync failed!' );
		}
	}

	// spawns the git request
	const ps =
		child.spawn(
			'/usr/bin/' + cmd, args,
			{
				cwd: repoPath,
				env: { GITENGINE_USER: user.username },
			}
		)
		.on( 'close',
			( code, a2 ) =>
		{
			if( user.username !== 'git' && cmd === 'git-receive-pack' )
			{
				if( code === 0 ) Coupling.upSync( count, repo.name );
			}
		} );
	ps.stdout.pipe( service.createStream( ) ).pipe( ps.stdin );
};
