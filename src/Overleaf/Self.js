/*
| Provides overleaf synchronization.
|
| Note: there are two pillars of semaphores in work.
|
|       on one hand the git repositories are semaphored, so one given
|       git repository only syncs to Overleaf at the same time.
|
|       on the other hand the overleaf projects are semaphored, so a given
|       overleaf project is only synced with once at the same time.
*/
def.abstract = true;

const fs = require( 'fs/promises' );
const unzipper = require( 'unzipper' );

const Client = tim.require( 'Overleaf/Client' );
const Exec = tim.require( 'System/Exec' );
const Log = tim.require( 'Log/Self' );
const OverleafProjectManager = tim.require( 'Overleaf/Project/Manager' );
const RepositoryManager = tim.require( 'Repository/Manager' );

/*
| Milliseconds to not downsync a project again.
*/
const downSyncTimeout = 60000;

/*
| Configured overleaf server url.
*/
let _url;

/*
| Configures overleaf admin user.
*/
let _adminUser;

/*
| Configures overleaf admin password.
*/
let _adminPass;

/*
| Configured olsync directory.
*/
let _syncDir;

/*
| The overleaf client.
*/
let _client;

/*
| Recurservly removes all but the .git directory
|
| ~dir: directory to clean
| ~keepGit: if true keeps the .git directory (in root dir only)
*/
const emptyDir =
	async function( dir, keepGit )
{
	const d = await fs.readdir( dir, { withFileTypes: true } );
	for( let entry of d )
	{
		let name = entry.name;
		if( keepGit && name === '.git' ) continue;
		await fs.rm( dir + name, { recursive: true } );
	}
};

def.static.init =
	function( url, adminUser, adminPass, syncDir )
{
	_url = url;
	_adminUser = adminUser;
	_adminPass = adminPass;
	_syncDir = syncDir;
};

/*
| Ensures dir exists.
*/
const ensureDir =
	async function( dir )
{
	try{ await fs.stat( dir ); }
	catch( e )
	{
		if( e.code !== 'ENOENT' ) throw e;
		fs.mkdir( dir );
	}
};

