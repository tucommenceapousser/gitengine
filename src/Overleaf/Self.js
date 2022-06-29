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

const Client = tim.require( 'Overleaf/Client' );
const Log = tim.require( 'Log/Self' );

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
let _olSyncDir;

/*
| The overleaf client.
*/
let _client;

def.static.init =
	function( url, adminUser, adminPass, olSyncDir )
{
	_url = url;
	_adminUser = adminUser;
	_adminPass = adminPass;
	_olSyncDir = olSyncDir;
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
		return;
	}

	Log.log( 'ssh', '*', 'starting' );
	_client = Client.Url( _url );
	// FIXME handle login error if overleaf server is down.
	await _client.login( _adminUser, _adminPass );

	await ensureDir( _olSyncDir + 'clone' );
	await ensureDir( _olSyncDir + 'hash' );
	await ensureDir( _olSyncDir + 'download' );
};

/*
def.proto.downSync =
	function( )
{

}
*/
