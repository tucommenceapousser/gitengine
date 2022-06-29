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
	}
	catch( e )
	{
		Log.log( 'overleaf', '*', 'ERROR: failed overleaf login!' );
		console.log( e );
		return false;
	}

	await ensureDir( _syncDir + 'clone' );
	await ensureDir( _syncDir + 'hash' );
	await ensureDir( _syncDir + 'download' );
	return true;
};

/*
| Down-syncs an overleaf project into a repository.
|
| ~return true if successfully downsynced (or no sync)
*/
def.static.downSync =
	async function( name, count )
{
/**/if( CHECK )
/**/{
/**/    if( arguments.length !== 2 ) throw new Error( );
/**/    if( typeof( name ) !== 'string' ) throw new Error( );
/**/}

	let repository = RepositoryManager.get( name );
	const opid = repository.overleafProjectId;
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

	const cloneDir = _syncDir + 'clone/' + name + '/';

	try{ await fs.rm( cloneDir, { recursive: true } ); }
	catch( e ){ /* ignore */ };

	// FIXME for now use file clones, may need to localloop for LFS to work.
	await Exec.file(
		'/usr/bin/git',
		[ 'clone', 'file://' + repository.path ],
		{ cwd: _syncDir + 'clone/' }
	);

	// FIXME respect subdir syncing
	emptyDir( cloneDir, true );

	const zip = await unzipper.Open.buffer( zipData );
	await zip.extract( { path: cloneDir } );
	
	const message = 'auto synced with overleaf';
	const opts = { cwd: cloneDir };

    try { await Exec.file( '/usr/bin/git', [ 'add', '--all' ], opts ); }
    catch( e ) { console.log( e ); }

    try { await Exec.file( '/usr/bin/git', [ 'commit', '-m', message ], opts ); }
    catch( e ) { console.log( e ); }

    try { await Exec.file( '/usr/bin/git', [ 'push' ], opts ); }
    catch( e ) { console.log( e ); }

	OverleafProjectManager.releaseSemaphore( opid, opFlag );
	RepositoryManager.overleafReleaseSemaphore( name, rmFlag );
	return true;
};