/*
| Starts the overleaf syncronisation capabilities.
*/
def.static.start =
	async function( )
{
	if( !_url )
	{
		Log.log( 'overleaf', '*', 'not configured, not starting' );
		return true;
	}

	Log.log( 'overleaf', '*', 'starting' );
	_client = Client.Url( _url );
	// FIXME handle login error if overleaf server is down.
	try
	{
		await _client.login( _adminUser, _adminPass );
		await _client.getProjectPage( );
	}
	catch( e )
	{
		Log.log( 'overleaf', '*', 'ERROR: failed overleaf login!' );
		console.log( e );
		return false;
	}

	await ensureDir( _syncDir + 'blue' );
	await ensureDir( _syncDir + 'clone' );
	await ensureDir( _syncDir + 'hash' );
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

	let repository = RepositoryManager.get( name );
	const opid = repository.overleafCeProjectId;
	if( !opid || opid === '' ) return true;

	const rmFlag = await RepositoryManager.overleafRequestSemaphore( name );
	const opFlag = await OverleafProjectManager.requestSemaphore( opid );

	Log.log( 'overleaf', count, 'down syncing ' + opid + ' to ' + name );

	// downloads the zip data
	let zipData;
	try{ zipData = await _client.downloadZip( opid ); }
	catch( e )
	{
		console.log( e );
		OverleafProjectManager.releaseSemaphore( opid, opFlag );
		RepositoryManager.overleafReleaseSemaphore( name, rmFlag );
		return false;
	}
	const zip = await unzipper.Open.buffer( zipData );
	const hash = Self._hashZip( zip );
	const hashFilename = _syncDir + 'hash/' + name;

	// checks if nothing changes since last down sync
	// in case of a follow upsync, downsyncing is forced
	const now = Date.now( );
	if( !followUp )
	{
		const timestamp = OverleafProjectManager.getDownSyncTimestamp( opid );
		if( timestamp !== undefined && now - timestamp <= downSyncTimeout )
		{
			Log.log( 'overleaf', count, 'Last down sync', now - timestamp, 'milliseconds ago, skipping downsync' );
			OverleafProjectManager.releaseSemaphore( opid, opFlag );
			RepositoryManager.overleafReleaseSemaphore( name, rmFlag );
			return true;
		}

		try
		{
			const oldHash = ( await fs.readFile( hashFilename ) ) + '';
			if( oldHash === hash )
			{
				Log.log( 'overleaf', count, 'hash identical, skipping downsync' );
				OverleafProjectManager.setDownSyncTimestamp( opid, now );
				OverleafProjectManager.releaseSemaphore( opid, opFlag );
				RepositoryManager.overleafReleaseSemaphore( name, rmFlag );
				return true;
			}
		}
		catch( e ){ /* ignore */ }
	}

	const blueDir = _syncDir + 'blue/' + name + '/';
	const cloneDir = _syncDir + 'clone/' + name + '/';

	try{ await fs.rm( cloneDir, { recursive: true } ); }
	catch( e ){ /* ignore */ }

	if( followUp )
	{
		try{ await fs.rm( blueDir, { recursive: true } ); }
		catch( e ){ /* ignore */ }

		await fs.mkdir( blueDir );
		await zip.extract( { path: blueDir } );
	}

	// FIXME for now use file clones, may need to localloop for LFS to work.
	await Exec.file(
		'/usr/bin/git',
		[ 'clone', 'file://' + repository.path ],
		{ cwd: _syncDir + 'clone/' }
	);

	// FIXME respect subdir syncing
	await emptyDir( cloneDir, true );
	await zip.extract( { path: cloneDir } );

	if( followUp ) { await zip.extract( { path: blueDir } ); }

	const message = 'auto synced with overleaf';
	const opts = { cwd: cloneDir };

	try { await Exec.file( '/usr/bin/git', [ 'add', '--all' ], opts ); }
	catch( e ) { console.log( e ); }

	try { await Exec.file( '/usr/bin/git', [ 'commit', '-m', message ], opts ); }
	catch( e ) { console.log( e ); }

	try { await Exec.file( '/usr/bin/git', [ 'push' ], opts ); }
	catch( e ) { console.log( e ); }

	// updates hash
	await fs.writeFile( hashFilename, hash );
	OverleafProjectManager.setDownSyncTimestamp( opid, now );

	if( !followUp )
	{
		// in case of a follow up semaphores are not released
		OverleafProjectManager.releaseSemaphore( opid, opFlag );
		RepositoryManager.overleafReleaseSemaphore( name, rmFlag );
		return true;
	}
	else
	{
		return Object.freeze( { opFlag: opFlag, rmFlag: rmFlag } );
	}
};

/*
| Releases the semaphores in case of an followUp upsync with a failed git.
*/
def.static.releaseSync =
	async function( name, flags )
{
	let repository = RepositoryManager.get( name );
	const opid = repository.overleafCeProjectId;
	if( !opid || opid === '' ) return;
	OverleafProjectManager.releaseSemaphore( opid, flags.opFlag );
	RepositoryManager.overleafReleaseSemaphore( name, flags.rmFlag );
};

/*
| Up-syncs to an overleaf project from a repository.
| Semaphores need to have been taken by downSync.
|
| ~count: client counter.
| ~name: repository name.
| ~flags: semaphore flags.
|
| ~return: true if successfully downsynced (or no sync).
*/
def.static.upSync =
	async function( count, name, flags )
{
/**/if( CHECK )
/**/{
/**/    if( arguments.length !== 3 ) throw new Error( );
/**/    if( typeof( name ) !== 'string' ) throw new Error( );
/**/}

	let repository = RepositoryManager.get( name );
	const opid = repository.overleafCeProjectId;
	if( !opid || opid === '' ) return true;

	Log.log( 'overleaf', count, 'up syncing ' + name + ' to ' + opid );

	const cloneDir = _syncDir + 'clone/' + name + '/';

	//try{ await fs.rm( cloneDir, { recursive: true } ); }
	//catch( e ){ /* ignore */ }

	// pulls the changes the user made into clone directory
	await Exec.file( '/usr/bin/git', [ 'pull', '--no-edit' ], { cwd: cloneDir } );

	const info = await _client.joinProject( count, opid );
	const tree = await Client.buildTree( info.rootFolder[ 0 ] );
	await Self._upSyncDir( count, name, opid, '', tree );

	OverleafProjectManager.releaseSemaphore( opid, flags.opFlag );
	RepositoryManager.overleafReleaseSemaphore( name, flags.rmFlag );
	return true;
};

