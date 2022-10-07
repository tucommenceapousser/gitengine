/*
| Provides loose coopling synchronization with other git repositories
|
| Note: there are two pillars of semaphores in work.
|
|       On one hand local git repositories are semaphored, so one given
|       git repository only syncs at the same time.
|
|       On the other hand remote repositories are semaphored, so a given
|       overleaf project is only synced with once at the same time.
*/
def.abstract = true;

const fs = require( 'fs/promises' );

const Exec = tim.require( 'System/Exec' );
const Log = tim.require( 'Log/Self' );
const LocalRepositoryManager = tim.require( 'Repository/Manager' );
const RemoteRepositoryManager = tim.require( 'Coupling/Repository/Manager' );

/*
| Milliseconds to not downsync a project again.
*/
//const downSyncTimeout = 60000;

/*
| Configured couple directory.
*/
const _coupleLocalDir = './couple/local/';
const _coupleRemoteDir = './couple/remote/';

/*
| Starts the couple syncronisator.
*/
def.static.start =
	async function( )
{
	Log.log( 'couple', '*', 'starting' );
	return true;
};

/*
| Down-syncs an overleaf project into a repository.
|
| ~count: client counter
| ~name: name of the repository to sync
| ~followUp: if true followed by an upSync
|
| ~return true if successfully downsynced (or no sync)
*/
def.static.downSync =
	async function( count, name, followUp )
{
/**/if( CHECK )
/**/{
/**/    if( arguments.length !== 3 ) throw new Error( );
/**/    if( typeof( name ) !== 'string' ) throw new Error( );
/**/    if( typeof( followUp ) !== 'boolean' ) throw new Error( );
/**/}

	let localRep = LocalRepositoryManager.get( name );
	const couplingUrl = localRep.couplingUrl;
	if( !couplingUrl || couplingUrl === '' ) return true;

	const localFlag = await LocalRepositoryManager.couplingRequestSemaphore( name );
	const remoteFlag = await RemoteRepositoryManager.requestSemaphore( couplingUrl );

	Log.log( 'coupling', count, 'down syncing ' + couplingUrl + ' to ' + name );

	// clones/pulls remote repository
	let missing = false;
	try{ await fs.stat( _coupleRemoteDir + name ); }
	catch( e )
	{
		if( e.code !== 'ENOENT' ) throw e;
		missing = true;
	}

	if( missing )
	{
		try
		{
			await Exec.file(
				'/usr/bin/git',
				[ 'clone', couplingUrl, name ],
				{
					cwd: _coupleRemoteDir,
					/*
					env:
					{
						GIT_SSL_NO_VERIFY: '1',
					}
					*/
				}
			);
		}
		catch( e )
		{
			console.log( e );
			RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
			LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
			return false;
		}
	}
	else
	{
		try
		{
			await Exec.file(
				'/usr/bin/git',
				[ 'pull' ],
				{
					cwd: _coupleRemoteDir + name,
				}
			);
		}
		catch( e )
		{
			console.log( e );
			RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
			LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
			return false;
		}
	}

	// clones/pulls local repository
	missing = false;
	try{ await fs.stat( _coupleLocalDir + name ); }
	catch( e )
	{
		if( e.code !== 'ENOENT' ) throw e;
		missing = true;
	}

	if( missing )
	{
		try
		{
			await Exec.file(
				'/usr/bin/git',
				[ 'clone', 'ssh://localhost/' + name, name ],
				{
					cwd: _coupleLocalDir,
					env:
					{
						GIT_SSL_NO_VERIFY: '1',
					}
				}
			);
		}
		catch( e )
		{
			console.log( e );
			RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
			LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
			return false;
		}
	}
	else
	{
		try
		{
			await Exec.file(
				'/usr/bin/git',
				[ 'pull' ],
				{
					cwd: _coupleLocalDir + name,
					env:
					{
						GIT_SSL_NO_VERIFY: '1',
					}
				}
			);
		}
		catch( e )
		{
			console.log( e );
			RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
			LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
			return false;
		}
	}

	RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
	LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
};
