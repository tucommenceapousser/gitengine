/*
| Provides the http(s) interface for git repositories.
| Does both forwarding git requests as well provides a cgit web interface.
*/

def.abstract = true;

const fs = require( 'fs/promises' );
const http = require( 'http' );
const https = require( 'https' );
const timers = require( 'timers/promises' );

const CGit = tim.require( 'Http/CGit' );
const HttpGit = tim.require( 'Http/Git' );
const LfsManager = tim.require( 'Lfs/Manager' );
const Log = tim.require( 'Log/Self' );
const UserManager = tim.require( 'User/Manager' );

const wrongWaitTime = 2000;

/*
| Configured ips.
*/
let _ips = [ '0.0.0.0' ];

/*
| Configured ports.
*/
let _httpsPort = 443;
let _httpPort = 80;

/*
| Configured ssl files.
*/
let _sslCertFile;
let _sslKeyFile;

/*
| Makes a http error.
*/
def.static.error =
	function( res, code, message )
{
	res.writeHead( '' + code, { 'Content-Type': 'text/plain' } );
	res.end( message );
	return false;
};

/*
| Sets IPs to listen to.
|
| ~ips: array of strings.
*/
def.static.setIPs = function( ips ) { _ips = ips; };

/*
| Sets the sslKeyFile to load.
*/
def.static.setSslCertFile = function( sslCertFile ) { _sslCertFile = sslCertFile; };

/*
| Sets the sslKeyFile to load.
*/
def.static.setSslKeyFile = function( sslKeyFile ) { _sslKeyFile = sslKeyFile; };

/*
| Sets the http port.
*/
def.static.setHttpPort = function( port ) { _httpPort = port; };

/*
| Sets the https port.
*/
def.static.setHttpsPort = function( port ) { _httpsPort = port; };

/*
| Starts the http(s) git server.
*/
def.static.start =
	async function( )
{
	Log.log( 'https', '*', 'starting' );
	if( !_sslKeyFile || !_sslCertFile ) throw new Error( 'no SSL configured' );

	const serve =
		( req, res ) =>
	{ Self._serve( req, res ); };

	const forward =
		( req, res ) =>
	{
		let host = req.headers.host;
		let ios;

		try{ ios = host.indexOf( ':' ); }
		catch( e ){ return Self.error( res, 400, 'Bad Request' ); }

		if( ios >= 0 ) host = host.substr( 0, ios );
		if( _httpsPort === 443 )
		{
			res.writeHead(
				307,
				{ Location: 'https://' + host + req.url }
			);
		}
		else
		{
			res.writeHead(
				307,
				{ Location: 'https://' + host + ':' + _httpsPort + req.url }
			);
		}
		res.end( 'go use https' );
	};

	const httpsOptions =
	{
		key: await fs.readFile( _sslKeyFile ),
		cert: await fs.readFile( _sslCertFile ),
	};

	for( let ip of _ips )
	{
		if( _httpsPort )
		{
			Log.log( 'https', '*', 'listening on ' + ip + ':' + _httpsPort );
			https
			.createServer( httpsOptions, serve )
			.listen( { port: _httpsPort, host: ip } );
		}
		if( _httpPort )
		{
			Log.log( 'https', '*', 'listening on ' + ip + ':' + _httpPort );
			http
			.createServer( forward )
			.listen( { port: _httpPort, host: ip } );
		}
	}

	await CGit.start( );
};

/*
| Handles basic and remote authentication.
|
| ~count: client counter
| ~req: request
| ~res: result
*/
def.static._auth =
	async function( count, req, res )
{
	let auth = req.headers.authorization;
	let username;
	if( !auth )
	{
		res.writeHead( 401, { 'WWW-Authenticate': 'Basic realm="csc"' } );
		res.end( 'Authorization is needed' );
		return;
	}

	if( auth.startsWith( 'Basic ' ) )
	{
		auth = auth.replace(/^Basic /, '');
		auth = Buffer.from( auth, 'base64' ).toString( 'utf8' );
		auth = auth.split( ':' );
		username = auth[ 0 ];
		const password = auth[ 1 ];

		Log.log( 'https', count, 'auth for', username );
		const user = UserManager.get( username );
		if( !user )
		{
			await timers.setTimeout( wrongWaitTime );
			Log.log( 'https', count, 'auth user unknown.' );
			return Self.error( res, 401, 'Unauthorized' );
		}

		const passhash = user.passhash;
		const r = passhash.checkPassword( password );
		if( r === undefined )
		{
			Log.log( 'https', count, 'auth user has no passhash' );
			await timers.setTimeout( wrongWaitTime );
			return Self.error( res, 401, 'Unauthorized' );
		}
		if( !r )
		{
			Log.log( 'https', count, 'auth wrong password' );
			await timers.setTimeout( wrongWaitTime );
			return Self.error( res, 401, 'Unauthorized' );
		}
		Log.log( 'https', count, 'auth OK' );
		return user;
	}
	else if( auth.startsWith( 'RemoteAuth ' ) )
	{
		auth = auth.replace(/^RemoteAuth /, '');
		auth = Buffer.from( auth, 'base64' ).toString( 'utf8' );
		auth = auth.split( ':' );
		username = auth[ 0 ];
		const token = auth[ 1 ];
		Log.log( 'https', count, 'remote auth for', username );
		if( !LfsManager.checkUserToken( username, token ) )
		{
			Log.log( 'https', count, 'unrecognized token' );
			return Self.error( res, 401, 'Unauthorized' );
		}
		const user = UserManager.get( username );
		if( !user )
		{
			await timers.setTimeout( wrongWaitTime );
			Log.log( 'https', count, 'remote auth user unknown.' );
			return Self.error( res, 401, 'Unauthorized' );
		}
		Log.log( 'https', count, 'auth OK' );
		return user;
	}
	else
	{
		Log.log( 'https', count, 'invalid auth scheme.' );
		return Self.error( res, 401, 'Unauthorized' );
	}

	// never should happen
	// eslint-disable-next-line no-unreachable
	throw new Error( );
};

/*
| Serves a https request (can be direct git or web view)
*/
def.static._serve =
	async function( req, res )
{
	const count = Log.getCount( );
	const person = await Self._auth( count, req, res );
	if( !person ) return;

	const agent = req.headers[ 'user-agent' ];
	if( agent.startsWith( 'git' ) ) await HttpGit.serve( count, req, res, person );
	else await CGit.serve( req, res, person );
};