/*
| Compares the blueping with the clone and uploads all changes to overleaf.
|
| ~count: client counter.
| ~name: repository name.
| ~projectId: project id.
| ~relDir: relativ dir.
| ~branch: branch in overleaf tree info.
*/
def.static._upSyncDir =
	async function( count, name, projectId, relDir, branch )
{
	const blueDir = _syncDir + 'blue/' + name + '/' + relDir;
	const cloneDir = _syncDir + 'clone/' + name + '/' + relDir;

	Log.log( 'overleaf', count, 'inspecting ' + cloneDir );
	let list = await fs.readdir( cloneDir, { withFileTypes: true } );
	for( let entry of list )
	{
		const ename = entry.name;
		// ignores .git
		if( ename === '.git' ) continue;
		let leaf = branch.subs[ ename ];
		if( entry.isDirectory( ) )
		{
			// create the folder if not there
			if( !leaf )
			{
				const id = await Self._addFolder( count, projectId, branch, relDir, ename );
				leaf = branch.subs[ ename ] =
				{
					id: id,
					name: ename,
					branch: branch,
					subs: { },
				};
			}
			await Self._upSyncDir( count, name, projectId, relDir + '/' + ename + '/', leaf );
		}
		else
		{
			let blueData;
			let cloneData = await fs.readFile( cloneDir + ename );
			try{ blueData = await fs.readFile( blueDir + ename ); }
			catch( e )
			{
				// rethrows anything but entity not found
				if( e.code !== 'ENOENT' ) throw e;
				await Self._uploadEntity( count, projectId, relDir, branch, ename, cloneData );
				continue;
			}
			if( cloneData.compare( blueData ) )
			{
				// files not equal
				await Self._uploadEntity( count, projectId, relDir, branch, ename, cloneData );
			}
		}
	}

	// removes entries from overleaf in project tree that are no longer in pad
	const subs = branch.subs;
	for( let key in subs )
	{
		const leaf = subs[ key ];
		const name = leaf.name;
		try
		{
			await fs.stat( cloneDir + name );
			// if the above line throws no error (entry is there), nothing to remove
			continue;
		}
		catch( e )
		{
			// rethrows all but entity not found
			if( e.code !== 'ENOENT' ) throw e;
		}
		await Self._removeEntity( count, projectId, relDir, leaf );
	}
};

/*
| Adds a folder.
|
| ~returns: folder id
*/
def.static._addFolder =
	async function( count, projectId, branch, relDir, name )
{
	Log.log( 'overleaf', count, 'adding folder ./' + relDir + name );
	try
	{
		const reply = await _client.addFolder( projectId, branch.id, name );
		return reply.data._id;
	}
	catch( e )
	{
		const response = e.response;
		if( response && response.data === 'file already exists' ) return 'EXISTS';
		// rethrow other errors
		throw e;
	}
};

/*
| Builds the hash for a zip file.
*/
def.static._hashZip =
	function( zip )
{
	let hash = '';
	for( let file of zip.files )
	{
		hash +=
			file.path
			+ ':' + file.uncompressedSize
			+ ':' + file.crc32
			+ '\n';
	}
	return hash;
};

/*
| Removes an entity.
*/
def.static._removeEntity =
	async function( count, projectId, relDir, leaf )
{
	Log.log( 'overleaf', count, 'removing ' + leaf.type + ' ./' + relDir + leaf.name );
	await _client.remove( projectId, leaf.type, leaf.id );
};

/*
| Uploads an entity.
*/
def.static._uploadEntity =
	async function( count, projectId, relDir, branch, ename, data )
{
	Log.log( 'overleaf', count, 'uploading ./' + relDir + ename + ' to ' + branch.id );
	await _client.upload( projectId, branch.id, ename, data );
};
