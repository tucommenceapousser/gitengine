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
const path = require( 'path' );

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
const _coupleDir = './coupling/';
const _coupleLocalDir = './coupling/local/';
const _coupleRemoteDir = './coupling/remote/';

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

	/*
	Log.log( 'coupling', count, 'XXX get semaphore 1', name );
	const localFlag = await LocalRepositoryManager.couplingRequestSemaphore( name );
	Log.log( 'coupling', count, 'XXX get semaphore 2', couplingUrl );
	const remoteFlag = await RemoteRepositoryManager.requestSemaphore( couplingUrl );
	Log.log( 'coupling', count, 'XXX got semapores' );
	*/
	const localFlag = { };
	const remoteFlag = { };

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
				{ cwd: _coupleRemoteDir }
			);
		}
		catch( e )
		{
			Log.log( 'coupling', count, e );
			//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
			//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
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
				{ cwd: _coupleRemoteDir + name }
			);
		}
		catch( e )
		{
			Log.log( 'coupling', count, e );
			//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
			//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
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
					env: { GIT_SSL_NO_VERIFY: '1' }
				}
			);
		}
		catch( e )
		{
			Log.log( 'coupling', count, e );
			//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
			//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
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
					env: { GIT_SSL_NO_VERIFY: '1' }
				}
			);
		}
		catch( e )
		{
			Log.log( 'coupling', count, e );
			//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
			//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
			return false;
		}
	}

	let branch = localRep.couplingBranch;
	if( !branch || branch === '' ) branch = 'master';
	try
	{
		await Exec.file(
			'/usr/bin/git',
			[ 'switch', branch ],
			{
				cwd: _coupleLocalDir + name,
				env: { GIT_SSL_NO_VERIFY: '1' }
			}
		);
	}
	catch( e )
	{
		Log.log( 'coupling', count, e );
		//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
		//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
		return false;
	}

	try
	{
		const src = path.resolve( _coupleRemoteDir + name ) + '/';
		const trg = path.resolve( _coupleLocalDir + name ) + '/';

		let dir = localRep.couplingDir;
		if( !dir ) dir = '';
		else if( dir !== '' && dir.endsWith( '/' ) ) dir += '/';

		if(
			!src.startsWith( '/home/git/datanode/coupling/' )
			|| !trg.startsWith( '/home/git/datanode/coupling/' )
		)
		{
			Log.log( 'couple', count, 'rsync failsafe!' );
			//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
			//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
			return false;
		}

		await Exec.file(
			'/usr/bin/rsync',
			[
				'-rp',
				'--delete',
				'--exclude=.git',
				'--exclude=.gitattributes',
				path.resolve( _coupleRemoteDir + name ) + '/',
				path.resolve( _coupleLocalDir + name ) + '/' + dir,
			],
			{ cwd: _coupleDir }
		);
	}
	catch( e )
	{
		Log.log( 'coupling', count, e );
		//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
		//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
		return false;
	}

	const opts = { cwd: _coupleLocalDir + name };

	try { await Exec.file( '/usr/bin/git', [ 'add', '--all' ], opts ); }
	catch( e ) { Log.log( 'coupling', count, e ); }

	const message = 'auto synced from overleaf';
	try { await Exec.file( '/usr/bin/git', [ 'commit', '-m', message ], opts ); }
	catch( e ) { Log.log( 'coupling', count, e ); }

	try { await Exec.file( '/usr/bin/git', [ 'push' ], opts ); }
	catch( e ) { Log.log( 'coupling', count, e ); }

	if( !followUp )
	{
		// in case of a follow up semaphores are not released
		//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
		//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
		return true;
	}
	else
	{
		return Object.freeze( { localFlag: localFlag, remoteFlag: remoteFlag } );
	}
};

/*
| Releases the semaphores in case of an followUp upsync with a failed git.
*/
def.static.releaseSync =
	async function( name, flags )
{
	//let localRep = LocalRepositoryManager.get( name );
	//const couplingUrl = localRep.couplingUrl;

	//RemoteRepositoryManager.releaseSemaphore( couplingUrl, flags.remoteFlag );
	//LocalRepositoryManager.couplingReleaseSemaphore( name, flags.localFlag );
};

/*
| Up-syncs an overleaf project into a repository.
|
| ~count: client counter
| ~name: name of the repository to sync
| ~flags: semaphore flags.
|
| ~return true if successfully upsynced (or no sync)
*/
def.static.upSync =
	async function( count, name, flags )
{
/**/if( CHECK )
/**/{
/**/    if( arguments.length !== 3 ) throw new Error( );
/**/    if( typeof( name ) !== 'string' ) throw new Error( );
/**/}

	const remoteFlag = flags.remoteFlag;
	const localFlag = flags.localFlag;

	let localRep = LocalRepositoryManager.get( name );
	const couplingUrl = localRep.couplingUrl;

	if( !couplingUrl || couplingUrl === '' ) return true;

	Log.log( 'coupling', count, 'up syncing ' + name + ' to ' + couplingUrl );

	// pulls from local repository
	try
	{
		await Exec.file(
			'/usr/bin/git',
			[ 'pull' ],
			{ cwd: _coupleLocalDir + name }
		);
	}
	catch( e )
	{
		Log.log( 'coupling', count, e );
		//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
		//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
		return false;
	}

	// clones/pulls local repository
	try
	{
		await Exec.file(
			'/usr/bin/git',
			[ 'pull' ],
			{
				cwd: _coupleLocalDir + name,
				env: { GIT_SSL_NO_VERIFY: '1' }
			}
		);
	}
	catch( e )
	{
		Log.log( 'coupling', count, e );
		//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
		//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
		return false;
	}

	try
	{
		const src = path.resolve( _coupleRemoteDir + name ) + '/';
		const trg = path.resolve( _coupleLocalDir + name ) + '/';

		let dir = localRep.couplingDir;
		if( !dir ) dir = '';
		else if( dir !== '' && dir.endsWith( '/' ) ) dir += '/';

		if(
			!src.startsWith( '/home/git/datanode/coupling/' )
			|| !trg.startsWith( '/home/git/datanode/coupling/' )
		)
		{
			Log.log( 'couple', count, 'rsync failsafe!' );
			//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
			//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
			return false;
		}

		await Exec.file(
			'/usr/bin/rsync',
			[
				'-rp',
				'--delete',
				'--exclude=.git',
				'--exclude=.gitattributes',
				path.resolve( _coupleLocalDir + name ) + '/' + dir,
				path.resolve( _coupleRemoteDir + name ) + '/',
			],
			{ cwd: _coupleDir }
		);
	}
	catch( e )
	{
		Log.log( 'coupling', count, e );
		//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
		//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );
		return false;
	}

	const opts = { cwd: _coupleRemoteDir + name };

	try { await Exec.file( '/usr/bin/git', [ 'add', '--all' ], opts ); }
	catch( e ) { Log.log( 'coupling', count, e ); }

	const message = 'auto synced to overleaf';
	try { await Exec.file( '/usr/bin/git', [ 'commit', '-m', message ], opts ); }
	catch( e ) { Log.log( 'coupling', count, e ); }

	try { await Exec.file( '/usr/bin/git', [ 'push' ], opts ); }
	catch( e ) { Log.log( 'coupling', count, e ); }

	//RemoteRepositoryManager.releaseSemaphore( couplingUrl, remoteFlag );
	//LocalRepositoryManager.couplingReleaseSemaphore( name, localFlag );

	return true;
};

