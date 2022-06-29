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
| Starts the overleaf syncronisation capabilities.
*/
def.static.start =
	async function( )
{
	_client = Client.Url( _url );
	// FIXME handle login error if overleaf server is down.
	await _client.login( _adminUser, _adminPass );

	try{ await fs.stat( _olSyncDir + 'clone' ); }
	catch( e ){ console.log( e ); throw e; }
};

/*
def.proto.downSync =
	function( )
{

}
*/
