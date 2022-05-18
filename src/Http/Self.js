/*
| Provides the http(s) interface for git repositories.
| Does both forwarding git requests as well provides a cgit web interface.
*/

def.abstract = true;

const fs = require( 'fs/promises' );
const http = require( 'http' );
const https = require( 'https' );
const timers = require( 'timers/promises' );

const CGit = tim.require( 'GitEngine/Http/CGit' );
const HttpGit = tim.require( 'GitEngine/Http/Git' );
const LfsManager = tim.require( 'GitEngine/Lfs/Manager' );
const UserManager = tim.require( 'GitEngine/User/Manager' );

const wrongWaitTime = 2000;

/*
| Configured ips.
*/
let _ips = [ '0.0.0.0' ];

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
| Starts the http(s) git server.
*/
def.static.start =
	async function( )
{
	console.log( 'starting https git backend' );
	if( !_sslKeyFile || !_sslCertFile ) throw new Error( 'no SSL configured' );

	const serve = ( req, res ) => { Self._serve( req, res ); };
	const forward= ( req, res ) => {
		res.writeHead( 307, { Location: 'https://' + req.headers.host + req.url, } );
		res.end( 'go use https' );
	};
	const httpsOptions =
	{
		key: await fs.readFile( _sslKeyFile ),
		cert: await fs.readFile( _sslCertFile ),
	};

	for( let ip of _ips )
	{
		https.createServer( httpsOptions, serve ).listen( { port: 443, host: ip } );
		http.createServer( forward ).listen( { port: 80, host: ip } );
	}

	await CGit.start( );
};

/*
| Handles basic and remote authentication.
*/
def.static._auth =
	async function( req, res )
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

		console.log( 'http auth for', username );
		const user = UserManager.get( username );
		if( !user )
		{
			await timers.setTimeout( wrongWaitTime );
			console.log( 'http auth user unknown.' );
			return Self.error( res, 401, 'Unauthorized' );
		}

		const passhash = user.passhash;
		const r = passhash.checkPassword( password );
		if( r === undefined )
		{
			console.log( 'http auth user has no passhash' );
			await timers.setTimeout( wrongWaitTime );
			return Self.error( res, 401, 'Unauthorized' );
		}
		if( !r )
		{
			console.log( 'http auth wrong password' );
			await timers.setTimeout( wrongWaitTime );
			return Self.error( res, 401, 'Unauthorized' );
		}
		console.log( 'http auth OK' );
		return user;
	}
	else if( auth.startsWith( 'RemoteAuth ' ) )
	{
		auth = auth.replace(/^RemoteAuth /, '');
		auth = Buffer.from( auth, 'base64' ).toString( 'utf8' );
		auth = auth.split( ':' );
		username = auth[ 0 ];
		const token = auth[ 1 ];
		console.log( 'http remote auth for', username );
		if( !LfsManager.checkUserToken( username, token ) )
		{
			console.log( 'unrecognized token' );
			return Self.error( res, 401, 'Unauthorized' );
		}
		const user = UserManager.get( username );
		if( !user )
		{
			await timers.setTimeout( wrongWaitTime );
			console.log( 'http remote auth user unknown.' );
			return Self.error( res, 401, 'Unauthorized' );
		}
		console.log( 'http auth OK' );
		return user;
	}
	else
	{
		console.log( 'invalid auth scheme.' );
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
	const person = await Self._auth( req, res );
	if( !person ) return;

	const agent = req.headers[ 'user-agent' ];
	if( agent.startsWith( 'git' ) ) await HttpGit.serve( req, res, person );
	else await CGit.serve( req, res, person );
};
